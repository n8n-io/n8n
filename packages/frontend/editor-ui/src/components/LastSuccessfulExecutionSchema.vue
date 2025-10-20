<script setup lang="ts">
import { useWorkflowsStore } from '@/stores/workflows.store';
import { N8nAccordionHeader } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import VirtualSchema from './VirtualSchema.vue';
import type { NodePanelType } from '@/Interface';
import type { IConnectedNode, INode, NodeConnectionType } from 'n8n-workflow';
import { convertToDisplayDate } from '@/utils/formatters/dateFormatter';
import { computed } from 'vue';

const i18n = useI18n();
const workflowsStore = useWorkflowsStore();

interface Props {
	node?: INode | null;
	nodes?: IConnectedNode[];
	connectionType?: NodeConnectionType;
	paneType: NodePanelType;
	compact?: boolean;
}

const lastExecutionTime = computed(() => {
	const execution = workflowsStore.lastSuccessfulExecution;
	if (!execution?.stoppedAt) {
		return { time: '', date: '' };
	}
	return convertToDisplayDate(execution.stoppedAt);
});

withDefaults(defineProps<Props>(), {
	node: null,
	nodes: () => [],
	connectionType: undefined,
});

const emit = defineEmits<{
	toggle: [expanded: boolean];
}>();

const toggle = (expanded: boolean) => {
	emit('toggle', expanded);
};
</script>

<template>
	<div v-if="workflowsStore.lastSuccessfulExecution">
		<N8nAccordionHeader
			:title="
				i18n.baseText('lastSuccessfulExecutionSchema.viewSchemaAction', {
					interpolate: {
						time: lastExecutionTime.time,
						date: lastExecutionTime.date,
					},
				})
			"
			@toggle="toggle"
		>
			<VirtualSchema
				class="mt-s"
				:pane-type="paneType"
				:nodes="nodes"
				:mapping-enabled="true"
				:node="node"
				:connection-type="connectionType"
				:compact="compact"
				:execution="workflowsStore.lastSuccessfulExecution"
			/>
		</N8nAccordionHeader>
	</div>
</template>
