import {
	MANUAL_TRIGGER_NODE_NAME,
	MANUAL_TRIGGER_NODE_DISPLAY_NAME,
	CODE_NODE_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
	EDIT_FIELDS_SET_NODE_NAME,
	SWITCH_NODE_NAME,
	MERGE_NODE_NAME,
	CODE_NODE_DISPLAY_NAME,
} from './../../constants';
import {
	clickContextMenuAction,
	getCanvasNodeByName,
	getCanvasNodes,
	getConnectionBySourceAndTarget,
	getConnectionLabelBySourceAndTarget,
	getOutputPlusHandle,
	openContextMenu,
} from '../../composables/workflow';
import { NDV, WorkflowExecutionsTab } from '../../pages';
import { clearNotifications, successToast } from '../../pages/notifications';
import { WorkflowPage as WorkflowPageClass } from '../../pages/workflow';

const WorkflowPage = new WorkflowPageClass();
const ExecutionsTab = new WorkflowExecutionsTab();
const NDVDialog = new NDV();
const DEFAULT_ZOOM_FACTOR = 1;
const ZOOM_IN_X1_FACTOR = 1.25; // Zoom in factor after one click
const ZOOM_IN_X2_FACTOR = 1.5625; // Zoom in factor after two clicks
const ZOOM_OUT_X1_FACTOR = 0.8;
const ZOOM_OUT_X2_FACTOR = 0.64;

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
		// Make sure output-less switch was connected correctly
		getConnectionBySourceAndTarget(`${EDIT_FIELDS_SET_NODE_NAME}3`, `${SWITCH_NODE_NAME}1`).should(
			'exist',
		);
		// Make sure all connections are there after reload
		for (let i = 0; i < desiredOutputs; i++) {
			const setName = `${EDIT_FIELDS_SET_NODE_NAME}${i > 0 ? i : ''}`;

			getConnectionBySourceAndTarget(`${SWITCH_NODE_NAME}`, setName).should('exist');
		}
	});

	it('should add merge node and test connections', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		for (let i = 0; i < 2; i++) {
			WorkflowPage.actions.addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME, true);
			WorkflowPage.getters.nodeView().click((i + 1) * 200, (i + 1) * 200, { force: true });
		}
		WorkflowPage.actions.zoomToFit();

		WorkflowPage.actions.addNodeToCanvas(MERGE_NODE_NAME);
		WorkflowPage.actions.zoomToFit();

		// Connect manual to Set1
		cy.draganddrop(
			WorkflowPage.getters.getEndpointSelector('output', MANUAL_TRIGGER_NODE_DISPLAY_NAME),
			WorkflowPage.getters.getEndpointSelector('input', `${EDIT_FIELDS_SET_NODE_NAME}1`),
		);

		// Connect Set1 and Set2 to merge
		cy.draganddrop(
			WorkflowPage.getters.getEndpointSelector('output', EDIT_FIELDS_SET_NODE_NAME),
			WorkflowPage.getters.getEndpointSelector('input', MERGE_NODE_NAME, 0),
		);
		cy.draganddrop(
			WorkflowPage.getters.getEndpointSelector('output', `${EDIT_FIELDS_SET_NODE_NAME}1`),
			WorkflowPage.getters.getEndpointSelector('input', MERGE_NODE_NAME, 1),
		);

		const checkConnections = () => {
			WorkflowPage.getters
				.getConnectionBetweenNodes(
					MANUAL_TRIGGER_NODE_DISPLAY_NAME,
					`${EDIT_FIELDS_SET_NODE_NAME}1`,
				)
				.should('exist');
			WorkflowPage.getters
				.getConnectionBetweenNodes(EDIT_FIELDS_SET_NODE_NAME, MERGE_NODE_NAME)
				.should('exist');
			WorkflowPage.getters
				.getConnectionBetweenNodes(`${EDIT_FIELDS_SET_NODE_NAME}1`, MERGE_NODE_NAME)
				.should('exist');
		};
		checkConnections();

		// Make sure all connections are there after save & reload
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		cy.reload();
		cy.waitForLoad();
		checkConnections();
		// cy.get('.rect-input-endpoint.jtk-endpoint-connected').should('have.length', 4);
		WorkflowPage.actions.executeWorkflow();
		WorkflowPage.getters.stopExecutionButton().should('not.exist');

		// Make sure all connections are there after save & reload
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		cy.reload();
		cy.waitForLoad();
		checkConnections();

		WorkflowPage.actions.executeWorkflow();
		WorkflowPage.getters.stopExecutionButton().should('not.exist');

		// If the merged set nodes are connected and executed correctly, there should be 2 items in the output of merge node
		getConnectionLabelBySourceAndTarget(`${EDIT_FIELDS_SET_NODE_NAME}1`, MERGE_NODE_NAME)
			.contains('2 items')
			.should('be.visible');
	});

	it('should add nodes and check execution success', () => {
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

		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.actions.zoomToFit();

		cy.getByTestId('canvas-handle-plus').should('not.have.attr', 'data-plus-type', 'success');

		cy.get('[data-edge-status=success]').should('have.length', 4);
		cy.getByTestId('canvas-node-status-success').should('have.length', 4);
	});

	it('should delete node using context menu', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.actions.zoomToFit();
		WorkflowPage.actions.deleteNodeFromContextMenu(CODE_NODE_DISPLAY_NAME, {
			method: 'right-click',
			anchor: 'topLeft',
		});
		WorkflowPage.getters.canvasNodes().should('have.length', 1);
		WorkflowPage.getters.nodeConnections().should('have.length', 0);
	});

	it('should delete node using keyboard shortcut', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(CODE_NODE_DISPLAY_NAME).click();
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
		WorkflowPage.getters.canvasNodeByName(CODE_NODE_DISPLAY_NAME).click();
		WorkflowPage.actions.zoomToFit();
		cy.get('body').type('{backspace}');
		WorkflowPage.getters.canvasNodes().should('have.length', 2);
		WorkflowPage.getters.nodeConnections().should('have.length', 1);
	});

	it('should delete multiple nodes (context menu or shortcut)', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		cy.wait(500);
		WorkflowPage.actions.hitDeleteAllNodes();
		WorkflowPage.getters.canvasNodes().should('have.length', 0);

		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		cy.wait(500);
		WorkflowPage.actions.selectAllFromContextMenu();
		openContextMenu();
		clickContextMenuAction('delete');
		WorkflowPage.getters.canvasNodes().should('have.length', 0);
	});

	it('should delete multiple nodes (context menu or shortcut)', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		cy.wait(500);
		WorkflowPage.actions.hitDeleteAllNodes();
		WorkflowPage.getters.canvasNodes().should('have.length', 0);

		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		cy.wait(500);
		WorkflowPage.actions.selectAllFromContextMenu();
		openContextMenu();
		clickContextMenuAction('delete');
		WorkflowPage.getters.canvasNodes().should('have.length', 0);
	});

	it('should move node', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);

		WorkflowPage.actions.zoomToFit();

		getCanvasNodes()
			.last()
			.then(($node) => {
				const { x: x1, y: y1 } = $node[0].getBoundingClientRect();

				cy.drag(getCanvasNodes().last(), [50, 150], {
					realMouse: true,
					abs: true,
				});

				getCanvasNodes()
					.last()
					.then(($node) => {
						const { x: x2, y: y2 } = $node[0].getBoundingClientRect();
						expect(x2).to.be.greaterThan(x1);
						expect(y2).to.be.greaterThan(y1);
					});
			});
	});

	describe('Canvas Zoom Functionality', () => {
		const getContainer = () => WorkflowPage.getters.canvasViewport();
		const checkZoomLevel = (expectedFactor: number) => {
			return getContainer().should(($nodeView) => {
				const newTransform = $nodeView.css('transform');
				const newScale = parseFloat(newTransform.split(',')[0].slice(7));

				expect(newScale).to.be.closeTo(expectedFactor, 0.2);
			});
		};

		const zoomAndCheck = (action: 'zoomIn' | 'zoomOut', expectedFactor: number) => {
			WorkflowPage.getters[`${action}Button`]().click();
			checkZoomLevel(expectedFactor);
		};

		it('should zoom in', () => {
			WorkflowPage.getters.zoomInButton().should('be.visible');
			getContainer().then(($nodeView) => {
				const initialTransform = $nodeView.css('transform');
				const initialScale =
					initialTransform === 'none' ? 1 : parseFloat(initialTransform.split(',')[0].slice(7));

				zoomAndCheck('zoomIn', initialScale * ZOOM_IN_X1_FACTOR);
				zoomAndCheck('zoomIn', initialScale * ZOOM_IN_X2_FACTOR);
			});
		});

		it('should zoom out', () => {
			zoomAndCheck('zoomOut', ZOOM_OUT_X1_FACTOR);
			zoomAndCheck('zoomOut', ZOOM_OUT_X2_FACTOR);
		});

		it('should reset zoom', () => {
			WorkflowPage.getters.resetZoomButton().should('not.exist');
			WorkflowPage.getters.zoomInButton().click();
			WorkflowPage.getters.resetZoomButton().should('be.visible').click();
			checkZoomLevel(DEFAULT_ZOOM_FACTOR);
		});

		it('should zoom to fit', () => {
			WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
			WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
			WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
			WorkflowPage.getters.zoomOutButton().click();
			WorkflowPage.getters.zoomOutButton().click();
			WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
			WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
			WorkflowPage.getters.zoomInButton().click();
			WorkflowPage.getters.zoomInButton().click();
			WorkflowPage.getters.canvasNodes().last().should('not.be.visible');
			WorkflowPage.getters.zoomToFitButton().click();
			WorkflowPage.getters.canvasNodes().last().should('be.visible');
		});
	});

	it('should disable node (context menu or shortcut)', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.getters.canvasNodes().last().click();
		WorkflowPage.actions.hitDisableNodeShortcut();
		WorkflowPage.getters.disabledNodes().should('have.length', 1);

		WorkflowPage.actions.disableNode(CODE_NODE_DISPLAY_NAME);
		WorkflowPage.getters.disabledNodes().should('have.length', 0);
	});

	it('should disable multiple nodes (context menu or shortcut)', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		cy.get('body').type('{esc}');
		cy.get('body').type('{esc}');

		// Keyboard shortcut
		WorkflowPage.actions.hitSelectAll();
		WorkflowPage.actions.hitDisableNodeShortcut();
		WorkflowPage.getters.disabledNodes().should('have.length', 2);
		WorkflowPage.actions.hitDisableNodeShortcut();
		WorkflowPage.getters.disabledNodes().should('have.length', 0);
		WorkflowPage.actions.deselectAll();
		getCanvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		WorkflowPage.actions.hitDisableNodeShortcut();
		WorkflowPage.getters.disabledNodes().should('have.length', 1);
		WorkflowPage.actions.hitSelectAll();
		WorkflowPage.actions.hitDisableNodeShortcut();
		WorkflowPage.getters.disabledNodes().should('have.length', 2);

		// Context menu
		WorkflowPage.actions.hitSelectAll();
		openContextMenu();
		WorkflowPage.actions.contextMenuAction('toggle_activation');
		WorkflowPage.getters.disabledNodes().should('have.length', 0);
		openContextMenu();
		WorkflowPage.actions.contextMenuAction('toggle_activation');
		WorkflowPage.getters.disabledNodes().should('have.length', 2);
		WorkflowPage.actions.deselectAll();
		WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		openContextMenu();
		WorkflowPage.actions.contextMenuAction('toggle_activation');
		WorkflowPage.getters.disabledNodes().should('have.length', 1);
		WorkflowPage.actions.hitSelectAll();
		openContextMenu();
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
		WorkflowPage.actions.duplicateNode(CODE_NODE_DISPLAY_NAME);
		WorkflowPage.getters.canvasNodes().should('have.length', 3);
		WorkflowPage.getters.nodeConnections().should('have.length', 1);

		WorkflowPage.actions.hitSelectAll();
		WorkflowPage.actions.hitDuplicateNode();
		WorkflowPage.getters.canvasNodes().should('have.length', 5);
	});

	// ADO-1240: Connections would get deleted after activating and deactivating NodeView
	it('should preserve connections after rename & node-view switch', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.actions.executeWorkflow();

		successToast().should('contain.text', 'Workflow executed successfully');
		clearNotifications();

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
		WorkflowPage.getters.nodeConnections().should('have.length', 1);
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

	it('should open and close the about modal on keyboard shortcut', () => {
		WorkflowPage.actions.hitOpenAbout();
		cy.getByTestId('close-about-modal-button').click();
	});
});
