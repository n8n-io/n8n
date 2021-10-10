import { INodeUi, IZoomConfig } from "@/Interface";

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

export const scaleSmaller = ({scale, offset: [xOffset, yOffset]}: IZoomConfig): IZoomConfig => {
	scale /= 1.25;
	xOffset /= 1.25;
	yOffset /= 1.25;
	xOffset += window.innerWidth / 10;
	yOffset += window.innerHeight / 10;

	return {
		scale,
		offset: [xOffset, yOffset],
	};
};

export const scaleBigger = ({scale, offset: [xOffset, yOffset]}: IZoomConfig): IZoomConfig => {
	scale *= 1.25;
	xOffset -= window.innerWidth / 10;
	yOffset -= window.innerHeight / 10;
	xOffset *= 1.25;
	yOffset *= 1.25;

	return {
		scale,
		offset: [xOffset, yOffset],
	};
};

export const scaleReset = (config: IZoomConfig): IZoomConfig => {
	if (config.scale > 1) { // zoomed in
		while (config.scale > 1) {
			config = scaleSmaller(config);
		}
	}
	else {
		while (config.scale < 1) {
			config = scaleBigger(config);
		}
	}

	config.scale = 1;

	return config;
};
