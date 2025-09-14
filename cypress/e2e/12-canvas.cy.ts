import {
	MANUAL_TRIGGER_NODE_NAME,
	MANUAL_TRIGGER_NODE_DISPLAY_NAME,
	CODE_NODE_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
	EDIT_FIELDS_SET_NODE_NAME,
	SWITCH_NODE_NAME,
	MERGE_NODE_NAME,
	CODE_NODE_DISPLAY_NAME,
} from './../constants';
import {
	clickContextMenuAction,
	getCanvasNodeByName,
	getCanvasNodes,
	getConnectionBySourceAndTarget,
	getConnectionLabelBySourceAndTarget,
	getOutputPlusHandle,
	openContextMenu,
} from '../composables/workflow';
import { NDV, WorkflowExecutionsTab } from '../pages';
import { clearNotifications, successToast } from '../pages/notifications';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

// --- Page Object Instantiation ---
const WorkflowPage = new WorkflowPageClass();
const ExecutionsTab = new WorkflowExecutionsTab();
const NDVDialog = new NDV();

// --- Constants ---
const DEFAULT_ZOOM_FACTOR = 1;
const ZOOM_IN_X1_FACTOR = 1.25;
const ZOOM_IN_X2_FACTOR = 1.5625;
const ZOOM_OUT_X1_FACTOR = 0.8;
const ZOOM_OUT_X2_FACTOR = 0.64;

const RENAME_NODE_NAME = 'Something else';
const RENAME_NODE_NAME2 = 'Something different';

/**
 * @description Tests for manipulating and navigating nodes on the workflow canvas.
 */
