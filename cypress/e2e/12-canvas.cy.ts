import {
	MANUAL_TRIGGER_NODE_NAME,
	MANUAL_TRIGGER_NODE_DISPLAY_NAME,
	CODE_NODE_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
	EDIT_FIELDS_SET_NODE_NAME,
	SWITCH_NODE_NAME,
	MERGE_NODE_NAME,
} from './../constants';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';
import { NDV, WorkflowExecutionsTab } from '../pages';

const WorkflowPage = new WorkflowPageClass();
const ExecutionsTab = new WorkflowExecutionsTab();
const NDVDialog = new NDV();
const DEFAULT_ZOOM_FACTOR = 1;
const ZOOM_IN_X1_FACTOR = 1.25; // Zoom in factor after one click
const ZOOM_IN_X2_FACTOR = 1.5625; // Zoom in factor after two clicks
const ZOOM_OUT_X1_FACTOR = 0.8;
const ZOOM_OUT_X2_FACTOR = 0.64;

const PINCH_ZOOM_IN_FACTOR = 1.05702;
const PINCH_ZOOM_OUT_FACTOR = 0.946058;
const RENAME_NODE_NAME = 'Something else';
const RENAME_NODE_NAME2 = 'Something different';

describe('Canvas Node Manipulation and Navigation', () => {
	beforeEach(() => {
		WorkflowPage.actions.visit();
	});

	it('should add switch node and test connections', () => {
		const desiredOutputs = 4;
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME, true);
		WorkflowPage.actions.addNodeToCanvas(SWITCH_NODE_NAME, true, true);

		for (let i = 0; i < desiredOutputs; i++) {
			cy.contains('Add Routing Rule').click();
		}

		NDVDialog.actions.close();
		for (let i = 0; i < desiredOutputs; i++) {
			WorkflowPage.getters.canvasNodePlusEndpointByName(SWITCH_NODE_NAME, i).click({ force: true });
			WorkflowPage.getters.nodeCreatorSearchBar().should('be.visible');
			WorkflowPage.actions.addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME, false);
			WorkflowPage.actions.zoomToFit();
		}
		WorkflowPage.getters.nodeViewBackground().click({ force: true });
		WorkflowPage.getters.canvasNodePlusEndpointByName(`${EDIT_FIELDS_SET_NODE_NAME}3`).click();
		WorkflowPage.actions.addNodeToCanvas(SWITCH_NODE_NAME, false);
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		cy.reload();
		cy.waitForLoad();
		// Make sure outputless switch was connected correctly
		cy.get(
			`[data-target-node="${SWITCH_NODE_NAME}1"][data-source-node="${EDIT_FIELDS_SET_NODE_NAME}3"]`,
		).should('be.visible');
		// Make sure all connections are there after reload
		for (let i = 0; i < desiredOutputs; i++) {
			const setName = `${EDIT_FIELDS_SET_NODE_NAME}${i > 0 ? i : ''}`;
			WorkflowPage.getters
				.canvasNodeInputEndpointByName(setName)
				.should('have.class', 'jtk-endpoint-connected');
		}
	});

	it('should add merge node and test connections', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		for (let i = 0; i < 2; i++) {
			WorkflowPage.actions.addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME, true);
			WorkflowPage.getters.nodeViewBackground().click(600 + i * 100, 200, { force: true });
		}
		WorkflowPage.actions.zoomToFit();

		WorkflowPage.actions.addNodeToCanvas(MERGE_NODE_NAME);
		WorkflowPage.actions.zoomToFit();

		// Connect manual to Set1
		cy.draganddrop(
			WorkflowPage.getters.getEndpointSelector('output', MANUAL_TRIGGER_NODE_DISPLAY_NAME),
			WorkflowPage.getters.getEndpointSelector('input', `${EDIT_FIELDS_SET_NODE_NAME}1`),
		);

		cy.get('.rect-input-endpoint.jtk-endpoint-connected').should('have.length', 2);

		// Connect Set1 and Set2 to merge
		cy.draganddrop(
			WorkflowPage.getters.getEndpointSelector('plus', EDIT_FIELDS_SET_NODE_NAME),
			WorkflowPage.getters.getEndpointSelector('input', MERGE_NODE_NAME, 0),
		);
		cy.draganddrop(
			WorkflowPage.getters.getEndpointSelector('plus', `${EDIT_FIELDS_SET_NODE_NAME}1`),
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
			WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME, true);
		}
		WorkflowPage.actions.zoomToFit();
		WorkflowPage.actions.executeWorkflow();

		cy.get('.jtk-connector.success').should('have.length', 3);
		cy.get('.data-count').should('have.length', 4);
		cy.get('.plus-draggable-endpoint').should('have.class', 'ep-success');

		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.actions.zoomToFit();

		cy.get('.plus-draggable-endpoint').filter(':visible').should('not.have.class', 'ep-success');
		cy.get('.jtk-connector.success').should('have.length', 3);
		cy.get('.jtk-connector').should('have.length', 4);
	});

	it('should delete node using context menu', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.actions.deleteNodeFromContextMenu(CODE_NODE_NAME);
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
		WorkflowPage.actions.addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME);
		WorkflowPage.getters.canvasNodes().should('have.length', 3);
		WorkflowPage.getters.nodeConnections().should('have.length', 2);
		WorkflowPage.getters.canvasNodeByName(CODE_NODE_NAME).click();
		WorkflowPage.actions.zoomToFit();
		cy.get('body').type('{backspace}');
		WorkflowPage.getters.canvasNodes().should('have.length', 2);
		WorkflowPage.getters.nodeConnections().should('have.length', 1);
	});

	it('should delete multiple nodes (context menu or shortcut)', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		cy.wait(500);
		WorkflowPage.actions.selectAll();
		cy.get('body').type('{backspace}');
		WorkflowPage.getters.canvasNodes().should('have.length', 0);

		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		cy.wait(500);
		WorkflowPage.actions.selectAllFromContextMenu();
		WorkflowPage.actions.openContextMenu();
		WorkflowPage.actions.contextMenuAction('delete');
		WorkflowPage.getters.canvasNodes().should('have.length', 0);
	});

	it('should delete multiple nodes (context menu or shortcut)', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		cy.wait(500);
		WorkflowPage.actions.selectAll();
		cy.get('body').type('{backspace}');
		WorkflowPage.getters.canvasNodes().should('have.length', 0);

		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		cy.wait(500);
		WorkflowPage.actions.selectAllFromContextMenu();
		WorkflowPage.actions.openContextMenu();
		WorkflowPage.actions.contextMenuAction('delete');
		WorkflowPage.getters.canvasNodes().should('have.length', 0);
	});

	it('should move node', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.actions.zoomToFit();

		cy.drag('[data-test-id="canvas-node"].jtk-drag-selected', [50, 150], { clickToFinish: true });
		WorkflowPage.getters
			.canvasNodes()
			.last()
			.should('have.css', 'left', '740px')
			.should('have.css', 'top', '320px');
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

	it('should zoom using scroll or pinch gesture', () => {
		WorkflowPage.actions.pinchToZoom(1, 'zoomIn');
		WorkflowPage.getters
			.nodeView()
			.should(
				'have.css',
				'transform',
				`matrix(${PINCH_ZOOM_IN_FACTOR}, 0, 0, ${PINCH_ZOOM_IN_FACTOR}, 0, 0)`,
			);

		WorkflowPage.actions.pinchToZoom(1, 'zoomOut');
		// Zoom in 1x + Zoom out 1x should reset to default (=1)
		WorkflowPage.getters.nodeView().should('have.css', 'transform', `matrix(1, 0, 0, 1, 0, 0)`);

		WorkflowPage.actions.pinchToZoom(1, 'zoomOut');
		WorkflowPage.getters
			.nodeView()
			.should(
				'have.css',
				'transform',
				`matrix(${PINCH_ZOOM_OUT_FACTOR}, 0, 0, ${PINCH_ZOOM_OUT_FACTOR}, 0, 0)`,
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

	it('should disable node (context menu or shortcut)', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.getters.canvasNodes().last().click();
		WorkflowPage.actions.hitDisableNodeShortcut();
		WorkflowPage.getters.disabledNodes().should('have.length', 1);

		WorkflowPage.actions.disableNode(CODE_NODE_NAME);
		WorkflowPage.getters.disabledNodes().should('have.length', 0);
	});

	it('should disable multiple nodes (context menu or shortcut)', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		cy.get('body').type('{esc}');
		cy.get('body').type('{esc}');

		// Keyboard shortcut
		WorkflowPage.actions.selectAll();
		WorkflowPage.actions.hitDisableNodeShortcut();
		WorkflowPage.getters.disabledNodes().should('have.length', 2);
		WorkflowPage.actions.hitDisableNodeShortcut();
		WorkflowPage.getters.disabledNodes().should('have.length', 0);
		WorkflowPage.actions.deselectAll();
		WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		WorkflowPage.actions.hitDisableNodeShortcut();
		WorkflowPage.getters.disabledNodes().should('have.length', 1);
		WorkflowPage.actions.selectAll();
		WorkflowPage.actions.hitDisableNodeShortcut();
		WorkflowPage.getters.disabledNodes().should('have.length', 2);

		// Context menu
		WorkflowPage.actions.selectAll();
		WorkflowPage.actions.openContextMenu();
		WorkflowPage.actions.contextMenuAction('toggle_activation');
		WorkflowPage.getters.disabledNodes().should('have.length', 0);
		WorkflowPage.actions.openContextMenu();
		WorkflowPage.actions.contextMenuAction('toggle_activation');
		WorkflowPage.getters.disabledNodes().should('have.length', 2);
		WorkflowPage.actions.deselectAll();
		WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		WorkflowPage.actions.openContextMenu();
		WorkflowPage.actions.contextMenuAction('toggle_activation');
		WorkflowPage.getters.disabledNodes().should('have.length', 1);
		WorkflowPage.actions.selectAll();
		WorkflowPage.actions.openContextMenu();
		WorkflowPage.actions.contextMenuAction('toggle_activation');
		WorkflowPage.getters.disabledNodes().should('have.length', 2);
	});

	it('should rename node (context menu or shortcut)', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.getters.canvasNodes().last().click();
		cy.get('body').trigger('keydown', { key: 'F2' });
		cy.get('.rename-prompt').should('be.visible');
		cy.get('body').type(RENAME_NODE_NAME);
		cy.get('body').type('{enter}');
		WorkflowPage.getters.canvasNodeByName(RENAME_NODE_NAME).should('exist');

		WorkflowPage.actions.renameNode(RENAME_NODE_NAME);
		cy.get('.rename-prompt').should('be.visible');
		cy.get('body').type(RENAME_NODE_NAME2);
		cy.get('body').type('{enter}');
		WorkflowPage.getters.canvasNodeByName(RENAME_NODE_NAME2).should('exist');
	});

	it('should not allow empty strings for node names', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.getters.canvasNodes().last().click();
		cy.get('body').trigger('keydown', { key: 'F2' });
		cy.get('.rename-prompt').should('be.visible');
		cy.get('body').type('{backspace}');
		cy.get('body').type('{enter}');
		cy.get('.rename-prompt').should('contain', 'Invalid Name');
	});

	it('should duplicate nodes (context menu or shortcut)', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.actions.duplicateNode(CODE_NODE_NAME);
		WorkflowPage.getters.canvasNodes().should('have.length', 3);
		WorkflowPage.getters.nodeConnections().should('have.length', 1);

		WorkflowPage.actions.selectAll();
		WorkflowPage.actions.hitDuplicateNodeShortcut();
		WorkflowPage.getters.canvasNodes().should('have.length', 5);
	});

	// ADO-1240: Connections would get deleted after activating and deactivating NodeView
	it('should preserve connections after rename & node-view switch', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.actions.executeWorkflow();

		ExecutionsTab.actions.switchToExecutionsTab();
		ExecutionsTab.getters.successfulExecutionListItems().should('have.length', 1);

		ExecutionsTab.actions.switchToEditorTab();

		ExecutionsTab.actions.switchToExecutionsTab();
		ExecutionsTab.getters.successfulExecutionListItems().should('have.length', 1);

		ExecutionsTab.actions.switchToEditorTab();
		WorkflowPage.getters.canvasNodes().should('have.length', 2);

		WorkflowPage.getters.canvasNodes().last().click();
		cy.get('body').trigger('keydown', { key: 'F2' });
		cy.get('.rename-prompt').should('be.visible');
		cy.get('body').type(RENAME_NODE_NAME);
		cy.get('body').type('{enter}');
		WorkflowPage.getters.canvasNodeByName(RENAME_NODE_NAME).should('exist');
		// Make sure all connections are there after save & reload
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		cy.reload();
		cy.waitForLoad();
		WorkflowPage.getters.canvasNodes().should('have.length', 2);
		cy.get('.rect-input-endpoint.jtk-endpoint-connected').should('have.length', 1);
	});

	it('should remove unknown credentials on pasting workflow', () => {
		cy.fixture('workflow-with-unknown-credentials.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));

			WorkflowPage.getters.canvasNodes().should('have.have.length', 2);

			WorkflowPage.actions.openNodeFromContextMenu('n8n');
			cy.get('[class*=hasIssues]').should('have.length', 1);
			NDVDialog.actions.close();
		});
	});

	it('should render connections correctly if unkown nodes are present', () => {
		const unknownNodeName = 'Unknown node';
		cy.createFixtureWorkflow('workflow-with-unknown-nodes.json', 'Unknown nodes');

		WorkflowPage.getters.canvasNodeByName(`${unknownNodeName} 1`).should('exist');
		WorkflowPage.getters.canvasNodeByName(`${unknownNodeName} 2`).should('exist');
		WorkflowPage.actions.zoomToFit();

		cy.draganddrop(
			WorkflowPage.getters.getEndpointSelector('plus', `${unknownNodeName} 1`),
			WorkflowPage.getters.getEndpointSelector('input', EDIT_FIELDS_SET_NODE_NAME),
		);

		cy.draganddrop(
			WorkflowPage.getters.getEndpointSelector('plus', `${unknownNodeName} 2`),
			WorkflowPage.getters.getEndpointSelector('input', `${EDIT_FIELDS_SET_NODE_NAME}1`),
		);

		WorkflowPage.actions.executeWorkflow();
		cy.contains('Unrecognized node type').should('be.visible');

		WorkflowPage.actions.deselectAll();
		WorkflowPage.actions.deleteNodeFromContextMenu(`${unknownNodeName} 1`);
		WorkflowPage.actions.deleteNodeFromContextMenu(`${unknownNodeName} 2`);

		WorkflowPage.actions.executeWorkflow();

		cy.contains('Unrecognized node type').should('not.exist');
	});
});
