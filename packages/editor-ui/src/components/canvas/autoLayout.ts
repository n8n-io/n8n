import { useVueFlow, type NodePositionChange } from '@vue-flow/core';
import * as d3 from 'd3-hierarchy';
import { CanvasNodeRenderType } from '@/types';
import type { CanvasNode } from '@/types';

export const useAutoLayout = (id: string) => {
	const { getNodes, getIncomers, getOutgoers, findNode } = useVueFlow(id);

	const getTriggersAndOrphans = (nodes: CanvasNode[]): CanvasNode[] => {
		return nodes.filter((node) => {
			if (node.data?.render.type !== CanvasNodeRenderType.Default) {
				return false;
			}

			if (node.data.render.options.trigger) return true;

			// the node is not connected to a parent node (orphan)
			const incomers = getIncomers(node.id);
			const outgoers = getOutgoers(node.id);
			return incomers.length === 0 && outgoers.length === 0;
		});
	};

	type Member = {
		id: string;
		children: Member[];
	};

	const useHierarchyBuilder = (nodes: CanvasNode[]) => {
		// Recursion helper to prevent processing the same node more than once
		const processed = new Set();

		const buildHierarchy = (node: CanvasNode): Member => {
			if (processed.has(node.id)) {
				return {
					id: node.id,
					children: [],
				};
			}

			processed.add(node.id);
			const outGoers = getOutgoers(node).filter((out) => !processed.has(out.id));
			const children = outGoers.map(buildHierarchy);

			// ending nodes
			const leafs = getIncomers(node.id)
				.filter((income) => {
					if (processed.has(income.id)) return false;
					if (income.data.render.options.trigger) return false;
					return !getIncomers(income.id).length;
				})
				.map((item) => ({ id: item.id, children: [] }));

			return {
				id: node.id,
				children: children.concat(leafs),
				// children,
			};
		};

		return nodes.map(buildHierarchy);
	};

	const autoLayout = (type: 'cluster' | 'tree' = 'tree') => {
		const startingNodes = getTriggersAndOrphans(getNodes.value);

		const root = d3.hierarchy({
			id: undefined,
			children: useHierarchyBuilder(startingNodes),
		});

		const d3Tree = d3[type]<{ id: undefined; children: Member[] }>().nodeSize([200, 400])(root);

		const changes = d3Tree.descendants().reduce<NodePositionChange[]>((acc, node) => {
			const nodeId = node.data.id;
			if (!nodeId) return acc;

			const uiNode = findNode(nodeId);
			if (!uiNode) return acc;

			acc.push({
				type: 'position',
				from: uiNode.position,
				id: nodeId,
				position: { x: node.y, y: node.x },
			});

			return acc;
		}, []);

		return changes;
	};

	return {
		autoLayout,
	};
};
