<script lang="ts" setup>
import { N8nIcon, N8nTooltip, type IconName } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, onUnmounted, ref } from 'vue';

const VISIBLE_SUGGESTION_COUNT = 4;
const PREVIEW_HOVER_DELAY_MS = 300;
const SUGGESTION_ENTER_STAGGER_MS = 50;
const SUGGESTION_LEAVE_STAGGER_MS = 35;

interface InstanceAiPromptSuggestionV2 {
	id: string;
	icon: IconName;
	labelKey: BaseTextKey;
	promptKey: BaseTextKey;
}

const props = defineProps<{
	suggestions: readonly InstanceAiPromptSuggestionV2[];
	disabled: boolean;
}>();

interface InsertSuggestionPayload {
	promptKey: BaseTextKey;
	suggestionId: string;
	suggestionKind: 'prompt';
	position: number;
}

interface CycleSuggestionsPayload {
	visibleSuggestionIds: string[];
	cycleCount: number;
}

const emit = defineEmits<{
	'preview-change': [promptKey: BaseTextKey | null];
	'insert-suggestion': [payload: InsertSuggestionPayload];
	'cycle-suggestions': [payload: CycleSuggestionsPayload];
}>();

const i18n = useI18n();
const startIndex = ref(0);
const cycleCount = ref(0);
let hoverTimer: ReturnType<typeof setTimeout> | null = null;

const canCycleSuggestions = computed(() => props.suggestions.length > VISIBLE_SUGGESTION_COUNT);
function getVisibleSuggestionsFromIndex(index: number) {
	const nextSuggestions: InstanceAiPromptSuggestionV2[] = [];

	for (let offset = 0; offset < VISIBLE_SUGGESTION_COUNT; offset++) {
		const suggestionIndex = (index + offset) % props.suggestions.length;
		const suggestion = props.suggestions[suggestionIndex];

		if (suggestion) {
			nextSuggestions.push(suggestion);
		}
	}

	return nextSuggestions;
}

const visibleSuggestions = computed(() => {
	if (!canCycleSuggestions.value) {
		return props.suggestions;
	}

	return getVisibleSuggestionsFromIndex(startIndex.value);
});
const visibleSuggestionButtonCount = computed(
	() => visibleSuggestions.value.length + (canCycleSuggestions.value ? 1 : 0),
);

function getSuggestionButtonStyle(index: number) {
	const reverseIndex = visibleSuggestionButtonCount.value - index - 1;

	return {
		'--suggestion-index': String(index),
		'--suggestion-count': String(visibleSuggestionButtonCount.value),
		'--suggestion-enter-delay': `${index * SUGGESTION_ENTER_STAGGER_MS}ms`,
		'--suggestion-leave-delay': `${reverseIndex * SUGGESTION_LEAVE_STAGGER_MS}ms`,
	};
}

function clearHoverTimer() {
	if (!hoverTimer) {
		return;
	}

	clearTimeout(hoverTimer);
	hoverTimer = null;
}

function setPreview(promptKey: BaseTextKey | null) {
	emit('preview-change', promptKey);
}

function getSuggestionPosition(suggestionId: string) {
	const index = props.suggestions.findIndex((suggestion) => suggestion.id === suggestionId);
	return index >= 0 ? index + 1 : 0;
}

function handleSuggestionEnter(suggestion: InstanceAiPromptSuggestionV2) {
	if (props.disabled) {
		return;
	}

	clearHoverTimer();
	hoverTimer = setTimeout(() => {
		hoverTimer = null;
		setPreview(suggestion.promptKey);
	}, PREVIEW_HOVER_DELAY_MS);
}

function clearPreview() {
	clearHoverTimer();
	setPreview(null);
}

function handleSuggestionFocus(suggestion: InstanceAiPromptSuggestionV2) {
	if (props.disabled) {
		return;
	}

	clearHoverTimer();
	setPreview(suggestion.promptKey);
}

