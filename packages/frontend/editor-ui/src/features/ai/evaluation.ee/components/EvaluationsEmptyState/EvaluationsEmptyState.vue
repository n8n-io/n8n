<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';

defineProps<{
	disabled?: boolean;
}>();

const emit = defineEmits<{
	getStarted: [];
}>();

const locale = useI18n();

type Feature = {
	icon: IconName;
	titleKey:
		| 'evaluations.emptyState.catchIssues.title'
		| 'evaluations.emptyState.buildConfidence.title'
		| 'evaluations.emptyState.measurePerformance.title';
	descriptionKey:
		| 'evaluations.emptyState.catchIssues.description'
		| 'evaluations.emptyState.buildConfidence.description'
		| 'evaluations.emptyState.measurePerformance.description';
};

const features: Feature[] = [
	{
		icon: 'bug',
		titleKey: 'evaluations.emptyState.catchIssues.title',
		descriptionKey: 'evaluations.emptyState.catchIssues.description',
	},
	{
		// `blocks` visually matches the design's "puzzle pieces" feel for the
		// iterate-with-confidence message better than the previously chosen
		// `grid-2x2` (a flat grid).
		icon: 'blocks',
		titleKey: 'evaluations.emptyState.buildConfidence.title',
		descriptionKey: 'evaluations.emptyState.buildConfidence.description',
	},
	{
		// `gauge` (dial) matches the "measure" metaphor — replaces the
		// trend-line icon that didn't read as a measurement device.
		icon: 'gauge',
		titleKey: 'evaluations.emptyState.measurePerformance.title',
		descriptionKey: 'evaluations.emptyState.measurePerformance.description',
	},
];
</script>

<template>
	<div :class="$style.wrapper" data-test-id="evaluations-empty-state">
		<header :class="$style.header">
			<N8nText tag="h2" size="xlarge" color="text-dark" bold :class="$style.title">
				{{ locale.baseText('evaluations.emptyState.title') }}
			</N8nText>
			<N8nText size="medium" color="text-base" :class="$style.description">
				{{ locale.baseText('evaluations.emptyState.description') }}
			</N8nText>
		</header>

		<div :class="$style.featuresCard">
			<div v-for="feature in features" :key="feature.titleKey" :class="$style.feature">
				<N8nIcon :icon="feature.icon" :size="24" :class="$style.featureIcon" />
				<N8nText size="medium" bold color="text-dark" :class="$style.featureTitle">
					{{ locale.baseText(feature.titleKey) }}
				</N8nText>
				<N8nText size="medium" color="text-base">
					{{ locale.baseText(feature.descriptionKey) }}
				</N8nText>
			</div>
		</div>

		<div :class="$style.footer">
			<N8nButton
				variant="solid"
				size="medium"
				type="button"
				:disabled="disabled"
				data-test-id="evaluations-empty-state-get-started"
				@click="emit('getStarted')"
			>
				{{ locale.baseText('evaluations.emptyState.getStarted') }}
			</N8nButton>
		</div>
	</div>
</template>

<style module lang="scss">
// New layout (per design):
//   ┌──────────────────────────────────────────────┐
//   │  Title (centered, no border)                 │
//   │  Description (centered, no border)           │
//   ├──────────────────────────────────────────────┤
//   │ ┌────────┬────────┬────────┐                 │
//   │ │ feat 1 │ feat 2 │ feat 3 │  (bordered card)│
//   │ └────────┴────────┴────────┘                 │
//   │              [ Get started ]                 │
//   └──────────────────────────────────────────────┘
//
// The features card is the only bordered block; title/description sit on
// the page background, the CTA sits below the card, both centered.
.wrapper {
	display: flex;
	flex-direction: column;
	align-items: center;
	// Vertically center the empty-state stack inside the parent (.evaluationsView
	// is already `height: 100%; display: flex`). `justify-content: center` here
	// pulls the title/card/CTA group to the vertical midpoint; the inner stack
	// keeps its tight vertical rhythm via `gap`.
	justify-content: center;
	gap: var(--spacing--md);
	width: 100%;
	max-width: 720px;
	height: 100%;
	margin: 0 auto;
	padding: var(--spacing--lg);
}

.header {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--3xs);
	text-align: center;
}

.title {
	margin: 0;
	font-size: var(--font-size--md, 18px);
}

.description {
	display: block;
	max-width: 480px;
}

.featuresCard {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	// `gap: 0` so the vertical dividers added via `border-right` on .feature
	// sit flush against neighbours instead of having grid-gap whitespace either
	// side. The internal padding on each .feature keeps the columns breathing.
	gap: 0;
	width: 100%;
	padding: var(--spacing--md);
	background-color: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--sm);
}

.feature {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--md);
	border-right: var(--border);

	// First column doesn't need left padding — its left edge aligns with the
	// card's own inner padding.
	&:first-child {
		padding-left: 0;
	}

	// Last column drops the divider AND right padding for symmetry with the
	// first column's flush left edge.
	&:last-child {
		padding-right: 0;
		border-right: none;
	}
}

.featureIcon {
	color: var(--color--text);
	margin-bottom: var(--spacing--2xs);
}

.featureTitle {
	display: block;
}

.footer {
	display: flex;
	justify-content: center;
}

@media (max-width: 640px) {
	.featuresCard {
		grid-template-columns: 1fr;
	}
}
</style>
