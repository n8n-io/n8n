<script setup lang="ts">
import { computed } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { formatDeltaPercent, getDeltaTone, type DeltaTone } from '../../evaluation.utils';

const props = defineProps<{
	delta: number | undefined;
}>();

const tone = computed<DeltaTone>(() => getDeltaTone(props.delta));
const label = computed(() => formatDeltaPercent(props.delta));
const icon = computed(() => (tone.value === 'negative' ? 'arrow-down' : 'arrow-up'));
</script>

<template>
	<span
		v-if="tone !== 'default'"
		:class="[$style.badge, $style[tone]]"
		data-test-id="trend-delta-badge"
	>
		<N8nIcon :icon="icon" size="xsmall" />
		<N8nText size="small" :class="$style.label">{{ label }}</N8nText>
	</span>
</template>

<style module lang="scss">
.badge {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-radius: var(--border-radius--base);
	line-height: 1;
}

.label {
	font-weight: var(--font-weight--medium);
}

.positive {
	background-color: var(--callout--color--background--success);
	color: var(--text-color--success);
}

.negative {
	background-color: var(--callout--color--background--danger);
	color: var(--text-color--danger);
}
</style>
