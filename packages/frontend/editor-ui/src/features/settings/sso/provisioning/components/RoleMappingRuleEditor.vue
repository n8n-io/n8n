<script lang="ts" setup>
import { onMounted } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useRoleMappingRules } from '../composables/useRoleMappingRules';
import RuleSectionHeader from './RuleSectionHeader.vue';
import RuleList from './RuleList.vue';

const i18n = useI18n();

const { instanceRules, isDirty, addRule, updateRule, deleteRule, reorder, loadRules, save } =
	useRoleMappingRules();

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
			@reorder="(from, to) => reorder('instance', from, to)"
			@update="updateRule"
			@delete="deleteRule"
		/>
		<!-- Project rules section will be added in PR 3 -->
	</div>
</template>
<style lang="scss" module>
.editor {
	padding: var(--spacing--lg) 0;
}
</style>
