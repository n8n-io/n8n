<script lang="ts" setup>
import {
	computed,
	nextTick,
	onMounted,
	onUnmounted,
	ref,
	shallowReactive,
	useTemplateRef,
	watch,
} from 'vue';
import { storeToRefs } from 'pinia';
import { N8nChatMessage, N8nIconButton, N8nScrollArea, N8nText } from '@n8n/design-system';
import { useScroll } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import {
	INSTANCE_AI_MAX_ATTACHMENTS,
	type InstanceAiAgentAttachment,
	type InstanceAiAttachment,
	type InstanceAiHandoffContext,
	type InstanceAiResourceAttachment,
} from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
// Experiment cleanup: remove with openWorkflowInAssistant.
import { useOpenWorkflowInAssistantStore } from '@/experiments/openWorkflowInAssistant/stores/openWorkflowInAssistant.store';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { countAttachedNodes } from '../utils/buildNodesAttachment';
import { useToast } from '@n8n/composables/useToast';
import { ResponseError } from '@n8n/rest-api-client';
import { useThread, useInstanceAiStore } from '../instanceAi.store';
import { getAgentBuilderTargetFromThreadMetadata } from '../instanceAi.threadRuntime';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { isPendingItemFloating } from '../confirmationKinds';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';
import { useCreditWarningBanner } from '../composables/useCreditWarningBanner';
import { useBuildingArtifactIds } from '../composables/useBuildingArtifactIds';
import {
	clearPendingAgentAttachment,
	clearPendingWorkflowAttachment as clearStashedWorkflowAttachment,
	consumePendingDraftAttachment,
	clearPendingComposerDraft,
	clearPendingHandoffContext,
	clearPendingThreadHandoff,
	consumePendingMentionDraft,
	consumePendingFirstMessage,
	consumePendingRedirectLanding,
	getPendingAgentAttachment,
	getPendingComposerDraft,
	getPendingHandoffContext,
	getPendingWorkflowAttachment,
	stashPendingComposerDraft,
	stashPendingFirstMessage,
	stashPendingHandoffContext,
	type PendingComposerDraft,
	type PendingMentionDraft,
} from '../composables/useInstanceAiHandoff';
import type { InstanceAiMessageAuthorship } from '../prefills';
import { INSTANCE_AI_AGENT_PREVIEW_VIEW_METADATA_KEY } from '../constants';
import {
	agentPreviewContextIcon,
	formatAgentPreviewContextLabel,
	getDismissedContextKeys,
	handoffContextKey,
} from '../instanceAi.handoffContext';
import InstanceAiMessage from './InstanceAiMessage.vue';
import InstanceAiInput from './InstanceAiInput.vue';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';
import AttachmentPreview from './AttachmentPreview.vue';
import InstanceAiStatusBar from './InstanceAiStatusBar.vue';
import InstanceAiConfirmationPanel from './InstanceAiConfirmationPanel.vue';
import WorkflowBuilderUnavailableNotice from './WorkflowBuilderUnavailableNotice.vue';
import AgentSection from './AgentSection.vue';
import { collectActiveBuilderAgents, messageHasVisibleContent } from '../builderAgents';
import CreditWarningBanner from '@/features/ai/assistant/components/Agent/CreditWarningBanner.vue';

const props = withDefaults(
	defineProps<{
		/** Runs before every send (e.g. flush a pending autosave). Rejecting cancels the send. */
		beforeSend?: () => Promise<void>;
		enableMentions?: boolean;
	}>(),
	{ beforeSend: undefined, enableMentions: false },
);

const emit = defineEmits<{
	'thread-missing': [];
	'agent-attachment-restored': [attachment: InstanceAiAgentAttachment];
	'mention-workflow-selected': [workflowId: string];
}>();

defineSlots<{
	'above-input'?: () => unknown;
	'inline-offers'?: () => unknown;
}>();

const store = useInstanceAiStore();
const settingsStore = useInstanceAiSettingsStore();
// Injected: the host (InstanceAiThreadView, or an embedding panel) provides the thread.
// Remount contract: this component has no threadId prop — the host must key it by
// thread id (e.g. `:key="threadId"`) so switching threads remounts it with a fresh runtime.
// Hosts must provide the runtime via `provideThread(threadId)` (store-registered):
// `isCurrentThreadRuntime()` compares against `store.getRuntime(thread.id)` to detect a
// disposed/recreated runtime, so an unregistered runtime object would never connect.
const thread = useThread();
const buildingWorkflowIds = useBuildingArtifactIds(thread);
const { showCreditWarning, quotaLocked } = storeToRefs(store);
const rootStore = useRootStore();
const i18n = useI18n();
const toast = useToast();
const telemetry = useTelemetry();
const { goToUpgrade } = usePageRedirectionHelper();
const creditBanner = useCreditWarningBanner(showCreditWarning);

