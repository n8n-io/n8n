<script setup lang="ts">
import { computed } from 'vue';
import Modal from '@/components/Modal.vue';
import { WORKFLOW_PUBLISH_MODAL_KEY } from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createEventBus } from '@n8n/utils/event-bus';
import { useI18n } from '@n8n/i18n';
import { N8nHeading, N8nCallout } from '@n8n/design-system';
import { getActivatableTriggerNodes } from '@/utils/nodeTypesUtils';

const modalBus = createEventBus();
const i18n = useI18n();

const workflowsStore = useWorkflowsStore();

const foundTriggers = computed(() =>
	getActivatableTriggerNodes(workflowsStore.workflowTriggerNodes),
);

const containsTrigger = computed((): boolean => {
	return foundTriggers.value.length > 0;
});
</script>

<template>
	<Modal
		max-width="500px"
		max-height="85vh"
		:name="WORKFLOW_PUBLISH_MODAL_KEY"
		:center="true"
		:show-close="true"
		:event-bus="modalBus"
	>
		<template #header>
			<N8nHeading size="xlarge">{{ i18n.baseText('workflows.publishModal.title') }}</N8nHeading>
		</template>
		<template #content>
			<N8nCallout v-if="!containsTrigger" theme="danger" icon="status-error">
				{{ i18n.baseText('workflows.publishModal.noTriggerMessage') }}
			</N8nCallout>
		</template>
	</Modal>
</template>