function handleSuggestionClick(suggestion: InstanceAiPromptSuggestionV2) {
	if (props.disabled) {
		return;
	}

	clearPreview();
	emit('insert-suggestion', {
		promptKey: suggestion.promptKey,
		suggestionId: suggestion.id,
		suggestionKind: 'prompt',
		position: getSuggestionPosition(suggestion.id),
	});
}

function cycleSuggestions() {
	if (props.disabled || !canCycleSuggestions.value) {
		return;
	}

	clearPreview();
	const nextStartIndex = (startIndex.value + VISIBLE_SUGGESTION_COUNT) % props.suggestions.length;
	const nextVisibleSuggestions = getVisibleSuggestionsFromIndex(nextStartIndex);
	cycleCount.value += 1;
	startIndex.value = nextStartIndex;

	emit('cycle-suggestions', {
		visibleSuggestionIds: nextVisibleSuggestions.map((suggestion) => suggestion.id),
		cycleCount: cycleCount.value,
	});
}

onUnmounted(clearHoverTimer);
</script>

<template>
	<div :class="$style.suggestions" data-test-id="instance-ai-prompt-suggestions-v2">
		<div :class="$style.suggestionRow">
			<button
				v-for="(suggestion, index) in visibleSuggestions"
				:key="suggestion.id"
				type="button"
				:class="$style.suggestionButton"
				:style="getSuggestionButtonStyle(index)"
				:data-test-id="`instance-ai-suggestion-${suggestion.id}`"
				:disabled="props.disabled"
				@click="handleSuggestionClick(suggestion)"
				@mouseenter="handleSuggestionEnter(suggestion)"
				@mouseleave="clearPreview"
				@focus="handleSuggestionFocus(suggestion)"
				@blur="clearPreview"
			>
				<N8nIcon :icon="suggestion.icon" :size="12" :class="$style.suggestionIcon" />
				<span>{{ i18n.baseText(suggestion.labelKey) }}</span>
			</button>

			<N8nTooltip
				v-if="canCycleSuggestions"
				:content="i18n.baseText('experiments.instanceAiPromptSuggestionsV2.nextSuggestions')"
				placement="top"
			>
				<button
					type="button"
					:class="[$style.suggestionButton, $style.cycleButton]"
					:style="getSuggestionButtonStyle(visibleSuggestions.length)"
					data-test-id="instance-ai-suggestions-cycle"
					:aria-label="i18n.baseText('experiments.instanceAiPromptSuggestionsV2.nextSuggestions')"
					:disabled="props.disabled"
					@click="cycleSuggestions"
				>
					<N8nIcon icon="refresh-cw" :size="12" />
				</button>
			</N8nTooltip>
		</div>
	</div>
</template>

<style module lang="scss">
@use '@/features/ai/shared/styles/prompt-suggestion-buttons' as promptSuggestions;

.suggestions {
	width: 100%;
}

.suggestionRow {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
	width: 100%;
}

.suggestionButton {
	@include promptSuggestions.prompt-suggestion-button;

	flex: 0 0 auto;
	white-space: nowrap;
	animation-delay: var(--suggestion-enter-delay, 0ms);
}

.suggestionIcon {
	@include promptSuggestions.prompt-suggestion-icon;

	.suggestionButton:hover &,
	.suggestionButton:focus-visible & {
		opacity: 1;
	}
}

.cycleButton {
	justify-content: center;
	width: calc(var(--spacing--lg) + var(--spacing--4xs));
	height: calc(var(--spacing--lg) + var(--spacing--4xs));
	padding: 0;
	flex-shrink: 0;
}

:global(.suggestions-fade-leave-active) .suggestionButton {
	pointer-events: none;
	animation: suggestionSlideOut 0.18s cubic-bezier(0.4, 0, 0.2, 1) both;
	animation-delay: var(--suggestion-leave-delay, 0ms);
}

@keyframes suggestionSlideOut {
	from {
		opacity: 1;
		transform: translateY(0);
	}

	to {
		opacity: 0;
		transform: translateY(6px);
	}
}
</style>
