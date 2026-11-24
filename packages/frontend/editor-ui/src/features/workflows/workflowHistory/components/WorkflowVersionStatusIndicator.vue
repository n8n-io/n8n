<script setup lang="ts">
import type { WorkflowHistoryVersionStatus } from '../types';

withDefaults(
	defineProps<{
		status?: WorkflowHistoryVersionStatus;
	}>(),
	{
		status: 'default',
	},
);
</script>

<template>
	<span :class="[$style.indicator, $style[`indicator-${status}`]]" />
</template>

<style module lang="scss">
.indicator {
	display: inline-block;
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: 50%;
	flex-shrink: 0;
}

.indicator-published {
	background-color: var(--color--mint-600);
}

.indicator-latest {
	background-color: var(--color--yellow-500);
}

.indicator-default {
	border: var(--border);
	border-color: var(--color--text--tint-2);
}
</style>
