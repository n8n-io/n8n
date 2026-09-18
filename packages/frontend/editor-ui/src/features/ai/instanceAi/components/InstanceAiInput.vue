<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, ref, watch, type Component } from 'vue';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { N8nIcon, N8nIconButton, N8nTag, N8nTooltip } from '@n8n/design-system';
import type { ITelemetryTrackProperties } from 'n8n-workflow';
import { useTextMention } from '@n8n/composables/useTextMention';
import { useToast } from '@n8n/composables/useToast';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import ChatInputBase from '@/features/ai/shared/components/ChatInputBase.vue';
import { EXTENDED_PROMPT_MAX_LENGTH } from '@/features/ai/shared/constants';
import AttachmentPreview from './AttachmentPreview.vue';
import InstanceAiPromptSuggestions from './InstanceAiPromptSuggestions.vue';
import InstanceAiInputMenu from './InstanceAiInputMenu.vue';
import { convertFileToBinaryData } from '@/app/utils/fileUtils';
import {
	base64EncodedSize,
	INSTANCE_AI_MAX_ATTACHMENTS,
	type InstanceAiAttachment,
	type InstanceAiResourceAttachment,
} from '@n8n/api-types';
import { INSTANCE_AI_EMPTY_STATE_SUGGESTIONS_VERSION } from '../emptyStateSuggestions';
import { useInstanceAiPromptSuggestionsTelemetry } from '../instanceAiPromptSuggestions.telemetry';
import type { ContextChip } from '../instanceAi.contextChip';
import { useInstanceAiStore } from '../instanceAi.store';
import {
	USER_TYPED_MESSAGE,
	type InstanceAiMessageAuthorship,
	type InstanceAiPrefillType,
	type InstanceAiPrefillTypeReported,
} from '../prefills';
import { mergeNodeSets } from '../utils/buildNodesAttachment';
import { useIsInstanceAiMentionsEnabled } from '../composables/useIsInstanceAiMentionsEnabled';
import InstanceAiMentionChip from '../mentions/InstanceAiMentionChip.vue';
import InstanceAiMentionPicker from '../mentions/InstanceAiMentionPicker.vue';
import { buildDraftMention } from '../mentions/buildMentionAttachment';
import { useInstanceAiMentionCatalog } from '../mentions/useInstanceAiMentionCatalog';
import type {
	InstanceAiDraftMention,
	InstanceAiMentionCandidate,
} from '../mentions/instanceAiMentions.types';

type AmendContext = { agentId: string; role: string } | null;
type SuggestionPromptPayload =
	| {
			promptKey: BaseTextKey;
			prompt?: never;
	  }
	| {
			prompt: string;
			promptKey?: never;
	  };
type SuggestionSelectionPayload = SuggestionPromptPayload & {
	suggestionId: string;
	suggestionKind: 'prompt' | 'quick_example';
	position: number;
	telemetryPayload?: ITelemetryTrackProperties;
	/** Required so a new catalog cannot emit suggestions that report as user-typed. */
	prefillType: InstanceAiPrefillType;
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
type ActivePrefill = {
	/** The text as the pre-fill wrote it, so an edit can be detected. */
	text: string;
	prefillType: InstanceAiPrefillTypeReported;
	prefillId?: string;
};
interface SubmittedDraft {
	files: File[];
	resources: InstanceAiResourceAttachment[];
	mentions: InstanceAiDraftMention[];
}
const SUGGESTIONS_TRANSITION_DURATION = { enter: 450, leave: 320 };
const DEFAULT_AUTOSIZE_ROWS = 3;
const DEFAULT_MAX_AUTOSIZE_ROWS = 6;

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
		enableMentions?: boolean;
		projectId?: string;
		draftMentions?: readonly InstanceAiDraftMention[];
		durableWorkflowIds?: ReadonlySet<string>;
		buildingWorkflowIds?: ReadonlySet<string>;
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
		enableMentions: false,
		projectId: undefined,
		draftMentions: () => [],
		durableWorkflowIds: () => new Set<string>(),
		buildingWorkflowIds: () => new Set<string>(),
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
	];
	stop: [];
	'dismiss-context-chip': [];
	'workflow-preview': [workflowFile: string | null];
	// Experiment cleanup: remove with instanceAiSplitEmptyState.
	// Fires when the composer goes between empty and non-empty so the split
	// empty state can pause its cycling placeholders only once the user types
	// (auto-focus on mount must NOT pause the cycle).
	'content-change': [hasContent: boolean];
	'update:draftMentions': [mentions: InstanceAiDraftMention[]];
	'mention-workflow-selected': [
		workflowId: string,
		text: string,
		selectionStart: number,
		selectionEnd: number,
	];
}>();

