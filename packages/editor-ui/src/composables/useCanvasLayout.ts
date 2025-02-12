import dagre from '@dagrejs/dagre';

import { useVueFlow, type GraphNode } from '@vue-flow/core';
import { STICKY_NODE_TYPE } from '../constants';
import { type CanvasConnection, type CanvasNodeData, type CanvasNodeMoveEvent } from '../types';
import { isPresent } from '../utils/typesUtils';

export type CanvasLayoutOptions = { id?: string };
export type CanvasLayoutTarget = 'selection' | 'all';
export type CanvasLayoutTargetData = {
	nodes: Array<GraphNode<CanvasNodeData>>;
	edges: CanvasConnection[];
};

export function useCanvasLayout({ id }: CanvasLayoutOptions = {}) {
	const { findNode, getSelectedNodes, edges: allEdges, nodes: allNodes } = useVueFlow({ id });

	function getTargetData(target: CanvasLayoutTarget): CanvasLayoutTargetData {
		if (target === 'selection') {
			return { nodes: getSelectedNodes.value, edges: allEdges.value };
		}
		return { nodes: allNodes.value, edges: allEdges.value };
	}

	function createDagreGraph({ nodes, edges }: CanvasLayoutTargetData) {
		const graph = new dagre.graphlib.Graph();

		graph.setGraph({ rankdir: 'LR', edgesep: 80, nodesep: 80, ranksep: 80 });
		graph.setDefaultEdgeLabel(() => ({}));

		const graphNodes = nodes.map((node) => findNode(node.id)).filter(isPresent);
		const nodeIdSet = new Set(nodes.map((node) => node.id));

		graphNodes.forEach(({ id: nodeId, dimensions: { width, height } }) =>
			graph.setNode(nodeId, { width: width + 64, height: height + 36 }),
		);

		edges
			.filter((edge) => nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target))
			.forEach((edge) => graph.setEdge(edge.source, edge.target));

		return graph;
	}

	function createDagreSubGraph({
		nodeIds,
		parent,
	}: { nodeIds: string[]; parent: dagre.graphlib.Graph }) {
		const subGraph = new dagre.graphlib.Graph();
		subGraph.setGraph({ rankdir: 'LR', edgesep: 64, nodesep: 64, ranksep: 64 });
		subGraph.setDefaultEdgeLabel(() => ({}));
		const nodeIdSet = new Set(nodeIds);

		nodeIds.forEach((nodeId) => subGraph.setNode(nodeId, parent.node(nodeId)));

		parent
			.edges()
			.filter((edge) => nodeIdSet.has(edge.v) && nodeIdSet.has(edge.w))
			.forEach((edge) => subGraph.setEdge(edge.v, edge.w, parent.edge(edge)));

		return subGraph;
	}

	function createDagreConfigurableSubGraph({
		nodeIds,
		parent,
	}: { nodeIds: string[]; parent: dagre.graphlib.Graph }) {
		const subGraph = new dagre.graphlib.Graph();
		subGraph.setGraph({ rankdir: 'TB', edgesep: 48, nodesep: 48, ranksep: 48 });
		subGraph.setDefaultEdgeLabel(() => ({}));
		const nodeIdSet = new Set(nodeIds);

		nodeIds.forEach((nodeId) => subGraph.setNode(nodeId, parent.node(nodeId)));

		parent
			.edges()
			.filter((edge) => nodeIdSet.has(edge.v) && nodeIdSet.has(edge.w))
			.forEach((edge) => subGraph.setEdge(edge.v, edge.w, parent.edge(edge)));

		return subGraph;
	}

	function findAnchor({
		nodeById,
		graph,
	}: { nodeById: Record<string, GraphNode>; graph: dagre.graphlib.Graph }) {
		dagre.layout(graph);
		const dagreNodes = graph.nodes();
		const anchorNode = dagreNodes.reduce((topLeftNode, nodeId) => {
			const node = nodeById[nodeId];
			if (node.position.x < topLeftNode.position.x) {
				return node;
			}

			if (node.position.x === topLeftNode.position.x && node.position.y < topLeftNode.position.y) {
				return node;
			}

			return topLeftNode;
		}, nodeById[dagreNodes[0]]);

		const anchorNodeAfter = graph.node(anchorNode.id);

		return {
			x: anchorNodeAfter.x - anchorNode.position.x,
			y: anchorNodeAfter.y - anchorNode.position.y - anchorNode.dimensions.height / 2,
		};
	}

	function calcBoundingBox(graph: dagre.graphlib.Graph) {
		const { minX, minY, maxX, maxY } = graph
			.nodes()
			.map((nodeId) => graph.node(nodeId))
			.reduce(
				(bbox, node) => ({
					minX: Math.min(bbox.minX, node.x),
					maxX: Math.max(bbox.maxX, node.x + node.width),
					minY: Math.min(bbox.minY, node.y),
					maxY: Math.max(bbox.maxY, node.y + node.height),
				}),
				{ minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
			);

		return {
			x: minX,
			y: minY,
			width: maxX - minX,
			height: maxY - minY,
		};
	}

	function layout(target: CanvasLayoutTarget): CanvasNodeMoveEvent[] {
		const { nodes, edges } = getTargetData(target);

		const nodesToLayout = nodes
			.filter((node) => node.data.type !== STICKY_NODE_TYPE)
			.map((node) => findNode(node.id))
			.filter(isPresent);

		const nodeById = nodesToLayout.reduce(
			(acc, node) => ({ ...acc, [node.id]: node }),
			{},
		) as Record<string, GraphNode<CanvasNodeData>>;

		const parentGraph = createDagreGraph({ nodes: nodesToLayout, edges });
		const anchor =
			target === 'selection' ? findAnchor({ nodeById, graph: parentGraph }) : { x: 0, y: 0 };

		const subgraphs = dagre.graphlib.alg
			.components(parentGraph)
			.map((nodeIds) => createDagreSubGraph({ nodeIds, parent: parentGraph }));

		let positions: CanvasNodeMoveEvent[] = [];
		let subGraphYOffset = 0;

		for (const graph of subgraphs) {
			dagre.layout(graph);

			// const configurableNodes = graph
			// 	.nodes()
			// 	.map((nodeId) => nodeById[nodeId])
			// 	.filter((node) => get(node, 'data.render.options.configurable'));

			// for (const configurableNode of configurableNodes) {
			// 	const connectedConfigurationNodes =
			// 		graph.inEdges(configurableNode.id)?.map((edge) => edge.v) ?? [];
			// 	const configGraph = createDagreConfigurableSubGraph({
			// 		nodeIds: [...connectedConfigurationNodes, configurableNode.id],
			// 		parent: graph,
			// 	});

			// 	dagre.layout(configGraph);
			// 	const boundingBox = calcBoundingBox(configGraph);

			// 	console.log(graph.nodes().length);
			// 	configGraph.nodes().forEach((nodeId) => [graph.removeNode(nodeId)]);
			// 	configGraph.setNode(configurableNode.id, {
			// 		width: boundingBox.width,
			// 		height: boundingBox.height,
			// 	});
			// 	console.log(graph.nodes().length);
			// }

			const boundingBox = calcBoundingBox(graph);

			positions = positions.concat(
				graph
					.nodes()
					// eslint-disable-next-line @typescript-eslint/no-loop-func
					.map((nodeId) => {
						const { x, y } = graph.node(nodeId);
						const node = nodeById[nodeId];
						return {
							id: node.id,
							position: {
								x: Math.ceil(x - anchor.x),
								y: Math.ceil(y + subGraphYOffset - anchor.y - node.dimensions.height / 2),
							},
						};
					}),
			);
			subGraphYOffset += boundingBox.height + 80;
		}

		return positions;
	}

	return { layout };
}
