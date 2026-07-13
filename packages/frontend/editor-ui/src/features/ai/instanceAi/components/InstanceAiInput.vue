<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, ref, watch, type Component } from 'vue';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { N8nIcon, N8nTag } from '@n8n/design-system';
import type { ITelemetryTrackProperties } from 'n8n-workflow';
import ChatInputBase from '@/features/ai/shared/components/ChatInputBase.vue';
import { EXTENDED_PROMPT_MAX_LENGTH } from '@/features/ai/shared/constants';
import AttachmentPreview from './AttachmentPreview.vue';
import InstanceAiPromptSuggestions from './InstanceAiPromptSuggestions.vue';
import { convertFileToBinaryData } from '@/app/utils/fileUtils';
import type { InstanceAiAttachment } from '@n8n/api-types';
import { INSTANCE_AI_EMPTY_STATE_SUGGESTIONS_VERSION } from '../emptyStateSuggestions';
import { useInstanceAiPromptSuggestionsTelemetry } from '../instanceAiPromptSuggestions.telemetry';

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
const SUGGESTIONS_TRANSITION_DURATION = { enter: 450, leave: 320 };
const DEFAULT_AUTOSIZE_ROWS = 3;
const DEFAULT_MAX_AUTOSIZE_ROWS = 6;

const props = withDefaults(
	defineProps<{
		isStreaming?: boolean;
		isSubmitting?: boolean;
		isAwaitingConfirmation?: boolean;
		isPlanEditMode?: boolean;
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
	}>(),
	{
		isStreaming: false,
		isSubmitting: false,
		isAwaitingConfirmation: false,
		isPlanEditMode: false,
		currentThreadId: '',
		amendContext: null,
		contextualSuggestion: null,
		isWorkflowBuilderAvailable: true,
		previewPromptKey: null,
		fixedRows: null,
		submitLabel: undefined,
		submitActiveRequiresFocus: false,
	},
);

const emit = defineEmits<{
	submit: [message: string, attachments?: InstanceAiAttachment[]];
	stop: [];
	'cancel-plan-edit': [];
	'workflow-preview': [workflowFile: string | null];
	// Experiment cleanup: remove with instanceAiSplitEmptyState.
	// Fires when the composer goes between empty and non-empty so the split
	// empty state can pause its cycling placeholders only once the user types
	// (auto-focus on mount must NOT pause the cycle).
	'content-change': [hasContent: boolean];
}>();

const i18n = useI18n();
const promptSuggestionsTelemetry = useInstanceAiPromptSuggestionsTelemetry();
const inputText = ref('');
const attachedFiles = ref<File[]>([]);
const chatInputRef = ref<InstanceType<typeof ChatInputBase> | null>(null);
// Experiment cleanup: remove with instanceAiPromptSuggestionsV2.
const previewPrompt = ref<string | null>(null);
const selectedSuggestionDraft = ref<SelectedSuggestionDraft | null>(null);

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
}

function setText(text: string) {
	inputText.value = text;
}

defineExpose({
	focus,
	appendText,
	setText,
	// Experiment cleanup: remove with instanceAiSplitEmptyState.
	insertSuggestion: handleSuggestionInsert,
	submitSuggestion,
});

const isBusy = computed(() =>
	props.isPlanEditMode ? props.isSubmitting : props.isStreaming || props.isSubmitting,
);
const hasNonWhitespaceDraftText = computed(() => inputText.value.trim().length > 0);
const isInputVisuallyEmpty = computed(() => inputText.value.length === 0);
const hasAttachments = computed(() => attachedFiles.value.length > 0);
const isComposerDirty = computed(() => hasNonWhitespaceDraftText.value || hasAttachments.value);
// Experiment cleanup: remove with instanceAiSplitEmptyState.
watch(isComposerDirty, (hasContent) => emit('content-change', hasContent));
const isGatedBySetup = computed(
	() => props.isAwaitingConfirmation || !props.isWorkflowBuilderAvailable,
);
const canSubmit = computed(() => isComposerDirty.value && !isBusy.value && !isGatedBySetup.value);
const canShowSuggestions = computed(
	() =>
		Boolean(props.suggestions?.length) &&
		!props.isPlanEditMode &&
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
	if (props.isPlanEditMode) {
		return i18n.baseText('instanceAi.input.planEditPlaceholder' as BaseTextKey);
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
	}
});

watch(
	() => props.isPlanEditMode,
	(isPlanEditMode, wasPlanEditMode) => {
		if (isPlanEditMode || wasPlanEditMode) {
			previewPrompt.value = null;
			resetDraftComposer();
		}
	},
);

