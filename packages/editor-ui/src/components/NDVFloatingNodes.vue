<template>
	<aside :class="$style.floatingNodes">
		<ul
			v-for="connectionGroup in connectionGroups"
			:class="[$style.nodesList, $style[connectionGroup]]"
			:key="connectionGroup"
		>
			<template v-for="{ node, nodeType } in connectedNodes[connectionGroup]">
				<n8n-tooltip
					:placement="tooltipPositionMapper[connectionGroup]"
					v-if="node && nodeType"
					:teleported="false"
					:key="node.name"
					:offset="60"
				>
					<template #content>{{ node.name }}</template>

					<li :class="$style.connectedNode" @click="$emit('switchSelectedNode', node.name)">
						<node-icon
							:nodeType="nodeType"
							:nodeName="node.name"
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
import { useNodeTypesStore, useWorkflowsStore } from '@/stores';
import { computed } from 'vue';
import NodeIcon from '@/components/NodeIcon.vue';
import type { INodeTypeDescription } from 'n8n-workflow';

interface Props {
	rootNode: INodeUi;
	type: 'input' | 'sub-input' | 'sub-output' | 'output';
}

const props = defineProps<Props>();
const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();
const workflow = workflowsStore.getCurrentWorkflow();

const enum FloatingPosition {
	Top = 'outputSub',
	Right = 'outputMain',
	Bottom = 'inputSub',
	Left = 'inputMain',
}

interface NodeConfig {
	node: INodeUi;
	nodeType: INodeTypeDescription;
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
	Record<FloatingPosition, Array<{ node: INodeUi; nodeType: INodeTypeDescription }>>
>(() => {
	const rootName = props.rootNode.name;
	return {
		[FloatingPosition.Top]: getINodesFromNames(workflow.getChildNodes(rootName, 'ALL_NON_MAIN')),
		[FloatingPosition.Right]: getINodesFromNames(workflow.getChildNodes(rootName, 'main', 1)),
		[FloatingPosition.Bottom]: getINodesFromNames(
			workflow.getParentNodes(rootName, 'ALL_NON_MAIN'),
		),
		[FloatingPosition.Left]: getINodesFromNames(workflow.getParentNodes(rootName, 'main', 1)),
	};
});

const connectionGroups = [
	FloatingPosition.Top,
	FloatingPosition.Right,
	FloatingPosition.Bottom,
	FloatingPosition.Left,
];
const tooltipPositionMapper = {
	[FloatingPosition.Top]: 'bottom',
	[FloatingPosition.Right]: 'left',
	[FloatingPosition.Bottom]: 'top',
	[FloatingPosition.Left]: 'right',
};
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
	border: 3px solid var(--color-background-xlight);
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