const pendingComposerContext = ref<InstanceAiHandoffContext | null>(null);
const pendingComposerDraft = ref<PendingComposerDraft | null>(null);
const pendingMentionDraft = ref<PendingMentionDraft | null>(null);
const generatedComposerDraft = ref<string | null>(null);
const pendingAgentAttachment = ref<InstanceAiAgentAttachment | null>(null);
const currentAgentAttachment = computed<InstanceAiAgentAttachment | null>(() => {
	const queued = pendingAgentAttachment.value;
	if (!queued) return null;

	const boundTarget = getAgentBuilderTargetFromThreadMetadata(store.getThreadMetadata(thread.id));
	if (
		boundTarget?.agentId !== queued.id ||
		boundTarget.projectId !== queued.projectId ||
		!queued.pending
	) {
		return queued;
	}

	const name = boundTarget.name ?? queued.name;
	return {
		type: 'agent',
		id: queued.id,
		projectId: queued.projectId,
		...(name ? { name } : {}),
	};
});
const durableWorkflowIds = computed(
	() =>
		new Set(
			[...thread.producedArtifacts.values()]
				.filter((artifact) => artifact.type === 'workflow')
				.map((artifact) => artifact.id),
		),
);
const reservedComposerAttachments = computed(
	() =>
		Number(currentAgentAttachment.value !== null) +
		Number(
			thread.pendingWorkflowAttachment !== null &&
				!thread.draftMentions.some(
					(mention) =>
						mention.target.kind === 'workflow' &&
						mention.target.workflowId === thread.pendingWorkflowAttachment?.id,
				),
		),
);

// Running builders render in a dedicated bottom section of the conversation.
// Once a builder finishes it falls out of this list and AgentTimeline renders
// it in its natural chronological slot.
const builderAgents = computed(() => collectActiveBuilderAgents(thread.messages));

// Assistant messages whose only content has been extracted to the bottom
// builder section (or which haven't produced anything renderable yet) would
// otherwise leave an empty wrapper in the list — filter them out.
// Reconciled in place: spliced only when membership changes, so streamed
// tokens don't re-render the list.
const displayedMessages = shallowReactive<typeof thread.messages>([]);
watch(
	() => thread.messages.filter(messageHasVisibleContent),
	(next) => {
		const unchanged =
			next.length === displayedMessages.length &&
			next.every((msg, i) => msg === displayedMessages[i]);
		if (!unchanged) displayedMessages.splice(0, displayedMessages.length, ...next);
	},
	{ immediate: true },
);

// Show the input disclaimer only once the AI has produced a visible response.
const hasAssistantResponse = computed(() => displayedMessages.some((m) => m.role === 'assistant'));

// True when at least one pending confirmation should occupy the chat-input
// slot (questions, generic approvals, or domain/web-search access). Drives
// the swap between the input and the floating confirmation panel.
const hasFloatingConfirmation = computed(() =>
	thread.pendingConfirmations.some(isPendingItemFloating),
);

const composerContextChip = computed(() => {
	const agentAttachment = currentAgentAttachment.value;
	if (agentAttachment && pendingComposerContext.value?.source !== 'agent-preview') {
		return {
			type: 'agent-artifact' as const,
			agentId: agentAttachment.id,
			projectId: agentAttachment.projectId,
			isNewAgent:
				pendingAgentAttachment.value?.id === agentAttachment.id &&
				pendingAgentAttachment.value.pending === true,
			key: `pending-agent:${agentAttachment.id}`,
			label: agentAttachment.name ?? i18n.baseText('agents.new.defaultName'),
			icon: 'robot',
			isPending: true,
		};
	}

	const workflowAttachment = thread.pendingWorkflowAttachment;
	if (workflowAttachment) {
		return {
			type: 'workflow-artifact' as const,
			workflowId: workflowAttachment.id,
			key: `pending-workflow:${workflowAttachment.id}`,
			label:
				workflowAttachment.name ?? i18n.baseText('instanceAi.workflowHandoff.untitledWorkflow'),
			icon: 'workflow',
			isPending: true,
		};
	}

	if (pendingComposerContext.value?.source === 'agent-preview') {
		return {
			type: 'agent-preview-session' as const,
			agentId: pendingComposerContext.value.agentId,
			threadId: pendingComposerContext.value.threadId,
			executionId: pendingComposerContext.value.executionId,
			key: handoffContextKey(pendingComposerContext.value),
			label: formatAgentPreviewContextLabel(
				pendingComposerContext.value,
				(textKey, options) => i18n.baseText(textKey, options),
				thread.producedArtifacts.get(pendingComposerContext.value.agentId)?.name,
			),
			icon: agentPreviewContextIcon(pendingComposerContext.value.agentIcon),
			isPending: true,
		};
	}

	const dismissedKeys = new Set(getDismissedContextKeys(store.getThreadMetadata(thread.id)));
	for (const message of [...thread.messages].reverse()) {
		if (message.role !== 'user' || message.context?.source !== 'agent-preview') continue;

		const key = handoffContextKey(message.context);
		if (dismissedKeys.has(key)) continue;

		return {
			type: 'agent-preview-session' as const,
			agentId: message.context.agentId,
			threadId: message.context.threadId,
			executionId: message.context.executionId,
			key,
			label: formatAgentPreviewContextLabel(
				message.context,
				(textKey, options) => i18n.baseText(textKey, options),
				thread.producedArtifacts.get(message.context.agentId)?.name,
			),
			icon: agentPreviewContextIcon(message.context.agentIcon),
			isPending: false,
		};
	}

	return null;
});