const i18n = useI18n();
const toast = useToast();
const telemetry = useTelemetry();
const promptSuggestionsTelemetry = useInstanceAiPromptSuggestionsTelemetry();
const instanceAiStore = useInstanceAiStore();
const inputText = ref('');
const attachedFiles = ref<File[]>([]);
const attachedResources = ref<InstanceAiResourceAttachment[]>([]);
const chatInputRef = ref<InstanceType<typeof ChatInputBase> | null>(null);
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

function setSelection(start: number, end: number = start) {
	chatInputRef.value?.setSelection(start, end);
}

function appendText(text: string) {
	inputText.value += text;
}

function setText(text: string) {
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
function setPrefill(prefill: {
	text: string;
	prefillType: InstanceAiPrefillTypeReported;
	prefillId?: string;
}) {
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
	setSelection,
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
	props.isAwaitingPlanReview ? props.isSubmitting : props.isStreaming || props.isSubmitting,
);
const hasNonWhitespaceDraftText = computed(() => inputText.value.trim().length > 0);
const isInputVisuallyEmpty = computed(() => inputText.value.length === 0);
const hasAttachments = computed(
	() =>
		attachedFiles.value.length > 0 ||
		attachedResources.value.length > 0 ||
		props.draftMentions.length > 0,
);
const composerAttachmentCount = computed(
	() => attachedFiles.value.length + attachedResources.value.length + props.draftMentions.length,
);
const outgoingAttachmentCount = computed(
	() => composerAttachmentCount.value + props.reservedAttachmentCount,
);
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
const canSubmit = computed(() =>
	canSubmitMessage(inputText.value.trim(), outgoingAttachmentCount.value),
);

const mentionsFlagEnabled = useIsInstanceAiMentionsEnabled();
const mentionUiEnabled = computed(
	() => props.enableMentions && mentionsFlagEnabled.value && Boolean(props.projectId),
);
const browsedWorkflowId = ref<string>();
// Draft mentions create temporary Assistant tabs, so they become drillable before submission.
const drillableWorkflowIds = computed<ReadonlySet<string>>(() => {
	const ids = new Set(props.durableWorkflowIds);
	for (const draftMention of props.draftMentions) ids.add(draftMention.target.workflowId);
	for (const workflowId of props.buildingWorkflowIds) ids.delete(workflowId);
	return ids;
});
const mentionResults = ref<InstanceAiMentionCandidate[]>([]);
const mention = useTextMention({
	results: mentionResults,
	getResultId: (candidate) => candidate.key,
	isResultDisabled: (candidate) => !candidate.source || Boolean(candidate.unavailableReason),
});
const mentionCatalog = useInstanceAiMentionCatalog({
	enabled: mentionUiEnabled,
	projectId: () => props.projectId,
	isOpen: mention.isOpen,
	query: mention.query,
	durableWorkflowIds: () => props.durableWorkflowIds,
	draftMentions: () => props.draftMentions,
	buildingWorkflowIds: () => props.buildingWorkflowIds,
});
const browsedWorkflow = computed(() =>
	mentionCatalog.workflowCandidates.value.find(
		(candidate) => candidate.workflowId === browsedWorkflowId.value,
	),
);
const mentionCandidates = computed(() => {
	if (mention.query.value.trim()) return mentionCatalog.visibleCandidates.value;
	if (browsedWorkflowId.value) {
		return mentionCatalog.localCandidates.value.filter(
			(candidate) => candidate.workflowId === browsedWorkflowId.value,
		);
	}
	return mentionCatalog.workflowCandidates.value;
});
const workflowDetailsLoaded = computed(
	() =>
		browsedWorkflowId.value !== undefined &&
		mentionCatalog.loadedWorkflowIds.value.has(browsedWorkflowId.value),
);
const workflowDetailsError = computed(
	() =>
		browsedWorkflowId.value !== undefined &&
		mentionCatalog.projectionErrorIds.value.has(browsedWorkflowId.value),
);
watch(
	mentionCandidates,
	(candidates) => {
		mentionResults.value = candidates;
	},
	{ immediate: true },
);
watch(
	[mention.isOpen, () => props.projectId, drillableWorkflowIds],
	([open, _projectId, drillableIds]) => {
		if (
			!open ||
			(browsedWorkflowId.value !== undefined && !drillableIds.has(browsedWorkflowId.value))
		) {
			browsedWorkflowId.value = undefined;
		}
	},
);
watch(
	[mentionUiEnabled, isBusy, isGatedBySetup, () => props.isAwaitingPlanReview],
	([enabled, busy, gated, planReview]) => {
		if (!enabled || busy || gated || planReview) mention.close();
	},
);
watch(
	() => mentionCatalog.availability.value,
	(availability) => {
		if (availability === 'empty' && mention.origin.value === 'typed') mention.close();
	},
);

const mentionLimitReason = computed<'mentions' | 'attachments' | undefined>(() => {
	if (props.draftMentions.length >= INSTANCE_AI_MAX_ATTACHMENTS) return 'mentions';
	if (outgoingAttachmentCount.value >= INSTANCE_AI_MAX_ATTACHMENTS) return 'attachments';
	return undefined;
});
const mentionButtonDisabled = computed(
	() =>
		isBusy.value ||
		isGatedBySetup.value ||
		props.isAwaitingPlanReview ||
		mentionCatalog.availability.value === 'empty' ||
		Boolean(mentionLimitReason.value),
);
const mentionButtonTooltip = computed(() =>
	mentionCatalog.availability.value === 'empty'
		? i18n.baseText('instanceAi.mentions.button.emptyProject')
		: i18n.baseText('instanceAi.mentions.button.label'),
);
const mentionTextareaAttributes = computed(() => {
	if (!mentionUiEnabled.value) return undefined;
	const highlighted = mention.highlightedId.value;
	return {
		role: 'combobox' as const,
		'aria-expanded': mention.isOpen.value,
		'aria-controls': 'instance-ai-mention-listbox',
		...(highlighted
			? {
					'aria-activedescendant': `instance-ai-mention-${highlighted.replace(/[^a-zA-Z0-9_-]/g, '-')}`,
				}
			: {}),
	};
});
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
) {
	previewPrompt.value = null;
	emit('submit', message, attachments, restoreDraft, authorship);
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
	if (attachmentCount > INSTANCE_AI_MAX_ATTACHMENTS) return false;
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
	mentions: InstanceAiDraftMention[],
	prefill: ActivePrefill | null,
) {
	const restorePrefill = () => {
		activePrefill.value = prefill ? { ...prefill } : null;
	};
	if (inputText.value.trim()) return false;
	const submittedMentionKeys = new Set(mentions.map((mention) => mention.key));
	const hasNewAttachments = attachedFiles.value.length > 0 || attachedResources.value.length > 0;
	const hasNewMentions = props.draftMentions.some(
		(mention) => !submittedMentionKeys.has(mention.key),
	);
	if (hasNewAttachments || hasNewMentions) {
		inputText.value = message;
		restorePrefill();
		return true;
	}
	inputText.value = message;
	restorePrefill();
	attachedFiles.value = [...files];
	attachedResources.value = [...resources];
	emit('update:draftMentions', [...mentions]);
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
	draft: SubmittedDraft = {
		files: [...attachedFiles.value],
		resources: [...attachedResources.value],
		mentions: [...props.draftMentions],
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
		);
		resetDraftComposer({ keepAttachments: true });
		return;
	}

	trackSelectedSuggestionSubmitted(message);

	emitSubmittedMessage(
		message,
		attachments,
		() => restoreSubmittedDraft(message, draft.files, draft.resources, draft.mentions, prefill),
		resolveAuthorship(message, prefill),
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
	if (!canSubmitMessage(text, outgoingAttachmentCount.value)) {
		return;
	}

	// Plan feedback carries no attachments, so skip encoding the staged files.
	if (props.isAwaitingPlanReview) {
		submitComposerMessage(text, undefined, null);
		return;
	}

	const draft: SubmittedDraft = {
		files: [...attachedFiles.value],
		resources: [...attachedResources.value],
		mentions: [...props.draftMentions],
	};
	const fileAttachments: InstanceAiAttachment[] = draft.files.length
		? (await Promise.all(draft.files.map(convertFileToBinaryData))).map((b) => ({
				type: 'file' as const,
				data: b.data,
				mimeType: b.mimeType,
				fileName: b.fileName ?? 'unnamed',
			}))
		: [];
	const attachments = [
		...fileAttachments,
		...draft.resources,
		...draft.mentions.map((draftMention) => draftMention.attachment),
	];

	submitComposerMessage(text, attachments.length ? attachments : undefined, prefill, draft);
}

