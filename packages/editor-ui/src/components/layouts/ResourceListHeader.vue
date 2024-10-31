<script setup lang="ts">
import { N8nHeading, N8nText, N8nIcon } from 'n8n-design-system';
defineProps<{ icon: string }>();
</script>

<template>
	<div :class="[$style.workflowHeader]">
		<div :class="[$style.icon]">
			<N8nIcon :icon color="text-light"></N8nIcon>
		</div>
		<div>
			<N8nHeading bold tag="h2" size="xlarge">
				<slot name="title" />
			</N8nHeading>
			<N8nText v-if="$slots.subtitle" size="small" color="text-light">
				<slot name="subtitle" />
			</N8nText>
		</div>
		<div v-if="$slots.actions" :class="[$style.actions]">
			<slot name="actions"></slot>
		</div>
	</div>
</template>

<style lang="scss" module>
.workflowHeader {
	display: flex;
	align-items: center;
	gap: 8px;
	padding-bottom: var(--spacing-m);
	min-height: 64px;
}

.icon {
	border: 1px solid var(--color-foreground-light);
	padding: 6px;
	border-radius: var(--border-radius-base);
}

.actions {
	margin-left: auto;
}
</style>
