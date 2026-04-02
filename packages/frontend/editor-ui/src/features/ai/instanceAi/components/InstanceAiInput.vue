<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { N8nIcon, N8nTooltip } from '@n8n/design-system';
import ChatInputBase from '@/features/ai/shared/components/ChatInputBase.vue';
import AttachmentPreview from './AttachmentPreview.vue';
import { convertFileToBinaryData } from '@/app/utils/fileUtils';
import { useInstanceAiStore } from '../instanceAi.store';
import type { InstanceAiAttachment } from '@n8n/api-types';
import {
	isMenuSuggestion,
	isPromptSuggestion,
	type InstanceAiEmptyStateQuickExample,
	type InstanceAiEmptyStateSuggestion,
} from '../emptyStateSuggestions';

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
const inputText = ref('');
const attachedFiles = ref<File[]>([]);
const chatInputRef = ref<InstanceType<typeof ChatInputBase> | null>(null);
const suggestionsRef = ref<HTMLElement | null>(null);
const hoveredPromptKey = ref<BaseTextKey | null>(null);
const isQuickExamplesOpen = ref(false);

defineExpose({
	focus: () => chatInputRef.value?.focus(),
});

const canSubmit = computed(
	() =>
		(inputText.value.trim().length > 0 || attachedFiles.value.length > 0) &&
		!props.isStreaming &&
		!store.isSendingMessage,
);

const showSuggestions = computed(
	() =>
		Boolean(props.suggestions?.length) &&
		inputText.value.trim().length === 0 &&
		attachedFiles.value.length === 0 &&
		!props.isStreaming &&
		!store.isSendingMessage,
);

const quickExamplesSuggestion = computed(() => props.suggestions?.find(isMenuSuggestion) ?? null);

