import { computed, reactive, ref, shallowRef, watch } from 'vue';
import {
	INSTANCE_AI_THREAD_SOURCE_FALLBACK,
	isSafeObjectKey,
	taskListSchema,
	type InstanceAiAttachment,
	type InstanceAiHandoffContext,
	type InstanceAiMessage,
	type InstanceAiResourceAttachment,
	type InstanceAiSetupItem,
	type InstanceAiThreadSourcePersisted,
	type InstanceAiThreadSummary,
	type RunTarget,
	type InstanceAiToolCallState,
	type InstanceAiWorkflowAttachment,
	type TaskList,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { useRootStore } from '@n8n/stores/useRootStore';
import { TELEMETRY_EVENT, type InferTelemetryProps } from '@n8n/telemetry';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import type { IWorkflowDb } from '@/Interface';
import type { InstanceAiMessageAuthorship } from './prefills';
import { optionalRunTarget } from './runTarget/runTargetOptions';
import {
	EMPTY_ASSISTANT_MENTION_COUNTS,
	type AssistantMentionCounts,
} from '@/features/ai/assistant-at-mentions/assistantAtMentions.types';
import { getLatestBuildResult, type RememberedManualExecution } from './canvasPreview.utils';
import {
	useResourceRegistry,
	type TransientWorkflowArtifactReference,
} from './useResourceRegistry';
import { buildThreadArtifactsContext, type OpenThreadTab } from './threadArtifacts';
import {
	INSTANCE_AI_AGENT_BUILDER_TARGET_METADATA_KEY,
	INSTANCE_AI_AGENT_BUILDER_TARGETS_METADATA_KEY,
	INSTANCE_AI_AGENT_PREVIEW_SESSION_METADATA_KEY,
	INSTANCE_AI_AGENT_PREVIEW_VIEW_METADATA_KEY,
	INSTANCE_AI_PENDING_AGENT_METADATA_KEY,
	NEW_CONVERSATION_TITLE,
	isInstanceAiThreadSource,
} from './constants';
import {
	stashPendingFirstMessage,
	stashPendingFirstMessageFiles,
} from './instanceAi.pendingFirstMessage';

/** Thread metadata keys the backend writes for the Assistant side panels. */
export const INSTANCE_AI_TASKS_METADATA_KEY = 'instanceAiTasks';
export const INSTANCE_AI_SETUP_ITEMS_METADATA_KEY = 'instanceAiSetupItems';

/**
 * State the editor handed off, snapshotted before its stores are torn down so
 * the artifact can seed it directly without refetching. `workflow`/`execution`
 * are omitted when the editor didn't have them loaded, leaving a fetch fallback.
 */
export interface PendingHandoff {
	workflowId: string;
	workflow?: IWorkflowDb;
	execution?: IExecutionResponse;
}

type SetupChatTelemetryContext = Pick<
	InferTelemetryProps<typeof TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_BUILDER_MESSAGE>,
	| 'workflow_id'
	| 'pending_credential_count'
	| 'pending_parameter_count'
	| 'session_id'
	| 'variant'
	| '$feature/118_instance_ai_setup_overhaul'
>;

/** How an onboarding thread ended; the telemetry value of each exit. */
export type OnboardingExitOutcome = 'build' | 'left' | 'run_failed';
/** Tool calls that end the onboarding flow, with the outcome each one reports. */
const ONBOARDING_EXIT_OUTCOMES = new Map<string, OnboardingExitOutcome>([
	['leave-onboarding', 'left'],
	['build-workflow', 'build'],
]);

/** A message the runtime asks the mounted Agents chat to send. */
export interface ThreadChatMessage {
	message: string;
	/** Resource references (workflow, agent, nodes). Files travel as `files`. */
	attachments?: InstanceAiResourceAttachment[];
	files?: File[];
	handoffContext?: InstanceAiHandoffContext;
	/** Read on the first message of a chat only. */
	runTarget?: RunTarget;
}

/** Sends through the mounted Agents chat. Resolves to `false` when nothing was sent. */
export type ThreadChatSender = (message: ThreadChatMessage) => Promise<boolean> | boolean;

/**
 * Cross-runtime hooks the store wires up at creation time, so runtime side
 * effects can reach store-owned state without a circular import.
 */
export interface ThreadRuntimeHooks {
	/** A tool call ended the onboarding flow (`leave-onboarding` or `build-workflow`). */
	onOnboardingLeft?: (
		threadId: string,
		outcome: OnboardingExitOutcome,
		leaveReason?: string,
	) => void;
	/** Thread-list metadata: builder targets, tasks and setup items. */
	getThreadMetadata?: (threadId: string) => Record<string, unknown> | undefined;
}

/**
 * The title a thread shows in a header: the summary title once the server has
 * generated one, else the first user message (truncated), else undefined —
 * rendering only on a defined value avoids a "New conversation" → real title
 * flash. Shared by `InstanceAiThreadView` and the embedded `InstanceAiChatPanel`.
 */
export function getThreadDisplayTitle(
	summary: InstanceAiThreadSummary | undefined,
	messages: InstanceAiMessage[],
): string | undefined {
	if (summary?.title && summary.title !== NEW_CONVERSATION_TITLE) return summary.title;
	const firstUserMessage = messages.find((message) => message.role === 'user');
	if (firstUserMessage?.content) {
		const text = firstUserMessage.content.trim();
		return text.length > 60 ? text.slice(0, 60) + '…' : text;
	}
	return undefined;
}

export function getAgentBuilderTargetFromThreadMetadata(
	metadata: Record<string, unknown> | undefined,
) {
	const raw = metadata?.[INSTANCE_AI_AGENT_BUILDER_TARGET_METADATA_KEY];
	if (!isRecord(raw)) return undefined;
	if (typeof raw.agentId !== 'string' || typeof raw.projectId !== 'string') return undefined;
	return {
		agentId: raw.agentId,
		projectId: raw.projectId,
		...(typeof raw.name === 'string' ? { name: raw.name } : {}),
	};
}

export function getAgentBuilderTargetsFromThreadMetadata(
	metadata: Record<string, unknown> | undefined,
) {
	const registry = metadata?.[INSTANCE_AI_AGENT_BUILDER_TARGETS_METADATA_KEY];
	if (!isRecord(registry)) return [];
	return Object.values(registry).flatMap((value) => {
		if (
			!isRecord(value) ||
			typeof value.agentId !== 'string' ||
			typeof value.projectId !== 'string'
		)
			return [];
		return [{ agentId: value.agentId, projectId: value.projectId }];
	});
}

export function getPendingAgentTargetFromThreadMetadata(
	metadata: Record<string, unknown> | undefined,
) {
	const raw = metadata?.[INSTANCE_AI_PENDING_AGENT_METADATA_KEY];
	if (!isRecord(raw)) return undefined;
	if (typeof raw.agentId !== 'string' || typeof raw.projectId !== 'string') return undefined;
	return { agentId: raw.agentId, projectId: raw.projectId };
}

export function getAgentPreviewViewFromThreadMetadata(
	metadata: Record<string, unknown> | undefined,
) {
	return getAgentPreviewTargetFromThreadMetadata(
		metadata,
		INSTANCE_AI_AGENT_PREVIEW_VIEW_METADATA_KEY,
	);
}

export function getAgentPreviewSessionFromThreadMetadata(
	metadata: Record<string, unknown> | undefined,
) {
	return getAgentPreviewTargetFromThreadMetadata(
		metadata,
		INSTANCE_AI_AGENT_PREVIEW_SESSION_METADATA_KEY,
	);
}

function getAgentPreviewTargetFromThreadMetadata(
	metadata: Record<string, unknown> | undefined,
	metadataKey: string,
) {
	const raw = metadata?.[metadataKey];
	if (!isRecord(raw)) return undefined;
	if (typeof raw.agentId !== 'string' || typeof raw.threadId !== 'string') return undefined;
	return { agentId: raw.agentId, threadId: raw.threadId };
}

/** The planned-task checklist the backend keeps in thread metadata. */
export function getTasksFromThreadMetadata(
	metadata: Record<string, unknown> | undefined,
): TaskList | null {
	const raw = metadata?.[INSTANCE_AI_TASKS_METADATA_KEY];
	if (raw === undefined) return null;
	const parsed = taskListSchema.safeParse(raw);
	return parsed.success && parsed.data.tasks.length > 0 ? parsed.data : null;
}

/**
 * The setup panel items per workflow, from thread metadata. The backend
 * re-inserts the latest announced workflow last, so key order is recency.
 */
export function getSetupItemsFromThreadMetadata(
	metadata: Record<string, unknown> | undefined,
): Record<string, InstanceAiSetupItem[]> {
	const raw = metadata?.[INSTANCE_AI_SETUP_ITEMS_METADATA_KEY];
	if (!isRecord(raw)) return {};
	const result: Record<string, InstanceAiSetupItem[]> = {};
	for (const [workflowId, items] of Object.entries(raw)) {
		if (!isSafeObjectKey(workflowId) || !Array.isArray(items)) continue;
		result[workflowId] = items as InstanceAiSetupItem[];
	}
	return result;
}

function findLatestTasksFromMessages(messages: InstanceAiMessage[]): TaskList | null {
	for (let i = messages.length - 1; i >= 0; i--) {
		const tasks = messages[i].agentTree?.tasks;
		if (tasks) return tasks;
	}
	return null;
}

function findToolCallById(
	messages: InstanceAiMessage[],
	predicate: (toolCall: InstanceAiToolCallState) => boolean,
): InstanceAiToolCallState | undefined {
	for (const message of messages) {
		const found = message.agentTree?.toolCalls.find(predicate);
		if (found) return found;
	}
	return undefined;
}

export type ThreadRuntime = ReturnType<typeof createThreadRuntime>;

/**
 * Per-thread state for the side panels of an n8n Assistant thread. The Agents
 * chat core owns the conversation, its stream and its history. This runtime
 * mirrors the chat messages (adapted to the Assistant message shape) so the
 * artifacts panel, the preview tabs, the to-do list and the setup panel can
 * read them, and it routes programmatic sends into the mounted chat.
 */
export function createThreadRuntime(
	threadId: string,
	hooks: ThreadRuntimeHooks,
	initialProjectId?: string,
) {
	const rootStore = useRootStore();
	const workflowsListStore = useWorkflowsListStore();
	const telemetry = useTelemetry();
	const i18n = useI18n();
	let readSetupChatTelemetryContext: (() => SetupChatTelemetryContext | undefined) | undefined;
	let chatSender: ThreadChatSender | undefined;

	function registerSetupChatTelemetryContext(reader: () => SetupChatTelemetryContext | undefined) {
		readSetupChatTelemetryContext = reader;
		return () => {
			if (readSetupChatTelemetryContext === reader) readSetupChatTelemetryContext = undefined;
		};
	}

	/** The mounted Agents chat registers here. Returns the unregister function. */
	function registerChatSender(sender: ThreadChatSender) {
		chatSender = sender;
		return () => {
			if (chatSender === sender) chatSender = undefined;
		};
	}

	// --- Reactive state ---
	const messages = ref<InstanceAiMessage[]>([]);
	const projectId = ref<string | undefined>(initialProjectId);
	const hydrationStatus = ref<'idle' | 'hydrating' | 'ready'>('idle');
	const agentsChatWorking = ref(false);
	const agentsChatAwaitingInput = ref(false);
	const pendingMessageCount = ref(0);
	/** Focused preview tab id while the artifacts preview is open. */
	const activeArtifactId = ref<string>();
	/**
	 * The tabs the thread view has open, sent to the agent with each message.
	 * `undefined` when no view reports tabs; the agent then gets every artifact.
	 * `null` while the view's stored tabs load; the message then carries no tabs,
	 * so the agent keeps the last tabs it has instead of closed ones.
	 */
	const openTabs = shallowRef<OpenThreadTab[] | null>();
	/** Resource references sent in this session, so their artifacts stay listed. */
	const sentAttachments = ref<InstanceAiAttachment[]>([]);

	// Workflow + execution the editor was showing at hand-off, to load once when
	// the artifact first opens. Transient: set right before navigation and
	// consumed by the workflow preview on mount.
	const pendingHandoff = ref<PendingHandoff | null>(null);
	function setPendingHandoff(value: PendingHandoff): void {
		pendingHandoff.value = value;
	}
	function consumePendingHandoff(
		workflowId: string,
	): Omit<PendingHandoff, 'workflowId'> | undefined {
		const pending = pendingHandoff.value;
		if (pending?.workflowId !== workflowId) return undefined;
		pendingHandoff.value = null;
		return { workflow: pending.workflow, execution: pending.execution };
	}

	/** Workflow stashed by a no-message hand-off; cleared after the first send. */
	const pendingWorkflowAttachment = ref<InstanceAiWorkflowAttachment | null>(null);
	function setPendingWorkflowAttachment(value: InstanceAiWorkflowAttachment | null): void {
		pendingWorkflowAttachment.value = value;
	}
	function clearPendingWorkflowAttachment(): void {
		pendingWorkflowAttachment.value = null;
	}
	const transientWorkflowReferences = reactive(
		new Map<string, TransientWorkflowArtifactReference>(),
	);
	function upsertTransientWorkflowReference(reference: TransientWorkflowArtifactReference): void {
		transientWorkflowReferences.set(reference.referenceId, { ...reference });
	}
	function removeTransientWorkflowReference(referenceId: string): void {
		transientWorkflowReferences.delete(referenceId);
	}

	// Latest user-triggered (non-agent) preview run per workflow. Lives here so it
	// survives the preview canvas unmounting on a tab switch (INS-611).
	const rememberedManualExecutions = new Map<string, RememberedManualExecution>();
	function rememberManualExecution(
		workflowId: string,
		executionId: string,
		agentExecutionId: string | undefined,
	): void {
		rememberedManualExecutions.set(workflowId, { executionId, agentExecutionId });
	}
	function getRememberedManualExecution(workflowId: string): RememberedManualExecution | undefined {
		return rememberedManualExecutions.get(workflowId);
	}
	function forgetManualExecution(workflowId: string): void {
		rememberedManualExecutions.delete(workflowId);
	}

	// Artifact logs panel auto-open bookkeeping. It lives here because the preview
	// remounts on every tab switch (INS-1192).
	const logsPanelMemory = {
		collapsedByUser: false,
		autoOpened: false,
		latestStartedExecutionIds: new Map<string, string>(),
	};

	const threadMetadata = () => hooks.getThreadMetadata?.(threadId);

	// --- Computeds ---
	const isStreaming = computed(() => agentsChatWorking.value);
	const isSendingMessage = computed(() => pendingMessageCount.value > 0);
	const isAwaitingConfirmation = computed(() => agentsChatAwaitingInput.value);
	const hasMessages = computed(() => messages.value.length > 0);
	const isHydratingThread = computed(() => hydrationStatus.value === 'hydrating');

	/** The registry reads resource references from messages; sent ones ride a synthetic row. */
	const registryMessages = computed<InstanceAiMessage[]>(() =>
		sentAttachments.value.length === 0
			? messages.value
			: [
					{
						id: 'sent-attachments',
						role: 'user',
						createdAt: new Date(0).toISOString(),
						content: '',
						reasoning: '',
						isStreaming: false,
						attachments: sentAttachments.value,
					},
					...messages.value,
				],
	);

	const {
		producedArtifacts,
		resourceNameIndex,
		linkableResourceNameIndex,
		producedArtifactOrigins,
		seedArtifactOrigins,
	} = useResourceRegistry(
		() => registryMessages.value,
		(id) => workflowsListStore.getWorkflowById(id)?.name,
		() => new Set<string>(),
		() => getAgentBuilderTargetFromThreadMetadata(threadMetadata()),
		() => {
			const pending = getPendingAgentTargetFromThreadMetadata(threadMetadata());
			return pending ? { ...pending, name: i18n.baseText('agents.new.defaultName') } : undefined;
		},
		() => pendingWorkflowAttachment.value ?? undefined,
		() => [...transientWorkflowReferences.values()],
		() => getAgentBuilderTargetsFromThreadMetadata(threadMetadata()),
	);

	/** The planned-task checklist from thread metadata, else the agent's own checklist. */
	const currentTasks = computed(
		() =>
			getTasksFromThreadMetadata(threadMetadata()) ?? findLatestTasksFromMessages(messages.value),
	);

	const setupItemsByWorkflowId = computed(() => getSetupItemsFromThreadMetadata(threadMetadata()));
	const latestSetupWorkflowId = computed(() => Object.keys(setupItemsByWorkflowId.value).at(-1));

	// --- Telemetry: 'User viewed new builder workflow' ---
	// Fires when the builder produces a workflow during a live turn. Re-hydrating
	// past messages or rebuilding the same workflow does not re-fire.
	const latestBuildResult = computed(() => {
		for (let i = messages.value.length - 1; i >= 0; i--) {
			const tree = messages.value[i].agentTree;
			if (tree) {
				const result = getLatestBuildResult(tree);
				if (result) return result;
			}
		}
		return null;
	});
	const reportedBuiltWorkflowIds = new Set<string>();

	watch(
		() => latestBuildResult.value?.toolCallId,
		(toolCallId) => {
			// Synchronous: the first sync assigns history and flips the hydration flag
			// in the same tick, so only a sync callback still sees it and skips history.
			if (!toolCallId || isHydratingThread.value) return;
			const workflowId = latestBuildResult.value?.workflowId;
			if (!workflowId || reportedBuiltWorkflowIds.has(workflowId)) return;
			reportedBuiltWorkflowIds.add(workflowId);
			telemetry.track('User viewed new builder workflow', {
				thread_id: threadId,
				instance_id: rootStore.instanceId,
				workflow_id: workflowId,
			});
		},
		{ flush: 'sync' },
	);

	function reportOnboardingExits(next: InstanceAiMessage[]): void {
		if (!hooks.onOnboardingLeft) return;
		for (const message of next) {
			for (const toolCall of message.agentTree?.toolCalls ?? []) {
				const outcome = ONBOARDING_EXIT_OUTCOMES.get(toolCall.toolName);
				if (!outcome) continue;
				const reason = toolCall.args.reason;
				hooks.onOnboardingLeft(threadId, outcome, typeof reason === 'string' ? reason : undefined);
				return;
			}
		}
	}

	function setActiveArtifactId(id?: string): void {
		activeArtifactId.value = id;
	}

	function setOpenTabs(tabs?: OpenThreadTab[] | null): void {
		openTabs.value = tabs;
	}

	/** The artifacts context the agent receives with each message. */
	function threadArtifactsContext() {
		if (openTabs.value === null) return undefined;
		return buildThreadArtifactsContext(
			producedArtifacts.values(),
			activeArtifactId.value,
			openTabs.value,
		);
	}

	function recordSentAttachments(attachments: readonly InstanceAiAttachment[]): void {
		const references = attachments.filter((attachment) => attachment.type !== 'file');
		if (references.length === 0) return;
		sentAttachments.value = [...sentAttachments.value, ...references];
	}

	/** Reset all state owned by this runtime. */
	function resetState(): void {
		hydrationStatus.value = 'idle';
		messages.value = [];
		activeArtifactId.value = undefined;
		openTabs.value = undefined;
		pendingWorkflowAttachment.value = null;
		sentAttachments.value = [];
		transientWorkflowReferences.clear();
		pendingHandoff.value = null;
		agentsChatWorking.value = false;
		agentsChatAwaitingInput.value = false;
	}

	/** The Agents chat is mounting: the panels wait for its first history load. */
	function enterAgentsChatMode(): void {
		if (messages.value.length === 0) hydrationStatus.value = 'hydrating';
	}

	/**
	 * Replace the mirrored messages with the latest Agents chat state. Messages
	 * are assigned before the hydration flag flips, so the synchronous preview
	 * watchers treat the first sync as history and do not auto-open past builds.
	 */
	function syncAgentsChat(next: InstanceAiMessage[], working: boolean, awaitingInput = false) {
		const wasReady = hydrationStatus.value === 'ready';
		messages.value = next;
		agentsChatWorking.value = working;
		agentsChatAwaitingInput.value = awaitingInput;
		hydrationStatus.value = 'ready';
		if (wasReady) reportOnboardingExits(next);
	}

	function setProjectId(id: string | undefined): void {
		projectId.value = id;
	}

	function dispose(): void {
		resetState();
		readSetupChatTelemetryContext = undefined;
		chatSender = undefined;
	}

	function resolveActionSource(): InstanceAiThreadSourcePersisted {
		const rawSource = threadMetadata()?.source;
		return isInstanceAiThreadSource(rawSource) ? rawSource : INSTANCE_AI_THREAD_SOURCE_FALLBACK;
	}

	function trackUserMessageSent(options: {
		authorship: InstanceAiMessageAuthorship;
		mentionCounts?: AssistantMentionCounts;
		attachmentCount?: number;
	}): void {
		const { authorship } = options;
		const isFirstMessage = !messages.value.some((m) => m.role === 'user');
		const isPrefill = authorship.kind === 'prefill';
		const setupContext =
			isPrefill && authorship.prefillType === 'handoff_setup_panel_execute'
				? undefined
				: readSetupChatTelemetryContext?.();
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_BUILDER_MESSAGE, {
			...setupContext,
			thread_id: threadId,
			instance_id: rootStore.instanceId,
			is_first_message: isFirstMessage,
			action_source: resolveActionSource(),
			// Explicit nulls so `prefill_type IS NULL` is a usable predicate.
			prefill_type: isPrefill ? authorship.prefillType : null,
			prefill_id: isPrefill ? (authorship.prefillId ?? null) : null,
			prompt_modified: isPrefill ? (authorship.promptModified ?? false) : null,
			mention_counts: options.mentionCounts ?? EMPTY_ASSISTANT_MENTION_COUNTS,
			attachment_count: options.attachmentCount ?? 0,
		});
	}

	/**
	 * Send a message n8n wrote (a hand-off, the setup panel, an offer) through the
	 * Agents chat. Without a mounted chat the message waits as the thread's
	 * pending first message, which the chat sends when it mounts.
	 *
	 * `authorship` is required so a new pre-fill surface cannot ship untagged.
	 */
	async function sendMessage(
		message: string,
		opts: {
			authorship: InstanceAiMessageAuthorship;
			attachments?: InstanceAiAttachment[];
			files?: File[];
			handoffContext?: InstanceAiHandoffContext;
			runTarget?: RunTarget;
			mentionCounts?: AssistantMentionCounts;
			mentionedWorkflowIds?: readonly string[];
			/** Accepted for call-site compatibility; the chat reads the push ref itself. */
			pushRef?: string;
		},
	): Promise<boolean> {
		const references = (opts.attachments ?? []).filter(
			(attachment): attachment is InstanceAiResourceAttachment => attachment.type !== 'file',
		);
		const payload: ThreadChatMessage = {
			message,
			...(references.length ? { attachments: references } : {}),
			...(opts.files?.length ? { files: opts.files } : {}),
			...(opts.handoffContext ? { handoffContext: opts.handoffContext } : {}),
			...optionalRunTarget(opts.runTarget),
		};
		seedArtifactOrigins(opts.mentionedWorkflowIds ?? [], 'mentioned');

		if (!chatSender) {
			stashPendingFirstMessage(threadId, {
				message,
				authorship: opts.authorship,
				...(references.length ? { attachments: references } : {}),
				...(opts.handoffContext ? { context: opts.handoffContext } : {}),
				...optionalRunTarget(opts.runTarget),
			});
			stashPendingFirstMessageFiles(threadId, opts.files ?? []);
			return true;
		}

		pendingMessageCount.value += 1;
		try {
			const sent = await chatSender(payload);
			if (sent) {
				trackUserMessageSent({
					authorship: opts.authorship,
					mentionCounts: opts.mentionCounts,
					attachmentCount: references.length + (opts.files?.length ?? 0),
				});
				recordSentAttachments(references);
			}
			return sent;
		} finally {
			pendingMessageCount.value = Math.max(0, pendingMessageCount.value - 1);
		}
	}

	/** Find a mirrored tool call by its id. */
	function findToolCall(toolCallId: string): InstanceAiToolCallState | undefined {
		return findToolCallById(messages.value, (toolCall) => toolCall.toolCallId === toolCallId);
	}

	/** Find a mirrored tool call by its confirmation request id. */
	function findToolCallByRequestId(requestId: string): InstanceAiToolCallState | undefined {
		return findToolCallById(
			messages.value,
			(toolCall) =>
				toolCall.confirmation?.requestId === requestId || toolCall.toolCallId === requestId,
		);
	}

	return reactive({
		id: threadId,

		// state refs
		messages,
		projectId,
		hydrationStatus,
		pendingMessageCount,
		activeArtifactId,

		// computeds
		isStreaming,
		isSendingMessage,
		isAwaitingConfirmation,
		hasMessages,
		isHydratingThread,
		producedArtifacts,
		resourceNameIndex,
		linkableResourceNameIndex,
		producedArtifactOrigins,
		currentTasks,
		setupItemsByWorkflowId,
		latestSetupWorkflowId,

		// actions
		setActiveArtifactId,
		setOpenTabs,
		threadArtifactsContext,
		recordSentAttachments,
		setPendingHandoff,
		consumePendingHandoff,
		pendingWorkflowAttachment,
		setPendingWorkflowAttachment,
		clearPendingWorkflowAttachment,
		transientWorkflowReferences,
		upsertTransientWorkflowReference,
		removeTransientWorkflowReference,
		rememberManualExecution,
		getRememberedManualExecution,
		forgetManualExecution,
		logsPanelMemory,
		resetState,
		dispose,
		enterAgentsChatMode,
		syncAgentsChat,
		setProjectId,
		registerSetupChatTelemetryContext,
		registerChatSender,
		trackUserMessageSent,
		resolveActionSource,
		sendMessage,
		findToolCall,
		findToolCallByRequestId,
		seedArtifactOrigins,
	});
}
