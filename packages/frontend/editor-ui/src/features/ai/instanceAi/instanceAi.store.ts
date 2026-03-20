import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useToast } from '@/app/composables/useToast';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { ResponseError } from '@n8n/rest-api-client';
import {
	instanceAiEventSchema,
	instanceAiPlanSpecSchema,
	instanceAiTaskRunSchema,
	isSafeObjectKey,
} from '@n8n/api-types';
import {
	ensureThread,
	postMessage,
	postCancel,
	postCancelTask,
	postConfirmation,
} from './instanceAi.api';
import { useInstanceAiSettingsStore } from './instanceAiSettings.store';
import { handleEvent as reduceEvent, rebuildRunStateFromTree } from './instanceAi.reducer';
import { useResourceRegistry } from './useResourceRegistry';
import { useResponseFeedback } from './useResponseFeedback';
import { NEW_CONVERSATION_TITLE } from './constants';
import {
	fetchThreads as fetchThreadsApi,
	fetchThreadMessages as fetchThreadMessagesApi,
	fetchThreadStatus as fetchThreadStatusApi,
	deleteThread as deleteThreadApi,
	renameThread as renameThreadApi,
} from './instanceAi.memory.api';
import type {
	InstanceAiAttachment,
	InstanceAiEvent,
	InstanceAiMessage,
	InstanceAiTaskRun,
	InstanceAiTaskUpsertFrame,
	InstanceAiPlanUpsertFrame,
	InstanceAiStreamFrame,
	InstanceAiStreamSyncFrame,
	InstanceAiAgentNode,
	InstanceAiToolCallState,
	InstanceAiThreadSummary,
	InstanceAiStreamConnectionState,
	InstanceAiQuestionResponse,
	AgentRunState,
} from '@n8n/api-types';

let streamAbortController: AbortController | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

// Module-level reducer state storage — kept outside Vue reactivity.
let runStateByGroupId: Record<string, AgentRunState> = {};
let groupIdByRunId: Record<string, string> = {};

// Stream connection generation — incremented on every connectStream() call.
// Stale stream readers from previous threads discard frames.
let streamGeneration = 0;
const STREAM_RECONNECT_DELAY_MS = 1000;

export interface PendingConfirmationItem {
	toolCall: InstanceAiToolCallState;
	agentNode: InstanceAiAgentNode;
	messageId: string;
}

/** Walk an agent tree, collecting tool calls that have an active (pending) confirmation. */
function collectPendingConfirmations(
	node: InstanceAiAgentNode,
	messageId: string,
	resolved: Map<string, 'approved' | 'denied' | 'deferred'>,
	out: PendingConfirmationItem[],
): void {
	for (const tc of node.toolCalls) {
		if (
			tc.confirmation &&
			tc.isLoading &&
			tc.confirmationStatus !== 'approved' &&
			tc.confirmationStatus !== 'denied' &&
			!resolved.has(tc.confirmation.requestId)
		) {
			out.push({ toolCall: tc, agentNode: node, messageId });
		}
	}
	for (const child of node.children) {
		collectPendingConfirmations(child, messageId, resolved, out);
	}
}