const workflowHandoffGreeting = computed(() => {
	const attachment = thread.pendingWorkflowAttachment;
	if (!attachment || thread.isHydratingThread || thread.hasMessages) return null;
	// Plain name: the pending attachment is registered as linkable, so the
	// markdown renderer turns it into a resource chip.
	const name = attachment.name ?? i18n.baseText('instanceAi.workflowHandoff.untitledWorkflow');
	return i18n.baseText('instanceAi.workflowHandoff.greeting', {
		interpolate: { workflow: name },
	});
});

const workflowHandoffAttachment = computed(() => {
	if (!workflowHandoffGreeting.value) return null;
	return thread.pendingWorkflowAttachment;
});

// --- Scroll management ---
const scrollableRef = useTemplateRef<HTMLElement>('scrollable');
// The actual scroll container is the reka-ui viewport inside N8nScrollArea,
// NOT the immediate parent (which is a non-scrolling content wrapper).
const scrollContainerRef = computed(
	() =>
		(scrollableRef.value?.closest('[data-reka-scroll-area-viewport]') as HTMLElement | null) ??
		null,
);
const { arrivedState } = useScroll(scrollContainerRef, {
	throttle: 100,
	offset: { bottom: 100 },
});
const userScrolledUp = ref(false);

watch(
	() => arrivedState.bottom,
	(atBottom) => {
		userScrolledUp.value = !atBottom;
	},
);

function scrollToBottom(smooth = false) {
	const container = scrollContainerRef.value;
	if (container) {
		container.scrollTo({
			top: container.scrollHeight,
			behavior: smooth ? 'smooth' : 'instant',
		});
	}
}

// Auto-scroll when content height changes (handles text deltas, tool calls,
// sub-agent spawns, results, etc. — anything that grows the DOM).
let contentResizeObserver: ResizeObserver | null = null;

watch(
	scrollableRef,
	(el) => {
		contentResizeObserver?.disconnect();
		if (el) {
			contentResizeObserver = new ResizeObserver(() => {
				if (!userScrolledUp.value) {
					scrollToBottom();
				}
			});
			contentResizeObserver.observe(el);
		}
	},
	{ immediate: true },
);

// --- Chat input ref for auto-focus ---
const chatInputRef = ref<InstanceType<typeof InstanceAiInput> | null>(null);

function focusChatInputIfFocusIsIdle() {
	const activeElement = document.activeElement;
	if (
		activeElement instanceof HTMLElement &&
		activeElement !== document.body &&
		activeElement !== document.documentElement
	) {
		return;
	}

	chatInputRef.value?.focus();
}

// Focus input on initial render (ref rebinds when messages load)
watch(chatInputRef, (el) => {
	if (el) {
		void nextTick(focusChatInputIfFocusIsIdle);
	}
});

watch(
	() => store.composerFocusRequest,
	() => {
		void nextTick(() => chatInputRef.value?.focus());
	},
);

watch(
	[chatInputRef, pendingComposerDraft, () => thread.pendingPlanReview],
	([input, draft, planReview]) => {
		if (!input || !draft || planReview) return;
		input.setPrefill({ text: draft.text, prefillType: draft.prefillType });
		generatedComposerDraft.value = draft.text;
		pendingComposerDraft.value = null;
		void nextTick(focusChatInputIfFocusIsIdle);
	},
);

watch([chatInputRef, pendingMentionDraft], ([input, draft]) => {
	if (!input || !draft) return;
	input.setText(draft.text);
	void nextTick(() => {
		input.setSelection(draft.selectionStart, draft.selectionEnd);
		input.focus();
	});
	pendingMentionDraft.value = null;
});

function isCurrentThreadRuntime(): boolean {
	return store.getRuntime(thread.id) === thread;
}

function restorePendingHandoffAttachments(): void {
	const agentAttachment = getPendingAgentAttachment(thread.id);
	if (agentAttachment) {
		pendingAgentAttachment.value = agentAttachment;
		emit('agent-attachment-restored', agentAttachment);
	}
	const workflowAttachment = getPendingWorkflowAttachment(thread.id);
	if (workflowAttachment) {
		thread.setPendingWorkflowAttachment(workflowAttachment);
	}
}