const placeholder = computed(() => {
	if (hoveredPromptKey.value && inputText.value.length === 0) {
		return i18n.baseText(hoveredPromptKey.value);
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

watch(showSuggestions, (shouldShow) => {
	if (!shouldShow) {
		hoveredPromptKey.value = null;
		isQuickExamplesOpen.value = false;
	}
});

onClickOutside(suggestionsRef, () => {
	isQuickExamplesOpen.value = false;
});

function handleDocumentKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape') {
		isQuickExamplesOpen.value = false;
		hoveredPromptKey.value = null;
	}
}

onMounted(() => {
	document.addEventListener('keydown', handleDocumentKeydown);
});

onUnmounted(() => {
	document.removeEventListener('keydown', handleDocumentKeydown);
});

async function handleSubmit() {
	const text = inputText.value.trim();
	if ((!text && attachedFiles.value.length === 0) || props.isStreaming || store.isSendingMessage) {
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

	emit('submit', text, attachments);
	inputText.value = '';
	attachedFiles.value = [];
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

function clearHoveredPrompt() {
	hoveredPromptKey.value = null;
}

function previewPrompt(promptKey: BaseTextKey) {
	if (inputText.value.length > 0) return;

	hoveredPromptKey.value = promptKey;
}

function previewSuggestionPrompt(suggestion: InstanceAiEmptyStateSuggestion) {
	if (!isPromptSuggestion(suggestion)) return;

	previewPrompt(suggestion.promptKey);
}

function submitPrompt(promptKey: BaseTextKey) {
	if (props.isStreaming || store.isSendingMessage) return;

	hoveredPromptKey.value = null;
	isQuickExamplesOpen.value = false;
	inputText.value = '';
	emit('submit', i18n.baseText(promptKey), undefined);
}

function handleSuggestionEnter(suggestion: InstanceAiEmptyStateSuggestion) {
	previewSuggestionPrompt(suggestion);
}

function handleSuggestionLeave(suggestion: InstanceAiEmptyStateSuggestion) {
	if (isPromptSuggestion(suggestion)) {
		clearHoveredPrompt();
	}
}

function handleSuggestionFocus(suggestion: InstanceAiEmptyStateSuggestion) {
	previewSuggestionPrompt(suggestion);
}

function handleSuggestionBlur(suggestion: InstanceAiEmptyStateSuggestion) {
	if (isPromptSuggestion(suggestion)) {
		clearHoveredPrompt();
	}
}

function toggleQuickExamples() {
	if (props.isStreaming || store.isSendingMessage) return;

	hoveredPromptKey.value = null;
	isQuickExamplesOpen.value = !isQuickExamplesOpen.value;
}

function handleSuggestionClick(suggestion: InstanceAiEmptyStateSuggestion) {
	if (isPromptSuggestion(suggestion)) {
		submitPrompt(suggestion.promptKey);
		return;
	}

	toggleQuickExamples();
}

function handleQuickExampleClick(example: InstanceAiEmptyStateQuickExample) {
	submitPrompt(example.promptKey);
}

function handleQuickExampleEnter(example: InstanceAiEmptyStateQuickExample) {
	previewPrompt(example.promptKey);
}

function handleQuickExampleLeave() {
	clearHoveredPrompt();
}
</script>

<template>
	<div :class="$style.composer">
		<ChatInputBase
			ref="chatInputRef"
			v-model="inputText"
			:placeholder="placeholder"
			:is-streaming="props.isStreaming"
			:can-submit="canSubmit"
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
			<div v-if="showSuggestions" ref="suggestionsRef" :class="$style.suggestions">
				<div :class="$style.suggestionRow">
					<button
						v-for="(suggestion, index) in props.suggestions"
						:key="suggestion.id"
						type="button"
						:class="[
							$style.suggestionButton,
							isMenuSuggestion(suggestion) && $style.menuSuggestionButton,
							isMenuSuggestion(suggestion) &&
								isQuickExamplesOpen &&
								$style.menuSuggestionButtonActive,
						]"
						:style="{ animationDelay: `${index * 50}ms` }"
						:data-test-id="`instance-ai-suggestion-${suggestion.id}`"
						:aria-expanded="isMenuSuggestion(suggestion) ? isQuickExamplesOpen : undefined"
						:aria-haspopup="isMenuSuggestion(suggestion) ? 'dialog' : undefined"
						@click="handleSuggestionClick(suggestion)"
						@mouseenter="handleSuggestionEnter(suggestion)"
						@mouseleave="handleSuggestionLeave(suggestion)"
						@focus="handleSuggestionFocus(suggestion)"
						@blur="handleSuggestionBlur(suggestion)"
					>
						<N8nIcon :icon="suggestion.icon" :size="12" :class="$style.suggestionIcon" />
						<span>{{ i18n.baseText(suggestion.labelKey) }}</span>
						<N8nIcon
							v-if="isMenuSuggestion(suggestion)"
							:icon="isQuickExamplesOpen ? 'chevron-up' : 'chevron-down'"
							:size="12"
							:class="$style.suggestionChevron"
						/>
					</button>
				</div>
				<Transition name="quick-examples-fade">
					<div
						v-if="isQuickExamplesOpen && quickExamplesSuggestion"
						:class="$style.quickExamplesPanel"
						data-test-id="instance-ai-quick-examples-panel"
					>
						<div :class="$style.quickExamplesHeader">
							<div :class="$style.quickExamplesTitle">
								<N8nIcon :icon="quickExamplesSuggestion.icon" :size="14" />
								{{ i18n.baseText(quickExamplesSuggestion.labelKey) }}
							</div>
							<button
								type="button"
								:class="$style.quickExamplesClose"
								:aria-label="i18n.baseText('instanceAi.emptyState.quickExamples.close')"
								@click="isQuickExamplesOpen = false"
							>
								<N8nIcon icon="x" :size="14" />
							</button>
						</div>
						<div :class="$style.quickExamplesList">
							<button
								v-for="example in quickExamplesSuggestion.examples"
								:key="example.id"
								type="button"
								:class="[
									$style.quickExampleButton,
									hoveredPromptKey === example.promptKey && $style.quickExampleButtonActive,
								]"
								:data-test-id="`instance-ai-quick-example-${example.id}`"
								@click="handleQuickExampleClick(example)"
								@mouseenter="handleQuickExampleEnter(example)"
								@mouseleave="handleQuickExampleLeave"
								@focus="handleQuickExampleEnter(example)"
								@blur="handleQuickExampleLeave"
							>
								{{ i18n.baseText(example.labelKey) }}
							</button>
						</div>
					</div>
				</Transition>
			</div>
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

.suggestions {
	position: relative;
	width: 100%;
}

.suggestionRow {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: var(--spacing--2xs);
	width: 100%;
}

.suggestionButton {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--3xs) var(--spacing--xs);
	border: var(--border-width) var(--border-style) transparent;
	border-radius: var(--radius--xl);
	background: var(--color--foreground--tint-2);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	line-height: var(--line-height--sm);
	cursor: pointer;
	animation: suggestionSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
	transition:
		border-color 0.15s ease,
		background-color 0.15s ease,
		color 0.15s ease,
		box-shadow 0.15s ease,
		transform 0.15s ease;

	&:hover,
	&:focus-visible {
		color: color-mix(in srgb, var(--color--primary) 68%, var(--color--text));
		border-color: color-mix(in srgb, var(--color--primary) 28%, var(--color--foreground--tint-1));
		background: color-mix(in srgb, var(--color--primary) 12%, var(--color--foreground--tint-2));
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.06);
		transform: translateY(-1px);
	}

	&:active {
		transform: translateY(0);
		box-shadow: none;
	}
}

