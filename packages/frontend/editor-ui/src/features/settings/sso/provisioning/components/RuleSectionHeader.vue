<script lang="ts" setup>
defineProps<{
	title: string;
	description: string;
}>();
</script>
<template>
	<div :class="$style.header">
		<h3 :class="$style.title">{{ title }}</h3>
		<p :class="$style.description">{{ description }}</p>
	</div>
</template>
<style lang="scss" module>
.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--sm) 0;
}

.title {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
	margin: 0;
}

.description {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	margin: 0;
}
</style>
