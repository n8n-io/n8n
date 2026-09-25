<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, ref, watch, type Component } from 'vue';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import type { ITelemetryTrackProperties } from 'n8n-workflow';
import ChatInputBase from '@/features/ai/shared/components/ChatInputBase.vue';
import { EXTENDED_PROMPT_MAX_LENGTH } from '@/features/ai/shared/constants';
import AttachmentPreview from './AttachmentPreview.vue';
import InstanceAiPromptSuggestions from './InstanceAiPromptSuggestions.vue';
import InstanceAiInputMenu from './InstanceAiInputMenu.vue';
import { convertFileToBinaryData } from '@/app/utils/fileUtils';
import {
	base64EncodedSize,
	type InstanceAiAttachment,
	type InstanceAiResourceAttachment,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import AssistantAtMentionPicker from '@/features/ai/assistant-at-mentions/AssistantAtMentionPicker.vue';
import { useAssistantAtMentions } from '@/features/ai/assistant-at-mentions/composables/useAssistantAtMentions';
import { useAssistantMentionAttachments } from '@/features/ai/assistant-at-mentions/composables/useAssistantMentionAttachments';
import type {
	AssistantMentionArtifactReference,
	AssistantMentionSelection,
	WorkflowArtifactReference,
} from '@/features/ai/assistant-at-mentions/assistantAtMentions.types';
import { buildMentionKey } from '@/features/ai/assistant-at-mentions/utils/buildMentionItems';
import { INSTANCE_AI_EMPTY_STATE_SUGGESTIONS_VERSION } from '../emptyStateSuggestions';
import { useInstanceAiPromptSuggestionsTelemetry } from '../instanceAiPromptSuggestions.telemetry';
import { instanceAiResponseNow } from '../instanceAi.responseTiming';
import type { ContextChip } from '../instanceAi.contextChip';
import { useInstanceAiStore } from '../instanceAi.store';
import {
	USER_TYPED_MESSAGE,
	type InstanceAiMessageAuthorship,
	type InstanceAiPrefillType,
	type InstanceAiPrefillPayload,
} from '../prefills';
import { mergeNodeSets } from '../utils/buildNodesAttachment';
import InstanceAiResourceChip from './InstanceAiResourceChip.vue';

type AmendContext = { agentId: string; role: string } | null;
export type SuggestionPromptPayload =
	| {
			promptKey: BaseTextKey;
			prompt?: never;
	  }
	| {
			prompt: string;
			promptKey?: never;
	  };
export type SuggestionSelectionPayload = SuggestionPromptPayload & {
	suggestionId: string;
	suggestionKind: 'prompt' | 'quick_example';
	position: number;
	telemetryPayload?: ITelemetryTrackProperties;
	/** Required so a new catalog cannot emit suggestions that report as user-typed. */
	prefillType: InstanceAiPrefillType;
	/**
	 * Catalog this row belongs to. A host-triggered submit (agent templates)
	 * is not the home-screen catalog mounted on this input.
	 */
	suggestionCatalogVersion?: string;
};
type SelectedSuggestionDraft = SuggestionSelectionPayload & {
	originalPrompt: string;
};
// Experiment cleanup: remove with instanceAiPromptSuggestionsV2.
type SuggestionsCyclePayload = {
	visibleSuggestionIds: string[];
	cycleCount: number;
	telemetryPayload?: ITelemetryTrackProperties;
};
type SuggestionPreviewPayload = BaseTextKey | { prompt: string } | null;
type ActivePrefill = InstanceAiPrefillPayload;
const SUGGESTIONS_TRANSITION_DURATION = { enter: 450, leave: 320 };
const DEFAULT_AUTOSIZE_ROWS = 3;
const DEFAULT_MAX_AUTOSIZE_ROWS = 6;
/** The keyCode browsers send while an IME composes text, such as Japanese, Chinese or Korean. */
const IME_COMPOSITION_KEYCODE = 229;

const props = withDefaults(
	defineProps<{
		isStreaming?: boolean;
		isSubmitting?: boolean;
		isAwaitingConfirmation?: boolean;
		isAwaitingPlanReview?: boolean;
		currentThreadId?: string;
		amendContext?: AmendContext;
		contextualSuggestion?: string | null;
		suggestions?: readonly unknown[];
		isWorkflowBuilderAvailable?: boolean;
		// Experiment cleanup: remove with instanceAiPromptSuggestionsV2.
		suggestionsComponent?: Component;
		suggestionsComponentProps?: Record<string, unknown>;
		suggestionCatalogVersion?: string;
		suggestionTelemetryPayload?: ITelemetryTrackProperties;
		placeholderKey?: BaseTextKey;
		// Experiment cleanup: remove with instanceAiSplitEmptyState.
		previewPromptKey?: BaseTextKey | null;
		// Experiment cleanup: remove with instanceAiSplitEmptyState.
		fixedRows?: number | null;
		// Experiment cleanup: remove with instanceAiSplitEmptyState.
		submitLabel?: string;
		submitActiveRequiresFocus?: boolean;
		contextChip?: ContextChip | null;
		mentionsEnabled?: boolean;
		mentionProjectId?: string;
		mentionArtifacts?: readonly WorkflowArtifactReference[];
		mentionActiveWorkflowId?: string;
		reservedAttachmentCount?: number;
	}>(),
	{
		isStreaming: false,
		isSubmitting: false,
		isAwaitingConfirmation: false,
		isAwaitingPlanReview: false,
		currentThreadId: '',
		amendContext: null,
		contextualSuggestion: null,
		isWorkflowBuilderAvailable: true,
		previewPromptKey: null,
		fixedRows: null,
		submitLabel: undefined,
		submitActiveRequiresFocus: false,
		contextChip: null,
		mentionsEnabled: false,
		mentionProjectId: undefined,
		mentionArtifacts: () => [],
		mentionActiveWorkflowId: undefined,
		reservedAttachmentCount: 0,
	},
);

const emit = defineEmits<{
	// `restoreDraft` puts the cleared draft back when the send fails. It returns
	// false when the user has already typed something newer, so the caller can
	// tell whether the draft was recovered. It also restores the pre-fill the
	// draft came from, so a retry stays attributed to the surface that wrote it.
	submit: [
		message: string,
		attachments: InstanceAiAttachment[] | undefined,
		restoreDraft: () => boolean,
		authorship: InstanceAiMessageAuthorship,
		responseStartedAtEpochMs: number,
		acceptDraft: () => void,
	];
	stop: [];
	'dismiss-context-chip': [];
	'workflow-preview': [workflowFile: string | null];
	'mention-reference-added': [reference: AssistantMentionArtifactReference];
	'mention-reference-removed': [referenceId: string];
	'mention-workflow-open': [workflowId: string];
	// Experiment cleanup: remove with instanceAiSplitEmptyState.
	// Fires when the composer goes between empty and non-empty so the split
	// empty state can pause its cycling placeholders only once the user types
	// (auto-focus on mount must NOT pause the cycle).
	'content-change': [hasContent: boolean];
}>();

const i18n = useI18n();
const toast = useToast();
const promptSuggestionsTelemetry = useInstanceAiPromptSuggestionsTelemetry();
const instanceAiStore = useInstanceAiStore();
const inputText = ref('');
const attachedFiles = ref<File[]>([]);
const attachedResources = ref<InstanceAiResourceAttachment[]>([]);
const isPreparingSubmission = ref(false);
const chatInputRef = ref<InstanceType<typeof ChatInputBase> | null>(null);
const mentionPickerRef = ref<InstanceType<typeof AssistantAtMentionPicker> | null>(null);
const composerRef = ref<HTMLElement | null>(null);
// Experiment cleanup: remove with instanceAiPromptSuggestionsV2.
const previewPrompt = ref<string | null>(null);
const selectedSuggestionDraft = ref<SelectedSuggestionDraft | null>(null);
/**
 * What pre-filled the composer, so the submit can report who wrote the text.
 * Separate from `selectedSuggestionDraft`, which is scoped to the suggestion
 * experiment; this also covers template examples and hand-off drafts.
 */
const activePrefill = ref<ActivePrefill | null>(null);

// Experiment cleanup: remove with instanceAiSplitEmptyState.
const typedPreview = ref('');
const TYPEWRITER_SPEED_MS = 9;
let typewriterTimer: ReturnType<typeof setInterval> | null = null;

function stopTypewriter() {
	if (typewriterTimer) {
		clearInterval(typewriterTimer);
		typewriterTimer = null;
	}
}

// Only the split-empty-state preview prompt (the `previewPromptKey` prop) types
// out; the suggestion hover ghost (previewPrompt) stays instant.
watch(
	() => props.previewPromptKey,
	(key) => {
		stopTypewriter();
		if (!key) {
			typedPreview.value = '';
			return;
		}
		const full = i18n.baseText(key);
		typedPreview.value = '';
		let i = 0;
		typewriterTimer = setInterval(() => {
			i += 1;
			typedPreview.value = full.slice(0, i);
			if (i >= full.length) stopTypewriter();
		}, TYPEWRITER_SPEED_MS);
	},
	{ immediate: true },
);

onBeforeUnmount(stopTypewriter);

function focus() {
	chatInputRef.value?.focus();
}

function appendText(text: string) {
	inputText.value += text;
	void mentions.handleTextChange(inputText.value, inputText.value.length);
}

function setText(text: string) {
	mentions.close();
	inputText.value = text;
}

function setTextIfEmpty(text: string) {
	if (!inputText.value.trim()) inputText.value = text;
}

/**
 * Put n8n-authored text in the composer. Pre-fills must come through here
 * rather than `setText` so the submit can attribute them; `setText` and
 * friends stay for restoring a draft the user wrote.
 */
function setPrefill(prefill: InstanceAiPrefillPayload) {
	inputText.value = prefill.text;
	activePrefill.value = { ...prefill };
}

function clearTextIfMatches(text: string) {
	if (inputText.value === text) inputText.value = '';
}

function isDirty() {
	return inputText.value.trim().length > 0 || hasAttachments.value;
}

defineExpose({
	focus,
	appendText,
	setText,
	setPrefill,
	setTextIfEmpty,
	clearTextIfMatches,
	isDirty,
	// Experiment cleanup: remove with instanceAiSplitEmptyState.
	insertSuggestion: handleSuggestionInsert,
	submitSuggestion,
});

// A run suspended on a plan review is parked, not working: the user is meant to
// type into it. Only a real in-flight submission blocks the composer then.
const isBusy = computed(() =>
	props.isAwaitingPlanReview
		? props.isSubmitting
		: props.isStreaming || props.isSubmitting || isPreparingSubmission.value,
);
const hasNonWhitespaceDraftText = computed(() => inputText.value.trim().length > 0);
const isInputVisuallyEmpty = computed(() => inputText.value.length === 0);
const hasAttachments = computed(
	() => attachedFiles.value.length > 0 || attachedResources.value.length > 0,
);
const excludedMentionKeys = computed(() => {
	const keys = new Set<string>();
	if (props.contextChip?.type === 'workflow-artifact') {
		keys.add(
			buildMentionKey('workflow', props.contextChip.workflowId, props.contextChip.workflowId),
		);
	}

	for (const attachment of attachedResources.value) {
		if (attachment.type === 'workflow') {
			keys.add(buildMentionKey('workflow', attachment.id, attachment.id));
			continue;
		}
		if (attachment.type !== 'nodes') continue;

		for (const set of attachment.sets) {
			if (set.canvasGroupId) {
				keys.add(buildMentionKey('group', attachment.workflowId, set.canvasGroupId));
				continue;
			}
			for (const node of set.nodes) {
				keys.add(buildMentionKey('node', attachment.workflowId, node.id));
			}
		}
	}

	return [...keys];
});
// Fed to the composer so its size guard can account for what is already staged.
// Summed per file after encoding — base64 pads each file individually, so encoding
// a raw total would undercount and disagree with the backend's per-file measurement.
const attachedEncodedBytes = computed(() =>
	attachedFiles.value.reduce((sum, file) => sum + base64EncodedSize(file.size), 0),
);
const isComposerDirty = computed(() => hasNonWhitespaceDraftText.value || hasAttachments.value);
// Experiment cleanup: remove with instanceAiSplitEmptyState.
watch(isComposerDirty, (hasContent) => emit('content-change', hasContent));
const isGatedBySetup = computed(
	() => props.isAwaitingConfirmation || !props.isWorkflowBuilderAvailable,
);
const shouldShowMentions = computed(
	() => props.mentionsEnabled && Boolean(props.mentionProjectId) && !props.isAwaitingPlanReview,
);
const canUseMentions = computed(
	() => shouldShowMentions.value && !isBusy.value && !isGatedBySetup.value,
);
const inputElement = computed(() => chatInputRef.value?.getInputElement() ?? null);
const mentions = useAssistantAtMentions({
	text: inputText,
	enabled: canUseMentions,
	getInputElement: () => inputElement.value ?? undefined,
});
const mentionMenuOpen = mentions.menuOpen;
const mentionQuery = mentions.query;

const mentionAttachments = useAssistantMentionAttachments({
	files: attachedFiles,
	resources: attachedResources,
	projectId: () => props.mentionProjectId,
	reservedAttachmentCount: () => props.reservedAttachmentCount,
	onReferenceAdded: (reference) => emit('mention-reference-added', reference),
	onReferenceRemoved: (referenceId) => emit('mention-reference-removed', referenceId),
	onCleared: mentions.close,
});

async function handleMentionSelection(selection: AssistantMentionSelection): Promise<void> {
	const result = mentionAttachments.select(selection);
	if (result.status === 'limit') {
		toast.showError(
			new Error(i18n.baseText('instanceAi.mentions.attachmentLimitMessage')),
			i18n.baseText('instanceAi.mentions.attachmentLimitTitle'),
		);
		return;
	}

	if (result.truncated) {
		toast.showError(
			new Error(i18n.baseText('instanceAi.nodeContext.truncated.message')),
			i18n.baseText('instanceAi.nodeContext.truncated.title'),
		);
	}
	emit('mention-workflow-open', selection.item.workflowId);
	await mentions.replaceActiveRange(selection.item.label);
}

const canSubmit = computed(() =>
	canSubmitMessage(
		inputText.value.trim(),
		attachedFiles.value.length + attachedResources.value.length,
	),
);
const canShowSuggestions = computed(
	() =>
		Boolean(props.suggestions?.length) &&
		!props.isAwaitingPlanReview &&
		!isComposerDirty.value &&
		!isBusy.value &&
		!isGatedBySetup.value,
);
const resolvedSuggestionsComponent = computed(
	() => props.suggestionsComponent ?? InstanceAiPromptSuggestions,
);
const resolvedSuggestionCatalogVersion = computed(
	() => props.suggestionCatalogVersion ?? INSTANCE_AI_EMPTY_STATE_SUGGESTIONS_VERSION,
);
// Experiment cleanup: remove with instanceAiPromptSuggestionsV2.
const shouldTrackVisibleSuggestions = computed(() => canShowSuggestions.value);

const placeholder = computed(() => {
	if (!props.isWorkflowBuilderAvailable) {
		return i18n.baseText('instanceAi.input.workflowBuilderUnavailablePlaceholder');
	}
	if (isGatedBySetup.value) {
		return i18n.baseText('instanceAi.input.suspendedPlaceholder');
	}
	if (props.isAwaitingPlanReview) {
		return i18n.baseText('instanceAi.input.planReviewPlaceholder');
	}
	// Experiment cleanup: remove with instanceAiSplitEmptyState. Split types the prompt out.
	if (props.previewPromptKey && isInputVisuallyEmpty.value) {
		return typedPreview.value;
	}
	if (previewPrompt.value && isInputVisuallyEmpty.value) {
		return previewPrompt.value;
	}
	if (props.amendContext) {
		return i18n.baseText('instanceAi.input.amendPlaceholder', {
			interpolate: { role: props.amendContext.role },
		});
	}
	if (props.contextualSuggestion) {
		return props.contextualSuggestion;
	}
	if (props.contextChip?.type === 'agent-artifact' && props.contextChip.isNewAgent) {
		return i18n.baseText('instanceAi.input.newAgentPlaceholder');
	}
	return i18n.baseText(props.placeholderKey ?? 'instanceAi.input.placeholder');
});

watch(
	[shouldTrackVisibleSuggestions, resolvedSuggestionCatalogVersion, () => props.currentThreadId],
	([shouldTrackSuggestions, suggestionCatalogVersion, threadId]) => {
		if (shouldTrackSuggestions) {
			promptSuggestionsTelemetry.trackSuggestionsShown({
				threadId: threadId || undefined,
				suggestionCatalogVersion,
				telemetryPayload: props.suggestionTelemetryPayload,
			});
			return;
		}

		previewPrompt.value = null;
		emit('workflow-preview', null);
	},
	{ immediate: true },
);

watch(inputText, (text) => {
	if (text.length === 0) {
		selectedSuggestionDraft.value = null;
		activePrefill.value = null;
	}
});

function emitSubmittedMessage(
	message: string,
	attachments: InstanceAiAttachment[] | undefined,
	restoreDraft: () => boolean,
	authorship: InstanceAiMessageAuthorship,
	responseStartedAtEpochMs: number,
	acceptDraft: () => void,
) {
	previewPrompt.value = null;
	emit(
		'submit',
		message,
		attachments,
		restoreDraft,
		authorship,
		responseStartedAtEpochMs,
		acceptDraft,
	);
}

/**
 * The composer is the only place that knows whether the text came from a
 * pre-fill, so it resolves authorship for every send that leaves it.
 */
function resolveAuthorship(
	message: string,
	prefill: ActivePrefill | null,
): InstanceAiMessageAuthorship {
	if (!prefill) return USER_TYPED_MESSAGE;
	return {
		kind: 'prefill',
		prefillType: prefill.prefillType,
		...(prefill.prefillId ? { prefillId: prefill.prefillId } : {}),
		promptModified: message !== prefill.text.trim(),
	};
}

function resetDraftComposer({ keepAttachments = false } = {}) {
	inputText.value = '';
	if (keepAttachments) return;
	attachedFiles.value = [];
	attachedResources.value = [];
}

/** The single submission gate — `canSubmit` is this predicate over the draft. */
function canSubmitMessage(message: string, attachmentCount = 0) {
	if (isBusy.value || isGatedBySetup.value) return false;
	// Plan feedback travels as a plain string, so an attachment cannot carry it.
	if (props.isAwaitingPlanReview) return message.length > 0;
	return message.length > 0 || attachmentCount > 0;
}

/**
 * Put failed plan feedback back. Only the text was submitted, so this cannot use
 * `isDirty()` as its guard: staged attachments keep that true even when the text
 * box is empty, which would block every restore.
 */
function restorePlanFeedbackDraft(message: string) {
	if (hasNonWhitespaceDraftText.value) return false;
	inputText.value = message;
	return true;
}

/**
 * Puts a submitted draft back after a refused send. Returns false when the user
 * has already typed something newer, so the caller knows the draft is gone.
 *
 * The pre-fill snapshot is restored with the text -- always after it, since an
 * empty assignment clears the pre-fill -- so retrying stays attributed to the
 * surface that wrote the draft rather than reporting as user-typed.
 */
function restoreSubmittedDraft(
	message: string,
	files: File[],
	resources: InstanceAiResourceAttachment[],
	prefill: ActivePrefill | null,
) {
	const restorePrefill = () => {
		activePrefill.value = prefill ? { ...prefill } : null;
	};
	if (isDirty()) {
		// Dirty only because something was attached after the send: the text slot is
		// still free, so give the draft back and leave the new attachments alone.
		if (inputText.value.trim()) return false;
		inputText.value = message;
		restorePrefill();
		return true;
	}
	inputText.value = message;
	restorePrefill();
	attachedFiles.value = [...files];
	attachedResources.value = [...resources];
	return true;
}

/**
 * `prefill` is the snapshot its caller took when it read the message, not live
 * state: `handleSubmit` awaits file conversion in between, and the composer can
 * be edited during that await.
 */
function submitComposerMessage(
	message: string,
	attachments: InstanceAiAttachment[] | undefined,
	prefill: ActivePrefill | null,
	responseStartedAtEpochMs = instanceAiResponseNow(),
	draftSnapshot?: {
		files: File[];
		resources: InstanceAiResourceAttachment[];
		mentionReferenceIds: readonly string[];
	},
) {
	if (!canSubmitMessage(message, attachments?.length ?? 0)) {
		return;
	}

	// Plan feedback is resumed as a plain string. Send the text alone and leave
	// anything staged in place, so it stays visible for a later real message
	// instead of being dropped on a send that could never carry it. A suggestion
	// draft can reach here, but feedback on a plan is not a suggestion submission.
	if (props.isAwaitingPlanReview) {
		// Feedback on a plan is the user's own answer, so it reports as typed even
		// when a pre-filled draft is what reached here -- the same reason this path
		// skips the suggestion-submitted event below.
		emitSubmittedMessage(
			message,
			undefined,
			() => restorePlanFeedbackDraft(message),
			USER_TYPED_MESSAGE,
			responseStartedAtEpochMs,
			() => {},
		);
		resetDraftComposer({ keepAttachments: true });
		return;
	}

	trackSelectedSuggestionSubmitted(message);

	const submittedFiles = draftSnapshot?.files ?? [...attachedFiles.value];
	const submittedResources = draftSnapshot?.resources ?? [...attachedResources.value];
	const mentionSubmission = mentionAttachments.detachSubmission(draftSnapshot?.mentionReferenceIds);
	emitSubmittedMessage(
		message,
		attachments,
		() => {
			const restored = restoreSubmittedDraft(message, submittedFiles, submittedResources, prefill);
			mentionSubmission.restore();
			return restored;
		},
		resolveAuthorship(message, prefill),
		responseStartedAtEpochMs,
		mentionSubmission.accept,
	);
	resetDraftComposer();
}

// Experiment cleanup: remove with instanceAiSplitEmptyState. A split example row
// click sends the prompt directly — attribute the submit (unedited) without a
// separate 'selected' event, since there is no insert step.
function submitSuggestion(payload: SuggestionSelectionPayload) {
	const prompt = getSuggestionPrompt(payload);
	selectedSuggestionDraft.value = { ...payload, originalPrompt: prompt };
	// Passed by argument, not staged in `activePrefill`: the composer is already
	// empty on this path, so `resetDraftComposer` leaves `inputText` unchanged and
	// the watcher never clears it -- a later typed message would inherit it.
	submitComposerMessage(prompt, undefined, {
		text: prompt,
		prefillType: payload.prefillType,
		prefillId: payload.suggestionId,
	});
}

async function handleSubmit() {
	const text = inputText.value.trim();
	// Read with the text: the file conversion below awaits, and an edit during it
	// would otherwise pair this message with the next pre-fill's authorship.
	const prefill = activePrefill.value;
	if (!canSubmitMessage(text, attachedFiles.value.length + attachedResources.value.length)) {
		return;
	}
	mentions.close();
	const responseStartedAtEpochMs = instanceAiResponseNow();

	// Plan feedback carries no attachments, so skip encoding the staged files.
	if (props.isAwaitingPlanReview) {
		submitComposerMessage(text, undefined, null, responseStartedAtEpochMs);
		return;
	}

	const submittedFiles = [...attachedFiles.value];
	const submittedResources = [...attachedResources.value];
	const mentionReferenceIds = mentionAttachments.snapshotSubmission();
	isPreparingSubmission.value = true;
	let fileAttachments: InstanceAiAttachment[];
	try {
		fileAttachments = submittedFiles.length
			? (await Promise.all(submittedFiles.map(convertFileToBinaryData))).map((b) => ({
					type: 'file' as const,
					data: b.data,
					mimeType: b.mimeType,
					fileName: b.fileName ?? 'unnamed',
				}))
			: [];
	} finally {
		isPreparingSubmission.value = false;
	}
	const attachments = [...fileAttachments, ...submittedResources];

	submitComposerMessage(
		text,
		attachments.length ? attachments : undefined,
		prefill,
		responseStartedAtEpochMs,
		{ files: submittedFiles, resources: submittedResources, mentionReferenceIds },
	);
}

function removeResource(index: number) {
	mentionAttachments.removeResource(index);
}

watch(
	() => instanceAiStore.pendingComposerAttachments,
	(pending) => {
		if (pending.length === 0) return;
		const consumed = instanceAiStore.consumePendingAttachments();
		for (const attachment of consumed) {
			if (attachment.type === 'file') continue;
			if (attachment.type === 'nodes') {
				const existing = attachedResources.value.find(
					(a): a is Extract<InstanceAiResourceAttachment, { type: 'nodes' }> =>
						a.type === 'nodes' && a.workflowId === attachment.workflowId,
				);
				if (existing) {
					existing.sets = mergeNodeSets(existing.sets, attachment.sets);
					existing.workflowName = attachment.workflowName ?? existing.workflowName;
					continue;
				}
			}
			attachedResources.value = [...attachedResources.value, attachment];
		}
	},
	{ deep: true, immediate: true },
);

function handleStop() {
	mentions.close();
	emit('stop');
}

function handleComposerKeydown(event: KeyboardEvent): void {
	if (!mentionMenuOpen.value) return;
	const handled = mentionPickerRef.value?.handleExternalKeydown(event) ?? false;
	const hasModifier = event.shiftKey || event.ctrlKey || event.metaKey || event.altKey;
	const isComposing = event.isComposing || event.keyCode === IME_COMPOSITION_KEYCODE;
	if (handled || event.key !== 'Enter' || hasModifier || isComposing) return;

	event.preventDefault();
	event.stopPropagation();
}

function handleTabAutocomplete() {
	if (!inputText.value && props.contextualSuggestion) {
		// n8n wrote this follow-up, so accepting it is a pre-fill like any other.
		setPrefill({ text: props.contextualSuggestion, prefillType: 'contextual_followup' });
	}
}

function handleFilesSelected(files: File[]) {
	attachedFiles.value.push(...files);
}

function handleFileRemove(file: File) {
	const idx = attachedFiles.value.indexOf(file);
	if (idx !== -1) {
		attachedFiles.value.splice(idx, 1);
	}
}

function getTelemetryContext(telemetryPayload?: ITelemetryTrackProperties) {
	return {
		threadId: props.currentThreadId || undefined,
		suggestionCatalogVersion: resolvedSuggestionCatalogVersion.value,
		telemetryPayload: {
			...props.suggestionTelemetryPayload,
			...telemetryPayload,
		},
	};
}

function getSuggestionPrompt(payload: SuggestionPromptPayload) {
	return payload.prompt ?? i18n.baseText(payload.promptKey);
}

function getPreviewPromptText(preview: SuggestionPreviewPayload) {
	if (!preview) {
		return null;
	}

	if (typeof preview === 'string') {
		return i18n.baseText(preview);
	}

	return preview.prompt;
}

// Experiment cleanup: remove with instanceAiPromptSuggestionsV2.
function trackSelectedSuggestionSubmitted(message: string) {
	const selectedSuggestion = selectedSuggestionDraft.value;
	if (!selectedSuggestion) {
		return;
	}

	promptSuggestionsTelemetry.trackSuggestionSubmitted({
		...getTelemetryContext(selectedSuggestion.telemetryPayload),
		suggestionCatalogVersion:
			selectedSuggestion.suggestionCatalogVersion ?? resolvedSuggestionCatalogVersion.value,
		suggestionId: selectedSuggestion.suggestionId,
		suggestionKind: selectedSuggestion.suggestionKind,
		position: selectedSuggestion.position,
		promptModified: message !== selectedSuggestion.originalPrompt,
	});
}

function handleQuickExamplesOpened(payload: { suggestionId: string; position: number }) {
	if (payload.suggestionId !== 'quick-examples') {
		return;
	}

	promptSuggestionsTelemetry.trackQuickExamplesOpened({
		...getTelemetryContext(),
		suggestionId: payload.suggestionId,
		position: payload.position,
	});
}

function trackSuggestionSelected(payload: SuggestionSelectionPayload) {
	promptSuggestionsTelemetry.trackSuggestionSelected({
		...getTelemetryContext(payload.telemetryPayload),
		suggestionId: payload.suggestionId,
		suggestionKind: payload.suggestionKind,
		position: payload.position,
	});
}

// Experiment cleanup: remove with instanceAiPromptSuggestionsV2.
function handleSuggestionsCycled(payload: SuggestionsCyclePayload) {
	promptSuggestionsTelemetry.trackSuggestionsCycled({
		...getTelemetryContext(payload.telemetryPayload),
		visibleSuggestionIds: payload.visibleSuggestionIds,
		cycleCount: payload.cycleCount,
	});
}

// Experiment cleanup: remove with instanceAiPromptSuggestionsV2.
async function handleSuggestionInsert(payload: SuggestionSelectionPayload) {
	trackSuggestionSelected(payload);
	previewPrompt.value = null;
	const prompt = getSuggestionPrompt(payload);
	selectedSuggestionDraft.value = {
		...payload,
		originalPrompt: prompt,
	};
	activePrefill.value = {
		text: prompt,
		prefillType: payload.prefillType,
		prefillId: payload.suggestionId,
	};
	inputText.value = prompt;

	await nextTick();
	chatInputRef.value?.focus();
}

const resizable = computed(() => {
	// Experiment cleanup: remove with instanceAiSplitEmptyState.
	if (props.fixedRows) {
		return { minRows: props.fixedRows, maxRows: props.fixedRows };
	}
	if (previewPrompt.value) {
		return { minRows: DEFAULT_AUTOSIZE_ROWS, maxRows: DEFAULT_AUTOSIZE_ROWS };
	}
	return { minRows: DEFAULT_AUTOSIZE_ROWS, maxRows: DEFAULT_MAX_AUTOSIZE_ROWS };
});
</script>

<template>
	<div
		ref="composerRef"
		:class="$style.composer"
		@keydown.capture="handleComposerKeydown"
		@pointerdown.capture="mentions.saveSelection"
		@click.capture="mentions.handleCaretMove"
		@keyup.capture="mentions.handleCaretMove"
		@select.capture="mentions.handleCaretMove"
	>
		<ChatInputBase
			ref="chatInputRef"
			:model-value="inputText"
			:class="$style.inputWrapper"
			:placeholder="placeholder"
			:is-streaming="props.isAwaitingPlanReview ? false : props.isStreaming"
			:can-submit="canSubmit"
			:disabled="isGatedBySetup || isPreparingSubmission"
			:autosize="resizable"
			:button-label="props.submitLabel"
			:active-requires-focus="props.submitActiveRequiresFocus"
			:max-length="EXTENDED_PROMPT_MAX_LENGTH"
			show-voice
			:show-attach="!props.isAwaitingPlanReview"
			:show-attach-button="false"
			:attached-encoded-bytes="attachedEncodedBytes"
			@update:model-value="mentions.handleTextChange"
			@submit="handleSubmit"
			@stop="handleStop"
			@tab="handleTabAutocomplete"
			@files-selected="handleFilesSelected"
		>
			<template #attachments>
				<div v-if="props.contextChip || attachedResources.length > 0" :class="$style.attachments">
					<InstanceAiResourceChip
						v-if="props.contextChip"
						:label="props.contextChip.label"
						:icon="props.contextChip.icon ?? 'robot'"
						:remove-label="i18n.baseText('generic.close')"
						:test-id="props.contextChip.testId ?? 'instance-ai-handoff-context-chip'"
						remove-test-id="instance-ai-handoff-context-chip-dismiss"
						removable
						@remove="emit('dismiss-context-chip')"
					/>
					<AttachmentPreview
						v-for="(attachment, index) in attachedResources"
						:key="`res-${index}`"
						:attachment="attachment"
						:is-removable="true"
						@remove-resource="removeResource(index)"
						@update:attachment="mentionAttachments.updateResource(index, $event)"
					/>
				</div>
				<div v-if="attachedFiles.length > 0" :class="$style.attachments">
					<AttachmentPreview
						v-for="(file, index) in attachedFiles"
						:key="index"
						:file="file"
						:is-removable="true"
						@remove="handleFileRemove"
					/>
				</div>
			</template>
			<template v-if="!props.isAwaitingPlanReview" #footer-start>
				<InstanceAiInputMenu
					:disabled="isBusy || isGatedBySetup"
					:thread-id="props.currentThreadId || undefined"
					@attach-files="chatInputRef?.openFilePicker()"
				/>
			</template>
			<template v-if="shouldShowMentions" #right-actions>
				<AssistantAtMentionPicker
					ref="mentionPickerRef"
					v-model="mentionMenuOpen"
					:query="mentionQuery"
					:project-id="props.mentionProjectId"
					:artifacts="props.mentionArtifacts"
					:active-workflow-id="props.mentionActiveWorkflowId"
					:excluded-keys="excludedMentionKeys"
					:input-element="inputElement"
					:reference="composerRef"
					:disabled="isBusy || isGatedBySetup"
					@update:model-value="mentions.handleMenuOpenChange"
					@select="handleMentionSelection"
				/>
			</template>
		</ChatInputBase>
		<slot name="footer"></slot>
		<Transition name="suggestions-fade" :duration="SUGGESTIONS_TRANSITION_DURATION">
			<component
				:is="resolvedSuggestionsComponent"
				v-if="canShowSuggestions && props.suggestions"
				:class="$style.suggestions"
				:suggestions="props.suggestions"
				:disabled="isBusy || isGatedBySetup"
				v-bind="props.suggestionsComponentProps"
				@preview-change="previewPrompt = getPreviewPromptText($event)"
				@quick-examples-opened="handleQuickExamplesOpened"
				@cycle-suggestions="handleSuggestionsCycled"
				@insert-suggestion="handleSuggestionInsert"
				@workflow-preview="emit('workflow-preview', $event)"
			/>
		</Transition>
	</div>
</template>

<style module lang="scss">
.composer {
	display: flex;
	flex-direction: column;
	> * + * {
		margin-top: var(--spacing--xs);
	}
}

.inputWrapper {
	z-index: 1;
}

.suggestions {
	margin-top: var(--spacing--lg);
}

.attachments {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);

	> * {
		max-width: 80%;
	}
}

:global(.suggestions-fade-enter-active) {
	transition:
		opacity 0.15s ease,
		transform 0.15s ease;
}

:global(.suggestions-fade-leave-active) {
	transition:
		opacity 0.18s ease,
		transform 0.18s ease;
}

:global(.suggestions-fade-enter-from) {
	opacity: 0;
	transform: translateY(-4px);
}

:global(.suggestions-fade-leave-to) {
	opacity: 0;
	transform: translateY(4px);
}
</style>
