<!-- Experiment cleanup (129_aia_inspiration_from_taxonomy_v2) -->
<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { N8nIcon, type IconName } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import type { TaxonomyDisplaySuggestion } from '../metadata';
import type { InstanceAiPrefillDeclaration } from '@/features/ai/instanceAi/prefills';

const SUGGESTION_ENTER_STAGGER_MS = 45;

const SUGGESTION_ICONS: Record<string, IconName> = {
	'v6-taxonomy-sales-and-marketing-1-weekly-ads-and-website-report': 'trending-up',
	'v6-taxonomy-sales-and-marketing-2-keep-crm-updated': 'refresh-cw',
	'v6-taxonomy-sales-and-marketing-3-qualify-leads-and-book-calls': 'message-circle',
	'v6-taxonomy-sales-and-marketing-4-schedule-linkedin-posts': 'calendar',
	'v6-taxonomy-sales-and-marketing-5-morning-news-brief': 'rss',
	'v6-taxonomy-sales-and-marketing-6-invoices-from-email': 'file-text',
	'v6-taxonomy-bis-sales-and-marketing-1-personal-follow-ups': 'mail',
	'v6-taxonomy-bis-sales-and-marketing-2-form-leads-to-sheet': 'inbox',
	'v6-taxonomy-bis-sales-and-marketing-3-research-ideal-customers': 'search',
	'v6-taxonomy-bis-sales-and-marketing-4-draft-seo-content': 'pencil',
	'v6-taxonomy-bis-sales-and-marketing-5-meeting-summaries': 'video',
	'v6-taxonomy-bis-sales-and-marketing-6-messages-into-tasks': 'list-checks',
};

const SECTIONS: Array<{ id: TaxonomyDisplaySuggestion['section']; headingKey: BaseTextKey }> = [
	{ id: 'role', headingKey: 'experiments.instanceAiInspirationFromTaxonomy.heading' },
	{ id: 'everyone', headingKey: 'experiments.instanceAiInspirationFromTaxonomy.everyone' },
];

const props = defineProps<{
	suggestions: readonly TaxonomyDisplaySuggestion[];
	disabled: boolean;
}>();

type InsertSuggestionPayload = InstanceAiPrefillDeclaration & {
	prompt: string;
	suggestionId: string;
	suggestionKind: 'prompt';
	suggestionTitle: string;
	position: number;
};

const emit = defineEmits<{
	'preview-change': [payload: { prompt: string } | null];
	'insert-suggestion': [payload: InsertSuggestionPayload];
}>();

const i18n = useI18n();

function shuffle<T>(items: readonly T[]): T[] {
	const copy = [...items];
	for (let index = copy.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(Math.random() * (index + 1));
		const current = copy[index];
		const next = copy[swapIndex];
		if (current === undefined || next === undefined) continue;
		copy[index] = next;
		copy[swapIndex] = current;
	}
	return copy;
}

const roleSuggestions = computed(() =>
	props.suggestions.filter((suggestion) => suggestion.section === 'role'),
);
// Shuffled once per catalog, so a re-render does not reorder the rows.
const shuffledRoleIds = ref<string[]>([]);
watch(
	() => roleSuggestions.value.map((suggestion) => suggestion.id).join('\0'),
	() => {
		shuffledRoleIds.value = shuffle(roleSuggestions.value).map((suggestion) => suggestion.id);
	},
	{ immediate: true },
);

const sections = computed(() =>
	SECTIONS.map((section) => {
		const inSection = props.suggestions.filter((suggestion) => suggestion.section === section.id);
		if (section.id !== 'role') {
			return { ...section, suggestions: inSection };
		}
		const byId = new Map(inSection.map((suggestion) => [suggestion.id, suggestion]));
		return {
			...section,
			suggestions: shuffledRoleIds.value.flatMap((id) => {
				const suggestion = byId.get(id);
				return suggestion ? [suggestion] : [];
			}),
		};
	}).filter((section) => section.suggestions.length > 0),
);

const displayedSuggestions = computed(() =>
	sections.value.flatMap((section) => section.suggestions),
);

function iconFor(suggestionId: string): IconName {
	return SUGGESTION_ICONS[suggestionId] ?? 'sparkles';
}

function getSuggestionStyle(index: number) {
	return { '--suggestion-enter-delay': `${index * SUGGESTION_ENTER_STAGGER_MS}ms` };
}

function previewSuggestion(suggestion: TaxonomyDisplaySuggestion) {
	if (props.disabled) return;
	emit('preview-change', { prompt: suggestion.builderPrompt });
}

function clearPreview() {
	emit('preview-change', null);
}

function handleSuggestionClick(suggestion: TaxonomyDisplaySuggestion) {
	if (props.disabled) return;

	clearPreview();
	const position =
		displayedSuggestions.value.findIndex((candidate) => candidate.id === suggestion.id) + 1;

	emit('insert-suggestion', {
		prompt: suggestion.builderPrompt,
		suggestionId: suggestion.id,
		suggestionKind: 'prompt',
		suggestionTitle: suggestion.shortTitle,
		position,
		prefillType: 'suggestion_catalog',
	});
}
</script>

<template>
	<div :class="$style.suggestions" data-test-id="instance-ai-taxonomy-prompt-suggestions">
		<section v-for="section in sections" :key="section.id" :class="$style.section">
			<p :class="$style.heading">{{ i18n.baseText(section.headingKey) }}</p>
			<div :class="$style.list">
				<button
					v-for="(suggestion, index) in section.suggestions"
					:key="suggestion.id"
					type="button"
					:class="$style.row"
					:style="getSuggestionStyle(index)"
					:data-test-id="`instance-ai-taxonomy-suggestion-${suggestion.id}`"
					:disabled="disabled"
					@click="handleSuggestionClick(suggestion)"
					@mouseenter="previewSuggestion(suggestion)"
					@mouseleave="clearPreview"
					@focus="previewSuggestion(suggestion)"
					@blur="clearPreview"
				>
					<span :class="$style.iconTile">
						<N8nIcon :icon="iconFor(suggestion.id)" size="small" />
					</span>
					<span :class="$style.title">{{ suggestion.shortTitle }}</span>
					<span :class="$style.arrow">
						<N8nIcon icon="arrow-right" size="small" />
					</span>
				</button>
			</div>
		</section>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.suggestions {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	width: 100%;
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.heading {
	margin: 0;
	color: var(--text-color--subtle);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--md);
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	width: 100%;
	min-width: 0;
	padding: var(--spacing--2xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-3);
	color: var(--text-color);
	text-align: left;
	cursor: pointer;

	@include motion.fade-in-up;
	--animation--fade-in-up--translate: var(--spacing--3xs);
	animation-delay: var(--suggestion-enter-delay, 0ms);
	animation-fill-mode: backwards;

	&:not(:disabled):hover,
	&:not(:disabled):focus-visible {
		border-color: var(--color--purple-400);
		outline: none;
	}

	&:disabled {
		color: var(--text-color--disabled);
		cursor: not-allowed;
	}
}

.iconTile {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	border-radius: var(--radius--sm);
	// Sampled from the reference tile. No purple token is this dark and muted.
	background-color: #2e2b4e;
	color: var(--color--purple-300);
}

.title {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	color: var(--text-color);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--md);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.arrow {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	border-radius: var(--radius--sm);
	background-color: var(--color--foreground);
	color: var(--color--text);
}
</style>
