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
	<span :class="[$style.dot, $style[`dot-${status}`]]" />
</template>

<style module lang="scss">
.dot {
	display: inline-block;
	width: 8px;
	height: 8px;
	border-radius: 50%;
	flex-shrink: 0;
}

.dot-active {
	background-color: var(--color--mint-600);
}

.dot-latest {
	background-color: var(--color--yellow-500);
}

.dot-default {
	border: var(--border);
	border-color: var(--color--text--tint-2);
}
</style>