function emitSubmittedMessage(message: string, attachments?: InstanceAiAttachment[]) {
	previewPrompt.value = null;
	emit('submit', message, attachments);
}

function resetDraftComposer() {
	inputText.value = '';
	attachedFiles.value = [];
}

function canSubmitMessage(message: string, attachmentCount = 0) {
	return (message.length > 0 || attachmentCount > 0) && !isBusy.value && !isGatedBySetup.value;
}

function submitComposerMessage(message: string, attachments?: InstanceAiAttachment[]) {
	if (!canSubmitMessage(message, attachments?.length ?? 0)) {
		return;
	}

	trackSelectedSuggestionSubmitted(message);
	emitSubmittedMessage(message, attachments);
	resetDraftComposer();
}

// Experiment cleanup: remove with instanceAiSplitEmptyState. A split example row
// click sends the prompt directly — attribute the submit (unedited) without a
// separate 'selected' event, since there is no insert step.
function submitSuggestion(payload: SuggestionSelectionPayload) {
	const prompt = getSuggestionPrompt(payload);
	selectedSuggestionDraft.value = { ...payload, originalPrompt: prompt };
	submitComposerMessage(prompt);
}

async function handleSubmit() {
	const text = inputText.value.trim();
	if (!canSubmitMessage(text, attachedFiles.value.length)) {
		return;
	}

	let attachments: InstanceAiAttachment[] | undefined;
	if (attachedFiles.value.length > 0) {
		const binaryData = await Promise.all(attachedFiles.value.map(convertFileToBinaryData));
		attachments = binaryData.map((b) => ({
			type: 'file' as const,
			data: b.data,
			mimeType: b.mimeType,
			fileName: b.fileName ?? 'unnamed',
		}));
	}

	submitComposerMessage(text, attachments);
}

function handleStop() {
	emit('stop');
}

function handleTabAutocomplete() {
	if (!inputText.value && props.contextualSuggestion) {
		inputText.value = props.contextualSuggestion;
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
			:class="{ [$style.planEditInput]: props.isPlanEditMode, [$style.inputWrapper]: true }"
			:placeholder="placeholder"
			:is-streaming="props.isPlanEditMode ? false : props.isStreaming"
			:can-submit="canSubmit"
			:disabled="isGatedBySetup"
			:autosize="resizable"
			:button-label="props.submitLabel"
			:active-requires-focus="props.submitActiveRequiresFocus"
			:max-length="EXTENDED_PROMPT_MAX_LENGTH"
			show-voice
			:show-attach="!props.isPlanEditMode"
			@submit="handleSubmit"
			@stop="handleStop"
			@tab="handleTabAutocomplete"
			@files-selected="handleFilesSelected"
		>
			<template #attachments>
				<div
					v-if="props.isPlanEditMode"
					:class="$style.contextChip"
					data-test-id="instance-ai-plan-edit-context"
				>
					<N8nTag
						:text="i18n.baseText('instanceAi.planReview.askForEdits')"
						:clickable="false"
						size="lg"
					>
						<template #tag>
							<span :class="$style.contextChipContent">
								<N8nIcon icon="corner-down-right" size="small" />
								<span :class="$style.contextChipText">{{
									i18n.baseText('instanceAi.planReview.askForEdits')
								}}</span>
								<button
									type="button"
									:class="$style.contextChipClose"
									:title="i18n.baseText('generic.close')"
									:aria-label="i18n.baseText('generic.close')"
									data-test-id="instance-ai-plan-edit-cancel"
									@click.stop="emit('cancel-plan-edit')"
								>
									<N8nIcon icon="x" size="xsmall" />
								</button>
							</span>
						</template>
					</N8nTag>
				</div>
				<div v-else-if="attachedFiles.length > 0" :class="$style.attachments">
					<AttachmentPreview
						v-for="(file, index) in attachedFiles"
						:key="index"
						:file="file"
						:is-removable="true"
						@remove="handleFileRemove"
					/>
				</div>
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
	align-self: flex-start;
	max-width: 100%;
}

.contextChipContent {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	line-height: var(--line-height--xs);
}

.contextChipText {
	white-space: nowrap;
}

.contextChipClose {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex: 0 0 auto;
	width: var(--spacing--xs);
	height: var(--spacing--xs);
	padding: 0;
	color: inherit;
	cursor: pointer;
	background: none;
	border: 0;
	border-radius: var(--radius--3xs);
}

.planEditInput {
	gap: var(--spacing--2xs);
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
