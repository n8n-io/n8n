<script lang="ts" setup>
import { N8nButton } from '@n8n/design-system';

defineProps<{
	title: string;
	description: string;
}>();

const emit = defineEmits<{
	add: [];
}>();
</script>
<template>
	<div :class="$style.header">
		<div :class="$style.headerText">
			<h3 :class="$style.title">{{ title }}</h3>
			<p :class="$style.description">{{ description }}</p>
		</div>
		<N8nButton
			type="tertiary"
			size="small"
			icon="plus"
			data-test-id="add-rule-button"
			@click="emit('add')"
		>
			{{ $t('settings.sso.settings.roleMappingRules.addRule') }}
		</N8nButton>
	</div>
</template>
<style lang="scss" module>
.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--sm) 0;
}

.headerText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.title {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
	margin: 0;
}

.description {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	margin: 0;
}
</style>
