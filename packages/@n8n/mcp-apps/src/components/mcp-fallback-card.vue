<script setup lang="ts">
import { N8nIcon, N8nSpinner, type IconName } from '@n8n/design-system';

defineProps<{
	title?: string;
	description?: string;
	icon?: IconName;
	loading?: boolean;
}>();
</script>

<template>
	<section class="fallback-card">
		<N8nSpinner v-if="loading" type="ring" />
		<N8nIcon v-else-if="icon" :icon="icon" class="fallback-icon" />
		<h1 v-if="title">{{ title }}</h1>
		<p v-if="description">{{ description }}</p>
		<slot />
	</section>
</template>

<style scoped lang="scss">
.fallback-card {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--xs);
	width: 45%;
	padding: var(--spacing--lg);
	border: var(--border);
	border-radius: var(--radius--md);
	background: var(--background--surface);
	box-shadow:
		var(--shadow--xs),
		inset var(--shadow--outline);
	overflow: hidden;
	text-align: center;
}

.fallback-card h1,
.fallback-card p {
	margin: 0;
}

.fallback-card h1 {
	font-size: var(--font-size--md);
	line-height: var(--line-height--xl);
	color: var(--text-color);
}

.fallback-card p {
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
}

.fallback-icon {
	color: var(--icon-color--strong);
}
</style>
