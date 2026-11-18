<script setup lang="ts">
import { useDocumentTitle } from '@n8n/composables/useDocumentTitle';
import { N8nSettingsLayout, N8nSettingsPageHeader } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { onMounted } from 'vue';

import WorkflowRulesEditor from '../admin/WorkflowRulesEditor.vue';
import { WORKFLOW_RULES_DOCS_URL } from '../workflow-rules.constants';

const i18n = useI18n();
const settingsStore = useSettingsStore();
const documentTitle = useDocumentTitle({ releaseChannel: settingsStore.settings.releaseChannel });

onMounted(() => documentTitle.set(i18n.baseText('workflowRules.settings.title')));
</script>

<template>
	<N8nSettingsLayout data-test-id="workflow-rules-settings">
		<N8nSettingsPageHeader
			:title="i18n.baseText('workflowRules.settings.title')"
			:description="i18n.baseText('workflowRules.settings.description')"
			:docs-url="WORKFLOW_RULES_DOCS_URL"
		/>
		<WorkflowRulesEditor :project-id="null" />
	</N8nSettingsLayout>
</template>
