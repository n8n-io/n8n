import { CODE_NODE_NAME, SET_NODE_NAME } from './../constants';
import { SCHEDULE_TRIGGER_NODE_NAME } from '../constants';
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
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.actions.hitUndo();
		WorkflowPage.getters.canvasNodes().should('have.have.length', 1);
		WorkflowPage.actions.hitRedo();
		WorkflowPage.getters.canvasNodes().should('have.have.length', 2);
		WorkflowPage.getters.nodeConnections().should('have.length', 1);
	});

	it('should undo/redo adding node in the middle', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(SET_NODE_NAME);
		WorkflowPage.getters.nodeConnections().first().trigger('mouseover', { force: true });
		cy.get('.connection-actions .add').click();
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.actions.zoomToFit();
		WorkflowPage.actions.hitUndo();
		WorkflowPage.getters.canvasNodes().should('have.have.length', 3);
		WorkflowPage.getters.nodeConnections().should('have.length', 2);
		WorkflowPage.actions.hitRedo();
		WorkflowPage.getters.canvasNodes().should('have.have.length', 4);
		WorkflowPage.getters.nodeConnections().should('have.length', 3);
	});

	it('should undo/redo deleting node using delete button', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(CODE_NODE_NAME).
			find('[data-test-id=delete-node-button]').click({ force: true });
		WorkflowPage.getters.canvasNodes().should('have.have.length', 1);
		WorkflowPage.getters.nodeConnections().should('have.length', 0);
		WorkflowPage.actions.hitUndo();
		WorkflowPage.getters.canvasNodes().should('have.have.length', 2);
		WorkflowPage.getters.nodeConnections().should('have.length', 1);
		WorkflowPage.actions.hitRedo();
		WorkflowPage.getters.canvasNodes().should('have.have.length', 1);
		WorkflowPage.getters.nodeConnections().should('have.length', 0);
	});

	it('should undo/redo deleting node using keyboard shortcut', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(CODE_NODE_NAME).click();
		cy.get('body').type('{backspace}');
		WorkflowPage.getters.canvasNodes().should('have.have.length', 1);
		WorkflowPage.getters.nodeConnections().should('have.length', 0);
		WorkflowPage.actions.hitUndo();
		WorkflowPage.getters.canvasNodes().should('have.have.length', 2);
		WorkflowPage.getters.nodeConnections().should('have.length', 1);
		WorkflowPage.actions.hitRedo();
		WorkflowPage.getters.canvasNodes().should('have.have.length', 1);
		WorkflowPage.getters.nodeConnections().should('have.length', 0);
	});

	it('should undo/redo deleting node between to connected nodes', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(SET_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(CODE_NODE_NAME).click();
		WorkflowPage.actions.zoomToFit();
		cy.get('body').type('{backspace}');
		WorkflowPage.getters.canvasNodes().should('have.have.length', 2);
		WorkflowPage.getters.nodeConnections().should('have.length', 1);
		WorkflowPage.actions.hitUndo();
		WorkflowPage.getters.canvasNodes().should('have.have.length', 3);
		WorkflowPage.getters.nodeConnections().should('have.length', 2);
		WorkflowPage.actions.hitRedo();
		WorkflowPage.getters.canvasNodes().should('have.have.length', 2);
		WorkflowPage.getters.nodeConnections().should('have.length', 1);
	});

	it('should undo/redo moving nodes', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		cy.drag('[data-test-id="canvas-node"].jtk-drag-selected', 50, 150);
		console.log(WorkflowPage.getters.canvasNodes().last().should('have.attr', 'style', 'left: 740px; top: 360px;'));
		WorkflowPage.actions.hitUndo();
		console.log(WorkflowPage.getters.canvasNodes().last().should('have.attr', 'style', 'left: 640px; top: 260px;'));
		WorkflowPage.actions.hitRedo();
		console.log(WorkflowPage.getters.canvasNodes().last().should('have.attr', 'style', 'left: 740px; top: 360px;'));
	});

	it('should undo/redo deleting a connection by pressing delete button', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.getters.nodeConnections().first().trigger('mouseover', { force: true });
		cy.get('.connection-actions .delete').click();
		WorkflowPage.getters.nodeConnections().should('have.length', 0);
		WorkflowPage.actions.hitUndo();
		WorkflowPage.getters.nodeConnections().should('have.length', 1);
		WorkflowPage.actions.hitRedo();
		WorkflowPage.getters.nodeConnections().should('have.length', 0);
	});

	it('should undo/redo deleting a connection by moving it away', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		cy.drag('.rect-input-endpoint.jtk-endpoint-connected', 0, -100);
		WorkflowPage.getters.nodeConnections().should('have.length', 0);
		WorkflowPage.actions.hitUndo();
		WorkflowPage.getters.nodeConnections().should('have.length', 1);
		WorkflowPage.actions.hitRedo();
		WorkflowPage.getters.nodeConnections().should('have.length', 0)
	});

	it('should undo/redo disabling a node using disable button', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.getters.canvasNodes().last().find('[data-test-id="disable-node-button"]').click({ force: true });
		WorkflowPage.getters.disabledNodes().should('have.length', 1);
		WorkflowPage.actions.hitUndo();
		WorkflowPage.getters.disabledNodes().should('have.length', 0);
		WorkflowPage.actions.hitRedo();
		WorkflowPage.getters.disabledNodes().should('have.length', 1);
	});

	it('should undo/redo disabling a node using keyboard shortcut', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.getters.canvasNodes().last().click();
		cy.get('body').type('{meta}', { release: false }).type('d');
		WorkflowPage.getters.disabledNodes().should('have.length', 1);
		WorkflowPage.actions.hitUndo();
		WorkflowPage.getters.disabledNodes().should('have.length', 0);
		WorkflowPage.actions.hitRedo();
		WorkflowPage.getters.disabledNodes().should('have.length', 1);
	});

	it('should undo/redo disabling multiple nodes', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		cy.get('body').type('{esc}');
		cy.get('body').type('{meta}', { release: false }).type('a');
		cy.get('body').type('{meta}', { release: false }).type('d');
		WorkflowPage.getters.disabledNodes().should('have.length', 2);
		WorkflowPage.actions.hitUndo();
		WorkflowPage.getters.disabledNodes().should('have.length', 0);
		WorkflowPage.actions.hitRedo();
		WorkflowPage.getters.disabledNodes().should('have.length', 2);
	});

	it('should undo/redo deleting whole workflow', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		cy.get('body').type('{esc}');
		cy.get('body').type('{meta}', { release: false }).type('a');
		cy.get('body').type('{backspace}');
		WorkflowPage.getters.canvasNodes().should('have.have.length', 0);
		WorkflowPage.actions.hitUndo();
		WorkflowPage.getters.canvasNodes().should('have.have.length', 2);
		WorkflowPage.getters.nodeConnections().should('have.length', 1);
		WorkflowPage.actions.hitRedo();
		WorkflowPage.getters.canvasNodes().should('have.have.length', 0);
		WorkflowPage.getters.nodeConnections().should('have.length', 0);
	});
});
