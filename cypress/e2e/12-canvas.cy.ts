import { MANUAL_TRIGGER_NODE_NAME, CODE_NODE_NAME, SCHEDULE_TRIGGER_NODE_NAME, SET_NODE_NAME } from './../constants';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

const WorkflowPage = new WorkflowPageClass();

const DEFAULT_ZOOM_FACTOR = 1;
const ZOOM_IN_X1_FACTOR = 1.25; // Zoom in factor after one click
const ZOOM_IN_X2_FACTOR = 1.5625; // Zoom in factor after two clicks
const ZOOM_OUT_X1_FACTOR = 0.8;
const ZOOM_OUT_X2_FACTOR = 0.64;

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

	it('should add note between two connected nodes', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.getters.nodeConnections().first().trigger('mouseover', { force: true });
		cy.wait(500);
		cy.get('.connection-actions .add').should('be.visible');
		cy.get('.connection-actions .add').click({ force: true });
		WorkflowPage.actions.addNodeToCanvas(SET_NODE_NAME);
		// Should now have 3 nodes and 2 connections
		WorkflowPage.getters.canvasNodes().should('have.length', 3);
		WorkflowPage.getters.nodeConnections().should('have.length', 2);
		// And last node should be pushed to the right
		WorkflowPage.getters.canvasNodes().last().should('have.attr', 'style', 'left: 640px; top: 260px;');
	});

	it('should delete node using node action button', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.getters
			.canvasNodeByName(CODE_NODE_NAME)
			.find('[data-test-id=delete-node-button]')
			.click({ force: true });
		WorkflowPage.getters.canvasNodes().should('have.have.length', 1);
		WorkflowPage.getters.nodeConnections().should('have.length', 0);
	});

	it('should delete node using keyboard shortcut', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(CODE_NODE_NAME).click();
		cy.get('body').type('{backspace}');
		WorkflowPage.getters.canvasNodes().should('have.have.length', 1);
		WorkflowPage.getters.nodeConnections().should('have.length', 0);
	});

	it('should delete node between two connected nodes', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(SET_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(CODE_NODE_NAME).click();
		WorkflowPage.actions.zoomToFit();
		cy.get('body').type('{backspace}');
		WorkflowPage.getters.canvasNodes().should('have.have.length', 2);
		WorkflowPage.getters.nodeConnections().should('have.length', 1);
	});

	it('should delete multiple nodes', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		cy.wait(500);
		WorkflowPage.actions.selectAll();
		cy.get('body').type('{backspace}');
		WorkflowPage.getters.canvasNodes().should('have.have.length', 0);
	});

	it('should move node', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.actions.zoomToFit();
		cy.drag('[data-test-id="canvas-node"].jtk-drag-selected', 50, 150);
		WorkflowPage.getters.canvasNodes().last().should('have.attr', 'style', 'left: 740px; top: 360px;');
	});

	it('should zoom in', () => {
		WorkflowPage.getters.zoomInButton().should('be.visible');
		WorkflowPage.getters.zoomInButton().click();
		WorkflowPage.getters.nodeView().should(
			'have.css',
			'transform',
			`matrix(${ ZOOM_IN_X1_FACTOR }, 0, 0, ${ ZOOM_IN_X1_FACTOR }, 0, 0)`
		);
		WorkflowPage.getters.zoomInButton().click();
		WorkflowPage.getters.nodeView().should(
			'have.css',
			'transform',
			`matrix(${ ZOOM_IN_X2_FACTOR }, 0, 0, ${ ZOOM_IN_X2_FACTOR }, 0, 0)`
		);
	});

	it('should zoom out', () => {
		WorkflowPage.getters.zoomOutButton().should('be.visible');
		WorkflowPage.getters.zoomOutButton().click();
		WorkflowPage.getters.nodeView().should(
			'have.css',
			'transform',
			`matrix(${ ZOOM_OUT_X1_FACTOR }, 0, 0, ${ ZOOM_OUT_X1_FACTOR }, 0, 0)`
		);
		WorkflowPage.getters.zoomOutButton().click();
		WorkflowPage.getters.nodeView().should(
			'have.css',
			'transform',
			`matrix(${ ZOOM_OUT_X2_FACTOR }, 0, 0, ${ ZOOM_OUT_X2_FACTOR }, 0, 0)`
		);
	});

	it('should reset zoom', () => {
		// Reset zoom should not appear until zoom level changed
		WorkflowPage.getters.resetZoomButton().should('not.exist');
		WorkflowPage.getters.zoomInButton().click();
		WorkflowPage.getters.resetZoomButton().should('be.visible');
		WorkflowPage.getters.resetZoomButton().click();
		WorkflowPage.getters.nodeView().should(
			'have.css',
			'transform',
			`matrix(${ DEFAULT_ZOOM_FACTOR }, 0, 0, ${ DEFAULT_ZOOM_FACTOR }, 0, 0)`
		);
	});

	it('should zoom to fit', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		// At this point last added node should be off-screen
		WorkflowPage.getters.canvasNodes().last().should('not.be.visible');
		WorkflowPage.getters.zoomToFitButton().click();
		WorkflowPage.getters.canvasNodes().last().should('be.visible');
	});

	it('should select all nodes', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.actions.selectAll();
		WorkflowPage.getters.selectedNodes().should('have.length', 2);
	});

	it('should select nodes using arrow keys', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		cy.wait(500);
		cy.get('body').type('{leftArrow}');
		WorkflowPage.getters.canvasNodes().first().should('have.class', 'jtk-drag-selected');
		cy.get('body').type('{rightArrow}');
		WorkflowPage.getters.canvasNodes().last().should('have.class', 'jtk-drag-selected');
	});

	it ('should select nodes using shift and arrow keys', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		cy.wait(500);
		cy.get('body').type('{shift}', { release: false }).type('{leftArrow}');
		WorkflowPage.getters.selectedNodes().should('have.length', 2);
	});
});
