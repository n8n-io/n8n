import {
	MANUAL_TRIGGER_NODE_NAME,
	MANUAL_TRIGGER_NODE_DISPLAY_NAME,
	CODE_NODE_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
	SET_NODE_NAME,
	IF_NODE_NAME,
	HTTP_REQUEST_NODE_NAME,
} from './../constants';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

const WorkflowPage = new WorkflowPageClass();
describe('Canvas Actions', () => {
	before(() => {
		cy.resetAll();
		cy.skipSetup();
	});

	beforeEach(() => {
		WorkflowPage.actions.visit();
	});

	it('should render canvas', () => {
		WorkflowPage.getters.nodeViewRoot().should('be.visible');
		WorkflowPage.getters.canvasPlusButton().should('be.visible');
		WorkflowPage.getters.zoomToFitButton().should('be.visible');
		WorkflowPage.getters.zoomInButton().should('be.visible');
		WorkflowPage.getters.zoomOutButton().should('be.visible');
		WorkflowPage.getters.executeWorkflowButton().should('be.visible');
	});

	it('should connect and disconnect a simple node', () => {
		WorkflowPage.actions.addNodeToCanvas(SET_NODE_NAME);
		WorkflowPage.getters.nodeViewBackground().click(600, 200, { force: true });
		cy.get('.jtk-connector').should('have.length', 1);
		WorkflowPage.actions.addNodeToCanvas(SET_NODE_NAME);

		// Change connection from Set to Set1
		cy.draganddrop(
			WorkflowPage.getters.getEndpointSelector('input', SET_NODE_NAME),
			WorkflowPage.getters.getEndpointSelector('input', `${SET_NODE_NAME}1`),
		);

		WorkflowPage.getters
			.canvasNodeInputEndpointByName(`${SET_NODE_NAME}1`)
			.should('have.class', 'jtk-endpoint-connected');

		cy.get('.jtk-connector').should('have.length', 1);
		// Disconnect Set1
		cy.drag(WorkflowPage.getters.getEndpointSelector('input', `${SET_NODE_NAME}1`), [-200, 100]);
		cy.get('.jtk-connector').should('have.length', 0);
	});

	it('should add first step', () => {
		WorkflowPage.getters.canvasPlusButton().should('be.visible');
		WorkflowPage.actions.addInitialNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodes().should('have.length', 1);
	});

	it('should add a node via plus endpoint drag', () => {
		WorkflowPage.getters.canvasPlusButton().should('be.visible');
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME, true);

		cy.drag(
			WorkflowPage.getters.getEndpointSelector('plus', SCHEDULE_TRIGGER_NODE_NAME),
			[100, 100],
		);

		WorkflowPage.getters.nodeCreatorSearchBar().should('be.visible');
		WorkflowPage.actions.addNodeToCanvas(IF_NODE_NAME, false);
		WorkflowPage.getters.nodeViewBackground().click({ force: true });
	});


	it('should add a connected node using plus endpoint', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		cy.get('.plus-endpoint').should('be.visible').click();
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

	it('should add node between two connected nodes', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(SET_NODE_NAME);
		WorkflowPage.actions.zoomToFit();
		WorkflowPage.actions.addNodeBetweenNodes(CODE_NODE_NAME, SET_NODE_NAME, HTTP_REQUEST_NODE_NAME);
		WorkflowPage.getters.canvasNodes().should('have.length', 4);
		WorkflowPage.getters.nodeConnections().should('have.length', 3);
		// And last node should be pushed to the right
		WorkflowPage.getters
			.canvasNodes()
			.last()
			.should('have.attr', 'style', 'left: 860px; top: 260px;');
	});

	it('should delete connections by pressing the delete button', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.getters.nodeConnections().first().realHover();
		cy.get('.connection-actions .delete').first().click({ force: true });
		WorkflowPage.getters.nodeConnections().should('have.length', 0);
	});

	it('should delete a connection by moving it away from endpoint', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		cy.drag(WorkflowPage.getters.getEndpointSelector('input', CODE_NODE_NAME), [0, -100]);
		WorkflowPage.getters.nodeConnections().should('have.length', 0);
	});

	it('should execute node', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.getters
			.canvasNodes()
			.last()
			.find('[data-test-id="execute-node-button"]')
			.click({ force: true });
		WorkflowPage.getters.successToast().should('contain', 'Node executed successfully');
	});

	it('should copy selected nodes', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.actions.selectAll();
		WorkflowPage.actions.hitCopy();
		WorkflowPage.getters.successToast().should('contain', 'Copied!');
	});

	it('should select all nodes', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.actions.selectAll();
		WorkflowPage.getters.selectedNodes().should('have.length', 2);
	});

	it('should select nodes using arrow keys', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		cy.wait(500);
		cy.get('body').type('{leftArrow}');
		WorkflowPage.getters.canvasNodes().first().should('have.class', 'jtk-drag-selected');
		cy.get('body').type('{rightArrow}');
		WorkflowPage.getters.canvasNodes().last().should('have.class', 'jtk-drag-selected');
	});

	it('should select nodes using shift and arrow keys', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		cy.wait(500);
		cy.get('body').type('{shift}', { release: false }).type('{leftArrow}');
		WorkflowPage.getters.selectedNodes().should('have.length', 2);
	});
});
