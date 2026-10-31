<script setup lang="ts">
import N8nText from '../N8nText/Text.vue';

defineOptions({ name: 'N8nVersionHistoryHeading' });

defineProps<{
	label: string;
}>();
</script>

<template>
	<div :class="$style.heading" data-test-id="version-history-heading">
		<!-- The parent slot replaces the label. This padding keeps the label lined up. -->
		<slot>
			<N8nText size="small" bold color="text-base">{{ label }}</N8nText>
		</slot>
	</div>
</template>

<style lang="scss" module>
.heading {
	// Line the label up with the left edge of the status dot.
	padding-inline-start: calc(
		var(--version-history--body-pad, var(--spacing--3xs)) +
			var(--version-history--rail-margin, var(--spacing--4xs)) +
			(var(--version-history--rail-size, var(--spacing--lg)) - var(--spacing--2xs)) / 2
	);
	padding-inline-end: var(--version-history--body-pad, var(--spacing--3xs));
	min-width: 0;
}
</style>
