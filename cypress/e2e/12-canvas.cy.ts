import {
	MANUAL_TRIGGER_NODE_NAME,
	MANUAL_TRIGGER_NODE_DISPLAY_NAME,
	CODE_NODE_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
	SET_NODE_NAME,
	SWITCH_NODE_NAME,
	IF_NODE_NAME,
	MERGE_NODE_NAME,
	HTTP_REQUEST_NODE_NAME,
} from './../constants';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

const WorkflowPage = new WorkflowPageClass();

const DEFAULT_ZOOM_FACTOR = 1;
const ZOOM_IN_X1_FACTOR = 1.25; // Zoom in factor after one click
const ZOOM_IN_X2_FACTOR = 1.5625; // Zoom in factor after two clicks
const ZOOM_OUT_X1_FACTOR = 0.8;
const ZOOM_OUT_X2_FACTOR = 0.64;
const RENAME_NODE_NAME = 'Something else';

describe('Canvas Node Manipulation and Navigation', () => {
	before(() => {
		cy.skipSetup();
	});

	beforeEach(() => {
		WorkflowPage.actions.visit();
	});


	it('should add switch node and test connections', () => {
		WorkflowPage.actions.addNodeToCanvas(SWITCH_NODE_NAME, true);

		// Switch has 4 output endpoints
		for (let i = 0; i < 4; i++) {
			WorkflowPage.getters.canvasNodePlusEndpointByName(SWITCH_NODE_NAME, i).click({ force: true });
			WorkflowPage.getters.nodeCreatorSearchBar().should('be.visible');
			WorkflowPage.actions.addNodeToCanvas(SET_NODE_NAME, false);
			WorkflowPage.actions.zoomToFit();
		}
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		cy.reload();
		cy.waitForLoad();
		// Make sure all connections are there after reload
		for (let i = 0; i < 4; i++) {
			const setName = `${SET_NODE_NAME}${i > 0 ? i : ''}`;
			WorkflowPage.getters
				.canvasNodeInputEndpointByName(setName)
				.should('have.class', 'jtk-endpoint-connected');
		}
	});

	it('should add merge node and test connections', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		for (let i = 0; i < 2; i++) {
			WorkflowPage.actions.addNodeToCanvas(SET_NODE_NAME, true);
			WorkflowPage.getters.nodeViewBackground().click(600 + i * 100, 200, { force: true });
		}
		WorkflowPage.actions.zoomToFit();

		WorkflowPage.actions.addNodeToCanvas(MERGE_NODE_NAME);
		WorkflowPage.actions.zoomToFit();

		// Connect manual to Set1
		cy.draganddrop(
			WorkflowPage.getters.getEndpointSelector('output', MANUAL_TRIGGER_NODE_DISPLAY_NAME),
			WorkflowPage.getters.getEndpointSelector('input', `${SET_NODE_NAME}1`),
		);

		cy.get('.rect-input-endpoint.jtk-endpoint-connected').should('have.length', 2);

		// Connect Set1 and Set2 to merge
		cy.draganddrop(
			WorkflowPage.getters.getEndpointSelector('plus', SET_NODE_NAME),
			WorkflowPage.getters.getEndpointSelector('input', MERGE_NODE_NAME, 0),
		);
		cy.draganddrop(
			WorkflowPage.getters.getEndpointSelector('plus', `${SET_NODE_NAME}1`),
			WorkflowPage.getters.getEndpointSelector('input', MERGE_NODE_NAME, 1),
		);

		cy.get('.rect-input-endpoint.jtk-endpoint-connected').should('have.length', 4);

		// Make sure all connections are there after save & reload
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		cy.reload();
		cy.waitForLoad();

		cy.get('.rect-input-endpoint.jtk-endpoint-connected').should('have.length', 4);
		WorkflowPage.actions.executeWorkflow();
		WorkflowPage.getters.stopExecutionButton().should('not.exist');

		// If the merged set nodes are connected and executed correctly, there should be 2 items in the output of merge node
		cy.get('[data-label="2 items"]').should('be.visible');
	});

	it('should add nodes and check execution success', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		for (let i = 0; i < 3; i++) {
			WorkflowPage.actions.addNodeToCanvas(SET_NODE_NAME, true);
		}
		WorkflowPage.actions.zoomToFit();
		WorkflowPage.actions.executeWorkflow();

		cy.get('.jtk-connector.success').should('have.length', 3);
		cy.get('.data-count').should('have.length', 4);
		cy.get('.plus-draggable-endpoint').should('have.class', 'ep-success');

		WorkflowPage.actions.addNodeToCanvas(SET_NODE_NAME);
		WorkflowPage.actions.zoomToFit();

		cy.get('.plus-draggable-endpoint').filter(':visible').should('not.have.class', 'ep-success');
		cy.get('.jtk-connector.success').should('have.length', 3);
		cy.get('.jtk-connector').should('have.length', 4);
	});

	it('should delete node using node action button', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.getters
			.canvasNodeByName(CODE_NODE_NAME)
			.find('[data-test-id=delete-node-button]')
			.click({ force: true });
		WorkflowPage.getters.canvasNodes().should('have.length', 1);
		WorkflowPage.getters.nodeConnections().should('have.length', 0);
	});

	it('should delete node using keyboard shortcut', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(CODE_NODE_NAME).click();
		cy.get('body').type('{backspace}');
		WorkflowPage.getters.canvasNodes().should('have.length', 1);
		WorkflowPage.getters.nodeConnections().should('have.length', 0);
	});

	it('should delete node between two connected nodes', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(SET_NODE_NAME);
		WorkflowPage.getters.canvasNodes().should('have.length', 3);
		WorkflowPage.getters.nodeConnections().should('have.length', 2);
		WorkflowPage.getters.canvasNodeByName(CODE_NODE_NAME).click();
		WorkflowPage.actions.zoomToFit();
		cy.get('body').type('{backspace}');
		WorkflowPage.getters.canvasNodes().should('have.length', 2);
		WorkflowPage.getters.nodeConnections().should('have.length', 1);
	});

	it('should delete multiple nodes', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		cy.wait(500);
		WorkflowPage.actions.selectAll();
		cy.get('body').type('{backspace}');
		WorkflowPage.getters.canvasNodes().should('have.length', 0);
	});

	it('should move node', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.actions.zoomToFit();
		cy.drag('[data-test-id="canvas-node"].jtk-drag-selected', [50, 150]);
		WorkflowPage.getters
			.canvasNodes()
			.last()
			.should('have.attr', 'style', 'left: 740px; top: 360px;');
	});

	it('should zoom in', () => {
		WorkflowPage.getters.zoomInButton().should('be.visible').click();
		WorkflowPage.getters
			.nodeView()
			.should(
				'have.css',
				'transform',
				`matrix(${ZOOM_IN_X1_FACTOR}, 0, 0, ${ZOOM_IN_X1_FACTOR}, 0, 0)`,
			);
		WorkflowPage.getters.zoomInButton().click();
		WorkflowPage.getters
			.nodeView()
			.should(
				'have.css',
				'transform',
				`matrix(${ZOOM_IN_X2_FACTOR}, 0, 0, ${ZOOM_IN_X2_FACTOR}, 0, 0)`,
			);
	});

	it('should zoom out', () => {
		WorkflowPage.getters.zoomOutButton().should('be.visible').click();
		WorkflowPage.getters
			.nodeView()
			.should(
				'have.css',
				'transform',
				`matrix(${ZOOM_OUT_X1_FACTOR}, 0, 0, ${ZOOM_OUT_X1_FACTOR}, 0, 0)`,
			);
		WorkflowPage.getters.zoomOutButton().click();
		WorkflowPage.getters
			.nodeView()
			.should(
				'have.css',
				'transform',
				`matrix(${ZOOM_OUT_X2_FACTOR}, 0, 0, ${ZOOM_OUT_X2_FACTOR}, 0, 0)`,
			);
	});

	it('should reset zoom', () => {
		// Reset zoom should not appear until zoom level changed
		WorkflowPage.getters.resetZoomButton().should('not.exist');
		WorkflowPage.getters.zoomInButton().click();
		WorkflowPage.getters.resetZoomButton().should('be.visible').click();
		WorkflowPage.getters
			.nodeView()
			.should(
				'have.css',
				'transform',
				`matrix(${DEFAULT_ZOOM_FACTOR}, 0, 0, ${DEFAULT_ZOOM_FACTOR}, 0, 0)`,
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

	it('should disable node by pressing the disable button', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.getters
			.canvasNodes()
			.last()
			.find('[data-test-id="disable-node-button"]')
			.click({ force: true });
		WorkflowPage.getters.disabledNodes().should('have.length', 1);
	});

	it('should disable node using keyboard shortcut', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.getters.canvasNodes().last().click();
		WorkflowPage.actions.hitDisableNodeShortcut();
		WorkflowPage.getters.disabledNodes().should('have.length', 1);
	});

	it('should disable multiple nodes', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		cy.get('body').type('{esc}');
		cy.get('body').type('{esc}');
		WorkflowPage.actions.selectAll();
		WorkflowPage.actions.hitDisableNodeShortcut();
		WorkflowPage.getters.disabledNodes().should('have.length', 2);
	});

	it('should rename node using keyboard shortcut', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.getters.canvasNodes().last().click();
		cy.get('body').trigger('keydown', { key: 'F2' });
		cy.get('.rename-prompt').should('be.visible');
		cy.get('body').type(RENAME_NODE_NAME);
		cy.get('body').type('{enter}');
		WorkflowPage.getters.canvasNodeByName(RENAME_NODE_NAME).should('exist');
	});

	it('should duplicate node', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.getters
			.canvasNodes()
			.last()
			.find('[data-test-id="duplicate-node-button"]')
			.click({ force: true });
		WorkflowPage.getters.canvasNodes().should('have.length', 3);
		WorkflowPage.getters.nodeConnections().should('have.length', 1);
	});
});