function removeResource(index: number) {
	attachedResources.value = attachedResources.value.filter((_, i) => i !== index);
}

function canStartMention(): boolean {
	return (
		mentionUiEnabled.value &&
		!isBusy.value &&
		!isGatedBySetup.value &&
		!props.isAwaitingPlanReview &&
		mentionCatalog.availability.value !== 'empty' &&
		!mentionLimitReason.value
	);
}

function handleMentionInput(event: Event): void {
	if (!canStartMention()) {
		mention.close();
		return;
	}
	const target = event.target;
	if (!(target instanceof HTMLTextAreaElement)) return;
	const wasOpen = mention.isOpen.value;
	mention.handleTextInput(target.value, target.selectionStart, target.selectionEnd);
	if (!wasOpen && mention.isOpen.value) trackMentionPickerOpened('typed');
}

function handleMentionSelectionChange(selection: { start: number; end: number }): void {
	mention.handleSelectionChange(inputText.value, selection.start, selection.end);
}

function handleMentionCompositionStart(): void {
	if (mentionUiEnabled.value) mention.startComposition();
}

function handleMentionCompositionEnd(event: CompositionEvent): void {
	const target = event.target;
	if (!(target instanceof HTMLTextAreaElement) || !canStartMention()) return;
	mention.endComposition(target.value, target.selectionStart, target.selectionEnd);
}

