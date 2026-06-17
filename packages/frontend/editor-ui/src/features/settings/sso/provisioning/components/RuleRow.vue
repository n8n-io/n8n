<script lang="ts" setup>
import { computed } from 'vue';
import { N8nIcon, N8nOption, N8nSelect, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRolesStore } from '@/app/stores/roles.store';
import type {
	RoleMappingRuleResponse,
	RoleMappingRuleType,
} from '@n8n/rest-api-client/api/roleMappingRule';
import RuleMappingExpressionInput from './RuleMappingExpressionInput.vue';

const props = withDefaults(
	defineProps<{
		rule: RoleMappingRuleResponse;
		priority: number;
		type?: RoleMappingRuleType;
		projects?: Array<{ id: string; name: string }>;
		disabled?: boolean;
	}>(),
	{
		type: 'instance',
		projects: () => [],
		disabled: false,
	},
);

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

const projectRoleOptions = computed(() =>
	rolesStore.processedProjectRoles.map((role) => ({
		label: role.displayName,
		value: role.slug,
	})),
);

const roleOptions = computed(() =>
	props.type === 'project' ? projectRoleOptions.value : instanceRoleOptions.value,
);

const selectedProjectNames = computed(() => {
	if (!props.rule.projectIds?.length) return '';
	return props.projects
		.filter((p) => props.rule.projectIds.includes(p.id))
		.map((p) => p.name)
		.join(', ');
});
</script>
<template>
	<div :class="[$style.row, { [$style.disabled]: props.disabled }]" data-test-id="rule-row">
		<div :class="$style.cellDrag" class="drag-handle" aria-label="Reorder rule">
			<N8nIcon icon="grip-vertical" size="small" color="text-light" />
		</div>
		<div :class="$style.cellPriority">{{ priority }}.</div>
		<div :class="$style.cellCondition">
			<span :class="$style.label">If</span>
			<RuleMappingExpressionInput
				:model-value="props.rule.expression"
				:disabled="props.disabled"
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
				:disabled="props.disabled"
				placeholder="Select role"
				:class="$style.roleSelect"
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
		<div v-if="props.type === 'project'" :class="$style.cellProject">
			<span :class="$style.label">in</span>
			<N8nTooltip :content="selectedProjectNames" :disabled="!selectedProjectNames" placement="top">
				<N8nSelect
					:model-value="props.rule.projectIds"
					size="small"
					multiple
					collapse-tags
					:collapse-tags-tooltip="false"
					:disabled="props.disabled"
					placeholder="Select proj..."
					data-test-id="rule-project-select"
					@update:model-value="
						emit('update', props.rule.id, {
							projectIds: ($event as string[]) ?? [],
						})
					"
				>
					<N8nOption
						v-for="project in props.projects"
						:key="project.id"
						:label="project.name"
						:value="project.id"
					/>
				</N8nSelect>
			</N8nTooltip>
		</div>
		<div :class="$style.cellAction">
			<N8nIcon
				icon="copy"
				size="small"
				color="text-light"
				:class="[$style.actionIcon, { [$style.disabledIcon]: props.disabled }]"
				aria-label="Duplicate rule"
				data-test-id="rule-copy-button"
				@click="!props.disabled && emit('duplicate', props.rule.id)"
			/>
		</div>
		<div :class="$style.cellAction">
			<N8nIcon
				icon="trash-2"
				size="small"
				color="text-light"
				:class="[$style.actionIcon, { [$style.disabledIcon]: props.disabled }]"
				aria-label="Delete rule"
				data-test-id="rule-delete-button"
				@click="!props.disabled && emit('delete', props.rule.id)"
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

.cellProject {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--2xs);
	flex-shrink: 0;
}

.cellRole {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--2xs);
	flex-shrink: 0;
}

.roleSelect {
	width: 130px;
}

.cellAction {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	flex-shrink: 0;
}

.actionIcon {
	cursor: pointer;

	&:hover {
		color: var(--color--text) !important;
	}
}

.disabledIcon {
	cursor: not-allowed;
	opacity: 0.5;

	&:hover {
		color: var(--color--text--tint-2) !important;
	}
}

.disabled {
	opacity: 0.6;
	pointer-events: auto;
}

.label {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
	white-space: nowrap;
}
</style>
