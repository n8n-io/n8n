import { BasePage } from './base';

export class CanvasNode extends BasePage {
	getters = {
		nodes: () => cy.getByTestId('canvas-node'),
		nodeByName: (nodeName: string) =>
			this.getters.nodes().filter(`:contains("${nodeName}")`),
	};

	actions = {
		openNode: (nodeName: string) => {
			this.getters.nodeByName(nodeName).dblclick();
		},
	};
}
