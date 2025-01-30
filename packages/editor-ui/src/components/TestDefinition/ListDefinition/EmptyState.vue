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
		<div :class="$style.content">
			<n8n-action-box
				:class="$style.actionBox"
				:heading="locale.baseText('testDefinition.list.evaluations')"
				:description="locale.baseText('testDefinition.list.actionDescription')"
				:button-text="locale.baseText('testDefinition.list.actionButton')"
				@click:button="$emit('create-test')"
			/>
			<n8n-action-box
				:class="$style.actionBox"
				:heading="locale.baseText('testDefinition.list.unitTests.title')"
				:description="locale.baseText('testDefinition.list.unitTests.description')"
				:button-text="locale.baseText('testDefinition.list.unitTests.cta')"
				button-type="tertiary"
			/>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	max-width: 75rem;
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
.content {
	width: 100%;
	display: flex;
	gap: var(--spacing-m);
}
.actionBox {
	flex: 1;
}
</style>