.menuSuggestionButton {
	padding-right: var(--spacing--2xs);
}

.menuSuggestionButtonActive {
	color: color-mix(in srgb, var(--color--primary) 68%, var(--color--text));
	border-color: color-mix(in srgb, var(--color--primary) 28%, var(--color--foreground--tint-1));
	background: color-mix(in srgb, var(--color--primary) 12%, var(--color--foreground--tint-2));
	box-shadow: 0 1px 3px rgb(0 0 0 / 0.06);
}

.suggestionIcon {
	opacity: 0.7;
	flex-shrink: 0;
	transition: opacity 0.15s ease;

	.suggestionButton:hover &,
	.suggestionButton:focus-visible &,
	.menuSuggestionButtonActive & {
		opacity: 1;
	}
}

.suggestionChevron {
	opacity: 0.6;
	margin-left: calc(var(--spacing--4xs) * -1);
}

.quickExamplesPanel {
	position: absolute;
	inset: 0 0 auto;
	z-index: 1;
	overflow: hidden;
	border-radius: var(--radius--2xl);
	border: 1px solid var(--color--foreground--tint-1);
	background: var(--color--background--light-3);
	box-shadow:
		0 18px 44px rgb(0 0 0 / 0.08),
		0 2px 8px rgb(0 0 0 / 0.04);
}

.quickExamplesHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm) var(--spacing--sm) var(--spacing--2xs);
	border-bottom: 1px solid color-mix(in srgb, var(--color--foreground--tint-2) 75%, transparent);
}

.quickExamplesTitle {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	color: var(--color--text);
}

.quickExamplesClose {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	padding: 0;
	border: 0;
	border-radius: var(--radius--md);
	background: transparent;
	color: var(--color--text--tint-1);
	cursor: pointer;
	transition:
		background-color 0.15s ease,
		color 0.15s ease;

	&:hover,
	&:focus-visible {
		background: var(--color--foreground--tint-2);
		color: var(--color--text);
	}
}

.quickExamplesList {
	display: flex;
	flex-direction: column;
	padding-bottom: var(--spacing--2xs);
}

.quickExampleButton {
	padding: var(--spacing--sm) var(--spacing--md);
	border: 0;
	border-top: 1px solid var(--color--foreground--tint-2);
	background: transparent;
	color: var(--color--text--tint-1);
	text-align: left;
	font-size: var(--font-size--sm);
	font-family: var(--font-family);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--md);
	cursor: pointer;
	transition:
		background-color 0.15s ease,
		color 0.15s ease,
		padding-left 0.15s ease;

	&:first-child {
		border-top: 0;
	}

	&:hover,
	&:focus-visible,
	&.quickExampleButtonActive {
		background: color-mix(in srgb, var(--color--primary) 10%, var(--color--background--light-3));
		color: color-mix(in srgb, var(--color--primary) 18%, var(--color--text));
		padding-left: calc(var(--spacing--md) + var(--spacing--4xs));
	}
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

:global(.quick-examples-fade-enter-active),
:global(.quick-examples-fade-leave-active) {
	transition:
		opacity 0.15s ease,
		transform 0.15s ease;
}

:global(.quick-examples-fade-enter-from),
:global(.quick-examples-fade-leave-to) {
	opacity: 0;
	transform: translateY(4px);
}

@keyframes suggestionSlideIn {
	from {
		opacity: 0;
		transform: translateY(6px);
	}

	to {
		opacity: 1;
		transform: translateY(0);
	}
}
</style>