function reconnectThreadAfterHydration(): void {
	const draftAttachment = consumePendingDraftAttachment(thread.id);
	if (draftAttachment) store.stageNodeSets(draftAttachment.workflowId, draftAttachment.sets);
	void thread.loadHistoricalMessages().then(async (hydrationStatus) => {
		if (hydrationStatus === 'stale') return;
		await thread.loadThreadStatus();
		if (!isCurrentThreadRuntime()) return;
		thread.connectSSE();
		// Replay an opening message handed off from another tab (e.g. credential help
		// opened in a new tab) as if typed here, so it shows and streams in this runtime.
		const pending = consumePendingFirstMessage(thread.id);
		if (pending) {
			void thread
				.sendMessage(pending.message, {
					authorship: pending.authorship,
					attachments: pending.attachments,
					pushRef: rootStore.pushRef,
					handoffContext: pending.context,
				})
				.then((sent) => {
					if (sent) return;
					// Consuming already removed it, so a refused send (e.g. a concurrency cap)
					// would otherwise discard a message the user typed in another tab. Put it
					// back so the next mount replays it -- but only while there is still a
					// thread to replay it into, otherwise the payload would be stranded in
					// localStorage for a thread that no longer exists.
					if (!store.threads.some((t) => t.id === thread.id)) return;
					stashPendingFirstMessage(thread.id, pending);
				});
		}
		// Experiment cleanup: remove with openWorkflowInAssistant. A stashed first
		// message or a workflow-list auto marker is the one-shot landing signal.
		const landedFromRedirect = consumePendingRedirectLanding(thread.id);
		if (pending || landedFromRedirect) {
			useOpenWorkflowInAssistantStore().handleRedirectLanding(thread.id);
		}
	});
}

// Validate the thread id against the loaded thread list, then connect this
// runtime. The host remounts this component on thread changes, so no
// store-level "active thread" state is needed here.
async function syncThread() {
	const requestedThreadId = thread.id;
	// Apply preview/credential composer state synchronously so a quick first
	// submit cannot race past it while the thread list is still loading.
	pendingComposerContext.value = getPendingHandoffContext(requestedThreadId);
	pendingComposerDraft.value = getPendingComposerDraft(requestedThreadId);
	const mentionDraft = consumePendingMentionDraft(requestedThreadId);
	if (mentionDraft) {
		thread.setDraftMentions(mentionDraft.mentions);
		pendingMentionDraft.value = mentionDraft;
	}
	// Apply editor hand-off attachments before any await so a first submit
	// cannot race past them, including when SSE is already connected.
	restorePendingHandoffAttachments();
	// The history list is paginated, so an unknown id is resolved on its own
	// rather than by loading the whole list.
	if (!store.threads.some((t) => t.id === requestedThreadId)) {
		try {
			await store.loadThread(requestedThreadId);
		} catch (error) {
			// The host may have moved on (remount per thread) while we awaited.
			if (!isCurrentThreadRuntime()) return;
			if (
				error instanceof ResponseError &&
				(error.httpStatusCode === 403 || error.httpStatusCode === 404)
			) {
				clearPendingThreadHandoff(requestedThreadId);
				emit('thread-missing');
			} else {
				toast.showError(error, i18n.baseText('generic.error'));
			}
			return;
		}
	}
	if (!isCurrentThreadRuntime()) return;
	if (thread.sseState === 'disconnected') {
		reconnectThreadAfterHydration();
	}
}

onMounted(() => {
	void syncThread();
	void nextTick(focusChatInputIfFocusIsIdle);
});

onUnmounted(() => {
	contentResizeObserver?.disconnect();
});

/**
 * Hand a refused submission back to the composer. Its own restore returns the
 * text, the attachments and the pre-fill provenance together -- so a retry stays
 * attributed to the surface that wrote the draft -- and declines when the user
 * has already typed something newer.
 */
function restoreFailedSubmission(restoreDraft: () => boolean) {
	restoreDraft();
}

/**
 * A plan change request is in flight. `confirmAction` never touches the send
 * counter, so without this the composer stays live for the round trip and a
 * second Enter is dropped by the runtime's duplicate guard without a trace.
 */
const isPlanChangeInFlight = computed(() => {
	const requestId = thread.pendingPlanReview?.requestId;
	return requestId !== undefined && thread.updatingPlanRequestIds.has(requestId);
});