function browseMentionWorkflow(candidate: InstanceAiMentionCandidate): void {
	if (candidate.kind !== 'workflow' || !drillableWorkflowIds.value.has(candidate.workflowId))
		return;
	browsedWorkflowId.value = candidate.workflowId;
}

function browseMentionWorkflows(): void {
	browsedWorkflowId.value = undefined;
}

function retryBrowsedWorkflow(): void {
	if (browsedWorkflowId.value) {
		mentionCatalog.retryWorkflowDetails(browsedWorkflowId.value);
	}
}

function handleMentionKeydown(event: KeyboardEvent): void {
	if (mention.isOpen.value && !mention.query.value.trim()) {
		if (event.key === 'ArrowRight' && !browsedWorkflowId.value) {
			const highlighted = mention.highlightedResult.value;
			if (
				highlighted?.kind === 'workflow' &&
				drillableWorkflowIds.value.has(highlighted.workflowId)
			) {
				event.preventDefault();
				browseMentionWorkflow(highlighted);
				return;
			}
		}
		if (event.key === 'ArrowLeft' && browsedWorkflowId.value) {
			event.preventDefault();
			browseMentionWorkflows();
			return;
		}
	}

	const restoreButtonFocus = mention.origin.value === 'button';
	const action = mention.handleKeydown(event);
	if (action?.type === 'select') selectMention(action.result, mention.highlightedIndex.value);
	if (action?.type === 'close' && restoreButtonFocus) {
		void nextTick(() => chatInputRef.value?.focus());
	}
}

function openMentionPickerFromButton(): void {
	if (!canStartMention() || mention.isOpen.value) return;
	browseMentionWorkflows();
	const selection = chatInputRef.value?.getSelection();
	mention.openFromButton(
		selection?.start ?? inputText.value.length,
		selection?.end ?? inputText.value.length,
	);
	trackMentionPickerOpened('button');
}

