<script setup lang="ts">
import { N8nButton, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import {
	useDocumentProjectWithAi,
	type UndocumentedWorkflow,
} from '../composables/useDocumentProjectWithAi';

/**
 * Asks the assistant to write pages for the most important workflows of a project that have none, and one general page about the project.
 * It renders nothing without a project, without a workflow to document, and when the assistant or the pages are not available to this user.
 * `started` fires after the assistant thread opened.
 */
const props = defineProps<{
	projectId?: string;
	undocumentedWorkflows: UndocumentedWorkflow[];
}>();

const emit = defineEmits<{ started: [] }>();

const i18n = useI18n();
const { isAvailable, isStarting, documentProject } = useDocumentProjectWithAi();

const canDocumentProject = computed(
	() =>
		isAvailable.value && props.projectId !== undefined && props.undocumentedWorkflows.length > 0,
);

async function startDocumenting(): Promise<void> {
	if (
		props.projectId !== undefined &&
		(await documentProject(props.projectId, props.undocumentedWorkflows))
	) {
		emit('started');
	}
}
</script>

<template>
	<N8nTooltip v-if="canDocumentProject" :content="i18n.baseText('page.documentProject.tooltip')">
		<N8nButton
			variant="solid"
			size="medium"
			icon="sparkles"
			:loading="isStarting"
			:label="i18n.baseText('page.documentProject.label')"
			data-test-id="page-document-project-button"
			@click="startDocumenting"
		/>
	</N8nTooltip>
</template>
