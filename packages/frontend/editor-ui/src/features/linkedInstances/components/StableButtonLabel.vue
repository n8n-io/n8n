<script setup lang="ts">
/**
 * A button label that keeps one width while its text changes, for example from
 * "Check connection" to "Checking…". The longest text sets the width, so the button does not
 * shrink under the pointer and the buttons next to it do not move.
 */
defineProps<{
	label: string;
	/** Every text that the button can show. */
	labels: readonly string[];
}>();
</script>

<template>
	<span :class="$style.stack">
		<!-- Hidden copies only reserve the width. Screen readers skip them. -->
		<span v-for="text in labels" :key="text" :class="$style.reserve" aria-hidden="true">
			{{ text }}
		</span>
		<span>{{ label }}</span>
	</span>
</template>

<style lang="scss" module>
.stack {
	display: inline-grid;
	justify-items: center;

	> * {
		grid-area: 1 / 1;
	}
}

.reserve {
	visibility: hidden;
}
</style>
