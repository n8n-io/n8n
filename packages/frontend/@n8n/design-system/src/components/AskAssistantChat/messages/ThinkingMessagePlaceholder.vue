<script setup lang="ts">
defineProps<{
	message: string;
}>();
</script>

<template>
	<div :class="$style.container">
		<span :class="[$style.statusText, $style.shimmer]">
			{{ message }}
		</span>
	</div>
</template>

<style lang="scss" module>
@use '../../../css/mixins/animations';

.container {
	margin: var(--spacing--2xs) 0;
	padding: var(--spacing--2xs) 0;
}

.statusText {
	color: var(--assistant--color--text--subtle);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--xl);
}

.shimmer {
	@include animations.shimmer;
}
</style>
