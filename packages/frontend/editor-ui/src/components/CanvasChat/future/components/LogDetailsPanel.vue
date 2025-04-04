<script setup lang="ts">
import ExecutionSummary from '@/components/CanvasChat/future/components/ExecutionSummary.vue';
import PanelHeader from '@/components/CanvasChat/future/components/PanelHeader.vue';
import RunDataView from '@/components/CanvasChat/future/components/RunDataView.vue';
import { LOG_DETAILS_CONTENT, type LogDetailsContent } from '@/components/CanvasChat/types/logs';
import NodeIcon from '@/components/NodeIcon.vue';
import { type TreeNode } from '@/components/RunDataAi/utils';
import { useI18n } from '@/composables/useI18n';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { N8nButton, N8nText } from '@n8n/design-system';
import { computed } from 'vue';

const { isOpen, logEntry, content } = defineProps<{
	isOpen: boolean;
	logEntry: TreeNode;
	content: LogDetailsContent;
}>();

const emit = defineEmits<{ clickHeader: []; toggleInput: []; toggleOutput: [] }>();

defineSlots<{ actions: {} }>();

const locale = useI18n();
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
				<div :class="$style.actions">
					<N8nButton
						size="mini"
						type="secondary"
						:class="content === LOG_DETAILS_CONTENT.OUTPUT ? '' : $style.pressed"
						@click.stop="emit('toggleInput')"
					>
						{{ locale.baseText('logs.details.header.actions.input') }}
					</N8nButton>
					<N8nButton
						size="mini"
						type="secondary"
						:class="content === LOG_DETAILS_CONTENT.INPUT ? '' : $style.pressed"
						@click.stop="emit('toggleOutput')"
					>
						{{ locale.baseText('logs.details.header.actions.output') }}
					</N8nButton>
				</div>
				<slot name="actions" />
			</template>
		</PanelHeader>
		<div v-if="isOpen" :class="$style.content" data-test-id="logs-details-body">
			<RunDataView
				v-if="content !== LOG_DETAILS_CONTENT.OUTPUT"
				:title="locale.baseText('logs.details.header.actions.input')"
				:data="runData"
			/>
			<RunDataView
				v-if="content !== LOG_DETAILS_CONTENT.INPUT"
				:title="locale.baseText('logs.details.header.actions.output')"
				:data="runData"
			/>
		</div>
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
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
	padding-inline-end: var(--spacing-2xs);

	.pressed {
		background-color: var(--color-button-secondary-focus-outline);
	}
}

.title {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
}

.content {
	flex-grow: 1;
	display: flex;
	align-items: stretch;

	& > * {
		width: 50%;
	}

	& > *:not(:last-child) {
		border-right: var(--border-base);
	}
}
</style>
