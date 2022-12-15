import { MANUAL_TRIGGER_NODE_NAME, CODE_NODE_NAME } from './../constants';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

const WorkflowPage = new WorkflowPageClass();

describe('Canvas Actions', () => {
	beforeEach(() => {
		cy.resetAll();
		cy.skipSetup();
		WorkflowPage.actions.visit();
		cy.waitForLoad();
	});

	it('should render canvas', () => {
		WorkflowPage.getters.nodeViewRoot().should('be.visible');
		WorkflowPage.getters.canvasPlusButton().should('be.visible');
	});

	it('should add first step', () => {
		WorkflowPage.getters.canvasPlusButton().should('be.visible');
		WorkflowPage.getters.canvasPlusButton().click();
		cy.getByTestId('item-iterator-item').contains('Manually').as('manualTrigger');
		cy.get('@manualTrigger').should('exist');
		cy.get('@manualTrigger').click();
		cy.get('body').type('{esc}');
		WorkflowPage.getters.canvasNodes().should('have.length', 1);
	});

	it('should add connected node', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		cy.get('.plus-endpoint').should('be.visible');
		cy.get('.plus-endpoint').click();
		WorkflowPage.getters.nodeCreatorSearchBar().should('be.visible');
		WorkflowPage.getters.nodeCreatorSearchBar().type(CODE_NODE_NAME);
		WorkflowPage.getters.nodeCreatorSearchBar().type('{enter}');
		cy.get('body').type('{esc}');
		WorkflowPage.getters.canvasNodes().should('have.length', 2);
		WorkflowPage.getters.nodeConnections().should('have.length', 1);
	});

	it('should add disconnected node if nothing is selected', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		// Deselect nodes
		WorkflowPage.getters.nodeViewBackground().click({ force: true });
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.getters.canvasNodes().should('have.length', 2);
		WorkflowPage.getters.nodeConnections().should('have.length', 0);
	});

	it('should move node', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.actions.zoomToFit();
		cy.drag('[data-test-id="canvas-node"].jtk-drag-selected', 50, 150);
		WorkflowPage.getters.canvasNodes().last().should('have.attr', 'style', 'left: 740px; top: 360px;');
	});
});
