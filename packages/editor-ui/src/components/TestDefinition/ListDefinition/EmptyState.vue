<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';

defineEmits<{ 'create-test': [] }>();

const locale = useI18n();
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<h1>{{ locale.baseText('testDefinition.list.tests') }}</h1>
		</div>
		<n8n-action-box
			:description="locale.baseText('testDefinition.list.actionDescription')"
			:button-text="locale.baseText('testDefinition.list.actionButton')"
			@click:button="$emit('create-test')"
		/>
	</div>
</template>

<style module lang="scss">
.container {
	max-width: 44rem;
	margin: var(--spacing-4xl) auto 0;
	gap: var(--spacing-l);
}
.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	color: var(--color-text-dark);
	font-size: var(--font-size-l);
	margin-bottom: var(--spacing-xl);

	h1 {
		margin: 0;
	}
}
</style>
