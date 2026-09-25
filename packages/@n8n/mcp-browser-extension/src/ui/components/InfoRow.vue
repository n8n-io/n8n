<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';

defineProps<{
	icon: IconName;
	title: string;
	description?: string;
}>();
</script>

<template>
	<div class="info-row">
		<span class="marker">
			<N8nIcon :icon="icon" size="large" />
		</span>
		<div class="info-content">
			<div class="info-title">{{ title }}</div>
			<div v-if="description" class="info-description">{{ description }}</div>
			<slot />
		</div>
	</div>
</template>

<style scoped lang="scss">
.info-row {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--sm);
}

.marker {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--row-marker-size);
	height: var(--row-marker-size);
	border-radius: 50%;
	background: var(--color--background);
	color: var(--color--text--shade-1);
}

.info-content {
	flex: 1;
	min-width: 0;
	padding-top: var(--spacing--4xs);
}

.info-title {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	color: var(--color--text--shade-1);
}

.info-description {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
	color: var(--text-color--subtler);
	margin-top: var(--spacing--4xs);
}
</style>
