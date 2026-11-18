<script setup lang="ts">
import type { WorkflowRulesScanResponse } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nIcon,
	N8nSettingsSaveBar,
	N8nTabs,
	type TabOptions,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { CustomRule } from '@n8n/workflow-rules';
import { computed, onMounted, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';

import CatalogueRulesTable from './CatalogueRulesTable.vue';
import CustomRuleDialog from './CustomRuleDialog.vue';
import CustomRulesList from './CustomRulesList.vue';
import ExemptionsList from './ExemptionsList.vue';
import ImpactConfirmDialog from './ImpactConfirmDialog.vue';
import RuleOptionsDialog from './RuleOptionsDialog.vue';
import RulesReport from './RulesReport.vue';
import UseInCiDialog from './UseInCiDialog.vue';
import { useRuleSetEditor } from './useRuleSetEditor';

type Tab = 'rules' | 'custom' | 'exemptions' | 'report';

const props = defineProps<{ projectId: string | null }>();

const i18n = useI18n();
const toast = useToast();
const editor = useRuleSetEditor(props.projectId);

const tab = ref<Tab>('rules');
const tabs = computed<Array<TabOptions<Tab>>>(() => [
	{ label: i18n.baseText('workflowRules.tabs.rules'), value: 'rules' },
	{ label: i18n.baseText('workflowRules.tabs.custom'), value: 'custom' },
	{ label: i18n.baseText('workflowRules.tabs.exemptions'), value: 'exemptions' },
	{ label: i18n.baseText('workflowRules.tabs.report'), value: 'report' },
]);

const optionsRuleId = ref<string | null>(null);
const customDialogOpen = ref(false);
const editingCustomRule = ref<CustomRule | null>(null);
const impact = ref<WorkflowRulesScanResponse | null>(null);
const previewing = ref(false);
const ciOpen = ref(false);

const customRules = computed(() => [
	...(editor.instanceRuleSet.value?.customRules ?? []),
	...editor.draft.value.customRules,
]);

function onOptionsSaved(
	ruleId: string,
	options: Record<string, unknown> | undefined,
	adjustable: boolean,
) {
	if (options) editor.setOptions(ruleId, options);
	const current = editor.settingFor(ruleId)?.adjustable ?? false;
	if (props.projectId === null && current !== adjustable) editor.setAdjustable(ruleId, adjustable);
	optionsRuleId.value = null;
}

function openCustomRule(rule: CustomRule | null) {
	editingCustomRule.value = rule;
	customDialogOpen.value = true;
}

function onCustomRuleSaved(rule: CustomRule) {
	editor.saveCustomRule(rule);
	customDialogOpen.value = false;
}

/** Previews the draft with this one rule changed, without touching the draft. */
async function previewCustomRule(rule: CustomRule) {
	const others = editor.draft.value.customRules.filter((existing) => existing.id !== rule.id);
	const original = editor.draft.value;
	editor.draft.value = { ...original, customRules: [...others, rule] };
	try {
		return await editor.previewDraft();
	} finally {
		editor.draft.value = original;
	}
}

async function onSaveClick() {
	previewing.value = true;
	try {
		impact.value = await editor.previewDraft();
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowRules.impact.error'));
	} finally {
		previewing.value = false;
	}
}

async function onConfirmSave() {
	if (await editor.save()) impact.value = null;
}

onMounted(async () => {
	await editor.load();
	void editor.runReport();
});

onBeforeRouteLeave(() => {
	if (!editor.isDirty.value) return true;
	return window.confirm(i18n.baseText('workflowRules.settings.leaveConfirm'));
});
</script>

<template>
	<div :class="$style.editor">
		<div v-if="editor.loading.value" :class="$style.loading">
			<N8nIcon icon="spinner" spin />
		</div>
		<template v-else>
			<div :class="$style.tabsRow">
				<N8nTabs v-model="tab" :options="tabs" data-test-id="workflow-rules-tabs" />
				<N8nButton
					v-if="projectId === null"
					variant="outline"
					icon="terminal"
					:label="i18n.baseText('workflowRules.ci.open')"
					data-test-id="workflow-rules-ci-open"
					@click="ciOpen = true"
				/>
			</div>

			<CatalogueRulesTable
				v-if="tab === 'rules'"
				:editor="editor"
				@configure="(ruleId) => (optionsRuleId = ruleId)"
				@show-report="tab = 'report'"
			/>
			<CustomRulesList
				v-else-if="tab === 'custom'"
				:editor="editor"
				@create="openCustomRule(null)"
				@edit="openCustomRule"
			/>
			<ExemptionsList
				v-else-if="tab === 'exemptions'"
				:project-id="projectId"
				:custom-rules="customRules"
			/>
			<RulesReport v-else :editor="editor" :custom-rules="customRules" />
		</template>

		<N8nSettingsSaveBar
			:visible="editor.isDirty.value"
			:message="i18n.baseText('workflowRules.settings.unsaved')"
			:save-label="i18n.baseText('workflowRules.settings.save')"
			:discard-label="i18n.baseText('workflowRules.settings.discard')"
			:saving="previewing || editor.saving.value"
			floating
			data-test-id="workflow-rules-save-bar"
			@save="onSaveClick"
			@discard="editor.discard()"
		/>

		<RuleOptionsDialog
			:rule-id="optionsRuleId"
			:options="optionsRuleId ? editor.settingFor(optionsRuleId)?.options : undefined"
			:adjustable="optionsRuleId ? editor.settingFor(optionsRuleId)?.adjustable : false"
			:show-adjustable="projectId === null"
			@close="optionsRuleId = null"
			@save="onOptionsSaved"
		/>
		<CustomRuleDialog
			:open="customDialogOpen"
			:rule="editingCustomRule"
			:allow-adjustable="projectId === null"
			:preview="previewCustomRule"
			:existing-ids="customRules.map((rule) => rule.id)"
			@close="customDialogOpen = false"
			@save="onCustomRuleSaved"
		/>
		<ImpactConfirmDialog
			:impact="impact"
			:saving="editor.saving.value"
			@close="impact = null"
			@confirm="onConfirmSave"
		/>
		<UseInCiDialog v-model:open="ciOpen" />
	</div>
</template>

<style lang="scss" module>
.editor {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	padding-bottom: var(--spacing--3xl);
}

.loading {
	display: flex;
	justify-content: center;
	padding: var(--spacing--xl);
}

.tabsRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}
</style>
