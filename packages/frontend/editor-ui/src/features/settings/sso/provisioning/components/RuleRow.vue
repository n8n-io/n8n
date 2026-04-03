<script lang="ts" setup>
import { computed } from 'vue';
import { N8nIcon, N8nOption, N8nSelect } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRolesStore } from '@/app/stores/roles.store';
import type { RoleMappingRuleResponse } from '@n8n/rest-api-client/api/roleMappingRule';
import RuleMappingExpressionInput from './RuleMappingExpressionInput.vue';

const props = defineProps<{
	rule: RoleMappingRuleResponse;
	priority: number;
}>();

const emit = defineEmits<{
	update: [id: string, patch: Partial<RoleMappingRuleResponse>];
	delete: [id: string];
	duplicate: [id: string];
}>();

const i18n = useI18n();
const rolesStore = useRolesStore();

const EXCLUDED_GLOBAL_ROLES = ['global:owner', 'global:chatUser'];

const instanceRoleOptions = computed(() =>
	rolesStore.roles.global
		.filter((role) => !EXCLUDED_GLOBAL_ROLES.includes(role.slug))
		.map((role) => ({ label: role.displayName, value: role.slug })),
);
</script>
<template>
	<div :class="$style.row" data-test-id="rule-row">
		<div :class="$style.cellDrag" class="drag-handle" aria-label="Reorder rule">
			<N8nIcon icon="grip-vertical" size="small" color="text-light" />
		</div>
		<div :class="$style.cellPriority">{{ priority }}.</div>
		<div :class="$style.cellCondition">
			<span :class="$style.label">If</span>
			<RuleMappingExpressionInput
				:model-value="props.rule.expression"
				:placeholder="
					i18n.baseText('settings.sso.settings.roleMappingRules.expression.placeholder')
				"
				@update:model-value="emit('update', props.rule.id, { expression: $event })"
			/>
		</div>
		<div :class="$style.cellRole">
			<span :class="$style.label">assign</span>
			<N8nSelect
				:model-value="props.rule.role"
				size="small"
				placeholder="Select role"
				:class="$style.roleSelect"
				data-test-id="rule-role-select"
				@update:model-value="emit('update', props.rule.id, { role: String($event) })"
			>
				<N8nOption
					v-for="option in instanceRoleOptions"
					:key="option.value"
					:label="option.label"
					:value="option.value"
				/>
				<div :class="$style.optionDivider" />
				<N8nOption label="No role" value="" />
			</N8nSelect>
		</div>
		<div :class="$style.cellAction">
			<N8nIcon
				icon="copy"
				size="small"
				color="text-light"
				:class="$style.actionIcon"
				aria-label="Duplicate rule"
				data-test-id="rule-copy-button"
				@click="emit('duplicate', props.rule.id)"
			/>
		</div>
		<div :class="$style.cellAction">
			<N8nIcon
				icon="trash-2"
				size="small"
				color="text-light"
				:class="$style.actionIcon"
				aria-label="Delete rule"
				data-test-id="rule-delete-button"
				@click="emit('delete', props.rule.id)"
			/>
		</div>
	</div>
</template>
<style lang="scss" module>
.row {
	display: flex;
	align-items: center;
	height: 48px;
	background: var(--color--foreground--tint-2);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);

	&:last-child {
		border-bottom: none;
	}
}

.cellDrag {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	padding: 0 var(--spacing--2xs) 0 var(--spacing--xs);
	cursor: grab;
	flex-shrink: 0;

	&:active {
		cursor: grabbing;
	}
}

.cellPriority {
	width: 24px;
	font-size: var(--font-size--sm);
	color: var(--color--text);
	flex-shrink: 0;
}

.cellCondition {
	flex: 1;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--2xs);
	min-width: 0;
}

.cellRole {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--2xs);
	flex-shrink: 0;
}

.cellAction {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	flex-shrink: 0;
}

.roleSelect {
	width: 130px;
}

.optionDivider {
	height: 1px;
	background: var(--color--foreground);
	margin: var(--spacing--4xs) var(--spacing--2xs);
}

.actionIcon {
	cursor: pointer;

	&:hover {
		color: var(--color--text) !important;
	}
}

.label {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
	white-space: nowrap;
}
</style>
