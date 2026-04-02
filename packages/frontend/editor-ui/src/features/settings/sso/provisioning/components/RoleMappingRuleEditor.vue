<script lang="ts" setup>
import { onMounted } from 'vue';
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRolesStore } from '@/app/stores/roles.store';
import { useRoleMappingRules } from '../composables/useRoleMappingRules';
import RuleSectionHeader from './RuleSectionHeader.vue';
import RuleList from './RuleList.vue';

const i18n = useI18n();
const rolesStore = useRolesStore();

const {
	instanceRules,
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
	const source = instanceRules.value.find((r) => r.id === id);
	if (!source) return;
	addRule('instance');
	const newRule = instanceRules.value[instanceRules.value.length - 1];
	updateRule(newRule.id, { expression: source.expression, role: source.role });
}

onMounted(async () => {
	await Promise.all([loadRules(), rolesStore.fetchRoles()]);
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
			:rules="instanceRules"
			:fallback-role="fallbackInstanceRole"
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
				data-test-id="add-rule-button"
				@click="addRule('instance')"
			>
				{{ i18n.baseText('settings.sso.settings.roleMappingRules.addRule') }}
			</N8nButton>
		</div>
		<!-- Project rules section will be added in PR 3 -->
	</div>
</template>
<style lang="scss" module>
.editor {
	padding: var(--spacing--lg) 0;
}

.addButtonRow {
	display: flex;
	justify-content: flex-end;
	padding: var(--spacing--xs) 0;
}
</style>
