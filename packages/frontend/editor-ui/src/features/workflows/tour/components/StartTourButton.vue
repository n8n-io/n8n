<script setup lang="ts">
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { N8nButton } from '@n8n/design-system';
import { computed } from 'vue';
import { useWorkflowTourStore } from '../workflowTour.store';
import { readWorkflowNodeDescriptions } from '../workflowTour.utils';

const emit = defineEmits<{
	start: [];
}>();

const i18n = useI18n();
const workflowDocumentStore = injectWorkflowDocumentStore();
const tourStore = useWorkflowTourStore();

const hasTourDescriptions = computed(() => {
	return !!readWorkflowNodeDescriptions(
		workflowDocumentStore.value.meta,
		workflowDocumentStore.value.allNodes.map((node) => node.id),
	);
});

const isVisible = computed(() => hasTourDescriptions.value && !tourStore.isActive);
const startButtonLabel = computed(() => i18n.baseText('workflowTour.startButton' as BaseTextKey));
</script>

<template>
	<N8nButton
		v-if="isVisible"
		variant="subtle"
		size="large"
		icon="book-open"
		:label="startButtonLabel"
		data-test-id="start-workflow-tour-button"
		@click="emit('start')"
	/>
</template>