describe('Canvas Node Manipulation and Navigation', () => {
	beforeEach(() => {
		WorkflowPage.actions.visit();
	});

	/**
	 * @description Verifies that a Switch node can be added, configured with multiple outputs,
	 * connected to other nodes, and that these connections persist after a save and reload.
	 */
	it('should add a Switch node and correctly persist its connections', () => {
		const desiredOutputs = 4;
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME, true);
		WorkflowPage.actions.addNodeToCanvas(SWITCH_NODE_NAME, true, true);

		// Add multiple routing rules to the Switch node
		for (let i = 0; i < desiredOutputs; i++) {
			cy.contains('Add Routing Rule').click();
		}
		NDVDialog.actions.close();

		// Connect each output to a new "Set" node
		for (let i = 0; i < desiredOutputs; i++) {
			getOutputPlusHandle(SWITCH_NODE_NAME).eq(0).click();
			WorkflowPage.getters.nodeCreatorSearchBar().should('be.visible');
			WorkflowPage.actions.addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME, false);
			WorkflowPage.actions.zoomToFit();
		}

		WorkflowPage.getters.nodeViewBackground().click({ force: true });
		getOutputPlusHandle(`${EDIT_FIELDS_SET_NODE_NAME}3`).click();
		WorkflowPage.actions.addNodeToCanvas(SWITCH_NODE_NAME, false);

		WorkflowPage.actions.saveWorkflowOnButtonClick();
		cy.reload();
		cy.waitForLoad();

		// Assert connections persist after reload
		getConnectionBySourceAndTarget(`${EDIT_FIELDS_SET_NODE_NAME}3`, `${SWITCH_NODE_NAME}1`).should(
			'exist',
		);

		for (let i = 0; i < desiredOutputs; i++) {
			const setName = `${EDIT_FIELDS_SET_NODE_NAME}${i > 0 ? i : ''}`;
			getConnectionBySourceAndTarget(`${SWITCH_NODE_NAME}`, setName).should('exist');
		}
	});

	/**
	 * @description Verifies that a Merge node can connect multiple inputs and that the
	 * item count on the connection label is accurate after execution.
	 */
	it('should add a Merge node and verify item count after execution', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		for (let i = 0; i < 2; i++) {
			WorkflowPage.actions.addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME, true);
			// Click on different canvas coordinates to avoid node stacking
			WorkflowPage.getters.nodeView().click((i + 1) * 200, (i + 1) * 200, { force: true });
		}
		WorkflowPage.actions.zoomToFit();

		WorkflowPage.actions.addNodeToCanvas(MERGE_NODE_NAME);
		WorkflowPage.actions.zoomToFit();

		// --- Connect Nodes ---
		cy.draganddrop(
			WorkflowPage.getters.getEndpointSelector('output', MANUAL_TRIGGER_NODE_DISPLAY_NAME),
			WorkflowPage.getters.getEndpointSelector('input', `${EDIT_FIELDS_SET_NODE_NAME}1`),
		);
		cy.draganddrop(
			WorkflowPage.getters.getEndpointSelector('output', EDIT_FIELDS_SET_NODE_NAME),
			WorkflowPage.getters.getEndpointSelector('input', MERGE_NODE_NAME, 0),
		);
		cy.draganddrop(
			WorkflowPage.getters.getEndpointSelector('output', `${EDIT_FIELDS_SET_NODE_NAME}1`),
			WorkflowPage.getters.getEndpointSelector('input', MERGE_NODE_NAME, 1),
		);

		const checkConnections = () => {
			const connections = [
				[MANUAL_TRIGGER_NODE_DISPLAY_NAME, `${EDIT_FIELDS_SET_NODE_NAME}1`],
				[EDIT_FIELDS_SET_NODE_NAME, MERGE_NODE_NAME],
				[`${EDIT_FIELDS_SET_NODE_NAME}1`, MERGE_NODE_NAME],
			];
			connections.forEach(([source, target]) => {
				WorkflowPage.getters.getConnectionBetweenNodes(source, target).should('exist');
			});
		};

		checkConnections();
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		cy.reload();
		cy.waitForLoad();
		checkConnections(); // Re-check after reload

		// --- Execute and Verify Output ---
		WorkflowPage.actions.executeWorkflow();
		WorkflowPage.getters.stopExecutionButton().should('not.exist');

		// After execution, the merge node should show that it received 2 items.
		getConnectionLabelBySourceAndTarget(`${EDIT_FIELDS_SET_NODE_NAME}1`, MERGE_NODE_NAME)
			.contains('2 items')
			.should('be.visible');
	});

	/**
	 * @description Ensures that nodes and edges correctly display a "success" status after a workflow execution.
	 */
	it('should add nodes and reflect success status after execution', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		for (let i = 0; i < 3; i++) {
			WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME, true);
		}
		WorkflowPage.actions.zoomToFit();
		WorkflowPage.actions.executeWorkflow();

		cy.get('[data-edge-status=success]').should('have.length', 3);
		cy.getByTestId('canvas-node-status-success').should('have.length', 4);
		cy.getByTestId('canvas-handle-plus-wrapper').should('have.attr', 'data-plus-type', 'success');

		// Add a new, unexecuted node
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.actions.zoomToFit();

		// The new plus handle should not have the success status
		cy.getByTestId('canvas-handle-plus').should('not.have.attr', 'data-plus-type', 'success');
		// The previous success statuses should remain
		cy.get('[data-edge-status=success]').should('have.length', 4);
		cy.getByTestId('canvas-node-status-success').should('have.length', 4);
	});

	/**
	 * @description Verifies a user can move a node on the canvas by dragging it.
	 */
	it('should move a node via drag and drop', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.actions.zoomToFit();

		getCanvasNodes()
			.last()
			.then(($node) => {
				const initialRect = $node[0].getBoundingClientRect();

				// Drag the node to a new absolute position on the page
				cy.drag(getCanvasNodes().last(), [50, 150], {
					realMouse: true,
					abs: true,
				});

				getCanvasNodes()
					.last()
					.then(($movedNode) => {
						const finalRect = $movedNode[0].getBoundingClientRect();
						// Assert that the node's position has changed
						expect(finalRect.x).to.not.be.closeTo(initialRect.x, 1);
						expect(finalRect.y).to.not.be.closeTo(initialRect.y, 1);
					});
			});
	});

	/**
	 * @description Tests related to deleting nodes from the canvas.
	 */
	describe('Node Deletion', () => {
		it('should delete a single node using the context menu', () => {
			WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
			WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
			WorkflowPage.getters.canvasNodes().should('have.length', 2);

			WorkflowPage.actions.deleteNodeFromContextMenu(CODE_NODE_DISPLAY_NAME, {
				method: 'right-click',
				anchor: 'topLeft',
			});

			WorkflowPage.getters.canvasNodes().should('have.length', 1);
			WorkflowPage.getters.nodeConnections().should('have.length', 0);
		});

		it('should delete a single node using a keyboard shortcut', () => {
			WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
			WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
			WorkflowPage.getters.canvasNodes().should('have.length', 2);

			WorkflowPage.getters.canvasNodeByName(CODE_NODE_DISPLAY_NAME).click();
			cy.get('body').type('{backspace}');

			WorkflowPage.getters.canvasNodes().should('have.length', 1);
			WorkflowPage.getters.nodeConnections().should('have.length', 0);
		});

		it('should delete a node between two connected nodes and auto-reconnect', () => {
			WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
			WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
			WorkflowPage.actions.addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME);
			WorkflowPage.getters.canvasNodes().should('have.length', 3);
			WorkflowPage.getters.nodeConnections().should('have.length', 2);
			WorkflowPage.actions.zoomToFit();

			WorkflowPage.getters.canvasNodeByName(CODE_NODE_DISPLAY_NAME).click();
			cy.get('body').type('{backspace}');

			WorkflowPage.getters.canvasNodes().should('have.length', 2);
			WorkflowPage.getters.nodeConnections().should('have.length', 1);
		});

		it('should delete all nodes using a keyboard shortcut (Ctrl+A -> Delete)', () => {
			WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
			WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
			WorkflowPage.getters.canvasNodes().should('have.length', 2); // Wait for nodes to render

			WorkflowPage.actions.hitDeleteAllNodes();
			WorkflowPage.getters.canvasNodes().should('have.length', 0);
		});

		it('should delete all nodes using the context menu (Select All -> Delete)', () => {
			WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
			WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
			WorkflowPage.getters.canvasNodes().should('have.length', 2); // Wait for nodes to render

			WorkflowPage.actions.selectAllFromContextMenu();
			openContextMenu();
			clickContextMenuAction('delete');
			WorkflowPage.getters.canvasNodes().should('have.length', 0);
		});
	});

	/**
	 * @description Tests the canvas zoom in, zoom out, reset, and fit-to-view functionalities.
	 */
	describe('Canvas Zoom Functionality', () => {
		const getContainer = () => WorkflowPage.getters.canvasViewport();
		const checkZoomLevel = (expectedFactor: number) => {
			return getContainer().should(($nodeView) => {
				const transformMatrix = $nodeView.css('transform');
				const scale = parseFloat(transformMatrix.split(',')[0].slice(7));
				expect(scale).to.be.closeTo(expectedFactor, 0.2);
			});
		};

		it('should zoom in correctly', () => {
			WorkflowPage.getters.zoomInButton().should('be.visible').click();
			checkZoomLevel(ZOOM_IN_X1_FACTOR);
			WorkflowPage.getters.zoomInButton().click();
			checkZoomLevel(ZOOM_IN_X2_FACTOR);
		});

		it('should zoom out correctly', () => {
			WorkflowPage.getters.zoomOutButton().should('be.visible').click();
			checkZoomLevel(ZOOM_OUT_X1_FACTOR);
			WorkflowPage.getters.zoomOutButton().click();
			checkZoomLevel(ZOOM_OUT_X2_FACTOR);
		});

		it('should reset zoom to default', () => {
			WorkflowPage.getters.resetZoomButton().should('not.exist');
			WorkflowPage.getters.zoomInButton().click();
			WorkflowPage.getters.resetZoomButton().should('be.visible').click();
			checkZoomLevel(DEFAULT_ZOOM_FACTOR);
		});

		it('should zoom to fit all nodes on canvas', () => {
			// Add nodes far apart to force a zoom-out on fit
			WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
			WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME, false, false, { x: 800, y: 600 });
			WorkflowPage.getters.zoomToFitButton().click();
			WorkflowPage.getters.canvasNodes().each(($node) => {
				cy.wrap($node).should('be.visible');
			});
		});
	});

	/**
	 * @description Tests related to activating and deactivating nodes.
	 */
	describe('Node Activation/Deactivation', () => {
		beforeEach(() => {
			// Setup a common workflow for deactivation tests
			WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
			WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
			WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		});

		it('should toggle a single node activation using a keyboard shortcut', () => {
			WorkflowPage.getters.canvasNodes().last().click();
			WorkflowPage.actions.hitDisableNodeShortcut();
			WorkflowPage.getters.disabledNodes().should('have.length', 1);

			// Toggle back to active
			WorkflowPage.actions.hitDisableNodeShortcut();
			WorkflowPage.getters.disabledNodes().should('have.length', 0);
		});

		it('should toggle a single node activation using the context menu', () => {
			WorkflowPage.actions.disableNode(CODE_NODE_DISPLAY_NAME);
			WorkflowPage.getters.disabledNodes().should('have.length', 1);

			// Toggle back to active
			WorkflowPage.actions.disableNode(CODE_NODE_DISPLAY_NAME);
			WorkflowPage.getters.disabledNodes().should('have.length', 0);
		});

		it('should toggle multiple selected nodes activation', () => {
			// Select all and disable
			WorkflowPage.actions.hitSelectAll();
			WorkflowPage.actions.hitDisableNodeShortcut();
			WorkflowPage.getters.disabledNodes().should('have.length', 2);

			// Re-enable all
			WorkflowPage.actions.hitSelectAll();
			openContextMenu();
			WorkflowPage.actions.contextMenuAction('toggle_activation');
			WorkflowPage.getters.disabledNodes().should('have.length', 0);
		});
	});

	/**
	 * @description Tests related to renaming nodes.
	 */
	describe('Node Renaming', () => {
		beforeEach(() => {
			WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
			WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
			WorkflowPage.getters.canvasNodes().last().click();
		});

		it('should rename a node using a keyboard shortcut (F2)', () => {
			cy.get('body').trigger('keydown', { key: 'F2' });
			cy.get('.rename-prompt').should('be.visible').type(`${RENAME_NODE_NAME}{enter}`);
			WorkflowPage.getters.canvasNodeByName(RENAME_NODE_NAME).should('exist');
		});

		it('should rename a node using the context menu', () => {
			WorkflowPage.actions.renameNode(CODE_NODE_DISPLAY_NAME);
			cy.get('.rename-prompt').should('be.visible').type(`${RENAME_NODE_NAME2}{enter}`);
			WorkflowPage.getters.canvasNodeByName(RENAME_NODE_NAME2).should('exist');
		});

		it('should not allow an empty string as a node name', () => {
			cy.get('body').trigger('keydown', { key: 'F2' });
			cy.get('.rename-prompt').should('be.visible');
			// Type the current node's name length in backspaces to clear it
			cy.get('.rename-prompt input').type('{selectall}{backspace}{enter}', { delay: 50 });
			cy.get('.rename-prompt').should('contain', 'Invalid Name');
		});
	});

	/**
	 * @description Tests related to duplicating nodes.
	 */
	describe('Node Duplication', () => {
		beforeEach(() => {
			WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
			WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
			WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		});

		it('should duplicate a single node using the context menu', () => {
			WorkflowPage.actions.duplicateNode(CODE_NODE_DISPLAY_NAME);
			WorkflowPage.getters.canvasNodes().should('have.length', 3);
			// Duplicating should not add connections
			WorkflowPage.getters.nodeConnections().should('have.length', 1);
		});

		it('should duplicate multiple selected nodes using a keyboard shortcut', () => {
			WorkflowPage.actions.hitSelectAll();
			WorkflowPage.actions.hitDuplicateNode();
			// Starting with 2 nodes, duplicating all should result in 4
			WorkflowPage.getters.canvasNodes().should('have.length', 4);
		});
	});

	/**
	 * @description Contains edge case and regression tests.
	 */
	describe('Regression and Edge Cases', () => {
		/**
		 * @description ADO-1240: Ensures connections are not lost after renaming a node,
		 * saving, and switching between the Editor and Executions tabs.
		 */
		it('should preserve connections after a node rename and view switching', () => {
			WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
			WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
			WorkflowPage.actions.executeWorkflow();
			successToast().should('contain.text', 'Workflow executed successfully');
			clearNotifications();

			// Switch tabs to simulate user activity
			ExecutionsTab.actions.switchToExecutionsTab();
			ExecutionsTab.getters.successfulExecutionListItems().should('have.length', 1);
			ExecutionsTab.actions.switchToEditorTab();

			// Rename node
			WorkflowPage.getters.canvasNodes().last().click();
			cy.get('body').trigger('keydown', { key: 'F2' });
			cy.get('.rename-prompt').should('be.visible').type(`${RENAME_NODE_NAME}{enter}`);
			WorkflowPage.getters.canvasNodeByName(RENAME_NODE_NAME).should('exist');

			// Save and reload to ensure persistence
			WorkflowPage.actions.saveWorkflowOnButtonClick();
			cy.reload();
			cy.waitForLoad();

			WorkflowPage.getters.canvasNodes().should('have.length', 2);
			WorkflowPage.getters.nodeConnections().should('have.length', 1);
		});

		/**
		 * @description Verifies that when pasting a workflow containing credentials that
		 * do not exist locally, the node is marked with an issue.
		 */
		it('should handle pasting workflows with unknown credentials gracefully', () => {
			cy.fixture('workflow-with-unknown-credentials.json').then((workflowData) => {
				// Simulate pasting the workflow JSON
				cy.get('body').paste(JSON.stringify(workflowData));

				WorkflowPage.getters.canvasNodes().should('have.length', 2);
				WorkflowPage.actions.openNodeFromContextMenu('n8n');

				// The node with the missing credential should have a visual issue indicator
				cy.get('[class*=hasIssues]').should('have.length', 1);
				NDVDialog.actions.close();
			});
		});

		it('should open and close the "About" modal using a keyboard shortcut', () => {
			WorkflowPage.actions.hitOpenAbout();
			cy.contains('About n8n').should('be.visible');
			cy.getByTestId('close-about-modal-button').click();
			cy.contains('About n8n').should('not.exist');
		});
	});
});