function handleMentionPickerOpen(open: boolean): void {
	if (!open) {
		const restoreButtonFocus = mention.origin.value === 'button';
		browseMentionWorkflows();
		mention.close();
		if (restoreButtonFocus) void nextTick(() => chatInputRef.value?.focus());
	} else if (!mention.isOpen.value) openMentionPickerFromButton();
}

function selectMention(candidate: InstanceAiMentionCandidate, position = 0): void {
	const source = candidate.source;
	const origin = mention.origin.value;
	const queryLength = mention.query.value.length;
	if (!source || !origin || mentionLimitReason.value) return;
	const edit = mention.applySelection(inputText.value, candidate.label);
	if (!edit) return;

	inputText.value = edit.value;
	emit('update:draftMentions', [...props.draftMentions, buildDraftMention(source, origin)]);
	telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_ADDED_CHAT_MENTION, {
		source: origin,
		resource_type: source.kind === 'canvas-group' ? 'canvas_group' : source.kind,
		query_length: queryLength,
		result_position: Math.max(0, position),
		surface: props.currentThreadId ? 'thread' : 'blank_chat',
	});
	if (source.kind === 'workflow') {
		emit(
			'mention-workflow-selected',
			source.workflowId,
			edit.value,
			edit.selectionStart,
			edit.selectionEnd,
		);
	}
	void nextTick(() => {
		chatInputRef.value?.setSelection(edit.selectionStart, edit.selectionEnd);
		chatInputRef.value?.focus();
	});
}

function trackMentionPickerOpened(source: 'typed' | 'button'): void {
	telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_OPENED_CHAT_MENTION_PICKER, {
		source,
		surface: props.currentThreadId ? 'thread' : 'blank_chat',
		has_open_workflow: props.durableWorkflowIds.size > 0 || props.draftMentions.length > 0,
	});
}

function removeMention(key: string): void {
	emit(
		'update:draftMentions',
		props.draftMentions.filter((draftMention) => draftMention.key !== key),
	);
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
					continue;
				}
			}
			if (outgoingAttachmentCount.value >= INSTANCE_AI_MAX_ATTACHMENTS) {
				showAttachmentLimit();
				continue;
			}
			attachedResources.value = [...attachedResources.value, attachment];
		}
	},
	{ deep: true, immediate: true },
);

function handleStop() {
	emit('stop');
}

function handleTabAutocomplete() {
	if (!inputText.value && props.contextualSuggestion) {
		// n8n wrote this follow-up, so accepting it is a pre-fill like any other.
		setPrefill({ text: props.contextualSuggestion, prefillType: 'contextual_followup' });
	}
}

function handleFilesSelected(files: File[]) {
	const remaining = INSTANCE_AI_MAX_ATTACHMENTS - outgoingAttachmentCount.value;
	if (files.length > remaining) {
		showAttachmentLimit();
		return;
	}
	attachedFiles.value.push(...files);
}