// --- Message handlers ---
async function handleSubmit(
	message: string,
	attachments: InstanceAiAttachment[] | undefined,
	restoreDraft: () => boolean,
	authorship: InstanceAiMessageAuthorship,
) {
	if (!settingsStore.isWorkflowBuilderAvailable) {
		return;
	}

	if (props.beforeSend) {
		try {
			await props.beforeSend();
		} catch {
			// The caller's own flow (e.g. a failed autosave) already surfaced its
			// error — put the draft back and stop, same as a refused send below.
			restoreDraft?.();
			return;
		}
		// The host may have disposed this runtime (e.g. closed the panel) while
		// `beforeSend` was pending — don't send into a thread that's gone.
		if (!isCurrentThreadRuntime()) return;
	}

	// Reset scroll on new user message
	userScrolledUp.value = false;

	// While a plan review is pending every message is feedback on that plan —
	// the user does not have to click "Ask for edits" first.
	const planReview = thread.pendingPlanReview;
	if (planReview) {
		void thread.requestPlanChanges(planReview.requestId, message).then((sent) => {
			if (!sent) {
				restoreFailedSubmission(restoreDraft);
				return;
			}
			// Only an accepted request revises the plan. Tracking up front would
			// also count a dropped or failed submit the run never saw.
			telemetry.track('User finished providing input', {
				thread_id: thread.id,
				input_thread_id: planReview.inputThreadId ?? '',
				instance_id: rootStore.instanceId,
				type: 'plan-review',
				provided_inputs: [
					{
						label: 'plan',
						options: ['approve', 'ask-for-edits', 'deny'],
						option_chosen: 'ask-for-edits',
					},
				],
				skipped_inputs: [],
				num_tasks: planReview.taskCount,
				feedback: scrubSecretsInText(message),
				plan_feedback_type: 'changes_requested',
			});
		});
		return;
	}

	const handoffContext = pendingComposerContext.value ?? undefined;
	const submittedGeneratedDraft = generatedComposerDraft.value;
	const queuedAgentAttachment = pendingAgentAttachment.value;
	const agentAttachment = currentAgentAttachment.value;
	const queuedWorkflowAttachment = thread.pendingWorkflowAttachment;
	// The queued hand-off resources ride the first real prompt. A workflow the
	// composer already attached is not added twice.
	const extraAttachments: InstanceAiAttachment[] = [];
	if (agentAttachment) extraAttachments.push(agentAttachment);
	if (
		queuedWorkflowAttachment &&
		!attachments?.some(
			(attachment) =>
				attachment.type === 'workflow' && attachment.id === queuedWorkflowAttachment.id,
		)
	) {
		extraAttachments.push(queuedWorkflowAttachment);
	}
	const submittedAttachments =
		extraAttachments.length > 0 ? [...(attachments ?? []), ...extraAttachments] : attachments;
	if ((submittedAttachments?.length ?? 0) > INSTANCE_AI_MAX_ATTACHMENTS) {
		toast.showError(
			new Error(i18n.baseText('instanceAi.mentions.limit.attachments')),
			i18n.baseText('instanceAi.mentions.limit.title'),
		);
		restoreFailedSubmission(restoreDraft);
		return;
	}

	const nodeCount = countAttachedNodes(attachments);
	const submittedMentions = [...thread.draftMentions];
	let acceptedResourceAttachments: InstanceAiResourceAttachment[] | undefined;

	void thread
		.sendMessage(message, {
			authorship,
			attachments: submittedAttachments,
			pushRef: rootStore.pushRef,
			handoffContext,
			...(submittedMentions.length > 0
				? {
						onAcceptedResourceAttachments: (
							accepted: InstanceAiResourceAttachment[] | undefined,
						) => {
							acceptedResourceAttachments = accepted;
						},
					}
				: {}),
		})
		.then((sent) => {
			if (!sent) {
				restoreFailedSubmission(restoreDraft);
				return;
			}
			thread.setDraftMentions([]);
			if (submittedMentions.length > 0 && acceptedResourceAttachments !== undefined) {
				telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_CHAT_MESSAGE_WITH_MENTIONS, {
					mention_count: submittedMentions.length,
					workflow_count: submittedMentions.filter((mention) => mention.target.kind === 'workflow')
						.length,
					node_count: submittedMentions.filter((mention) => mention.target.kind === 'node').length,
					canvas_group_count: submittedMentions.filter(
						(mention) => mention.target.kind === 'canvas-group',
					).length,
				});
			}
			// Track message-with-nodes only after a successful send, so failed
			// sends and retries don't inflate the node-count metric.
			if (nodeCount > 0) {
				telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_CHAT_MESSAGE_WITH_NODES, {
					node_count: nodeCount,
				});
			}
			// Clear the canvas selection only once the send succeeded — clearing it
			// up front loses the selection on a failed send that the user retries.
			if (submittedAttachments?.some((a) => a.type === 'nodes')) {
				store.requestClearCanvasSelection();
			}
			const isCurrentHandoff = !handoffContext || pendingComposerContext.value === handoffContext;
			const isCurrentDraft =
				!submittedGeneratedDraft || generatedComposerDraft.value === submittedGeneratedDraft;
			if ((handoffContext || submittedGeneratedDraft) && isCurrentHandoff && isCurrentDraft) {
				clearPendingHandoffContext(thread.id);
				clearPendingComposerDraft(thread.id);
				if (handoffContext) pendingComposerContext.value = null;
				if (submittedGeneratedDraft) generatedComposerDraft.value = null;
			}
			if (queuedAgentAttachment && pendingAgentAttachment.value === queuedAgentAttachment) {
				clearPendingAgentAttachment(thread.id);
				pendingAgentAttachment.value = null;
			}
			if (queuedWorkflowAttachment) {
				// Clear the stash by id even if leaving the thread disposed the runtime
				// (and its pending attachment) before this callback ran.
				if (getPendingWorkflowAttachment(thread.id)?.id === queuedWorkflowAttachment.id) {
					clearStashedWorkflowAttachment(thread.id);
				}
				if (thread.pendingWorkflowAttachment?.id === queuedWorkflowAttachment.id) {
					thread.clearPendingWorkflowAttachment();
				}
			}
		});
}

