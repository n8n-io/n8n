<script lang="ts" setup>
import { N8nOption, N8nSelect } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const modelValue = defineModel<string>({ default: 'global:member' });

const i18n = useI18n();

const roleOptions = [
	{ label: 'Admin', value: 'global:admin' },
	{ label: 'Member', value: 'global:member' },
];
</script>
<template>
	<div :class="$style.group" data-test-id="fallback-role-select">
		<label>{{ i18n.baseText('settings.sso.settings.roleMappingRules.fallbackRole.label') }}</label>
		<N8nSelect
			:model-value="modelValue"
			size="small"
			:class="$style.select"
			@update:model-value="modelValue = String($event)"
		>
			<N8nOption
				v-for="option in roleOptions"
				:key="option.value"
				:label="option.label"
				:value="option.value"
			/>
		</N8nSelect>
		<small>{{
			i18n.baseText('settings.sso.settings.roleMappingRules.fallbackRole.description')
		}}</small>
	</div>
</template>
<style lang="scss" module>
.group {
	padding: var(--spacing--lg) 0 0;

	> label {
		display: inline-block;
		font-size: var(--font-size--sm);
		font-weight: var(--font-weight--medium);
		padding: 0 0 var(--spacing--2xs);
	}

	small {
		display: block;
		padding: var(--spacing--2xs) 0 0;
		font-size: var(--font-size--2xs);
		color: var(--color--text--tint-1);
	}
}

.select {
	display: block;
	max-width: 200px;
}
</style>
