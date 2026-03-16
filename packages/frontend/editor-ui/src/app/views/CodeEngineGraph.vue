<script setup lang="ts">
import { computed } from 'vue';
import { VueFlow, MarkerType, Position, type Node, type Edge } from '@vue-flow/core';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import dagre from '@dagrejs/dagre';
import type { StaticGraph, ExecutionTrace } from '@/app/api/codeEngine';

const props = defineProps<{
	graph: StaticGraph;
	executingNodes?: Set<string>;
	executionTrace?: ExecutionTrace | null;
	waitingForWebhook?: boolean;
}>();

const layoutResult = computed(() => {
	const g = new dagre.graphlib.Graph();
	g.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 120 });
	g.setDefaultEdgeLabel(() => ({}));

	const nodeWidth = 180;
	const nodeHeight = 60;

	for (const node of props.graph.nodes) {
		g.setNode(node.id, { width: nodeWidth, height: nodeHeight });
	}
	for (const edge of props.graph.edges) {
		g.setEdge(edge.from, edge.to);
	}
	dagre.layout(g);

	const nodes: Node[] = props.graph.nodes.map((node) => {
		const pos = g.node(node.id);
		const traceNode = props.executionTrace?.nodes.find((t) => t.id === node.id);
		const isExecuting = props.executingNodes?.has(node.id) ?? false;
		const isWaiting =
			props.waitingForWebhook === true && node.type === 'trigger' && !isExecuting && !traceNode;

		return {
			id: node.id,
			position: { x: pos.x - nodeWidth / 2, y: pos.y - nodeHeight / 2 },
			sourcePosition: Position.Right,
			targetPosition: Position.Left,
			label: node.type === 'trigger' ? `${node.method} ${node.path}` : node.label,
			class: isWaiting ? 'code-engine-node-waiting' : undefined,
			data: {
				nodeType: node.type,
				executed: !!traceNode,
				executing: isExecuting,
				hasError: !!traceNode?.error,
			},
			style: {
				width: `${nodeWidth}px`,
				height: `${nodeHeight}px`,
				border: traceNode?.error
					? '2px solid var(--color--danger)'
					: traceNode
						? '2px solid var(--color--success)'
						: isExecuting
							? '2px solid var(--color--primary)'
							: isWaiting
								? '2px solid var(--color--warning)'
								: '1px solid var(--color--foreground)',
				borderRadius: 'var(--radius--lg)',
				backgroundColor: isWaiting
					? 'var(--color--warning--tint-2)'
					: isExecuting
						? 'var(--color--primary--tint-3)'
						: 'var(--color--background)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				fontSize: 'var(--font-size--sm)',
				fontWeight: 'var(--font-weight--regular)',
				padding: '0 var(--spacing--xs)',
			},
		};
	});

	const edges: Edge[] = props.graph.edges.map((edge) => {
		const wasTraversed = props.executionTrace?.edges.some(
			(e) => e.from === edge.from && e.to === edge.to,
		);
		return {
			id: `${edge.from}-${edge.to}`,
			source: edge.from,
			target: edge.to,
			label: edge.condition,
			animated: !!wasTraversed,
			markerEnd: {
				type: MarkerType.ArrowClosed,
				color: wasTraversed ? 'var(--color--success)' : 'var(--color--foreground)',
			},
			style: {
				stroke: wasTraversed ? 'var(--color--success)' : 'var(--color--foreground)',
			},
		};
	});

	return { nodes, edges };
});
</script>

<template>
	<div :class="$style.graphContainer">
		<VueFlow
			:nodes="layoutResult.nodes"
			:edges="layoutResult.edges"
			:default-viewport="{ x: 50, y: 50, zoom: 1 }"
			:nodes-draggable="false"
			:nodes-connectable="false"
			fit-view-on-init
		/>
	</div>
</template>

<style lang="scss" module>
.graphContainer {
	position: absolute;
	inset: 0;
}
</style>

<style lang="scss">
@keyframes code-engine-node-pulse {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.5;
	}
}

.code-engine-node-waiting {
	animation: code-engine-node-pulse 2s ease-in-out infinite;
}
</style>
