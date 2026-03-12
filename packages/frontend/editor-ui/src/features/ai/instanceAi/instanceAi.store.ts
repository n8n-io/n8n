import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useToast } from '@/app/composables/useToast';
import { ResponseError } from '@n8n/rest-api-client';
import { instanceAiEventSchema } from '@n8n/api-types';
import { postMessage, postCancel, postCancelTask, postConfirmation } from './instanceAi.api';
import {
	fetchThreads as fetchThreadsApi,
	fetchThreadMessages as fetchThreadMessagesApi,
	fetchThreadStatus as fetchThreadStatusApi,
} from './instanceAi.memory.api';
import { handleEvent as reduceEvent } from './instanceAi.reducer';
import { useResourceRegistry } from './useResourceRegistry';
import { NEW_CONVERSATION_TITLE } from './constants';
import type {
	InstanceAiEvent,
	InstanceAiMessage,
	InstanceAiThreadSummary,
	InstanceAiSSEConnectionState,
} from '@n8n/api-types';

// Module-level EventSource reference — not in reactive state (not serializable,
// not needed for rendering, wrapping in a reactive proxy causes issues).
let eventSource: EventSource | null = null;

export const useInstanceAiStore = defineStore('instanceAi', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const toast = useToast();

	// --- State ---
	const currentThreadId = ref<string>(uuidv4());
	const threads = ref<InstanceAiThreadSummary[]>([]);
	const sseState = ref<InstanceAiSSEConnectionState>('disconnected');
	const lastEventIdByThread = ref<Record<string, number>>({});
	const activeRunId = ref<string | null>(null);
	const messages = ref<InstanceAiMessage[]>([]);
	const debugEvents = ref<Array<{ timestamp: string; event: InstanceAiEvent }>>([]);
	const debugMode = ref(false);
	const researchMode = ref(localStorage.getItem('instanceAi.researchMode') === 'true');
	const amendContext = ref<{ agentId: string; role: string } | null>(null);
	const MAX_DEBUG_EVENTS = 1000;

	// --- Computed ---
	const isStreaming = computed(() => activeRunId.value !== null);
	const hasMessages = computed(() => messages.value.length > 0);
	const isLocalFilesystemEnabled = computed(
		() => settingsStore.moduleSettings?.['instance-ai']?.filesystem === true,
	);
	const isGatewayConnected = computed(
		() => settingsStore.moduleSettings?.['instance-ai']?.gatewayConnected === true,
	);
	const gatewayDirectory = computed(
		() => settingsStore.moduleSettings?.['instance-ai']?.gatewayDirectory ?? null,
	);
	const filesystemDirectory = computed(
		() => settingsStore.moduleSettings?.['instance-ai']?.filesystemDirectory ?? null,
	);
	const activeDirectory = computed(() => gatewayDirectory.value ?? filesystemDirectory.value);

	// Resource registry — maps known resource names to their types & IDs
	const { registry: resourceRegistry } = useResourceRegistry(() => messages.value);

	/** The latest task list — scans all messages backwards since tasks persist across runs. */
	const currentTasks = computed(() => {
		for (let i = messages.value.length - 1; i >= 0; i--) {
			const tasks = messages.value[i].agentTree?.tasks;
			if (tasks) return tasks;
		}
		return null;
	});

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

	// --- Event reducer (delegated to pure module) ---

	// --- SSE lifecycle ---

	function onSSEMessage(sseEvent: MessageEvent): void {
		// Track last event ID per thread (for reconnection)
		if (sseEvent.lastEventId) {
			lastEventIdByThread.value[currentThreadId.value] = Number(sseEvent.lastEventId);
		}
		try {
			const parsed = instanceAiEventSchema.safeParse(JSON.parse(String(sseEvent.data)));
			if (!parsed.success) {
				console.warn('[InstanceAI] Invalid SSE event, skipping:', parsed.error.message);
				return;
			}
			// Push to debug event buffer (capped)
			debugEvents.value.push({
				timestamp: new Date().toISOString(),
				event: parsed.data,
			});
			if (debugEvents.value.length > MAX_DEBUG_EVENTS) {
				debugEvents.value.splice(0, debugEvents.value.length - MAX_DEBUG_EVENTS);
			}
			const previousRunId = activeRunId.value;
			activeRunId.value = reduceEvent(
				{ messages: messages.value, activeRunId: activeRunId.value },
				parsed.data,
			);
			// When a run finishes, refresh thread list to pick up Mastra-generated titles
			if (previousRunId && activeRunId.value === null) {
				void loadThreads();
			}
		} catch {
			// Malformed JSON — skip
		}
	}

	function connectSSE(threadId?: string): void {
		const tid = threadId ?? currentThreadId.value;
		if (eventSource) {
			closeSSE();
		}
		sseState.value = 'connecting';

		const lastEventId = lastEventIdByThread.value[tid];
		const baseUrl = rootStore.restApiContext.baseUrl;
		const url =
			lastEventId !== null && lastEventId !== undefined
				? `${baseUrl}/instance-ai/events/${tid}?lastEventId=${String(lastEventId)}`
				: `${baseUrl}/instance-ai/events/${tid}`;

		eventSource = new EventSource(url, { withCredentials: true });

		eventSource.onopen = () => {
			sseState.value = 'connected';
		};

		eventSource.onmessage = (ev: MessageEvent) => {
			onSSEMessage(ev);
		};

		eventSource.onerror = () => {
			// EventSource auto-reconnects. Mark as reconnecting if not already closed.
			if (eventSource?.readyState === EventSource.CONNECTING) {
				sseState.value = 'reconnecting';
			} else if (eventSource?.readyState === EventSource.CLOSED) {
				sseState.value = 'disconnected';
				eventSource = null;
			}
		};
	}

	function closeSSE(): void {
		if (eventSource) {
			eventSource.close();
			eventSource = null;
		}
		sseState.value = 'disconnected';
	}

	function switchThread(threadId: string): void {
		// 1. Close current SSE connection
		closeSSE();
		// 2. Clear store state
		messages.value = [];
		activeRunId.value = null;
		debugEvents.value = [];
		// 3. Switch thread
		currentThreadId.value = threadId;
		// 4. Load rich historical messages first, then connect SSE after.
		//    loadHistoricalMessages sets the SSE cursor (nextEventId) so SSE
		//    only receives events that arrived AFTER the historical snapshot.
		delete lastEventIdByThread.value[threadId];
		void loadHistoricalMessages(threadId).then(() => {
			void loadThreadStatus(threadId);
			connectSSE(threadId);
		});
	}

	// --- Actions ---

	function newThread(): string {
		const newThreadId = uuidv4();
		closeSSE();
		messages.value = [];
		activeRunId.value = null;
		debugEvents.value = [];
		currentThreadId.value = newThreadId;

		threads.value.unshift({
			id: newThreadId,
			title: NEW_CONVERSATION_TITLE,
			createdAt: new Date().toISOString(),
		});

		connectSSE(newThreadId);
		return newThreadId;
	}

	function deleteThread(threadId: string): { currentThreadId: string; wasActive: boolean } {
		const wasActive = threadId === currentThreadId.value;

		// Remove thread from list
		threads.value = threads.value.filter((t) => t.id !== threadId);

		// Clean up event cursor
		delete lastEventIdByThread.value[threadId];

		if (wasActive) {
			if (threads.value.length > 0) {
				// Switch to first remaining thread
				switchThread(threads.value[0].id);
			} else {
				// No threads left — create a new one
				const freshId = uuidv4();
				closeSSE();
				messages.value = [];
				activeRunId.value = null;
				debugEvents.value = [];
				currentThreadId.value = freshId;
				threads.value.push({
					id: freshId,
					title: NEW_CONVERSATION_TITLE,
					createdAt: new Date().toISOString(),
				});
				connectSSE(freshId);
			}
		}

		return { currentThreadId: currentThreadId.value, wasActive };
	}

	async function loadThreads(): Promise<void> {
		try {
			const result = await fetchThreadsApi(rootStore.restApiContext);
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

	async function loadHistoricalMessages(threadId: string): Promise<void> {
		try {
			const result = await fetchThreadMessagesApi(rootStore.restApiContext, threadId, 100);
			// Only hydrate if we're still on the same thread and SSE hasn't delivered messages
			if (currentThreadId.value !== threadId || messages.value.length > 0) return;
			// Backend now returns InstanceAiMessage[] directly — no conversion needed
			if (result.messages.length > 0) {
				messages.value = result.messages;
			}
			// Set SSE cursor to skip past events already covered by historical messages.
			// This prevents duplicate messages when SSE replays in-memory events.
			if (result.nextEventId !== null && result.nextEventId !== undefined) {
				lastEventIdByThread.value[threadId] = result.nextEventId - 1;
			}
		} catch {
			// Silently ignore — messages will appear if SSE delivers them
		}
	}

	async function loadThreadStatus(threadId: string): Promise<void> {
		try {
			const status = await fetchThreadStatusApi(rootStore.restApiContext, threadId);
			if (currentThreadId.value !== threadId) return;

			const hasActivity =
				status.hasActiveRun || status.isSuspended || status.backgroundTasks.length > 0;
			if (!hasActivity) return;

			const lastAssistant = [...messages.value].reverse().find((m) => m.role === 'assistant');
			if (!lastAssistant) return;

			if (status.hasActiveRun || status.isSuspended) {
				activeRunId.value = lastAssistant.runId ?? null;
				lastAssistant.isStreaming = status.hasActiveRun;
			}

			// Inject running background tasks as active children in the agent tree
			// so the UI shows them as in-progress sub-agents
			if (status.backgroundTasks.length > 0 && lastAssistant.agentTree) {
				for (const task of status.backgroundTasks) {
					const existing = lastAssistant.agentTree.children.find((c) => c.agentId === task.agentId);
					if (!existing) {
						lastAssistant.agentTree.children.push({
							agentId: task.agentId,
							role: task.role,
							status: task.status === 'running' ? 'active' : 'completed',
							textContent: '',
							reasoning: '',
							toolCalls: [],
							children: [],
							timeline: [],
						});
					}
				}
			}
		} catch {
			// Silently ignore
		}
	}

	async function sendMessage(message: string): Promise<void> {
		// Clear amend context on new message
		amendContext.value = null;

		// 1. Add user message optimistically
		const userMessage: InstanceAiMessage = {
			id: uuidv4(),
			role: 'user',
			createdAt: new Date().toISOString(),
			content: message,
			reasoning: '',
			isStreaming: false,
		};
		messages.value.push(userMessage);

		// 2. POST to backend — returns { runId }
		// Thread title is generated by Mastra asynchronously after the agent responds.
		// activeRunId is set by the run-start event arriving over SSE, NOT by the POST response.
		try {
			await postMessage(
				rootStore.restApiContext,
				currentThreadId.value,
				message,
				researchMode.value || undefined,
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
			// Don't clear activeRunId here — wait for the run-finish event via SSE
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
				events: collapsed,
			},
			null,
			2,
		);
	}

	function renameThread(threadId: string, title: string): void {
		const thread = threads.value.find((t) => t.id === threadId);
		if (thread) {
			thread.title = title;
		}
	}

	return {
		// State
		currentThreadId,
		threads,
		sseState,
		lastEventIdByThread,
		activeRunId,
		messages,
		debugEvents,
		debugMode,
		researchMode,
		amendContext,
		// Computed
		isStreaming,
		hasMessages,
		isLocalFilesystemEnabled,
		isGatewayConnected,
		gatewayDirectory,
		filesystemDirectory,
		activeDirectory,
		contextualSuggestion,
		currentTasks,
		resourceRegistry,
		// Actions
		newThread,
		deleteThread,
		renameThread,
		switchThread,
		loadThreads,
		loadHistoricalMessages,
		loadThreadStatus,
		sendMessage,
		cancelRun,
		cancelBackgroundTask,
		amendAgent,
		toggleResearchMode,
		confirmAction,
		copyFullTrace,
		connectSSE,
		closeSSE,
	};
});
