import type { CanvasNode } from '../canvas.types';
import type { VueFlowStore } from '@vue-flow/core';

export function useCanvasTraversal({ getIncomers, getOutgoers }: VueFlowStore) {
	function sortNodesByVerticalPosition(nodes: CanvasNode[]) {
		return nodes.sort((a, b) => a.position.y - b.position.y);
	}

	function getIncomingNodes(id: string) {
		return sortNodesByVerticalPosition(getIncomers(id));
	}

	function getOutgoingNodes(id: string) {
		return sortNodesByVerticalPosition(getOutgoers(id));
	}

	function getSiblingNodes(id: string) {
		const incomingSiblings = getIncomers(id).flatMap((incomingNode) =>
			getOutgoers(incomingNode.id),
		);
		const outgoingSiblings = getOutgoers(id).flatMap((outgoingNode) =>
			getIncomers(outgoingNode.id),
		);

		return sortNodesByVerticalPosition(
			[...incomingSiblings, ...outgoingSiblings].filter(
				(node, index, nodes) => nodes.findIndex((n) => n.id === node.id) === index,
			),
		);
	}

	function getDownstreamNodes(id: string, visited: string[] = []): CanvasNode[] {
		if (visited.includes(id)) {
			return [];
		}
		visited.push(id);

		const downstreamNodes = getOutgoers(id);

		return [
			...downstreamNodes,
			...downstreamNodes.flatMap((node) => getDownstreamNodes(node.id, visited)),
		].filter((node, index, nodes) => nodes.findIndex((n) => n.id === node.id) === index);
	}

	function getUpstreamNodes(id: string, visited: string[] = []): CanvasNode[] {
		if (visited.includes(id)) {
			return [];
		}
		visited.push(id);

		const upstreamNodes = getIncomers(id);

		return [
			...upstreamNodes,
			...upstreamNodes.flatMap((node) => getUpstreamNodes(node.id, visited)),
		].filter((node, index, nodes) => nodes.findIndex((n) => n.id === node.id) === index);
	}

	return {
		sortNodesByVerticalPosition,
		getIncomingNodes,
		getOutgoingNodes,
		getSiblingNodes,
		getDownstreamNodes,
		getUpstreamNodes,
	};
}
