<script setup lang="ts">
import { computed } from 'vue';
import { N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import {
	formatMetricLabel,
	formatMetricPercent,
	formatMetricRawScore,
	type MetricCategory,
} from '../../evaluation.utils';

const props = defineProps<{
	name: string;
	value: number | undefined;
	category?: MetricCategory;
	sourceNodeName?: string;
}>();

const formattedLabel = computed(() => formatMetricLabel(props.name));
const formattedPercent = computed(() =>
	formatMetricPercent(props.value, { category: props.category }),
);
const formattedRawScore = computed(() =>
	formatMetricRawScore(props.value, { category: props.category }),
);
const tooltipContent = computed(() =>
	formattedRawScore.value ? `${formattedPercent.value} • ${formattedRawScore.value}` : '',
);
</script>

<template>
	<div :class="$style.row" data-test-id="test-case-metric-row">
		<div :class="$style.leading">
			<N8nIcon icon="circle-check" size="small" :class="$style.successIcon" />
			<N8nText size="medium" bold :class="$style.name">{{ formattedLabel }}</N8nText>
			<N8nText v-if="sourceNodeName" size="small" :class="$style.subtitle">
				{{ sourceNodeName }}
			</N8nText>
		</div>
		<div :class="$style.trailing">
			<N8nTooltip v-if="tooltipContent" :content="tooltipContent" placement="top">
				<N8nText size="medium" :class="$style.value">{{ formattedPercent }}</N8nText>
			</N8nTooltip>
			<N8nText v-else size="medium" :class="$style.value">{{ formattedPercent }}</N8nText>
		</div>
	</div>
</template>

<style module lang="scss">
.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--2xs) 0;
	min-height: 32px;
}

.leading {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	flex: 1 1 auto;
}

.trailing {
	display: flex;
	align-items: center;
	flex: 0 0 auto;
}

.successIcon {
	color: var(--icon-color--success);
}

.name {
	color: var(--color--text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.subtitle {
	color: var(--color--text--tint-1);
}

.value {
	font-variant-numeric: tabular-nums;
	color: var(--color--text);
	font-weight: var(--font-weight--medium);
}
</style>
