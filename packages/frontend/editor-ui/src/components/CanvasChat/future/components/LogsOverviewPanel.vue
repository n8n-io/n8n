<script setup lang="ts">
import PanelHeader from '@/components/CanvasChat/future/components/PanelHeader.vue';
import { useClearExecutionButtonVisible } from '@/composables/useClearExecutionButtonVisible';
import { useI18n } from '@/composables/useI18n';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { N8nButton, N8nText, N8nTooltip } from '@n8n/design-system';
import { computed } from 'vue';
import { ElTree } from 'element-plus';
import { createAiData, getTreeNodeData, type TreeNode } from '@/components/RunDataAi/utils';
import { type INodeUi } from '@/Interface';

const { node, isOpen } = defineProps<{ isOpen: boolean; node: INodeUi | null }>();

const emit = defineEmits<{ clickHeader: [] }>();

defineSlots<{ actions: {} }>();

const locale = useI18n();
const workflowsStore = useWorkflowsStore();
const nodeHelpers = useNodeHelpers();
const isClearExecutionButtonVisible = useClearExecutionButtonVisible();
const workflow = computed(() => workflowsStore.getCurrentWorkflow());
const executionTree = computed<TreeNode[]>(() =>
	node
		? getTreeNodeData(
				node.name,
				workflow.value,
				createAiData(node.name, workflow.value, workflowsStore.getWorkflowResultDataByNodeName),
			)
		: [],
);
const isEmpty = computed(() => executionTree.value.length === 0);

function onClearExecutionData() {
	workflowsStore.setWorkflowExecutionData(null);
	nodeHelpers.updateNodesExecutionIssues();
}
</script>

<template>
	<div :class="$style.container">
		<PanelHeader
			:title="locale.baseText('logs.overview.header.title')"
			@click="emit('clickHeader')"
		>
			<template #actions>
				<N8nTooltip
					v-if="isClearExecutionButtonVisible"
					:content="locale.baseText('logs.overview.header.actions.clearExecution.tooltip')"
				>
					<N8nButton
						size="mini"
						type="secondary"
						icon="trash"
						icon-size="medium"
						@click.stop="onClearExecutionData"
						>{{ locale.baseText('logs.overview.header.actions.clearExecution') }}</N8nButton
					>
				</N8nTooltip>
				<slot name="actions" />
			</template>
		</PanelHeader>
		<div v-if="isOpen" :class="[$style.content, isEmpty ? $style.empty : '']">
			<N8nText v-if="isEmpty" tag="p" size="medium" color="text-base" :class="$style.emptyText">
				{{ locale.baseText('logs.overview.body.empty.message') }}
			</N8nText>
			<ElTree
				v-else
				:indent="0"
				:data="executionTree"
				:expand-on-click-node="true"
				:default-expand-all="false"
			>
				<template #default="{ node, data }">
					<LogsOverviewRow :data="data" :node="node" />
				</template>
			</ElTree>
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

	& :global(.el-icon) {
		display: none;
	}
}

.content {
	padding: var(--spacing-2xs);
	flex-grow: 1;
	overflow: auto;

	&.empty {
		display: flex;
		align-items: center;
		justify-content: center;
	}
}

.emptyText {
	max-width: 20em;
	text-align: center;
}
</style>
