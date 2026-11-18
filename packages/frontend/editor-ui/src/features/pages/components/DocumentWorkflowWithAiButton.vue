<script setup lang="ts">
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import {
	useDocumentWorkflowWithAi,
	type WorkflowToDocument,
} from '../composables/useDocumentWorkflowWithAi';

/**
 * Asks the assistant to write a page that documents a workflow.
 * It renders nothing when the assistant or the pages are not available to this user.
 * `started` fires after the assistant thread opened.
 */
const props = defineProps<{
	workflow: WorkflowToDocument;
	/** The project of the assistant thread. The new page goes to this project. */
	projectId: string;
}>();

const emit = defineEmits<{ started: [] }>();

const i18n = useI18n();
const { isAvailable, isStarting, documentWorkflow } = useDocumentWorkflowWithAi();

async function startDocumenting(): Promise<void> {
	if (await documentWorkflow(props.workflow, props.projectId)) {
		emit('started');
	}
}
</script>

<template>
	<N8nButton
		v-if="isAvailable"
		variant="ghost"
		size="small"
		icon="sparkles"
		:label="i18n.baseText('page.documentWithAi.label')"
		:loading="isStarting"
		data-test-id="workflow-pages-document-with-ai"
		@click="startDocumenting"
	/>
</template>