function showAttachmentLimit() {
	toast.showError(
		new Error(i18n.baseText('instanceAi.mentions.limit.attachments')),
		i18n.baseText('instanceAi.mentions.limit.title'),
	);
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
	<div :class="$style.composer">
		<ChatInputBase
			ref="chatInputRef"
			v-model="inputText"
			:class="$style.inputWrapper"
			:placeholder="placeholder"
			:is-streaming="props.isAwaitingPlanReview ? false : props.isStreaming"
			:can-submit="canSubmit"
			:disabled="isGatedBySetup"
			:autosize="resizable"
			:button-label="props.submitLabel"
			:active-requires-focus="props.submitActiveRequiresFocus"
			:max-length="EXTENDED_PROMPT_MAX_LENGTH"
			show-voice
			:show-attach="!props.isAwaitingPlanReview"
			:show-attach-button="false"
			:attached-encoded-bytes="attachedEncodedBytes"
			:textarea-attributes="mentionTextareaAttributes"
			@submit="handleSubmit"
			@stop="handleStop"
			@tab="handleTabAutocomplete"
			@files-selected="handleFilesSelected"
			@input="handleMentionInput"
			@keydown="handleMentionKeydown"
			@compositionstart="handleMentionCompositionStart"
			@compositionend="handleMentionCompositionEnd"
			@selection-change="handleMentionSelectionChange"
		>
			<template #attachments>
				<div
					v-if="props.contextChip"
					:class="$style.contextChip"
					:data-test-id="props.contextChip.testId ?? 'instance-ai-handoff-context-chip'"
				>
					<N8nTag :text="props.contextChip.label" :clickable="false" size="lg">
						<template #tag>
							<span :class="$style.contextChipContent">
								<N8nIcon
									:icon="props.contextChip.icon ?? 'robot'"
									size="medium"
									:class="$style.contextChipIcon"
									data-test-id="instance-ai-handoff-context-chip-icon"
								/>
								<span :class="$style.contextChipText">{{ props.contextChip.label }}</span>
							</span>
							<N8nIconButton
								icon="x"
								size="xsmall"
								variant="ghost"
								:class="$style.contextChipClose"
								:title="i18n.baseText('generic.close')"
								:aria-label="i18n.baseText('generic.close')"
								data-test-id="instance-ai-handoff-context-chip-dismiss"
								@click.stop="emit('dismiss-context-chip')"
							/>
						</template>
					</N8nTag>
				</div>
				<div v-if="props.draftMentions.length > 0" :class="$style.attachments">
					<InstanceAiMentionChip
						v-for="draftMention in props.draftMentions"
						:key="draftMention.key"
						:mention="draftMention"
						@remove="removeMention(draftMention.key)"
					/>
				</div>
				<div v-if="attachedResources.length > 0" :class="$style.attachments">
					<AttachmentPreview
						v-for="(attachment, index) in attachedResources"
						:key="`res-${index}`"
						:attachment="attachment"
						:is-removable="true"
						@remove-resource="removeResource(index)"
						@update:attachment="attachedResources[index] = $event"
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
					@attach-files="chatInputRef?.openFilePicker()"
				/>
			</template>
			<template v-if="mentionUiEnabled" #right-actions>
				<InstanceAiMentionPicker
					:open="mention.isOpen.value"
					:origin="mention.origin.value"
					:query="mention.query.value"
					:candidates="mentionCandidates"
					:browsed-workflow="browsedWorkflow"
					:drillable-workflow-ids="drillableWorkflowIds"
					:workflow-details-loaded="workflowDetailsLoaded"
					:workflow-details-error="workflowDetailsError"
					:highlighted-id="mention.highlightedId.value"
					:anchor="chatInputRef?.getTextareaElement()"
					:availability="mentionCatalog.availability.value"
					:loading="mentionCatalog.isLoadingWorkflows.value"
					:error="mentionCatalog.workflowError.value"
					:limit-reason="mentionLimitReason"
					@update:open="handleMentionPickerOpen"
					@update:query="mention.setQuery"
					@highlight="mention.setHighlightedId"
					@keydown="handleMentionKeydown"
					@browse-workflow="browseMentionWorkflow"
					@browse-workflows="browseMentionWorkflows"
					@select="selectMention"
					@retry="mentionCatalog.retry"
					@retry-workflow="retryBrowsedWorkflow"
				>
					<template #trigger>
						<N8nTooltip as-child :content="mentionButtonTooltip" placement="top">
							<span
								:tabindex="mentionButtonDisabled ? 0 : -1"
								:aria-label="mentionButtonDisabled ? mentionButtonTooltip : undefined"
							>
								<N8nIconButton
									variant="ghost"
									icon="at-sign"
									icon-size="large"
									:disabled="mentionButtonDisabled"
									:aria-label="i18n.baseText('instanceAi.mentions.button.label')"
									data-test-id="instance-ai-mention-button"
									@click.stop="openMentionPickerFromButton"
								/>
							</span>
						</N8nTooltip>
					</template>
				</InstanceAiMentionPicker>
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
	gap: var(--spacing--2xs);
}

.contextChip {
	--tag--min-width: 0;
	--tag--max-width: 80%;

	align-self: flex-start;
	max-width: 100%;
}

.contextChipContent {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	line-height: var(--line-height--xs);
	overflow: hidden;
}

.contextChipIcon {
	flex-shrink: 0;
}

.contextChipText {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	line-height: 1.2;
}

.contextChipClose {
	flex: 0 0 auto;
	margin-right: calc(var(--spacing--2xs) * -1);
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
