<script setup lang="ts">
import { N8nText } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';

import CheckHeader from './CheckHeader.vue';

defineProps<{
	icon: IconName;
	iconBg?: string;
	iconFg?: string;
	title: string;
	description?: string;
	badge?: string;
	badgeIcon?: IconName;
	category?: string;
	loading?: boolean;
	scoreLabel?: string;
	scoreText?: string;
	scorePercent?: number;
	loadingLabel?: string;
	outputLabel?: string;
	outputText?: string;
	outputMeta?: string;
}>();
</script>

<template>
	<div :class="[$style.card, loading ? $style.cardLoading : null]">
		<CheckHeader
			:icon="icon"
			:icon-bg="iconBg"
			:icon-fg="iconFg"
			:title="title"
			:badge="badge"
			:badge-icon="badgeIcon"
		>
			<template #description>
				<N8nText
					v-if="loading && loadingLabel"
					size="xsmall"
					color="text-light"
					:class="$style.subtitle"
				>
					{{ loadingLabel }}
				</N8nText>
				<N8nText v-else-if="description" size="small" color="text-base" :class="$style.subtitle">
					{{ description }}
				</N8nText>
			</template>
		</CheckHeader>

		<template v-if="loading">
			<div :class="$style.progressTrack">
				<div :class="[$style.progressFill, $style.progressFillIndeterminate]"></div>
			</div>
		</template>
		<template v-else>
			<div v-if="scoreText" :class="$style.scoreRow">
				<N8nText size="xsmall" color="text-base">{{ scoreLabel }}</N8nText>
				<N8nText size="xsmall" bold color="text-dark">{{ scoreText }}</N8nText>
			</div>
			<div v-if="scorePercent !== undefined" :class="$style.progressTrack">
				<div
					:class="[$style.progressFill, category ? $style[`progressFill_${category}`] : null]"
					:style="{ width: `${scorePercent}%` }"
				></div>
			</div>
			<div v-if="outputLabel || outputText || outputMeta" :class="$style.outputBlock">
				<N8nText v-if="outputLabel" size="xsmall" color="text-base">
					{{ outputLabel }}
				</N8nText>
				<N8nText v-if="outputText" size="small" color="text-dark" :class="$style.outputText">
					{{ outputText }}
				</N8nText>
				<N8nText v-if="outputMeta" size="xsmall" color="text-light">
					{{ outputMeta }}
				</N8nText>
			</div>
		</template>
	</div>
</template>

<style module lang="scss">
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
}

.cardLoading .subtitle {
	opacity: 0.85;
}

.subtitle {
	display: block;
	line-height: 1.4;
}

.scoreRow {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.progressTrack {
	width: 100%;
	height: 6px;
	border-radius: 3px;
	background-color: var(--background--subtle);
	overflow: hidden;
}

.progressFill {
	height: 100%;
	background-color: var(--background--brand);
	transition: width var(--duration--snappy) ease;
}

.progressFillIndeterminate {
	width: 40%;
	background-color: var(--background--brand);
	animation: progressFillSlide 1.4s ease-in-out infinite;
}

@keyframes progressFillSlide {
	0% {
		transform: translateX(-40%);
	}
	100% {
		transform: translateX(250%);
	}
}

.progressFill_aiBased {
	background-color: var(--color--green--shade-1, #1a8d4a);
}
.progressFill_stringSimilarity {
	background-color: var(--color--purple--shade-1, #6b3fc4);
}
.progressFill_categorization {
	background-color: var(--color--yellow--shade-1, #c98a04);
}
.progressFill_toolsUsed {
	background-color: var(--color--teal--shade-1, #128172);
}
.progressFill_custom {
	background-color: var(--background--brand);
}

.outputBlock {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding-top: var(--spacing--2xs);
	border-top: var(--border);
}

.outputText {
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
	overflow: hidden;
	line-height: 1.4;
}
</style>
