<script setup lang="ts">
import type { VersionHistoryStatus } from './VersionHistory.types';

defineOptions({ name: 'N8nVersionHistoryStatusDot' });

withDefaults(
	defineProps<{
		/** Timeline mark for this version. */
		status?: VersionHistoryStatus;
	}>(),
	{ status: 'default' },
);
</script>

<template>
	<!-- Kept in one file so a later status dot can replace this mark. -->
	<span
		:class="[$style.dot, $style[status]]"
		data-test-id="version-history-status"
		:data-status="status"
	/>
</template>

<style lang="scss" module>
.dot {
	box-sizing: border-box;
	flex: 0 0 auto;
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: var(--radius--full);
}

.published {
	background-color: var(--color--success);
}

.latest {
	background-color: var(--color--warning);
}

.default {
	background-color: transparent;
	border: var(--border);
	border-color: var(--color--text--tint-2);
}
</style>
