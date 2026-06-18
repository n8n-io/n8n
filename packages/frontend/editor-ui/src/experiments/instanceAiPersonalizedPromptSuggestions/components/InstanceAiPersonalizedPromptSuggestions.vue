<script lang="ts" setup>
import { computed, onUnmounted, ref } from 'vue';
import { useI18n } from '@n8n/i18n';

import type {
	PersonalizedPromptDisplaySuggestion,
	PersonalizedPromptFormat,
	PersonalizedPromptSuggestionSource,
} from '../types';

const PREVIEW_HOVER_DELAY_MS = 300;

const props = defineProps<{
	suggestions: readonly PersonalizedPromptDisplaySuggestion[];
	fallbackSuggestions: readonly PersonalizedPromptDisplaySuggestion[];
	format: PersonalizedPromptFormat;
	disabled: boolean;
	showSeeMore: boolean;
}>();

type InsertSuggestionPayload = {
	prompt: string;
	suggestionId: string;
	suggestionKind: 'prompt';
	position: number;
	telemetryPayload?: {
		suggestion_source: PersonalizedPromptSuggestionSource;
	};
};

type CycleSuggestionsPayload = {
	visibleSuggestionIds: string[];
	cycleCount: number;
	telemetryPayload?: {
		suggestion_source: PersonalizedPromptSuggestionSource;
	};
};
type PreviewChangePayload = { prompt: string } | null;

const emit = defineEmits<{
	'preview-change': [payload: PreviewChangePayload];
	'insert-suggestion': [payload: InsertSuggestionPayload];
	'cycle-suggestions': [payload: CycleSuggestionsPayload];
}>();

const i18n = useI18n();
const isShowingFallback = ref(false);
const cycleCount = ref(0);
let hoverTimer: ReturnType<typeof setTimeout> | null = null;

const visibleSuggestions = computed(() =>
	isShowingFallback.value ? props.fallbackSuggestions : props.suggestions,
);
const visibleSuggestionSource = computed<PersonalizedPromptSuggestionSource>(() =>
	isShowingFallback.value ? 'v2_top_used_fallback' : 'matrix',
);

function clearHoverTimer() {
	if (!hoverTimer) {
		return;
	}

	clearTimeout(hoverTimer);
	hoverTimer = null;
}

function setPreview(builderPrompt: string | null) {
	emit('preview-change', builderPrompt ? { prompt: builderPrompt } : null);
}

function clearPreview() {
	clearHoverTimer();
	setPreview(null);
}

function handleSuggestionEnter(suggestion: PersonalizedPromptDisplaySuggestion) {
	if (props.disabled) {
		return;
	}

	clearHoverTimer();
	hoverTimer = setTimeout(() => {
		hoverTimer = null;
		setPreview(suggestion.builderPrompt);
	}, PREVIEW_HOVER_DELAY_MS);
}

function handleSuggestionFocus(suggestion: PersonalizedPromptDisplaySuggestion) {
	if (props.disabled) {
		return;
	}

	clearHoverTimer();
	setPreview(suggestion.builderPrompt);
}

function handleSuggestionClick(suggestion: PersonalizedPromptDisplaySuggestion) {
	if (props.disabled) {
		return;
	}

	clearPreview();
	const position =
		visibleSuggestions.value.findIndex(
			(visibleSuggestion) => visibleSuggestion.id === suggestion.id,
		) + 1;

	emit('insert-suggestion', {
		prompt: suggestion.builderPrompt,
		suggestionId: suggestion.id,
		suggestionKind: 'prompt',
		position,
		telemetryPayload: isShowingFallback.value
			? {
					suggestion_source: 'v2_top_used_fallback',
				}
			: undefined,
	});
}

