import { CODE_NODE, SCHEDULE_TRIGGER_NODE_NAME } from '../constants';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

const WorkflowPage = new WorkflowPageClass();

describe('Undo/Redo', () => {
	beforeEach(() => {
		cy.resetAll();
		cy.skipSetup();
		WorkflowPage.actions.visit();
	});

	it('should undo/redo adding nodes', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.hitUndo();
		WorkflowPage.getters.canvasNodes().should('have.have.length', 0);
		WorkflowPage.actions.hitRedo();
		WorkflowPage.getters.canvasNodes().should('have.have.length', 0);
	});

	it('should undo/redo adding connected nodes', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE);
		WorkflowPage.actions.hitUndo();
		WorkflowPage.getters.canvasNodes().should('have.have.length', 1);
		WorkflowPage.actions.hitRedo();
		WorkflowPage.getters.canvasNodes().should('have.have.length', 2);
		WorkflowPage.getters.nodeConnections().should('have.length', 1);
	});
});