function handleStop() {
	void thread.cancelRun();
}

function clearGeneratedDraft() {
	const draft = generatedComposerDraft.value;
	if (draft) chatInputRef.value?.clearTextIfMatches(draft);
	clearPendingComposerDraft(thread.id);
	pendingComposerDraft.value = null;
	generatedComposerDraft.value = null;
}

/** Body of the former assistant-handoff handler, once the host's own guards pass. */
function applyHandoff(context: InstanceAiHandoffContext, initialDraft?: PendingComposerDraft) {
	stashPendingHandoffContext(thread.id, context);
	pendingComposerContext.value = context;

	if (context.source === 'agent-preview') {
		void store
			.updateThreadMetadata(thread.id, {
				[INSTANCE_AI_AGENT_PREVIEW_VIEW_METADATA_KEY]: {
					agentId: context.agentId,
					threadId: context.threadId,
				},
			})
			.catch((error: unknown) => {
				toast.showError(error, i18n.baseText('generic.error'));
			});
	}

	if (initialDraft) {
		stashPendingComposerDraft(thread.id, initialDraft);
		pendingComposerDraft.value = initialDraft;
	} else {
		clearGeneratedDraft();
	}

	if (!thread.pendingPlanReview) {
		void nextTick(() => chatInputRef.value?.focus());
	}
}

function clearPendingComposerHandoff() {
	const draft = generatedComposerDraft.value ?? pendingComposerDraft.value?.text;
	if (draft) chatInputRef.value?.clearTextIfMatches(draft);
	pendingComposerDraft.value = null;
	generatedComposerDraft.value = null;
	pendingComposerContext.value = null;
	clearPendingHandoffContext(thread.id);
	clearPendingComposerDraft(thread.id);
}

/** Exposed for the host to re-provide to sibling panels (e.g. the artifacts panel). */
function dismissPendingComposerContext(key: string): boolean {
	const context = pendingComposerContext.value;
	if (!context || handoffContextKey(context) !== key) return false;
	clearPendingComposerHandoff();
	return true;
}

async function dismissComposerContextChip() {
	if (!composerContextChip.value) return;

	if (pendingAgentAttachment.value && pendingComposerContext.value?.source !== 'agent-preview') {
		clearPendingAgentAttachment(thread.id);
		pendingAgentAttachment.value = null;
		return;
	}

	if (composerContextChip.value.type === 'workflow-artifact') {
		clearStashedWorkflowAttachment(thread.id);
		thread.clearPendingWorkflowAttachment();
		return;
	}

	if (composerContextChip.value.isPending) {
		clearPendingComposerHandoff();
		return;
	}

	const dismissedKeys = new Set(getDismissedContextKeys(store.getThreadMetadata(thread.id)));
	dismissedKeys.add(composerContextChip.value.key);
	await store.updateThreadMetadata(thread.id, {
		dismissedContextKeys: [...dismissedKeys],
	});
}

function isDirty(): boolean {
	return chatInputRef.value?.isDirty() ?? false;
}

/** So a host-triggered send (e.g. the "fix with AI" offer) re-follows new messages. */
function resetScroll() {
	userScrolledUp.value = false;
}

defineExpose({
	isDirty,
	applyHandoff,
	dismissPendingComposerContext,
	resetScroll,
	// Read by the host for panels that sit beside (not inside) the conversation.
	pendingComposerContext,
});
</script>

