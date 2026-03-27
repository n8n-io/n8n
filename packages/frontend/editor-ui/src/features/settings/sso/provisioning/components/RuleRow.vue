<script lang="ts" setup>
import { computed } from 'vue';
import { N8nButton, N8nIcon, N8nInput, N8nOption, N8nSelect } from '@n8n/design-system';
import { ElSwitch } from 'element-plus';
import { useI18n } from '@n8n/i18n';
import type { RoleMappingRuleResponse, RoleMappingRuleType } from '../types';

const props = withDefaults(
	defineProps<{
		rule: RoleMappingRuleResponse;
		type?: RoleMappingRuleType;
		projects?: Array<{ id: string; name: string }>;
	}>(),
	{
		type: 'instance',
		projects: () => [],
	},
);

const emit = defineEmits<{
	update: [id: string, patch: Partial<RoleMappingRuleResponse>];
	delete: [id: string];
}>();

const i18n = useI18n();

const instanceRoleOptions = [
	{ label: 'Admin', value: 'global:admin' },
	{ label: 'Member', value: 'global:member' },
];

const projectRoleOptions = [
	{ label: 'Project Admin', value: 'project:admin' },
	{ label: 'Project Editor', value: 'project:editor' },
	{ label: 'Project Viewer', value: 'project:viewer' },
];

const roleOptions = computed(() =>
	props.type === 'project' ? projectRoleOptions : instanceRoleOptions,
);
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
		<div v-if="props.type === 'project'" :class="$style.projectSelect">
			<N8nSelect
				:model-value="props.rule.projectIds"
				size="small"
				multiple
				placeholder="Select projects"
				data-test-id="rule-project-select"
				@update:model-value="emit('update', props.rule.id, { projectIds: $event as string[] })"
			>
				<N8nOption
					v-for="project in props.projects"
					:key="project.id"
					:label="project.name"
					:value="project.id"
				/>
			</N8nSelect>
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
					v-for="option in roleOptions"
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

.projectSelect {
	width: 200px;
	flex-shrink: 0;
}

.roleSelect {
	width: 160px;
	flex-shrink: 0;
}
</style>
