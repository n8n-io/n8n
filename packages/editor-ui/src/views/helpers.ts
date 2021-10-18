import { INodeUi, IZoomConfig, XYPositon } from "@/Interface";
import { Connection, OverlaySpec } from "jsplumb";

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

export const getDefaultOverlays = (): OverlaySpec[] => ([
	[
		'Arrow',
		{
			id: 'endpoint-arrow',
			location: 1,
			width: 12,
			foldback: 1,
			length: 10,
			visible: true,
		},
	],
	[
		'Label',
		{
			id: 'drop-add-node',
			label: 'Drop connection<br />to create node',
			cssClass: 'drop-add-node-label',
			location: 0.5,
		},
	],
	[
		'Arrow',
		{
			id: 'midpoint-arrow',
			location: 0.5,
			width: 12,
			foldback: 1,
			length: 10,
			visible: false,
		},
	],
]);

export const addEndpointArrow = (connection: Connection)  => {
	connection.addOverlay([
		'Arrow',
		{
			id: 'endpoint-arrow',
			location: 1,
			width: 12,
			foldback: 1,
			length: 10,
		},
	]);
};

export const hideMidpointArrow = (connection: Connection) => {
	const arrow = connection.getOverlay('midpoint-arrow');
	if (arrow) {
		arrow.setVisible(false);
	}
};

export const showOrHideMidpointArrow = (connection: Connection) => {
	const sourceEndpoint = connection.endpoints[0];
	const targetEndpoint = connection.endpoints[1];
	const requiresArrow = sourceEndpoint.anchor.lastReturnValue[0] >= targetEndpoint.anchor.lastReturnValue[0];

	const arrow = connection.getOverlay('midpoint-arrow');
	if (arrow) {
		arrow.setVisible(requiresArrow);
	}
};

export const getIcon = (name: string): string => {
	if (name === 'trash') {
		return `<svg data-v-66d5c7e2="" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="trash" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="svg-inline--fa fa-trash fa-w-14 Icon__medium_ctPPJ"><path data-v-66d5c7e2="" fill="currentColor" d="M432 32H312l-9.4-18.7A24 24 0 0 0 281.1 0H166.8a23.72 23.72 0 0 0-21.4 13.3L136 32H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16zM53.2 467a48 48 0 0 0 47.9 45h245.8a48 48 0 0 0 47.9-45L416 128H32z" class=""></path></svg>`;
	}

	if (name === 'plus') {
		return `<svg data-v-301ed208="" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="plus" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="svg-inline--fa fa-plus fa-w-14 Icon__medium_ctPPJ"><path data-v-301ed208="" fill="currentColor" d="M416 208H272V64c0-17.67-14.33-32-32-32h-32c-17.67 0-32 14.33-32 32v144H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h144v144c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32V304h144c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z" class=""></path></svg>`;
	}

	return '';
};

export const showOrHideItemsLabel = (connection: Connection) => {
	const overlay = connection.getOverlay('output-items-label');
	if (!overlay) {
		return;
	}

	// @ts-ignore
	const bounds = connection.connector.bounds;
	const diffX = Math.abs(bounds.maxX - bounds.minX);
	const diffY = Math.abs(bounds.maxY - bounds.minY);

	if (diffX < 150 && diffY < 100) {
		overlay.setVisible(false);
	}
	else {
		overlay.setVisible(true);
	}
};

const canUsePosition = (position1: XYPositon, position2: XYPositon) => {
	if (Math.abs(position1[0] - position2[0]) <= 100) {
		if (Math.abs(position1[1] - position2[1]) <= 50) {
			return false;
		}
	}

	return true;
};

export const getNewNodePosition = (nodes: INodeUi[], newPosition: XYPositon, movePosition?: XYPositon): XYPositon => {
	// @ts-ignore
	newPosition = newPosition.slice();

	if (!movePosition) {
		movePosition = [50, 50];
	}

	let conflictFound = false;
	let i, node;
	do {
		conflictFound = false;
		for (i = 0; i < nodes.length; i++) {
			node = nodes[i];
			if (!canUsePosition(node.position, newPosition!)) {
				conflictFound = true;
				break;
			}
		}

		if (conflictFound === true) {
			newPosition![0] += movePosition[0];
			newPosition![1] += movePosition[1];
		}
	} while (conflictFound === true);

	return newPosition!;
};
