<script lang="ts" setup>
import { N8nHeading } from '@n8n/design-system';

defineProps<{
	title: string;
}>();
</script>

<template>
	<div :class="$style.block">
		<div :class="$style.header">
			<N8nHeading tag="h3" size="small" color="text-base">{{ title }}</N8nHeading>
		</div>
		<div :class="$style.content">
			<slot></slot>
		</div>
	</div>
</template>

<style lang="scss" module>
.block {
	padding-bottom: var(--spacing--xl);
}

.header {
	padding: 0 0 var(--spacing--4xs);
	border-bottom: var(--border);
}

.content {
	padding: var(--spacing--xs) 0 0;
}
</style>
