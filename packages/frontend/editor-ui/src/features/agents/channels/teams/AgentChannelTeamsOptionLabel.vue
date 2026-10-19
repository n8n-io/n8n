<script setup lang="ts">
import { N8nText } from '@n8n/design-system';

defineProps<{ label: string; description?: string; disabled?: boolean }>();
</script>

<template>
	<span :class="$style.option">
		<N8nText size="small" bold :color="disabled ? 'text-xlight' : 'text-dark'">{{ label }}</N8nText>
		<N8nText v-if="description" size="xsmall" :color="disabled ? 'text-xlight' : 'text-light'">
			{{ description }}
		</N8nText>
	</span>
</template>

<style module lang="scss">
.option {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	max-width: 260px;
	padding: var(--spacing--4xs) 0;
	white-space: normal;
	line-height: var(--line-height--md);
}
</style>
