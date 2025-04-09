<script setup lang="ts">
import ExecutionSummary from '@/components/CanvasChat/future/components/ExecutionSummary.vue';
import PanelHeader from '@/components/CanvasChat/future/components/PanelHeader.vue';
import RunDataView from '@/components/CanvasChat/future/components/RunDataView.vue';
import { LOG_DETAILS_CONTENT, type LogDetailsContent } from '@/components/CanvasChat/types/logs';
import NodeIcon from '@/components/NodeIcon.vue';
import { getSubtreeTotalConsumedTokens, type TreeNode } from '@/components/RunDataAi/utils';
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
const consumedTokens = computed(() => getSubtreeTotalConsumedTokens(logEntry));
const isTriggerNode = computed(() => type.value?.group.includes('trigger'));
</script>

<template>
	<div :class="$style.container" data-test-id="log-details">
		<PanelHeader data-test-id="logs-details-header" @click="emit('clickHeader')">
			<template #title>
				<div :class="$style.title">
					<NodeIcon :node-type="type" :size="16" :class="$style.icon" />
					<N8nText tag="div" :bold="true" size="small" :class="$style.name">
						{{ node.name }}
					</N8nText>
					<ExecutionSummary
						v-if="isOpen"
						:class="$style.executionSummary"
						:status="runData.executionStatus ?? 'unknown'"
						:consumed-tokens="consumedTokens"
						:time-took="runData.executionTime"
					/>
				</div>
			</template>
			<template #actions>
				<div v-if="isOpen && !isTriggerNode" :class="$style.actions">
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
				v-if="!isTriggerNode && content !== LOG_DETAILS_CONTENT.OUTPUT"
				pane-type="input"
				:class="$style.runDataView"
				:title="locale.baseText('logs.details.header.actions.input')"
				:log-entry="logEntry"
			/>
			<RunDataView
				v-if="isTriggerNode || content !== LOG_DETAILS_CONTENT.INPUT"
				pane-type="output"
				:class="$style.runDataView"
				:title="locale.baseText('logs.details.header.actions.output')"
				:log-entry="logEntry"
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
	flex-shrink: 1;
}

.icon {
	margin-right: var(--spacing-2xs);
}

.name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.executionSummary {
	flex-shrink: 1;
}

.content {
	flex-shrink: 1;
	flex-grow: 1;
	display: flex;
	align-items: stretch;
	overflow: hidden;

	& > *:not(:last-child) {
		border-right: var(--border-base);
	}
}

.runDataView {
	flex-grow: 1;
	flex-shrink: 1;
	width: 50%;
}
</style>
