<script lang="ts" setup>
import { computed, nextTick, ref, watch, type Component } from 'vue';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { N8nIcon, N8nIconButton } from '@n8n/design-system';
import ChatInputBase from '@/features/ai/shared/components/ChatInputBase.vue';
import AttachmentPreview from './AttachmentPreview.vue';
import InstanceAiPromptSuggestions from './InstanceAiPromptSuggestions.vue';
import { convertFileToBinaryData } from '@/app/utils/fileUtils';
import type { InstanceAiAttachment } from '@n8n/api-types';
import {
	INSTANCE_AI_EMPTY_STATE_SUGGESTIONS_VERSION,
	type InstanceAiEmptyStateSuggestion,
} from '../emptyStateSuggestions';
import { useInstanceAiPromptSuggestionsTelemetry } from '../instanceAiPromptSuggestions.telemetry';

type AmendContext = { agentId: string; role: string } | null;
type SuggestionSelectionPayload = {
	promptKey: BaseTextKey;
	suggestionId: string;
	suggestionKind: 'prompt' | 'quick_example';
	position: number;
};
// Experiment cleanup: remove with instanceAiPromptSuggestionsV2.
type SelectedSuggestionDraft = SuggestionSelectionPayload & {
	originalPrompt: string;
};
// Experiment cleanup: remove with instanceAiPromptSuggestionsV2.
type SuggestionsCyclePayload = {
	visibleSuggestionIds: string[];
	cycleCount: number;
};
const SUGGESTIONS_TRANSITION_DURATION = { enter: 450, leave: 320 };

const props = withDefaults(
	defineProps<{
		isStreaming?: boolean;
		isSubmitting?: boolean;
		isAwaitingConfirmation?: boolean;
		isPlanEditMode?: boolean;
		currentThreadId?: string;
		amendContext?: AmendContext;
		contextualSuggestion?: string | null;
		suggestions?: readonly InstanceAiEmptyStateSuggestion[];
		// Experiment cleanup: remove with instanceAiPromptSuggestionsV2.
		suggestionsComponent?: Component;
		suggestionCatalogVersion?: string;
		placeholderKey?: BaseTextKey;
	}>(),
	{
		isStreaming: false,
		isSubmitting: false,
		isAwaitingConfirmation: false,
		isPlanEditMode: false,
		currentThreadId: '',
		amendContext: null,
		contextualSuggestion: null,
	},
);

const emit = defineEmits<{
	submit: [message: string, attachments?: InstanceAiAttachment[]];
	stop: [];
	'cancel-plan-edit': [];
}>();

const i18n = useI18n();
const promptSuggestionsTelemetry = useInstanceAiPromptSuggestionsTelemetry();
const inputText = ref('');
const attachedFiles = ref<File[]>([]);
const chatInputRef = ref<InstanceType<typeof ChatInputBase> | null>(null);
const previewPromptKey = ref<BaseTextKey | null>(null);
// Experiment cleanup: remove with instanceAiPromptSuggestionsV2.
const selectedSuggestionDraft = ref<SelectedSuggestionDraft | null>(null);

defineExpose({
	focus: () => chatInputRef.value?.focus(),
});

const isBusy = computed(() =>
	props.isPlanEditMode ? props.isSubmitting : props.isStreaming || props.isSubmitting,
);
const hasNonWhitespaceDraftText = computed(() => inputText.value.trim().length > 0);
const isInputVisuallyEmpty = computed(() => inputText.value.length === 0);
const hasAttachments = computed(() => attachedFiles.value.length > 0);
const isComposerDirty = computed(() => hasNonWhitespaceDraftText.value || hasAttachments.value);
const isGatedBySetup = computed(() => props.isAwaitingConfirmation);
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
	if (isGatedBySetup.value) {
		return i18n.baseText('instanceAi.input.suspendedPlaceholder');
	}
	if (props.isPlanEditMode) {
		return i18n.baseText('instanceAi.input.planEditPlaceholder' as BaseTextKey);
	}
	if (previewPromptKey.value && isInputVisuallyEmpty.value) {
		return i18n.baseText(previewPromptKey.value);
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
			});
			return;
		}

		previewPromptKey.value = null;
	},
	{ immediate: true },
);

// Experiment cleanup: remove with instanceAiPromptSuggestionsV2.
watch(inputText, (text) => {
	if (text.length === 0) {
		selectedSuggestionDraft.value = null;
	}
});

watch(
	() => props.isPlanEditMode,
	(isPlanEditMode, wasPlanEditMode) => {
		if (isPlanEditMode || wasPlanEditMode) {
			previewPromptKey.value = null;
			resetDraftComposer();
		}
	},
);

