import { INodeUi } from "@/Interface";

interface ICorners {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

export const getLeftmostTopNode = (nodes: INodeUi[]): INodeUi => {
	return nodes.reduce((leftmostTop, node) => {
		if (node.position[0] > leftmostTop.position[0] || node.position[1] > leftmostTop.position[1]) {
			return leftmostTop;
		}

		return node;
	});
};

export const getWorkflowCorners = (nodes: INodeUi[]): ICorners => {
	return nodes.reduce((accu: ICorners, node: INodeUi) => {
		if (node.position[0] < accu.minX) {
			accu.minX = node.position[0];
		}
		if (node.position[1] < accu.minY) {
			accu.minY = node.position[1];
		}
		if (node.position[0] > accu.maxX) {
			accu.maxX = node.position[0];
		}
		if (node.position[1] > accu.maxY) {
			accu.maxY = node.position[1];
		}

		return accu;
	}, {
		minX: nodes[0].position[0],
		minY: nodes[0].position[1],
		maxX: nodes[0].position[0],
		maxY: nodes[0].position[1],
	});
};
