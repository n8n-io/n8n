<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { N8nTooltip } from '@n8n/design-system';
import ChatInputBase from '@/features/ai/shared/components/ChatInputBase.vue';
import AttachmentPreview from './AttachmentPreview.vue';
import InstanceAiPromptSuggestions from './InstanceAiPromptSuggestions.vue';
import { convertFileToBinaryData } from '@/app/utils/fileUtils';
import { useInstanceAiStore } from '../instanceAi.store';
import type { InstanceAiAttachment } from '@n8n/api-types';
import type { InstanceAiEmptyStateSuggestion } from '../emptyStateSuggestions';
import { useInstanceAiPromptSuggestionsTelemetry } from '../instanceAiPromptSuggestions.telemetry';

const props = defineProps<{
	isStreaming: boolean;
	suggestions?: readonly InstanceAiEmptyStateSuggestion[];
}>();

const emit = defineEmits<{
	submit: [message: string, attachments?: InstanceAiAttachment[]];
	stop: [];
}>();

const i18n = useI18n();
const store = useInstanceAiStore();
const promptSuggestionsTelemetry = useInstanceAiPromptSuggestionsTelemetry();
const inputText = ref('');
const attachedFiles = ref<File[]>([]);
const chatInputRef = ref<InstanceType<typeof ChatInputBase> | null>(null);
const previewPromptKey = ref<BaseTextKey | null>(null);

defineExpose({
	focus: () => chatInputRef.value?.focus(),
});

const isBusy = computed(() => props.isStreaming || store.isSendingMessage);
const hasNonWhitespaceDraftText = computed(() => inputText.value.trim().length > 0);
const isInputVisuallyEmpty = computed(() => inputText.value.length === 0);
const hasAttachments = computed(() => attachedFiles.value.length > 0);
const isComposerDirty = computed(() => hasNonWhitespaceDraftText.value || hasAttachments.value);
const isGatedBySetup = computed(() => store.isAwaitingConfirmation);
const canSubmit = computed(() => isComposerDirty.value && !isBusy.value && !isGatedBySetup.value);
const canShowSuggestions = computed(
	() =>
		Boolean(props.suggestions?.length) &&
		!isComposerDirty.value &&
		!isBusy.value &&
		!isGatedBySetup.value,
);
const visibleSuggestionThreadId = computed(() =>
	canShowSuggestions.value ? store.currentThreadId : null,
);

const placeholder = computed(() => {
	if (isGatedBySetup.value) {
		return i18n.baseText('instanceAi.input.suspendedPlaceholder');
	}
	if (previewPromptKey.value && isInputVisuallyEmpty.value) {
		return i18n.baseText(previewPromptKey.value);
	}
	if (store.amendContext) {
		return i18n.baseText('instanceAi.input.amendPlaceholder', {
			interpolate: { role: store.amendContext.role },
		});
	}
	if (store.contextualSuggestion) {
		return store.contextualSuggestion;
	}
	return i18n.baseText('instanceAi.input.placeholder');
});

watch(
	visibleSuggestionThreadId,
	(threadId) => {
		if (threadId) {
			promptSuggestionsTelemetry.trackSuggestionsShown({
				threadId,
				researchMode: store.researchMode,
			});
			return;
		}

		previewPromptKey.value = null;
	},
	{ immediate: true },
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
	if (!inputText.value && store.contextualSuggestion) {
		inputText.value = store.contextualSuggestion;
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
		threadId: store.currentThreadId,
		researchMode: store.researchMode,
	};
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

function handleSuggestionSubmit(payload: {
	promptKey: BaseTextKey;
	suggestionId: string;
	suggestionKind: 'prompt' | 'quick_example';
	position: number;
}) {
	promptSuggestionsTelemetry.trackSuggestionSelected({
		...getTelemetryContext(),
		suggestionId: payload.suggestionId,
		suggestionKind: payload.suggestionKind,
		position: payload.position,
	});
	submitComposerMessage(i18n.baseText(payload.promptKey));
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
		<ChatInputBase
			ref="chatInputRef"
			v-model="inputText"
			:placeholder="placeholder"
			:is-streaming="props.isStreaming"
			:can-submit="canSubmit"
			:disabled="isGatedBySetup"
			:autosize="resizable"
			show-voice
			show-attach
			@submit="handleSubmit"
			@stop="handleStop"
			@tab="handleTabAutocomplete"
			@files-selected="handleFilesSelected"
		>
			<template v-if="attachedFiles.length > 0" #attachments>
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
			<template #footer-start>
				<N8nTooltip
					:content="i18n.baseText('instanceAi.input.researchToggle.tooltip')"
					placement="top"
					:show-after="300"
				>
					<button
						:class="[$style.researchToggle, { [$style.active]: store.researchMode }]"
						data-test-id="instance-ai-research-toggle"
						@click="store.toggleResearchMode()"
					>
						<svg
							:class="$style.researchIcon"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 16 16"
							fill="currentColor"
						>
							<path
								d="M6.5 1a5.5 5.5 0 0 1 4.383 8.823l3.897 3.897a.75.75 0 0 1-1.06 1.06l-3.897-3.897A5.5 5.5 0 1 1 6.5 1Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
							/>
						</svg>
						{{ i18n.baseText('instanceAi.input.researchToggle') }}
					</button>
				</N8nTooltip>
			</template>
		</ChatInputBase>
		<Transition name="suggestions-fade">
			<InstanceAiPromptSuggestions
				v-if="canShowSuggestions && props.suggestions"
				:suggestions="props.suggestions"
				:disabled="isBusy || isGatedBySetup"
				@preview-change="previewPromptKey = $event"
				@quick-examples-opened="handleQuickExamplesOpened"
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

.researchToggle {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: transparent;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	cursor: pointer;
	transition:
		background 0.15s,
		color 0.15s,
		border-color 0.15s;
	user-select: none;

	&:hover {
		color: var(--color--text);
		border-color: var(--color--foreground--shade-1);
	}

	&.active {
		background: var(--color--primary);
		color: var(--button--color--text--primary);
		border-color: var(--color--primary);

		&:hover {
			background: var(--color--primary--shade-1);
			border-color: var(--color--primary--shade-1);
		}
	}
}

.researchIcon {
	width: 14px;
	height: 14px;
	flex-shrink: 0;
}

:global(.suggestions-fade-enter-active),
:global(.suggestions-fade-leave-active) {
	transition:
		opacity 0.15s ease,
		transform 0.15s ease;
}

:global(.suggestions-fade-enter-from),
:global(.suggestions-fade-leave-to) {
	opacity: 0;
	transform: translateY(-4px);
}
</style>
