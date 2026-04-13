<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRBACStore } from '@/app/stores/rbac.store';
import { useRolesStore } from '@/app/stores/roles.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useRoleMappingRules } from '../composables/useRoleMappingRules';
import RuleSectionHeader from './RuleSectionHeader.vue';
import RuleList from './RuleList.vue';

const props = withDefaults(
	defineProps<{
		showProjectRules?: boolean;
	}>(),
	{
		showProjectRules: true,
	},
);

const i18n = useI18n();
const rbacStore = useRBACStore();
const rolesStore = useRolesStore();
const projectsStore = useProjectsStore();

const canEdit = computed(() => rbacStore.hasScope('roleMappingRule:create'));

const teamProjectOptions = computed(() =>
	projectsStore.teamProjects.map((p) => ({ id: p.id, name: p.name ?? '' })),
);

const {
	instanceRules,
	projectRules,
	fallbackInstanceRole,
	isDirty,
	addRule,
	updateRule,
	deleteRule,
	reorder,
	loadRules,
	save,
} = useRoleMappingRules();

function duplicateRule(id: string) {
	const allRules = [...instanceRules.value, ...projectRules.value];
	const source = allRules.find((r) => r.id === id);
	if (!source) return;
	addRule(source.type);
	const rules = source.type === 'instance' ? instanceRules : projectRules;
	const newRule = rules.value[rules.value.length - 1];
	updateRule(newRule.id, {
		expression: source.expression,
		role: source.role,
		projectIds: [...source.projectIds],
	});
}

onMounted(async () => {
	await Promise.all([loadRules(), rolesStore.fetchRoles(), projectsStore.getAllProjects()]);
});

defineExpose({ isDirty, save });
</script>
<template>
	<div :class="$style.editor" data-test-id="role-mapping-rule-editor">
		<RuleSectionHeader
			:title="i18n.baseText('settings.sso.settings.roleMappingRules.instanceRules.title')"
			:description="
				i18n.baseText('settings.sso.settings.roleMappingRules.instanceRules.description')
			"
		/>
		<RuleList
			type="instance"
			:rules="instanceRules"
			:fallback-role="fallbackInstanceRole"
			:disabled="!canEdit"
			@reorder="(from, to) => reorder('instance', from, to)"
			@update="updateRule"
			@delete="deleteRule"
			@duplicate="duplicateRule"
			@update:fallback-role="fallbackInstanceRole = $event"
		/>
		<div :class="$style.addButtonRow">
			<N8nButton
				variant="outline"
				size="small"
				icon="plus"
				:disabled="!canEdit"
				data-test-id="add-instance-rule-button"
				@click="addRule('instance')"
			>
				{{ i18n.baseText('settings.sso.settings.roleMappingRules.addRule') }}
			</N8nButton>
		</div>

		<template v-if="props.showProjectRules">
			<hr :class="$style.sectionDivider" />

			<RuleSectionHeader
				:title="i18n.baseText('settings.sso.settings.roleMappingRules.projectRules.title')"
				:description="
					i18n.baseText('settings.sso.settings.roleMappingRules.projectRules.description')
				"
			/>
			<RuleList
				type="project"
				:rules="projectRules"
				:projects="teamProjectOptions"
				:disabled="!canEdit"
				@reorder="(from, to) => reorder('project', from, to)"
				@update="updateRule"
				@delete="deleteRule"
				@duplicate="duplicateRule"
			/>
			<div :class="$style.addButtonRow">
				<N8nButton
					variant="outline"
					size="small"
					icon="plus"
					:disabled="!canEdit"
					data-test-id="add-project-rule-button"
					@click="addRule('project')"
				>
					{{ i18n.baseText('settings.sso.settings.roleMappingRules.addRule') }}
				</N8nButton>
			</div>
		</template>
	</div>
</template>
<style lang="scss" module>
.editor {
	padding: var(--spacing--sm) 0;
}

.addButtonRow {
	display: flex;
	justify-content: flex-end;
	padding: var(--spacing--2xs) 0;
}

.sectionDivider {
	border: none;
	border-top: var(--border-width) var(--border-style) var(--color--foreground);
	margin: var(--spacing--sm) 0;
}
</style>
