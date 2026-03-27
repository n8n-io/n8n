<script lang="ts" setup>
import { N8nButton, N8nIcon, N8nInput, N8nOption, N8nSelect } from '@n8n/design-system';
import { ElSwitch } from 'element-plus';
import { useI18n } from '@n8n/i18n';
import type { RoleMappingRuleResponse } from '../types';

const props = defineProps<{
	rule: RoleMappingRuleResponse;
}>();

const emit = defineEmits<{
	update: [id: string, patch: Partial<RoleMappingRuleResponse>];
	delete: [id: string];
}>();

const i18n = useI18n();

const instanceRoleOptions = [
	{ label: 'Admin', value: 'global:admin' },
	{ label: 'Member', value: 'global:member' },
];
</script>
<template>
	<div :class="$style.row" data-test-id="rule-row">
		<div :class="$style.dragHandle" class="drag-handle">
			<N8nIcon icon="grip-vertical" size="small" color="text-light" />
		</div>
		<ElSwitch
			:model-value="props.rule.enabled"
			data-test-id="rule-toggle"
			@update:model-value="emit('update', props.rule.id, { enabled: $event as boolean })"
		/>
		<div :class="$style.expression">
			<N8nInput
				:model-value="props.rule.expression"
				type="text"
				size="small"
				:placeholder="
					i18n.baseText('settings.sso.settings.roleMappingRules.expression.placeholder')
				"
				data-test-id="rule-expression-input"
				@update:model-value="emit('update', props.rule.id, { expression: String($event) })"
			/>
		</div>
		<div :class="$style.roleSelect">
			<N8nSelect
				:model-value="props.rule.role"
				size="small"
				placeholder="Select role"
				data-test-id="rule-role-select"
				@update:model-value="emit('update', props.rule.id, { role: String($event) })"
			>
				<N8nOption
					v-for="option in instanceRoleOptions"
					:key="option.value"
					:label="option.label"
					:value="option.value"
				/>
			</N8nSelect>
		</div>
		<N8nButton
			type="tertiary"
			size="small"
			icon="trash-2"
			data-test-id="rule-delete-button"
			@click="emit('delete', props.rule.id)"
		/>
	</div>
</template>
<style lang="scss" module>
.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius);
	background: var(--color--background);

	&:hover {
		background: var(--color--background--shade-1);
	}
}

.dragHandle {
	cursor: grab;
	display: flex;
	align-items: center;
	padding: var(--spacing--4xs);

	&:active {
		cursor: grabbing;
	}
}

.expression {
	flex: 1;
	min-width: 0;
}

.roleSelect {
	width: 160px;
	flex-shrink: 0;
}
</style>
