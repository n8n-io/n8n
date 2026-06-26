<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';

import type {
	PersonalizedPromptDisplaySuggestion,
	PersonalizedPromptFormat,
	PersonalizedPromptSuggestionSource,
} from '../types';

const SUGGESTION_ENTER_STAGGER_MS = 45;

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

const visibleSuggestions = computed(() =>
	isShowingFallback.value ? props.fallbackSuggestions : props.suggestions,
);
const visibleSuggestionSource = computed<PersonalizedPromptSuggestionSource>(() =>
	isShowingFallback.value ? 'v2_top_used_fallback' : 'matrix',
);

function getSuggestionStyle(index: number) {
	return { '--suggestion-enter-delay': `${index * SUGGESTION_ENTER_STAGGER_MS}ms` };
}

function setPreview(builderPrompt: string | null) {
	emit('preview-change', builderPrompt ? { prompt: builderPrompt } : null);
}

function clearPreview() {
	setPreview(null);
}

function previewSuggestion(suggestion: PersonalizedPromptDisplaySuggestion) {
	if (props.disabled) {
		return;
	}

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
</script>

<template>
	<div :class="$style.suggestions" data-test-id="instance-ai-personalized-prompt-suggestions">
		<div :class="$style.header">
			<span :class="$style.heading">
				{{ i18n.baseText('experiments.instanceAiPersonalizedPromptSuggestions.heading') }}
			</span>
			<button
				v-if="showSeeMore"
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
				v-for="(suggestion, index) in visibleSuggestions"
				:key="suggestion.id"
				type="button"
				:class="[
					$style.suggestionButton,
					props.format === 'cards' ? $style.cardButton : $style.listButton,
				]"
				:style="getSuggestionStyle(index)"
				:data-test-id="`instance-ai-personalized-suggestion-${suggestion.id}`"
				:disabled="props.disabled"
				@click="handleSuggestionClick(suggestion)"
				@mouseenter="previewSuggestion(suggestion)"
				@mouseleave="clearPreview"
				@focus="previewSuggestion(suggestion)"
				@blur="clearPreview"
			>
				<span :class="$style.textGroup">
					<span :class="$style.suggestionTitle">{{ suggestion.shortTitle }}</span>
					<span :class="$style.suggestionDescription">
						{{ suggestion.description }}
					</span>
				</span>
			</button>
		</div>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion';

.suggestions {
	width: 100%;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	min-height: var(--spacing--md);
	/* Inset to align with the card/row text, which is padded by --spacing--sm. */
	padding: 0 var(--spacing--sm);
	margin-bottom: var(--spacing--xs);
}

.heading {
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--sm);
	letter-spacing: 0.04em;
	text-transform: uppercase;
}

.suggestionList {
	display: grid;
	width: 100%;
}

/* Cards: a 2-column grid of soft surface cards that lift further on hover/focus. */
.cardList {
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--spacing--2xs);
}

/* List: a single column of softly filled rows, each led by a brand sparkle. */
.compactList {
	grid-template-columns: minmax(0, 1fr);
	gap: var(--spacing--2xs);
}

.suggestionButton {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	position: relative;
	width: 100%;
	min-width: 0;
	color: var(--text-color);
	text-align: left;
	background: transparent;
	border: 0;
	cursor: pointer;
	transition:
		color var(--duration--snappy) var(--easing--ease-out),
		background-color var(--duration--snappy) var(--easing--ease-out),
		box-shadow var(--duration--snappy) var(--easing--ease-out),
		transform var(--duration--snappy) var(--easing--ease-out);

	@include motion.fade-in-up;
	--animation--fade-in-up--translate: var(--spacing--3xs);
	animation-delay: var(--suggestion-enter-delay, 0ms);
	/* Hold the start state during the stagger delay so toggling doesn't flicker. */
	animation-fill-mode: backwards;
}

.suggestionButton:disabled {
	color: var(--text-color--disabled);
	cursor: not-allowed;
}

.textGroup {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.suggestionTitle {
	min-width: 0;
	overflow: hidden;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--md);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.suggestionDescription {
	display: -webkit-box;
	overflow: hidden;
	color: var(--text-color--subtle);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--md);
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
}

/* --- Cards: plain text at rest; the surface card materializes on hover/focus. --- */
.cardButton {
	padding: var(--spacing--xs) var(--spacing--sm);
	border-radius: var(--radius--md);
}

.cardButton:not(:disabled):hover,
.cardButton:not(:disabled):focus-visible {
	background: light-dark(var(--background--surface), var(--background--subtle));
	box-shadow: var(--shadow--sm);
	transform: translateY(-2px);
	outline: none;
	z-index: 1;
}

.cardButton:not(:disabled):focus-visible {
	box-shadow:
		var(--shadow--sm),
		0 0 0 2px var(--focus--border-color);
}

/* --- List: plain rows (title + description); the surface fills in on hover/focus. --- */
.listButton {
	padding: var(--spacing--xs) var(--spacing--sm);
	border-radius: var(--radius--md);
}

.listButton:not(:disabled):hover,
.listButton:not(:disabled):focus-visible {
	background: light-dark(var(--background--surface), var(--background--subtle));
	box-shadow: var(--shadow--sm);
	transform: translateY(-1px);
	outline: none;
	z-index: 1;
}

.listButton:not(:disabled):focus-visible {
	box-shadow:
		var(--shadow--sm),
		0 0 0 2px var(--focus--border-color);
}

/* --- See more --- */
.seeMoreButton {
	flex-shrink: 0;
	padding: 0;
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--sm);
	background: none;
	border: 0;
	border-radius: var(--radius--3xs);
	cursor: pointer;
	transition: color var(--duration--snappy) var(--easing--ease-out);
}

.seeMoreButton:not(:disabled):hover {
	color: var(--text-color);
	text-decoration: underline;
}

.seeMoreButton:not(:disabled):focus-visible {
	color: var(--text-color);
	outline: 2px solid var(--focus--border-color);
	outline-offset: 2px;
}

.seeMoreButton:disabled {
	color: var(--text-color--disabled);
	cursor: not-allowed;
}

@media (max-width: 600px) {
	.cardList {
		grid-template-columns: minmax(0, 1fr);
	}
}

@media (prefers-reduced-motion: reduce) {
	.suggestionButton {
		transition: none;
	}

	.cardButton:not(:disabled):hover,
	.cardButton:not(:disabled):focus-visible,
	.listButton:not(:disabled):hover,
	.listButton:not(:disabled):focus-visible {
		transform: none;
	}
}
</style>