function emitSubmittedMessage(message: string, attachments?: InstanceAiAttachment[]) {
	previewPromptKey.value = null;
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

async function handleSubmit() {
	const text = inputText.value.trim();
	if (!canSubmitMessage(text, attachedFiles.value.length)) {
		return;
	}

	let attachments: InstanceAiAttachment[] | undefined;
	if (attachedFiles.value.length > 0) {
		const binaryData = await Promise.all(attachedFiles.value.map(convertFileToBinaryData));
		attachments = binaryData.map((b) => ({
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

function getTelemetryContext() {
	return {
		threadId: props.currentThreadId || undefined,
		suggestionCatalogVersion: resolvedSuggestionCatalogVersion.value,
	};
}

// Experiment cleanup: remove with instanceAiPromptSuggestionsV2.
function trackSelectedSuggestionSubmitted(message: string) {
	const selectedSuggestion = selectedSuggestionDraft.value;
	if (!selectedSuggestion) {
		return;
	}

	promptSuggestionsTelemetry.trackSuggestionSubmitted({
		...getTelemetryContext(),
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
		...getTelemetryContext(),
		suggestionId: payload.suggestionId,
		suggestionKind: payload.suggestionKind,
		position: payload.position,
	});
}

// Experiment cleanup: remove with instanceAiPromptSuggestionsV2.
function handleSuggestionsCycled(payload: SuggestionsCyclePayload) {
	promptSuggestionsTelemetry.trackSuggestionsCycled({
		suggestionCatalogVersion: resolvedSuggestionCatalogVersion.value,
		visibleSuggestionIds: payload.visibleSuggestionIds,
		cycleCount: payload.cycleCount,
	});
}

function handleSuggestionSubmit(payload: SuggestionSelectionPayload) {
	trackSuggestionSelected(payload);
	submitComposerMessage(i18n.baseText(payload.promptKey));
}

// Experiment cleanup: remove with instanceAiPromptSuggestionsV2.
async function handleSuggestionInsert(payload: SuggestionSelectionPayload) {
	trackSuggestionSelected(payload);
	previewPromptKey.value = null;
	const prompt = i18n.baseText(payload.promptKey);
	selectedSuggestionDraft.value = {
		...payload,
		originalPrompt: prompt,
	};
	inputText.value = prompt;

	await nextTick();
	chatInputRef.value?.focus();
}

const resizable = computed(() => {
	if (previewPromptKey.value) {
		return { minRows: 2, maxRows: 2 };
	}
	return undefined;
});
</script>

<template>
	<div :class="$style.composer">
		<div
			v-if="props.isPlanEditMode"
			:class="$style.contextChip"
			data-test-id="instance-ai-plan-edit-context"
		>
			<div :class="$style.contextChipLabel">
				<N8nIcon icon="message-square" size="small" />
				<span>{{ i18n.baseText('instanceAi.input.planEditContext' as BaseTextKey) }}</span>
			</div>
			<N8nIconButton
				icon="x"
				variant="ghost"
				size="xsmall"
				:title="i18n.baseText('generic.close')"
				data-test-id="instance-ai-plan-edit-cancel"
				@click="emit('cancel-plan-edit')"
			/>
		</div>
		<ChatInputBase
			ref="chatInputRef"
			v-model="inputText"
			:placeholder="placeholder"
			:is-streaming="props.isPlanEditMode ? false : props.isStreaming"
			:can-submit="canSubmit"
			:disabled="isGatedBySetup"
			:autosize="resizable"
			show-voice
			:show-attach="!props.isPlanEditMode"
			@submit="handleSubmit"
			@stop="handleStop"
			@tab="handleTabAutocomplete"
			@files-selected="handleFilesSelected"
		>
			<template v-if="attachedFiles.length > 0 && !props.isPlanEditMode" #attachments>
				<div :class="$style.attachments">
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
		<Transition name="suggestions-fade" :duration="SUGGESTIONS_TRANSITION_DURATION">
			<component
				:is="resolvedSuggestionsComponent"
				v-if="canShowSuggestions && props.suggestions"
				:suggestions="props.suggestions"
				:disabled="isBusy || isGatedBySetup"
				@preview-change="previewPromptKey = $event"
				@quick-examples-opened="handleQuickExamplesOpened"
				@cycle-suggestions="handleSuggestionsCycled"
				@insert-suggestion="handleSuggestionInsert"
				@submit-suggestion="handleSuggestionSubmit"
			/>
		</Transition>
	</div>
</template>

<style module lang="scss">
.composer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.attachments {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.contextChip {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	align-self: flex-start;
	max-width: 100%;
	padding: var(--spacing--4xs) var(--spacing--3xs) var(--spacing--4xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
	color: var(--color--text--tint-1);
	box-shadow: var(--shadow--xs);
}

.contextChipLabel {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
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
