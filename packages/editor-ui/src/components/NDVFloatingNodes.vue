<template>
	<aside :class="$style.floatingNodes">
		<ul
			v-for="connectionGroup in connectionGroups"
			:key="connectionGroup"
			:class="[$style.nodesList, $style[connectionGroup]]"
		>
			<template v-for="{ node, nodeType } in connectedNodes[connectionGroup]">
				<n8n-tooltip
					v-if="node && nodeType"
					:key="node.name"
					:placement="tooltipPositionMapper[connectionGroup]"
					:teleported="false"
					:offset="60"
				>
					<template #content>{{ node.name }}</template>

					<li
						:class="$style.connectedNode"
						data-test-id="floating-node"
						:data-node-name="node.name"
						:data-node-placement="connectionGroup"
						@click="$emit('switchSelectedNode', node.name)"
					>
						<NodeIcon
							:node-type="nodeType"
							:node-name="node.name"
							:tooltip-position="tooltipPositionMapper[connectionGroup]"
							:size="35"
							circle
						/>
					</li>
				</n8n-tooltip>
			</template>
		</ul>
	</aside>
</template>

<script setup lang="ts">
import type { INodeUi } from '@/Interface';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { computed, onMounted, onBeforeUnmount } from 'vue';
import NodeIcon from '@/components/NodeIcon.vue';
import type { INodeTypeDescription } from 'n8n-workflow';

interface Props {
	rootNode: INodeUi;
}
const enum FloatingNodePosition {
	top = 'outputSub',
	right = 'outputMain',
	left = 'inputMain',
}
const props = defineProps<Props>();
const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();
const workflow = workflowsStore.getCurrentWorkflow();
const emit = defineEmits(['switchSelectedNode']);

interface NodeConfig {
	node: INodeUi;
	nodeType: INodeTypeDescription;
}
function moveNodeDirection(direction: FloatingNodePosition) {
	const matchedDirectionNode = connectedNodes.value[direction][0];
	if (matchedDirectionNode) {
		emit('switchSelectedNode', matchedDirectionNode.node.name);
	}
}

function onKeyDown(e: KeyboardEvent) {
	if (e.shiftKey && e.altKey && (e.ctrlKey || e.metaKey)) {
		/* eslint-disable @typescript-eslint/naming-convention */
		const mapper = {
			ArrowUp: FloatingNodePosition.top,
			ArrowRight: FloatingNodePosition.right,
			ArrowLeft: FloatingNodePosition.left,
		};
		/* eslint-enable @typescript-eslint/naming-convention */

		const matchingDirection = mapper[e.key as keyof typeof mapper] || null;
		if (matchingDirection) {
			moveNodeDirection(matchingDirection);
		}
	}
}
function getINodesFromNames(names: string[]): NodeConfig[] {
	return names
		.map((name) => {
			const node = workflowsStore.getNodeByName(name);
			if (node) {
				const nodeType = nodeTypesStore.getNodeType(node.type);
				if (nodeType) {
					return { node, nodeType };
				}
			}
			return null;
		})
		.filter((n): n is NodeConfig => n !== null);
}
const connectedNodes = computed<
	Record<FloatingNodePosition, Array<{ node: INodeUi; nodeType: INodeTypeDescription }>>
>(() => {
	const rootName = props.rootNode.name;
	return {
		[FloatingNodePosition.top]: getINodesFromNames(
			workflow.getChildNodes(rootName, 'ALL_NON_MAIN'),
		),
		[FloatingNodePosition.right]: getINodesFromNames(workflow.getChildNodes(rootName, 'main', 1)),
		[FloatingNodePosition.left]: getINodesFromNames(workflow.getParentNodes(rootName, 'main', 1)),
	};
});

const connectionGroups = [
	FloatingNodePosition.top,
	FloatingNodePosition.right,
	FloatingNodePosition.left,
];
const tooltipPositionMapper = {
	[FloatingNodePosition.top]: 'bottom',
	[FloatingNodePosition.right]: 'left',
	[FloatingNodePosition.left]: 'right',
} as const;

onMounted(() => {
	document.addEventListener('keydown', onKeyDown, true);
});

onBeforeUnmount(() => {
	document.removeEventListener('keydown', onKeyDown, true);
});
defineExpose({
	moveNodeDirection,
});
</script>

<style lang="scss" module>
.floatingNodes {
	position: fixed;
	bottom: 0;
	top: 0;
	right: 0;
	left: 0;
	z-index: 10;
	pointer-events: none;
}
.floatingNodes {
	right: 0;
}

.nodesList {
	list-style: none;
	padding: 0;
	position: absolute;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: column;
	width: min-content;
	margin: auto;
	transform-origin: center;
	gap: var(--spacing-s);
	transition: transform 0.2s ease-in-out;

	&.inputSub,
	&.outputSub {
		right: 0;
		left: 0;
		flex-direction: row;
	}
	&.outputSub {
		top: 0;
	}
	&.inputSub {
		bottom: 0;
	}
	&.outputMain,
	&.inputMain {
		top: 0;
		bottom: 0;
	}
	&.outputMain {
		right: 0;
	}
	&.inputMain {
		left: 0;
	}

	&.outputMain {
		transform: translateX(50%);
	}
	&.outputSub {
		transform: translateY(-50%);
	}
	&.inputMain {
		transform: translateX(-50%);
	}
	&.inputSub {
		transform: translateY(50%);
	}
}
.connectedNode {
	border: var(--border-base);
	background-color: var(--color-canvas-node-background);
	border-radius: 100%;
	padding: var(--spacing-s);
	cursor: pointer;
	pointer-events: all;
	transition: transform 0.2s cubic-bezier(0.19, 1, 0.22, 1);
	position: relative;
	transform: scale(0.8);
	display: flex;
	justify-self: center;
	align-self: center;

	&::after {
		content: '';
		position: absolute;
		top: -35%;
		right: -30%;
		bottom: -35%;
		left: -30%;
		z-index: -1;
	}
	.outputMain &,
	.inputMain & {
		border-radius: var(--border-radius-large);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.outputMain & {
		&:hover {
			transform: scale(1.2) translateX(-50%);
		}
	}
	.outputSub & {
		&:hover {
			transform: scale(1.2) translateY(50%);
		}
	}
	.inputMain & {
		&:hover {
			transform: scale(1.2) translateX(50%);
		}
	}
	.inputSub & {
		&:hover {
			transform: scale(1.2) translateY(-50%);
		}
	}
}
</style>
