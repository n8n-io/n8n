<template>
	<n8n-node-creator-node
		v-if="nodeType"
		draggable
		class="action ignore-key-press"
		:title="title"
		:is-trigger="false"
		data-keyboard-nav="true"
		@click.capture="onAddNode"
	>
		<template #dragContent>
			<div ref="draggableDataTransfer" class="draggableDataTransfer" />
			<div v-show="dragging" class="draggable" :style="draggableStyle">
				<NodeIcon :node-type="nodeType" :size="40" :shrink="false" @click.capture.stop />
			</div>
		</template>
		<template #icon>
			<NodeIcon :node-type="nodeType" />
		</template>
	</n8n-node-creator-node>
</template>

<script setup lang="ts">
import { reactive, computed, toRefs } from 'vue';
import type { AddedNodesAndConnections } from '@/Interface';

import NodeIcon from '@/components/NodeIcon.vue';

// import { useViewStacks } from '../composables/useViewStacks';
// import { useActions } from '../composables/useActions';
import type { INode } from 'n8n-workflow';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

export interface Props {
	// nodeType: INodeTypeDescription;
	title: string;
	node: INode;
}
const emit = defineEmits<{
	(event: 'addNodes', value: AddedNodesAndConnections): void;
}>();

const props = defineProps<Props>();
const state = reactive({
	dragging: false,
	draggableStyle: {
		top: '0px',
		left: '0px',
	},
});
const nodeType = computed(() => {
	return useNodeTypesStore().allLatestNodeTypes.find(
		(nodeType) => nodeType.name === props.node.type,
	);
});
function onAddNode(event: UIEvent) {
	// We wrap the click event in node-icon emit, so to avoid double adding of nodes
	// if (event?.type === 'click') return;
	emit('addNodes', {
		nodes: [props.node],
		connections: [],
	});
}
// const telemetry = instance?.proxy.$telemetry;

// const { getActionData, getAddedNodesAndConnections, setAddedNodeActionParameters } = useActions();
// const { activeViewStack } = useViewStacks();
const { draggableStyle, dragging } = toRefs(state);
</script>

<style lang="scss" scoped>
.action {
	--node-creator-name-size: var(--font-size-2xs);
	--node-creator-name-weight: var(--font-weight-normal);
	--trigger-icon-background-color: #{$trigger-icon-background-color};
	--trigger-icon-border-color: #{$trigger-icon-border-color};
	--node-icon-size: 20px;
	--node-icon-margin-right: var(--spacing-xs);

	margin-left: var(--spacing-s);
	margin-right: var(--spacing-s);
	padding: var(--spacing-2xs) 0;
}
.nodeIcon {
	margin-right: var(--spacing-xs);
}

.draggable {
	width: 100px;
	height: 100px;
	position: fixed;
	z-index: 1;
	opacity: 0.66;
	border: 2px solid var(--color-foreground-xdark);
	border-radius: var(--border-radius-large);
	background-color: var(--color-background-xlight);
	display: flex;
	justify-content: center;
	align-items: center;
}

.draggableDataTransfer {
	width: 1px;
	height: 1px;
}
</style>
