<script setup lang="ts">
import { N8nHeading } from '@n8n/design-system';

defineProps<{
	title: string;
}>();
</script>

<template>
	<section :class="$style.section">
		<div :class="$style.header">
			<N8nHeading tag="h3" size="large" :class="$style.title">{{ title }}</N8nHeading>
			<slot name="actions" />
		</div>
		<div :class="$style.gallery">
			<slot />
		</div>
	</section>
</template>

<style lang="scss" module>
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	position: relative;
	width: 100%;
	max-width: 100%;
	min-width: 0;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: var(--spacing--md);
	position: relative;
}

.title {
	letter-spacing: -0.01em;
	color: var(--color--text);
	margin: 0;
}

.gallery {
	display: flex;
	flex-direction: row;
	gap: var(--spacing--sm);
}
</style>
