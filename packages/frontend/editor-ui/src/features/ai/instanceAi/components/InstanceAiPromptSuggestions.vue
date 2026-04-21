<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';
import {
	isMenuSuggestion,
	isPromptSuggestion,
	type InstanceAiEmptyStateSuggestion,
} from '../emptyStateSuggestions';

const props = defineProps<{
	suggestions: readonly InstanceAiEmptyStateSuggestion[];
	disabled: boolean;
}>();

interface SubmitSuggestionPayload {
	promptKey: BaseTextKey;
	suggestionId: string;
	suggestionKind: 'prompt' | 'quick_example';
	position: number;
}

const emit = defineEmits<{
	'preview-change': [promptKey: BaseTextKey | null];
	'quick-examples-opened': [payload: { suggestionId: string; position: number }];
	'submit-suggestion': [payload: SubmitSuggestionPayload];
}>();

const i18n = useI18n();
// Current suggestions contract exposes a single menu group ("quick examples").
const quickExamplesSuggestion = computed(() => props.suggestions.find(isMenuSuggestion) ?? null);
const activePreviewPromptKey = ref<BaseTextKey | null>(null);
const isQuickExamplesOpen = ref(false);
const rootRef = ref<HTMLElement | null>(null);

function setPreview(promptKey: BaseTextKey | null) {
	activePreviewPromptKey.value = promptKey;
	emit('preview-change', promptKey);
}

function closeQuickExamples() {
	isQuickExamplesOpen.value = false;
	setPreview(null);
}

function getTopLevelPosition(suggestionId: string) {
	const index = props.suggestions.findIndex((suggestion) => suggestion.id === suggestionId);
	return index >= 0 ? index + 1 : 0;
}

function getQuickExamplePosition(exampleId: string) {
	const quickExamples = quickExamplesSuggestion.value;
	if (!quickExamples) {
		return 0;
	}

	const index = quickExamples.examples.findIndex((example) => example.id === exampleId);
	return index >= 0 ? index + 1 : 0;
}

function submitSuggestion(payload: SubmitSuggestionPayload) {
	if (props.disabled) {
		return;
	}

	closeQuickExamples();
	emit('submit-suggestion', payload);
}

function handleDocumentKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape') {
		closeQuickExamples();
	}
}

onMounted(() => {
	document.addEventListener('keydown', handleDocumentKeydown);
});

onUnmounted(() => {
	document.removeEventListener('keydown', handleDocumentKeydown);
});

onClickOutside(rootRef, closeQuickExamples);

function handleSuggestionEnter(suggestion: InstanceAiEmptyStateSuggestion) {
	if (props.disabled || !isPromptSuggestion(suggestion)) {
		return;
	}

	setPreview(suggestion.promptKey);
}

function handleSuggestionLeave(suggestion: InstanceAiEmptyStateSuggestion) {
	if (props.disabled || !isPromptSuggestion(suggestion)) {
		return;
	}

	setPreview(null);
}

function handleSuggestionFocus(suggestion: InstanceAiEmptyStateSuggestion) {
	if (props.disabled || !isPromptSuggestion(suggestion)) {
		return;
	}

	setPreview(suggestion.promptKey);
}

function handleSuggestionBlur(suggestion: InstanceAiEmptyStateSuggestion) {
	if (props.disabled || !isPromptSuggestion(suggestion)) {
		return;
	}

	setPreview(null);
}

function handleSuggestionClick(suggestion: InstanceAiEmptyStateSuggestion) {
	if (isPromptSuggestion(suggestion)) {
		submitSuggestion({
			promptKey: suggestion.promptKey,
			suggestionId: suggestion.id,
			suggestionKind: 'prompt',
			position: getTopLevelPosition(suggestion.id),
		});
		return;
	}

	if (props.disabled) {
		return;
	}

	if (isQuickExamplesOpen.value) {
		closeQuickExamples();
		return;
	}

	setPreview(null);
	isQuickExamplesOpen.value = true;
	emit('quick-examples-opened', {
		suggestionId: suggestion.id,
		position: getTopLevelPosition(suggestion.id),
	});
}

function handleQuickExampleEnter(promptKey: BaseTextKey) {
	if (props.disabled) {
		return;
	}

	setPreview(promptKey);
}

function handleQuickExampleLeave() {
	if (props.disabled) {
		return;
	}

	setPreview(null);
}
</script>

<template>
	<div ref="rootRef" :class="$style.suggestions">
		<div :class="$style.suggestionRow">
			<button
				v-for="(suggestion, index) in props.suggestions"
				:key="suggestion.id"
				type="button"
				:class="[
					$style.suggestionButton,
					isMenuSuggestion(suggestion) && $style.menuSuggestionButton,
					isMenuSuggestion(suggestion) && isQuickExamplesOpen && $style.menuSuggestionButtonActive,
				]"
				:style="{ animationDelay: `${index * 50}ms` }"
				:data-test-id="`instance-ai-suggestion-${suggestion.id}`"
				:aria-expanded="isMenuSuggestion(suggestion) ? isQuickExamplesOpen : undefined"
				:aria-haspopup="isMenuSuggestion(suggestion) ? 'dialog' : undefined"
				:disabled="props.disabled"
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
						:disabled="props.disabled"
						@click="closeQuickExamples"
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
							activePreviewPromptKey === example.promptKey && $style.quickExampleButtonActive,
						]"
						:data-test-id="`instance-ai-quick-example-${example.id}`"
						:disabled="props.disabled"
						@click="
							submitSuggestion({
								promptKey: example.promptKey,
								suggestionId: example.id,
								suggestionKind: 'quick_example',
								position: getQuickExamplePosition(example.id),
							})
						"
						@mouseenter="handleQuickExampleEnter(example.promptKey)"
						@mouseleave="handleQuickExampleLeave"
						@focus="handleQuickExampleEnter(example.promptKey)"
						@blur="handleQuickExampleLeave"
					>
						{{ i18n.baseText(example.labelKey) }}
					</button>
				</div>
			</div>
		</Transition>
	</div>
</template>

<style module lang="scss">
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
