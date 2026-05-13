<script setup lang="ts">
import { computed } from 'vue';

import type { PreviewWorkflowOutput } from '../../../shared/workflow-diagram';
import ConnectionLine from './ConnectionLine.vue';
import NodeBox from './NodeBox.vue';

const NODE_WIDTH = 220;
const NODE_HEIGHT = 72;
const PADDING = 96;

const props = defineProps<{
	workflow: PreviewWorkflowOutput;
}>();

const nodesByName = computed(() => new Map(props.workflow.nodes.map((node) => [node.name, node])));

const connectionLines = computed(() => {
	const lines: Array<{
		key: string;
		sourceX: number;
		sourceY: number;
		targetX: number;
		targetY: number;
	}> = [];

	for (const [sourceName, outputsByType] of Object.entries(props.workflow.connections)) {
		const sourceNode = nodesByName.value.get(sourceName);
		if (!sourceNode) continue;

		for (const [connectionType, outputGroups] of Object.entries(outputsByType)) {
			outputGroups.forEach((connections, outputIndex) => {
				connections?.forEach((connection, connectionIndex) => {
					const targetNode = nodesByName.value.get(connection.node);
					if (!targetNode) return;

					lines.push({
						key: `${sourceName}-${connectionType}-${outputIndex}-${connection.node}-${connection.index}-${connectionIndex}`,
						sourceX: sourceNode.position[0] + NODE_WIDTH,
						sourceY: sourceNode.position[1] + NODE_HEIGHT / 2,
						targetX: targetNode.position[0],
						targetY: targetNode.position[1] + NODE_HEIGHT / 2,
					});
				});
			});
		}
	}

	return lines;
});

const viewport = computed(() => {
	if (props.workflow.nodes.length === 0) {
		return { x: 0, y: 0, width: 640, height: 320 };
	}

	const minX = Math.min(...props.workflow.nodes.map((node) => node.position[0])) - PADDING;
	const minY = Math.min(...props.workflow.nodes.map((node) => node.position[1])) - PADDING;
	const maxX =
		Math.max(...props.workflow.nodes.map((node) => node.position[0] + NODE_WIDTH)) + PADDING;
	const maxY =
		Math.max(...props.workflow.nodes.map((node) => node.position[1] + NODE_HEIGHT)) + PADDING;

	return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
});

const viewBox = computed(
	() => `${viewport.value.x} ${viewport.value.y} ${viewport.value.width} ${viewport.value.height}`,
);
</script>

<template>
	<div class="diagram-frame">
		<svg class="workflow-svg" :viewBox="viewBox" role="img" aria-label="Workflow diagram">
			<defs>
				<marker
					id="arrowhead"
					markerWidth="10"
					markerHeight="10"
					refX="8"
					refY="3"
					orient="auto"
					markerUnits="strokeWidth"
				>
					<path d="M0,0 L0,6 L9,3 z" class="arrowhead" />
				</marker>
			</defs>

			<g class="connection-layer">
				<ConnectionLine
					v-for="line in connectionLines"
					:key="line.key"
					:source-x="line.sourceX"
					:source-y="line.sourceY"
					:target-x="line.targetX"
					:target-y="line.targetY"
				/>
			</g>

			<g class="node-layer">
				<NodeBox
					v-for="node in workflow.nodes"
					:key="node.name"
					:name="node.name"
					:type="node.type"
					:x="node.position[0]"
					:y="node.position[1]"
					:width="NODE_WIDTH"
					:height="NODE_HEIGHT"
				/>
			</g>
		</svg>
	</div>
</template>