<template>
	<div :class="$style.chatContent">
		<N8nScrollArea as-child type="auto" :class="$style.scrollArea">
			<div ref="scrollable" :class="$style.scrollContent">
				<div :class="$style.messageList">
					<!-- Mirrors the old empty opener: a user bubble with only the
					     workflow chip, then the static assistant greeting. -->
					<N8nChatMessage
						v-if="workflowHandoffAttachment"
						role="user"
						data-test-id="instance-ai-workflow-handoff-attachment"
					>
						<AttachmentPreview :attachment="workflowHandoffAttachment" :is-removable="false" />
					</N8nChatMessage>
					<N8nChatMessage
						v-if="workflowHandoffGreeting"
						role="assistant"
						data-test-id="instance-ai-workflow-handoff-greeting"
					>
						<N8nText size="large">
							<InstanceAiMarkdown :content="workflowHandoffGreeting" />
						</N8nText>
					</N8nChatMessage>
					<TransitionGroup name="message-slide">
						<InstanceAiMessage
							v-for="message in displayedMessages"
							:key="message.id"
							:message="message"
						/>
					</TransitionGroup>
					<!-- Builder sub-agents are extracted from their parent assistant
	     messages and rendered here so they always sit at the bottom
	     of the conversation. -->
					<div v-if="builderAgents.length" :class="$style.builderAgents">
						<AgentSection
							v-for="builder in builderAgents"
							:key="builder.agentId"
							:agent-node="builder"
						/>
					</div>
					<!-- Inline confirmations (plan review, text, setup, credential,
						 gateway resource-decision, continue) render in
						 the chat flow. Floating-eligible items take over the chat
						 input slot below instead - see `hasFloatingConfirmation`. -->
					<InstanceAiConfirmationPanel kind="inline" />

					<slot name="inline-offers" />

					<!-- Live activity indicator. Sits at the very end of the
						 conversation flow — below any pending questions/confirmations
						 and not pinned above the input — so it trails the active
						 content and scrolls away when reading back. -->
					<InstanceAiStatusBar />
				</div>

				<!-- Floating input slot - replaced by the confirmation panel while a
					 floating interaction is pending. The credit banner stays
					 anchored above the slot in both states. The leaving child is
					 positioned absolutely during the cross-fade so the in-flow child
					 can size the slot to its natural height. -->
				<div :class="$style.inputDock">
					<!-- Scroll to bottom button -->
					<div :class="$style.scrollButtonContainer">
						<Transition name="scroll-button-fade">
							<N8nIconButton
								v-if="userScrolledUp && thread.hasMessages"
								variant="outline"
								icon="arrow-down"
								size="large"
								icon-size="large"
								:class="$style.scrollToBottomButton"
								@click="
									scrollToBottom(true);
									userScrolledUp = false;
								"
							/>
						</Transition>
					</div>

					<div :class="$style.inputContainer">
						<div :class="$style.inputConstraint">
							<WorkflowBuilderUnavailableNotice v-if="!settingsStore.isWorkflowBuilderAvailable" />
							<CreditWarningBanner
								v-if="creditBanner.visible.value"
								:credits-remaining="store.creditsRemaining"
								:credits-quota="store.creditsQuota"
								:amounts-hidden="quotaLocked"
								@upgrade-click="goToUpgrade('instance-ai', 'upgrade-instance-ai')"
								@dismiss="creditBanner.dismiss()"
							/>
							<slot name="above-input" />
							<div :class="$style.inputSwap">
								<Transition name="input-swap">
									<InstanceAiConfirmationPanel
										v-if="hasFloatingConfirmation"
										key="floating-confirmation"
										kind="floating"
									/>
									<InstanceAiInput
										v-else
										ref="chatInputRef"
										key="chat-input"
										:is-streaming="thread.isStreaming"
										:is-submitting="thread.isSendingMessage || isPlanChangeInFlight"
										:is-awaiting-confirmation="thread.isAwaitingConfirmation"
										:is-awaiting-plan-review="thread.pendingPlanReview !== null"
										:is-workflow-builder-available="settingsStore.isWorkflowBuilderAvailable"
										:current-thread-id="thread.id"
										:amend-context="thread.amendContext"
										:context-chip="composerContextChip"
										:contextual-suggestion="thread.contextualSuggestion"
										:enable-mentions="props.enableMentions"
										:project-id="thread.projectId"
										:draft-mentions="thread.draftMentions"
										:durable-workflow-ids="durableWorkflowIds"
										:building-workflow-ids="buildingWorkflowIds"
										:reserved-attachment-count="reservedComposerAttachments"
										@update:draft-mentions="thread.setDraftMentions"
										@mention-workflow-selected="emit('mention-workflow-selected', $event)"
										@submit="handleSubmit"
										@stop="handleStop"
										@dismiss-context-chip="dismissComposerContextChip"
									/>
								</Transition>
							</div>
							<p v-if="hasAssistantResponse" :class="$style.disclaimer">
								{{ i18n.baseText('instanceAi.input.disclaimer') }}
							</p>
						</div>
					</div>
				</div>
			</div>
		</N8nScrollArea>
	</div>
