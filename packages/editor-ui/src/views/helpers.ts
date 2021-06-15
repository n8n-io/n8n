import { INodeUi } from "@/Interface";

export const getWorkflowCorners = (nodes: INodeUi[]): {minX: number, minY: number, maxX: number, maxY: number} => {
	let minX = nodes[0].position[0];
	let minY = nodes[0].position[1];
	let maxX = nodes[0].position[0];
	let maxY = nodes[0].position[1];

	nodes.forEach(node => {
		if (node.position[0] < minX) {
			minX = node.position[0];
		}
		if (node.position[1] < minY) {
			minY = node.position[1];
		}
		if (node.position[0] > maxX) {
			maxX = node.position[0];
		}
		if (node.position[1] > maxY) {
			maxY = node.position[1];
		}
	});

	return {
		minX,
		minY,
		maxX,
		maxY,
	};
};
