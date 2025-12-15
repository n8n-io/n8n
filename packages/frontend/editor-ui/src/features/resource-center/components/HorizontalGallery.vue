<script setup lang="ts" generic="T">
import { N8nHeading } from '@n8n/design-system';

defineProps<{
	title: string;
	items: T[];
}>();
</script>

<template>
	<section :class="$style.section">
		<div :class="$style.header">
			<N8nHeading tag="h2" size="large" :class="$style.title">{{ title }}</N8nHeading>
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
	// padding-top: var(--spacing--xs);
	position: relative;
}

.title {
	font-family: 'Clash Display', var(--font-family);
	letter-spacing: -0.01em;
	color: var(--color--text);
	margin: 0;
}

.gallery {
	display: flex;
	flex-direction: row;
	gap: 16px;

	/* Hide items beyond the 4th */
	> *:nth-child(n + 5) {
		display: none;
	}
}
</style>
