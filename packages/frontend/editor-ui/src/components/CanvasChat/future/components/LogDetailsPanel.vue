<script setup lang="ts">
import ExecutionSummary from '@/components/CanvasChat/future/components/ExecutionSummary.vue';
import PanelHeader from '@/components/CanvasChat/future/components/PanelHeader.vue';
import NodeIcon from '@/components/NodeIcon.vue';
import { type TreeNode } from '@/components/RunDataAi/utils';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { N8nText } from '@n8n/design-system';
import { computed } from 'vue';

const { isOpen, logEntry } = defineProps<{ isOpen: boolean; logEntry: TreeNode }>();

const emit = defineEmits<{ clickHeader: [] }>();

defineSlots<{ actions: {} }>();

const workflowsStore = useWorkflowsStore();
const nodeTypeStore = useNodeTypesStore();
const node = computed(() => workflowsStore.nodesByName[logEntry.node]);
const type = computed(() => (node.value ? nodeTypeStore.getNodeType(node.value.type) : undefined));
const runData = computed(
	() =>
		(workflowsStore.workflowExecutionData?.data?.resultData.runData[logEntry.node] ?? [])[
			logEntry.runIndex
		],
);
const isError = computed(() => !!runData.value?.error);
</script>

<template>
	<div v-if="runData !== undefined" :class="$style.container" data-test-id="log-details">
		<PanelHeader data-test-id="logs-details-header" @click="emit('clickHeader')">
			<template #title>
				<div :class="$style.title">
					<NodeIcon :node-type="type" :size="16" :class="$style.icon" />
					<N8nText
						tag="div"
						:bold="true"
						size="small"
						:class="$style.name"
						:color="isError ? 'danger' : undefined"
						>{{ node.name }}</N8nText
					>
					<ExecutionSummary
						:status="runData.executionStatus ?? 'unknown'"
						:consumed-tokens="logEntry.consumedTokens"
						:time-took="runData.executionTime"
					/>
				</div>
			</template>
			<template #actions>
				<slot name="actions" />
			</template>
		</PanelHeader>
		<div v-if="isOpen" :class="$style.content" data-test-id="logs-details-body" />
	</div>
</template>

<style lang="scss" module>
.container {
	flex-grow: 1;
	flex-shrink: 1;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	overflow: hidden;
	background-color: var(--color-foreground-xlight);
}

.title {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
}

.content {
	flex-grow: 1;
	padding: var(--spacing-s);
}
</style>