</template>

<style lang="scss" module>
@property --instance-ai-artifacts-layout-width {
	syntax: '<length>';
	inherits: true;
	initial-value: 0;
}

.chatContent {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	position: relative;
}

.scrollArea {
	flex: 1;
	// Allow flex item to shrink below content size so reka-ui viewport scrolls
	min-height: 0;

	:global([data-orientation='vertical'][data-orientation='vertical']) {
		background: transparent;
		padding: 0;
		// Sit above the sticky input dock (z-index: 3) so its gradient doesn't cover the scrollbar
		z-index: 4;
	}

	:global([data-orientation='vertical'][data-orientation='vertical'] > *) {
		background: light-dark(var(--color--neutral-400), var(--color--neutral-600));

		&:hover {
			background: light-dark(var(--color--neutral-500), var(--color--neutral-500));
		}
	}
}

.scrollContent {
	width: 100%;
	min-height: 100%;
	display: flex;
	flex-direction: column;
}

.messageList {
	width: calc(100% - var(--instance-ai-artifacts-layout-width));
	max-width: 800px;
	margin: 0 auto;
	padding: var(--spacing--sm) var(--spacing--lg);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	transform: translateX(calc(var(--instance-ai-artifacts-layout-width) / -2));
}

.builderAgents {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--xs);
}

.inputDock {
	position: sticky;
	bottom: 0;
	margin-top: auto;
	z-index: 3;
	pointer-events: none;
}

.scrollButtonContainer {
	display: flex;
	justify-content: center;
	pointer-events: none;
	margin-bottom: var(--spacing--sm);
	transform: translateX(calc(var(--instance-ai-artifacts-layout-width) / -2));
}

.scrollToBottomButton {
	--button--color: var(--icon-color--strong);
	--button--color--background: var(--background--surface);
	--button--color--background-hover: var(--color--foreground--tint-2);
	--button--color--background-active: var(--color--foreground--tint-2);
	--button--shadow: var(--shadow--xs);
	--button--shadow--hover: var(--shadow--xs);
	--button--shadow--active: var(--shadow--xs);
	--button--border-color: var(--border-color);
	--button--border-color--hover: var(--border-color);
	--button--border-color--active: var(--border-color);
	--button--border--shadow: 0 0 0 1px var(--button--border-color);
	--button--border--shadow--hover: 0 0 0 1px var(--button--border-color--hover);
	--button--border--shadow--active: 0 0 0 1px var(--button--border-color--active);
	--button--radius: var(--radius--full);

	pointer-events: auto;

	&.scrollToBottomButton {
		background-color: var(--background--surface);
		border: var(--border);
		border-radius: var(--radius--full);
		box-shadow: var(--shadow--xs);
		color: var(--icon-color--strong);

		&:hover {
			background-color: var(--color--foreground--tint-2);
			box-shadow: var(--shadow--xs);
		}
	}
}

.inputContainer {
	padding: 0 var(--spacing--lg) var(--spacing--sm);
	// Fades into the host's surface: the thread view paints `light-2`, an
	// embedding panel overrides the variable with its own background.
	background: linear-gradient(
		transparent 0%,
		var(--instance-ai-conversation-background, var(--color--background--light-2)) 30%
	);
	pointer-events: none;

	& > * {
		pointer-events: auto;
	}
}

.inputConstraint {
	width: calc(100% - var(--instance-ai-artifacts-layout-width));
	max-width: 750px;
	margin: 0 auto;
	transform: translateX(calc(var(--instance-ai-artifacts-layout-width) / -2));
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.disclaimer {
	margin: 0;
	text-align: center;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--md);
}

// The leaving child is detached from layout (see `.input-swap-leave-active`
// below) so the slot follows the entering child's intrinsic height during
// the cross-fade.
.inputSwap {
	position: relative;
}
</style>

<style lang="scss">
.message-slide-enter-from {
	opacity: 0;
	transform: translateY(8px);
}

.message-slide-enter-active {
	transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.scroll-button-fade-enter-from,
.scroll-button-fade-leave-to {
	opacity: 0;
}

.scroll-button-fade-enter-active,
.scroll-button-fade-leave-active {
	transition: opacity 0.12s ease;
}

// Cross-fade between the chat input and the floating confirmation panel.
// Default-mode cross-fade: both children co-exist briefly, the leaving one
// is absolute-positioned so it doesn't push the entering one down, and the
// slot sizes to the in-flow (entering) child.
.input-swap-enter-from,
.input-swap-leave-to {
	opacity: 0;
}

.input-swap-enter-active,
.input-swap-leave-active {
	transition: opacity 120ms ease;
}

.input-swap-leave-active {
	position: absolute;
	inset: 0;
}
</style>