function toggleSuggestions() {
	if (props.disabled || !props.showSeeMore) {
		return;
	}

	clearPreview();
	isShowingFallback.value = !isShowingFallback.value;
	cycleCount.value += 1;

	emit('cycle-suggestions', {
		visibleSuggestionIds: visibleSuggestions.value.map((suggestion) => suggestion.id),
		cycleCount: cycleCount.value,
		telemetryPayload: isShowingFallback.value
			? {
					suggestion_source: visibleSuggestionSource.value,
				}
			: undefined,
	});
}

onUnmounted(clearHoverTimer);
</script>

<template>
	<div :class="$style.suggestions" data-test-id="instance-ai-personalized-prompt-suggestions">
		<div v-if="showSeeMore" :class="$style.toolbar">
			<button
				type="button"
				:class="$style.seeMoreButton"
				data-test-id="instance-ai-personalized-see-more"
				:disabled="props.disabled"
				@click="toggleSuggestions"
			>
				{{ i18n.baseText('experiments.instanceAiPersonalizedPromptSuggestions.seeMore') }}
			</button>
		</div>

		<div
			:class="[
				$style.suggestionList,
				props.format === 'cards' ? $style.cardList : $style.compactList,
			]"
		>
			<button
				v-for="suggestion in visibleSuggestions"
				:key="suggestion.id"
				type="button"
				:class="[
					$style.suggestionButton,
					props.format === 'cards' ? $style.cardButton : $style.listButton,
				]"
				:data-test-id="`instance-ai-personalized-suggestion-${suggestion.id}`"
				:disabled="props.disabled"
				@click="handleSuggestionClick(suggestion)"
				@mouseenter="handleSuggestionEnter(suggestion)"
				@mouseleave="clearPreview"
				@focus="handleSuggestionFocus(suggestion)"
				@blur="clearPreview"
			>
				<span :class="$style.suggestionTitle">{{ suggestion.shortTitle }}</span>
				<span v-if="props.format === 'cards'" :class="$style.suggestionDescription">
					{{ suggestion.description }}
				</span>
			</button>
		</div>
	</div>
</template>

<style module lang="scss">
.suggestions {
	width: 100%;
}

.toolbar {
	display: flex;
	justify-content: flex-end;
	margin-bottom: var(--spacing--2xs);
}

.seeMoreButton {
	padding: 0;
	color: var(--color--primary);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--sm);
	background: none;
	border: 0;
	cursor: pointer;
}

.seeMoreButton:disabled {
	color: var(--text-color--disabled);
	cursor: not-allowed;
}

.suggestionList {
	display: grid;
	gap: var(--spacing--2xs);
	width: 100%;
}

.cardList {
	grid-template-columns: repeat(2, minmax(0, 1fr));
}

.compactList {
	grid-template-columns: minmax(0, 1fr);
}

.suggestionButton {
	width: 100%;
	min-width: 0;
	color: var(--text-color--subtle);
	text-align: left;
	background: light-dark(var(--background--surface), var(--background--subtle));
	border: var(--border);
	border-radius: var(--radius--sm);
	cursor: pointer;
}

.suggestionButton:hover,
.suggestionButton:focus-visible {
	color: color-mix(in srgb, var(--background--brand) 68%, var(--text-color));
	background: color-mix(in srgb, var(--background--brand) 12%, var(--background--hover));
	border-color: color-mix(in srgb, var(--background--brand) 28%, var(--border-color--subtle));
	outline: none;
}

.suggestionButton:disabled {
	color: var(--text-color--disabled);
	cursor: not-allowed;
	background: light-dark(var(--background--surface), var(--background--subtle));
}

.cardButton {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-height: 88px;
	padding: var(--spacing--xs);
}

.listButton {
	padding: var(--spacing--2xs) var(--spacing--xs);
}

.suggestionTitle {
	display: block;
	min-width: 0;
	overflow: hidden;
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--sm);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.suggestionDescription {
	display: -webkit-box;
	overflow: hidden;
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--sm);
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
}

@media (max-width: 600px) {
	.cardList {
		grid-template-columns: minmax(0, 1fr);
	}
}
</style>
