<script setup lang="ts">
import { N8nButton, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import {
	useDocumentProjectWithAi,
	type UndocumentedWorkflow,
} from '../composables/useDocumentProjectWithAi';

/**
 * Asks the assistant to write pages for the most important workflows of a project that have none, and the summary of the project.
 * `hasSummary` tells that the project has a summary. The button then offers an update.
 * It renders nothing without a project, and when the assistant or the pages are not available to this user.
 * `started` fires after the assistant thread opened.
 */
const props = withDefaults(
	defineProps<{
		projectId?: string;
		undocumentedWorkflows: UndocumentedWorkflow[];
		hasSummary?: boolean;
	}>(),
	{ projectId: undefined, hasSummary: false },
);

const emit = defineEmits<{ started: [] }>();

const i18n = useI18n();
const { isAvailable, isStarting, documentProject } = useDocumentProjectWithAi();

const canDocumentProject = computed(() => isAvailable.value && props.projectId !== undefined);

const labelKey = computed(() =>
	props.hasSummary ? 'page.documentProject.update.label' : 'page.documentProject.label',
);
const tooltipKey = computed(() =>
	props.hasSummary ? 'page.documentProject.update.tooltip' : 'page.documentProject.tooltip',
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
	<N8nTooltip v-if="canDocumentProject" :content="i18n.baseText(tooltipKey)">
		<N8nButton
			:variant="hasSummary ? 'ghost' : 'solid'"
			:size="hasSummary ? 'small' : 'medium'"
			icon="sparkles"
			:loading="isStarting"
			:label="i18n.baseText(labelKey)"
			data-test-id="page-document-project-button"
			@click="startDocumenting"
		/>
	</N8nTooltip>
</template>
