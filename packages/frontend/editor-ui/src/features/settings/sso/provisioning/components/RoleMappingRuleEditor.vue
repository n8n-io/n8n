<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useRoleMappingRules } from '../composables/useRoleMappingRules';
import RuleSectionHeader from './RuleSectionHeader.vue';
import RuleList from './RuleList.vue';
import FallbackRoleSelect from './FallbackRoleSelect.vue';
import RemoveMappingButton from './RemoveMappingButton.vue';

const emit = defineEmits<{
	removeMapping: [];
}>();

const i18n = useI18n();

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

// Mock projects for now — will come from a real API
const availableProjects = ref([
	{ id: 'project-1', name: 'Marketing Automation' },
	{ id: 'project-2', name: 'Data Pipeline' },
	{ id: 'project-3', name: 'Customer Support' },
]);

onMounted(() => {
	void loadRules();
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
			@add="addRule('instance')"
		/>
		<RuleList
			:rules="instanceRules"
			type="instance"
			@reorder="(from, to) => reorder('instance', from, to)"
			@update="updateRule"
			@delete="deleteRule"
		/>

		<FallbackRoleSelect v-model="fallbackInstanceRole" />

		<RuleSectionHeader
			:title="i18n.baseText('settings.sso.settings.roleMappingRules.projectRules.title')"
			:description="
				i18n.baseText('settings.sso.settings.roleMappingRules.projectRules.description')
			"
			@add="addRule('project')"
		/>
		<RuleList
			:rules="projectRules"
			type="project"
			:projects="availableProjects"
			@reorder="(from, to) => reorder('project', from, to)"
			@update="updateRule"
			@delete="deleteRule"
		/>

		<RemoveMappingButton @remove="emit('removeMapping')" />
	</div>
</template>
<style lang="scss" module>
.editor {
	padding: var(--spacing--lg) 0;
}
</style>