export const useInstanceAiStore = defineStore('instanceAi', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const instanceAiSettingsStore = useInstanceAiSettingsStore();
	const toast = useToast();
	const telemetry = useTelemetry();
	const persistedThreadIds = new Set<string>();

	// --- State ---
	const currentThreadId = ref<string>(uuidv4());
	const threads = ref<InstanceAiThreadSummary[]>([]);
	const streamState = ref<InstanceAiStreamConnectionState>('disconnected');
	const activeRunId = ref<string | null>(null);
	const messages = ref<InstanceAiMessage[]>([]);
	const taskRuns = ref<InstanceAiTaskRun[]>([]);
	const debugEvents = ref<Array<{ timestamp: string; event: InstanceAiEvent }>>([]);
	const debugMode = ref(false);
	const researchMode = ref(localStorage.getItem('instanceAi.researchMode') === 'true');
	const amendContext = ref<{ agentId: string; role: string } | null>(null);
	const resolvedConfirmationIds = ref<Map<string, 'approved' | 'denied' | 'deferred'>>(new Map());
	const MAX_DEBUG_EVENTS = 1000;

	// --- Computed ---
	const isStreaming = computed(() => activeRunId.value !== null);
	const hasMessages = computed(() => messages.value.length > 0);
	const isLocalGatewayEnabled = computed(
		() => settingsStore.moduleSettings?.['instance-ai']?.localGateway === true,
	);
	const isGatewayConnected = computed(() => instanceAiSettingsStore.isGatewayConnected);
	const gatewayDirectory = computed(() => instanceAiSettingsStore.gatewayDirectory);
	const localGatewayFallbackDirectory = computed(
		() => settingsStore.moduleSettings?.['instance-ai']?.localGatewayFallbackDirectory ?? null,
	);
	const activeDirectory = computed(
		() => gatewayDirectory.value ?? localGatewayFallbackDirectory.value,
	);

	// Resource registry — maps known resource names to their types & IDs
	const { registry: resourceRegistry } = useResourceRegistry(() => messages.value);

	// Response feedback — rateability selector + submission
	const { feedbackByResponseId, rateableResponseId, submitFeedback, resetFeedback } =
		useResponseFeedback({ messages, currentThreadId, telemetry });

	/** The latest task list — scans all messages backwards since tasks persist across runs. */
	const currentTasks = computed(() => {
		for (let i = messages.value.length - 1; i >= 0; i--) {
			const tasks = messages.value[i].agentTree?.tasks;
			if (tasks) return tasks;
		}
		return null;
	});

	/** The latest assistant message that owns a plan artifact for this thread. */
	const currentPlanMessage = computed(() => {
		for (let i = messages.value.length - 1; i >= 0; i--) {
			const message = messages.value[i];
			if (message.role !== 'assistant' || !message.agentTree?.plan) continue;
			return message;
		}
		return null;
	});

	const currentPlanAgentNode = computed(() => currentPlanMessage.value?.agentTree ?? null);

	const currentPlan = computed(() => currentPlanAgentNode.value?.plan ?? null);
	const currentTaskRuns = computed(() => taskRuns.value);
	const activeTaskRuns = computed(() =>
		taskRuns.value.filter(
			(taskRun) =>
				taskRun.status === 'running' ||
				taskRun.status === 'queued' ||
				taskRun.status === 'suspended',
		),
	);
	const hasTaskRuns = computed(() => taskRuns.value.length > 0);
	const taskRunsByTaskId = computed(
		() => new Map(taskRuns.value.map((taskRun) => [taskRun.taskId, taskRun])),
	);

	/**
	 * Derive a single contextual follow-up suggestion from the last completed
	 * assistant message. Shown as the input placeholder + Tab to autocomplete.
	 */
	const contextualSuggestion = computed((): string | null => {
		if (isStreaming.value) return null;

		// Find last assistant message
		const lastAssistant = [...messages.value].reverse().find((m) => m.role === 'assistant');
		if (!lastAssistant || lastAssistant.isStreaming) return null;

		const tree = lastAssistant.agentTree;
		if (!tree) return null;

		// Workflow builder completed
		const builderChild = tree.children.find((c) => c.role === 'workflow-builder');
		if (builderChild) {
			return builderChild.status === 'error' || builderChild.status === 'cancelled'
				? 'Try building the workflow again with different settings'
				: 'Add error handling to the workflow';
		}

		// Data table manager completed
		const dataChild = tree.children.find((c) => c.role === 'data-table-manager');
		if (dataChild) {
			return 'Query the data table to show recent entries';
		}

		return null;
	});

	function replaceTaskRuns(nextTaskRuns: InstanceAiTaskRun[]): void {
		taskRuns.value = [...nextTaskRuns].sort((left, right) => right.updatedAt - left.updatedAt);
	}

	function upsertTaskRun(taskRun: InstanceAiTaskRun): void {
		const nextTaskRuns = taskRuns.value.filter(
			(existingTask) => existingTask.taskId !== taskRun.taskId,
		);
		nextTaskRuns.push(taskRun);
		replaceTaskRuns(nextTaskRuns);
	}

	function getTaskRun(taskId?: string | null): InstanceAiTaskRun | null {
		if (!taskId) return null;
		return taskRunsByTaskId.value.get(taskId) ?? null;
	}

	function getTaskRunsForMessageGroup(messageGroupId?: string | null): InstanceAiTaskRun[] {
		if (!messageGroupId) return [];
		return taskRuns.value
			.filter((taskRun) => taskRun.messageGroupId === messageGroupId)
			.sort((left, right) => left.createdAt - right.createdAt);
	}

	/** All pending confirmations across all messages, for the top-level panel. */
	const pendingConfirmations = computed((): PendingConfirmationItem[] => {
		const items: PendingConfirmationItem[] = [];
		for (const msg of messages.value) {
			if (msg.role !== 'assistant' || !msg.agentTree) continue;
			collectPendingConfirmations(msg.agentTree, msg.id, resolvedConfirmationIds.value, items);
		}
		return items;
	});

	function resolveConfirmation(
		requestId: string,
		action: 'approved' | 'denied' | 'deferred',
	): void {
		const next = new Map(resolvedConfirmationIds.value);
		next.set(requestId, action);
		resolvedConfirmationIds.value = next;
	}

	// --- Event reducer (delegated to pure module) ---

	// --- Stream lifecycle ---

	function isRecord(value: unknown): value is Record<string, unknown> {
		return value !== null && typeof value === 'object' && !Array.isArray(value);
	}

	function resetThreadState(): void {
		messages.value = [];
		taskRuns.value = [];
		activeRunId.value = null;
		debugEvents.value = [];
		resetFeedback();
		resolvedConfirmationIds.value = new Map();
		runStateByGroupId = {};
		groupIdByRunId = {};
	}

	function pushDebugEvent(event: InstanceAiEvent): void {
		debugEvents.value.push({
			timestamp: new Date().toISOString(),
			event,
		});
		if (debugEvents.value.length > MAX_DEBUG_EVENTS) {
			debugEvents.value.splice(0, debugEvents.value.length - MAX_DEBUG_EVENTS);
		}
	}

	function rebuildRoutingState(nextMessages: InstanceAiMessage[]): void {
		runStateByGroupId = {};
		groupIdByRunId = {};

		for (const message of nextMessages) {
			if (message.role !== 'assistant' || !message.agentTree) continue;

			const groupId = message.messageGroupId ?? message.runId;
			if (!groupId || !isSafeObjectKey(groupId)) continue;

			const rebuiltRunState = rebuildRunStateFromTree(message.agentTree);
			if (!rebuiltRunState) continue;
			runStateByGroupId[groupId] = rebuiltRunState;

			if (message.runIds) {
				for (const runId of message.runIds) {
					if (!isSafeObjectKey(runId)) continue;
					groupIdByRunId[runId] = groupId;
				}
			}

			if (message.runId && isSafeObjectKey(message.runId)) {
				groupIdByRunId[message.runId] = groupId;
			}
		}
	}

	function hydrateThreadState(
		nextMessages: InstanceAiMessage[],
		nextTaskRuns: InstanceAiTaskRun[],
		nextActiveRunId: string | null,
	): void {
		messages.value = nextMessages;
		replaceTaskRuns(nextTaskRuns);
		activeRunId.value = nextActiveRunId;
		rebuildRoutingState(nextMessages);
	}

	function applyStreamEvent(event: InstanceAiEvent): void {
		pushDebugEvent(event);

		if (event.type === 'task-created' || event.type === 'task-updated') {
			upsertTaskRun(event.payload.task);
			return;
		}

		const previousRunId = activeRunId.value;
		activeRunId.value = reduceEvent(
			{
				messages: messages.value,
				activeRunId: activeRunId.value,
				runStateByGroupId,
				groupIdByRunId,
			},
			event,
		);

		if (previousRunId && activeRunId.value === null) {
			void loadThreads();
		}
	}

	function applySyncFrame(frame: InstanceAiStreamSyncFrame): void {
		hydrateThreadState(frame.messages, frame.taskRuns, frame.activeRunId);
	}

	function applyTaskUpsertFrame(frame: InstanceAiTaskUpsertFrame): void {
		const event: InstanceAiEvent = {
			type: 'task-updated',
			runId: frame.runId,
			agentId: frame.agentId,
			payload: { task: frame.payload.task },
		};
		pushDebugEvent(event);
		upsertTaskRun(frame.payload.task);
	}

	function applyPlanUpsertFrame(frame: InstanceAiPlanUpsertFrame): void {
		applyStreamEvent({
			type: 'plan-updated',
			runId: frame.runId,
			agentId: frame.agentId,
			payload: { plan: frame.payload.plan },
		});
	}

	function parseStreamFrame(line: string): InstanceAiStreamFrame | null {
		try {
			const parsed = JSON.parse(line) as unknown;
			if (!isRecord(parsed) || typeof parsed.type !== 'string') {
				return null;
			}

			if (parsed.type === 'sync') {
				if (
					typeof parsed.threadId === 'string' &&
					Array.isArray(parsed.messages) &&
					Array.isArray(parsed.taskRuns) &&
					(parsed.activeRunId === null || typeof parsed.activeRunId === 'string')
				) {
					return {
						type: 'sync',
						threadId: parsed.threadId,
						messages: parsed.messages as InstanceAiMessage[],
						taskRuns: parsed.taskRuns as InstanceAiTaskRun[],
						activeRunId: parsed.activeRunId,
					};
				}
				return null;
			}

			if (parsed.type === 'task-upsert') {
				const payload = isRecord(parsed.payload) ? parsed.payload : undefined;
				const task = instanceAiTaskRunSchema.safeParse(payload?.task);
				if (
					task.success &&
					typeof parsed.runId === 'string' &&
					typeof parsed.agentId === 'string'
				) {
					return {
						type: 'task-upsert',
						runId: parsed.runId,
						agentId: parsed.agentId,
						payload: { task: task.data },
					};
				}
				return null;
			}

			if (parsed.type === 'plan-upsert') {
				const payload = isRecord(parsed.payload) ? parsed.payload : undefined;
				const plan = instanceAiPlanSpecSchema.safeParse(payload?.plan);
				if (
					plan.success &&
					typeof parsed.runId === 'string' &&
					typeof parsed.agentId === 'string'
				) {
					return {
						type: 'plan-upsert',
						runId: parsed.runId,
						agentId: parsed.agentId,
						payload: { plan: plan.data },
					};
				}
				return null;
			}

			const event = instanceAiEventSchema.safeParse(parsed);
			if (!event.success) {
				return null;
			}

			switch (event.data.type) {
				case 'task-created':
				case 'task-updated':
					return {
						type: 'task-upsert',
						runId: event.data.runId,
						agentId: event.data.agentId,
						payload: { task: event.data.payload.task },
					};
				case 'plan-created':
				case 'plan-updated':
					return {
						type: 'plan-upsert',
						runId: event.data.runId,
						agentId: event.data.agentId,
						payload: { plan: event.data.payload.plan },
					};
				case 'filesystem-request':
					return null;
				default:
					return event.data;
			}
		} catch {
			return null;
		}
	}

	function handleStreamFrame(frame: InstanceAiStreamFrame): void {
		switch (frame.type) {
			case 'sync':
				applySyncFrame(frame);
				return;
			case 'task-upsert':
				applyTaskUpsertFrame(frame);
				return;
			case 'plan-upsert':
				applyPlanUpsertFrame(frame);
				return;
			default:
				applyStreamEvent(frame);
		}
	}

	function clearReconnectTimer(): void {
		if (reconnectTimer) {
			clearTimeout(reconnectTimer);
			reconnectTimer = null;
		}
	}

	async function waitForReconnectDelay(): Promise<void> {
		await new Promise<void>((resolve) => {
			reconnectTimer = setTimeout(() => {
				reconnectTimer = null;
				resolve();
			}, STREAM_RECONNECT_DELAY_MS);
		});
	}

	async function consumeThreadStream(
		threadId: string,
		gen: number,
		signal: AbortSignal,
	): Promise<void> {
		const baseUrl = rootStore.restApiContext.baseUrl;
		const response = await fetch(`${baseUrl}/instance-ai/stream/${threadId}`, {
			method: 'GET',
			credentials: 'include',
			headers: { Accept: 'application/x-ndjson' },
			signal,
		});

		if (!response.ok || !response.body) {
			throw new Error(`Stream request failed with status ${response.status}`);
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';
		let receivedSync = false;

		const processLine = (line: string) => {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) {
				return;
			}

			const frame = parseStreamFrame(trimmed);
			if (!frame) {
				console.warn('[InstanceAI] Invalid stream frame, skipping');
				return;
			}

			if (gen !== streamGeneration || currentThreadId.value !== threadId) {
				return;
			}

			if (!receivedSync && frame.type !== 'sync') {
				console.warn('[InstanceAI] Ignoring pre-sync frame');
				return;
			}

			handleStreamFrame(frame);
			if (frame.type === 'sync') {
				receivedSync = true;
				streamState.value = 'connected';
			}
		};

		while (true) {
			const { value, done } = await reader.read();
			if (done) {
				break;
			}

			buffer += decoder.decode(value, { stream: true });
			let newlineIndex = buffer.indexOf('\n');
			while (newlineIndex >= 0) {
				processLine(buffer.slice(0, newlineIndex));
				buffer = buffer.slice(newlineIndex + 1);
				newlineIndex = buffer.indexOf('\n');
			}
		}

		buffer += decoder.decode();
		if (buffer.length > 0) {
			processLine(buffer);
		}

		if (!receivedSync) {
			throw new Error('Stream ended before initial sync frame');
		}
	}

	async function runThreadStream(threadId: string, gen: number): Promise<void> {
		let firstAttempt = true;

		while (gen === streamGeneration && currentThreadId.value === threadId) {
			clearReconnectTimer();
			const controller = new AbortController();
			streamAbortController = controller;
			streamState.value = firstAttempt ? 'connecting' : 'reconnecting';

			try {
				await consumeThreadStream(threadId, gen, controller.signal);
			} catch (error) {
				if (controller.signal.aborted || gen !== streamGeneration) {
					return;
				}

				console.warn('[InstanceAI] Thread stream disconnected, retrying', error);
			} finally {
				if (streamAbortController === controller) {
					streamAbortController = null;
				}
			}

			if (gen !== streamGeneration || currentThreadId.value !== threadId) {
				return;
			}

			streamState.value = 'reconnecting';
			await waitForReconnectDelay();
			firstAttempt = false;
		}
	}

	function connectStream(threadId?: string): void {
		const tid = threadId ?? currentThreadId.value;
		clearReconnectTimer();
		if (streamAbortController) {
			streamAbortController.abort();
			streamAbortController = null;
		}

		const gen = ++streamGeneration;
		void runThreadStream(tid, gen);
	}

	function closeStream(): void {
		streamGeneration += 1;
		clearReconnectTimer();
		if (streamAbortController) {
			streamAbortController.abort();
			streamAbortController = null;
		}
		streamState.value = 'disconnected';
	}

	function switchThread(threadId: string): void {
		closeStream();
		resetThreadState();
		// 3. Switch thread
		currentThreadId.value = threadId;
		connectStream(threadId);
	}

	// --- Actions ---

	function newThread(): string {
		const newThreadId = uuidv4();
		closeStream();
		resetThreadState();
		resolvedConfirmationIds.value = new Map();
		resetFeedback();
		currentThreadId.value = newThreadId;

		threads.value.unshift({
			id: newThreadId,
			title: NEW_CONVERSATION_TITLE,
			createdAt: new Date().toISOString(),
		});

		connectStream(newThreadId);
		return newThreadId;
	}

	async function deleteThread(
		threadId: string,
	): Promise<{ currentThreadId: string; wasActive: boolean }> {
		const wasActive = threadId === currentThreadId.value;

		// Only call API for threads that have been persisted to the backend
		if (persistedThreadIds.has(threadId)) {
			try {
				await deleteThreadApi(rootStore.restApiContext, threadId);
				persistedThreadIds.delete(threadId);
			} catch {
				toast.showError(new Error('Failed to delete thread. Try again.'), 'Delete failed');
				return { currentThreadId: currentThreadId.value, wasActive };
			}
		}

		// Remove thread from list
		threads.value = threads.value.filter((t) => t.id !== threadId);

		if (wasActive) {
			if (threads.value.length > 0) {
				// Switch to first remaining thread
				switchThread(threads.value[0].id);
			} else {
				// No threads left — create a new one
				const freshId = uuidv4();
				closeStream();
				resetThreadState();
				resolvedConfirmationIds.value = new Map();
				resetFeedback();
				currentThreadId.value = freshId;
				threads.value.push({
					id: freshId,
					title: NEW_CONVERSATION_TITLE,
					createdAt: new Date().toISOString(),
				});
				connectStream(freshId);
			}
		}

		return { currentThreadId: currentThreadId.value, wasActive };
	}

	async function loadThreads(): Promise<void> {
		try {
			const result = await fetchThreadsApi(rootStore.restApiContext);
			for (const thread of result.threads) {
				persistedThreadIds.add(thread.id);
			}
			// Merge server threads into local list, preserving any local-only threads
			// (e.g. a freshly created thread that hasn't been persisted yet)
			const serverIds = new Set(result.threads.map((t) => t.id));
			const localOnly = threads.value.filter((t) => !serverIds.has(t.id));
			const serverThreads: InstanceAiThreadSummary[] = result.threads.map((t) => ({
				id: t.id,
				title: t.title || NEW_CONVERSATION_TITLE,
				createdAt: t.createdAt,
			}));
			threads.value = [...localOnly, ...serverThreads];
		} catch {
			// Silently ignore — threads will remain client-side only
		}
	}

	async function syncThread(threadId: string): Promise<void> {
		if (persistedThreadIds.has(threadId)) return;

		const result = await ensureThread(rootStore.restApiContext, threadId);
		persistedThreadIds.add(result.thread.id);

		const existingThread = threads.value.find((thread) => thread.id === threadId);
		if (existingThread) {
			existingThread.createdAt = result.thread.createdAt;
			existingThread.title = result.thread.title || existingThread.title;
			return;
		}

		threads.value.unshift({
			id: result.thread.id,
			title: result.thread.title || NEW_CONVERSATION_TITLE,
			createdAt: result.thread.createdAt,
		});
	}

	async function loadHistoricalMessages(threadId: string): Promise<void> {
		try {
			const result = await fetchThreadMessagesApi(rootStore.restApiContext, threadId, 100);
			// Only hydrate if we're still on the same thread and the live stream
			// has not already replaced the state with a sync frame.
			if (currentThreadId.value !== threadId || messages.value.length > 0) return;
			if (result.messages.length > 0) {
				hydrateThreadState(result.messages, taskRuns.value, activeRunId.value);
			}
		} catch {
			// Silently ignore — messages will appear when the stream sync arrives
		}
	}

	async function sendMessage(message: string, attachments?: InstanceAiAttachment[]): Promise<void> {
		// Clear amend context on new message
		amendContext.value = null;

		try {
			await syncThread(currentThreadId.value);
		} catch {
			toast.showError(new Error('Failed to start a new thread. Try again.'), 'Send failed');
			return;
		}

		// 1. Add user message optimistically
		const userMessage: InstanceAiMessage = {
			id: uuidv4(),
			role: 'user',
			createdAt: new Date().toISOString(),
			content: message,
			reasoning: '',
			isStreaming: false,
			attachments: attachments && attachments.length > 0 ? attachments : undefined,
		};
		messages.value.push(userMessage);

		// 2. POST to backend — returns { runId }
		// Thread title is generated by Mastra asynchronously after the agent responds.
		// activeRunId is set by the live stream, NOT by the POST response.
		try {
			await postMessage(
				rootStore.restApiContext,
				currentThreadId.value,
				message,
				researchMode.value || undefined,
				attachments,
			);
		} catch (error: unknown) {
			const status = error instanceof ResponseError ? error.httpStatusCode : undefined;
			if (status === 409) {
				toast.showError(
					new Error('Agent is still working on your previous message'),
					'Cannot send message',
				);
			} else if (status === 400) {
				toast.showError(new Error('Message cannot be empty'), 'Invalid message');
			} else {
				toast.showError(new Error('Failed to send message. Try again.'), 'Send failed');
			}
			// Remove the optimistic user message on failure
			const idx = messages.value.indexOf(userMessage);
			if (idx !== -1) {
				messages.value.splice(idx, 1);
			}
		}
	}

	async function cancelRun(): Promise<void> {
		if (!activeRunId.value) return;
		try {
			await postCancel(rootStore.restApiContext, currentThreadId.value);
			// Don't clear activeRunId here — wait for the run-finish event via the stream
		} catch {
			toast.showError(new Error('Failed to cancel. Try again.'), 'Cancel failed');
		}
	}

	/** Cancel a specific background task. */
	async function cancelBackgroundTask(taskId: string): Promise<void> {
		try {
			await postCancelTask(rootStore.restApiContext, currentThreadId.value, taskId);
		} catch {
			toast.showError(new Error('Failed to cancel task. Try again.'), 'Cancel failed');
		}
	}

	/** Stop an agent and prime the input for amend instructions. */
	function amendAgent(agentId: string, role: string, taskId?: string): void {
		if (taskId) {
			void cancelBackgroundTask(taskId);
		} else {
			void cancelRun();
		}
		amendContext.value = { agentId, role };
	}

	async function confirmAction(
		requestId: string,
		approved: boolean,
		credentialId?: string,
		credentials?: Record<string, string>,
		autoSetup?: { credentialType: string },
		userInput?: string,
		domainAccessAction?: string,
		mockCredentials?: boolean,
		answers?: InstanceAiQuestionResponse[],
	): Promise<void> {
		try {
			await postConfirmation(
				rootStore.restApiContext,
				requestId,
				approved,
				credentialId,
				credentials,
				autoSetup,
				userInput,
				domainAccessAction,
				mockCredentials,
				answers,
			);
		} catch {
			toast.showError(new Error('Failed to send confirmation. Try again.'), 'Confirmation failed');
		}
	}

	function toggleResearchMode(): void {
		researchMode.value = !researchMode.value;
		localStorage.setItem('instanceAi.researchMode', String(researchMode.value));
	}

	function copyFullTrace(): string {
		// Collapse consecutive text-delta / reasoning-delta events from the same agent
		// into single entries so traces are compact and readable.
		const collapsed: Array<{ timestamp: string; event: InstanceAiEvent }> = [];
		let pendingText: { timestamp: string; event: InstanceAiEvent; buffer: string } | null = null;
		let pendingReasoning: { timestamp: string; event: InstanceAiEvent; buffer: string } | null =
			null;

		for (const entry of debugEvents.value) {
			const { event } = entry;

			if (event.type === 'text-delta') {
				if (pendingText && pendingText.event.agentId === event.agentId) {
					pendingText.buffer += event.payload.text;
				} else {
					if (pendingText) {
						(pendingText.event as InstanceAiEvent & { type: 'text-delta' }).payload.text =
							pendingText.buffer;
						collapsed.push(pendingText);
					}
					pendingText = {
						timestamp: entry.timestamp,
						event: { ...event, payload: { ...event.payload } },
						buffer: event.payload.text,
					};
				}
				continue;
			}

			if (event.type === 'reasoning-delta') {
				if (pendingReasoning && pendingReasoning.event.agentId === event.agentId) {
					pendingReasoning.buffer += event.payload.text;
				} else {
					if (pendingReasoning) {
						(pendingReasoning.event as InstanceAiEvent & { type: 'reasoning-delta' }).payload.text =
							pendingReasoning.buffer;
						collapsed.push(pendingReasoning);
					}
					pendingReasoning = {
						timestamp: entry.timestamp,
						event: { ...event, payload: { ...event.payload } },
						buffer: event.payload.text,
					};
				}
				continue;
			}

			// Non-delta event — flush any pending buffers
			if (pendingText) {
				(pendingText.event as InstanceAiEvent & { type: 'text-delta' }).payload.text =
					pendingText.buffer;
				collapsed.push(pendingText);
				pendingText = null;
			}
			if (pendingReasoning) {
				(pendingReasoning.event as InstanceAiEvent & { type: 'reasoning-delta' }).payload.text =
					pendingReasoning.buffer;
				collapsed.push(pendingReasoning);
				pendingReasoning = null;
			}
			collapsed.push(entry);
		}
		// Flush remaining
		if (pendingText) {
			(pendingText.event as InstanceAiEvent & { type: 'text-delta' }).payload.text =
				pendingText.buffer;
			collapsed.push(pendingText);
		}
		if (pendingReasoning) {
			(pendingReasoning.event as InstanceAiEvent & { type: 'reasoning-delta' }).payload.text =
				pendingReasoning.buffer;
			collapsed.push(pendingReasoning);
		}

		return JSON.stringify(
			{
				threadId: currentThreadId.value,
				exportedAt: new Date().toISOString(),
				messages: messages.value,
				taskRuns: taskRuns.value,
				events: collapsed,
			},
			null,
			2,
		);
	}

	async function renameThread(threadId: string, title: string): Promise<void> {
		const thread = threads.value.find((t) => t.id === threadId);
		if (thread) {
			thread.title = title;
		}

		// Only call API for threads that have been persisted to the backend
		if (persistedThreadIds.has(threadId)) {
			await renameThreadApi(rootStore.restApiContext, threadId, title);
		}
	}

	return {
		// State
		currentThreadId,
		threads,
		streamState,
		activeRunId,
		messages,
		debugEvents,
		debugMode,
		researchMode,
		amendContext,
		feedbackByResponseId,
		resolvedConfirmationIds,
		// Computed
		isStreaming,
		hasMessages,
		isLocalGatewayEnabled,
		isGatewayConnected,
		gatewayDirectory,
		localGatewayFallbackDirectory,
		activeDirectory,
		contextualSuggestion,
		currentTasks,
		currentPlanMessage,
		currentPlanAgentNode,
		currentPlan,
		currentTaskRuns,
		activeTaskRuns,
		hasTaskRuns,
		getTaskRun,
		getTaskRunsForMessageGroup,
		resourceRegistry,
		taskRuns,
		rateableResponseId,
		pendingConfirmations,
		// Actions
		newThread,
		deleteThread,
		renameThread,
		switchThread,
		loadThreads,
		loadHistoricalMessages,
		sendMessage,
		cancelRun,
		cancelBackgroundTask,
		amendAgent,
		toggleResearchMode,
		confirmAction,
		resolveConfirmation,
		copyFullTrace,
		connectStream,
		closeStream,
		submitFeedback,
	};
});
