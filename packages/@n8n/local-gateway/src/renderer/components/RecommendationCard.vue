<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { DesktopAssistantRecommendation } from '../../shared/types';

const props = defineProps<{ recommendation: DesktopAssistantRecommendation }>();

const emit = defineEmits<{ run: [prompt: string] }>();

const i18n = useI18n();

function run() {
	emit('run', props.recommendation.prompt);
}
</script>

<template>
	<div
		:class="$style.card"
		role="button"
		tabindex="0"
		:aria-label="
			i18n.baseText('desktopAssistant.recommendations.runAriaLabel', {
				interpolate: { title: recommendation.title },
			})
		"
		@click="run"
		@keydown.enter="run"
		@keydown.space.prevent="run"
	>
		<span :class="$style.tile" aria-hidden="true">{{ recommendation.icon }}</span>

		<span :class="$style.body">
			<span :class="$style.title">{{ recommendation.title }}</span>
			<span :class="$style.subtitle">
				<N8nIcon :class="$style.sparkle" icon="sparkles" :size="11" aria-hidden="true" />
				<span :class="$style.subtitleText">{{ recommendation.prompt }}</span>
			</span>
		</span>

		<span :class="$style.trailing">{{
			i18n.baseText('desktopAssistant.recommendations.suggested')
		}}</span>
	</div>
</template>

<style module>
/* Reuses TaskCard's layout, but reads as a suggestion: dashed border + reduced
   opacity, lifting to full opacity on hover/focus so it feels actionable. */
.card {
	display: flex;
	align-items: center;
	gap: 11px;
	width: 100%;
	padding: 10px var(--spacing--2xs);
	border: 1px dashed var(--da-border-strong);
	background: transparent;
	text-align: left;
	cursor: pointer;
	font: inherit;
	color: var(--da-text);
	border-radius: var(--radius--xs);
	opacity: 0.62;
	transition:
		background-color 0.12s,
		opacity 0.12s,
		border-color 0.12s;
}

.card:hover,
.card:focus-within {
	opacity: 1;
	background: var(--da-surface-2);
	border-color: var(--da-subtler);
}

.card:focus-visible {
	outline: var(--da-focus-ring);
	outline-offset: calc(-1 * var(--da-focus-ring-offset));
}

.tile {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: 34px;
	height: 34px;
	border-radius: var(--radius--xs);
	border: 1px dashed var(--da-border);
	background: var(--da-surface);
	font-size: 15px;
	line-height: 1;
}

.body {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
}

/* --line-height--md (not the reset's 1) so overflow:hidden doesn't clip
   descenders, while the row stays shorter than the 34px tile. */
.title {
	font-size: 13px;
	font-weight: 500;
	line-height: var(--line-height--md);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--da-text);
}

.subtitle {
	display: flex;
	align-items: center;
	gap: 5px;
	min-width: 0;
	font-size: 11px;
	line-height: var(--line-height--md);
	margin-top: var(--spacing--5xs);
	color: var(--da-subtler);
}

.sparkle {
	flex-shrink: 0;
	color: var(--da-purple);
}

.subtitleText {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* Small, muted "Suggested" marker — the cue that this is a recommendation. */
.trailing {
	flex-shrink: 0;
	padding: 2px 7px;
	font-size: 10px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.6px;
	color: var(--da-subtlest);
	background: var(--da-surface-2);
	border: 1px dashed var(--da-border);
	border-radius: var(--radius--full);
}
</style>
