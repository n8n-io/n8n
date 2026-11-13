<script setup lang="ts">
import { N8nText } from '@n8n/design-system';

defineProps<{
	controlId: string;
	title: string;
	description?: string;
}>();
</script>

<template>
	<div :class="$style.row">
		<div :class="$style.info">
			<label :for="controlId">
				<N8nText size="medium" color="text-dark" bold :class="$style.label">{{ title }}</N8nText>
			</label>
			<N8nText v-if="description" size="small" :class="$style.description">
				{{ description }}
			</N8nText>
		</div>
		<div :class="$style.action">
			<slot />
		</div>
	</div>
</template>

<style lang="scss" module>
.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.info {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.label {
	font-size: var(--font-size--sm);
}

.description {
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtler);
}

.action {
	display: flex;
	align-items: center;
	flex-shrink: 0;
}
</style>
