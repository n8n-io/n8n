<script lang="ts" setup>
import { computed, onUnmounted, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';

import type {
	PersonalizedPromptDisplaySuggestion,
	PersonalizedPromptFormat,
	PersonalizedPromptSuggestionSource,
} from '../types';

const PREVIEW_HOVER_DELAY_MS = 300;
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
let hoverTimer: ReturnType<typeof setTimeout> | null = null;

const visibleSuggestions = computed(() =>
	isShowingFallback.value ? props.fallbackSuggestions : props.suggestions,
);
const visibleSuggestionSource = computed<PersonalizedPromptSuggestionSource>(() =>
	isShowingFallback.value ? 'v2_top_used_fallback' : 'matrix',
);

function getSuggestionStyle(index: number) {
	return { '--suggestion-enter-delay': `${index * SUGGESTION_ENTER_STAGGER_MS}ms` };
}

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
				@mouseenter="handleSuggestionEnter(suggestion)"
				@mouseleave="clearPreview"
				@focus="handleSuggestionFocus(suggestion)"
				@blur="clearPreview"
			>
				<N8nIcon
					v-if="props.format === 'list'"
					icon="sparkles"
					:size="16"
					:class="$style.listIcon"
				/>
				<span :class="$style.textGroup">
					<span :class="$style.suggestionTitle">{{ suggestion.shortTitle }}</span>
					<span v-if="props.format === 'cards'" :class="$style.suggestionDescription">
						{{ suggestion.description }}
					</span>
				</span>
			</button>
		</div>

		<div v-if="showSeeMore" :class="$style.footer">
			<button
				type="button"
				:class="$style.seeMoreButton"
				data-test-id="instance-ai-personalized-see-more"
				:disabled="props.disabled"
				@click="toggleSuggestions"
			>
				<span>{{
					i18n.baseText('experiments.instanceAiPersonalizedPromptSuggestions.seeMore')
				}}</span>
				<N8nIcon icon="refresh-cw" :size="12" :class="$style.seeMoreIcon" />
			</button>
		</div>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion';

.suggestions {
	width: 100%;
}

.suggestionList {
	display: grid;
	width: 100%;
}

/* Cards: a 2-column grid where rows are separated by a hairline at rest and
 * lift into an elevated surface card on hover/focus. */
.cardList {
	grid-template-columns: repeat(2, minmax(0, 1fr));
	column-gap: var(--spacing--md);
	row-gap: 0;
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

/* --- Cards --- */
.cardButton {
	padding: var(--spacing--xs) var(--spacing--sm);
	border-radius: var(--radius--md);
}

/* Resting hairline between rows (items from the second row down). Kept at
 * zero specificity via :where() so hover/focus reliably overrides it. */
:where(.cardList .cardButton:nth-child(n + 3)) {
	box-shadow: inset 0 1px 0 0 var(--border-color--subtle);
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

/* --- List --- */
.listButton {
	padding: var(--spacing--xs) var(--spacing--sm);
	background: var(--background--subtle);
	border-radius: var(--radius--md);
}

.listIcon {
	flex-shrink: 0;
	color: var(--background--brand);
}

.listButton:not(:disabled):hover,
.listButton:not(:disabled):focus-visible {
	background: color-mix(in srgb, var(--background--brand) 8%, var(--background--subtle));
	box-shadow: var(--shadow--xs);
	transform: translateY(-1px);
	outline: none;
}

.listButton:not(:disabled):focus-visible {
	box-shadow:
		var(--shadow--xs),
		0 0 0 2px var(--focus--border-color);
}

.listButton:disabled {
	background: var(--background--subtle);
}

/* --- See more --- */
.footer {
	display: flex;
	justify-content: flex-end;
	margin-top: var(--spacing--sm);
}

.seeMoreButton {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--sm);
	background: none;
	border: 0;
	border-radius: var(--radius--sm);
	cursor: pointer;
	transition:
		color var(--duration--snappy) var(--easing--ease-out),
		background-color var(--duration--snappy) var(--easing--ease-out),
		box-shadow var(--duration--snappy) var(--easing--ease-out);
}

.seeMoreButton:not(:disabled):hover,
.seeMoreButton:not(:disabled):focus-visible {
	color: var(--text-color);
	background: var(--background--hover);
	outline: none;
}

.seeMoreButton:not(:disabled):focus-visible {
	box-shadow: 0 0 0 2px var(--focus--border-color);
}

.seeMoreButton:disabled {
	color: var(--text-color--disabled);
	cursor: not-allowed;
}

.seeMoreIcon {
	flex-shrink: 0;
	opacity: 0.8;
}

@media (max-width: 600px) {
	.cardList {
		grid-template-columns: minmax(0, 1fr);
		column-gap: 0;
	}

	/* Single column: also separate the second card from the first. */
	:where(.cardList .cardButton:nth-child(2)) {
		box-shadow: inset 0 1px 0 0 var(--border-color--subtle);
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
