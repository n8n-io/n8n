import { getCanvasNodes } from '../composables/workflow';
import {
	SCHEDULE_TRIGGER_NODE_NAME,
	SET_NODE_NAME,
	MANUAL_TRIGGER_NODE_NAME,
	MANUAL_TRIGGER_NODE_DISPLAY_NAME,
	CODE_NODE_DISPLAY_NAME,
} from '../constants';
import { NDV } from '../pages/ndv';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

const WorkflowPage = new WorkflowPageClass();
const ndv = new NDV();

describe('Undo/Redo', () => {
	beforeEach(() => {
		WorkflowPage.actions.visit();
	});

	it('should undo/redo deleting node using context menu', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addCodeNodeToCanvas();
		WorkflowPage.actions.zoomToFit();
		WorkflowPage.actions.deleteNodeFromContextMenu(CODE_NODE_DISPLAY_NAME, {
			method: 'right-click',
			anchor: 'topLeft',
		});
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
		WorkflowPage.actions.addCodeNodeToCanvas();
		WorkflowPage.getters.canvasNodeByName(CODE_NODE_DISPLAY_NAME).click();
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

	it('should undo/redo deleting node between two connected nodes', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addCodeNodeToCanvas();
		WorkflowPage.actions.addNodeToCanvas(SET_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(CODE_NODE_DISPLAY_NAME).click();
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

	it('should undo/redo deleting whole workflow', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addCodeNodeToCanvas();
		cy.get('body').type('{esc}');
		cy.get('body').type('{esc}');
		WorkflowPage.actions.hitDeleteAllNodes();
		WorkflowPage.getters.canvasNodes().should('have.have.length', 0);
		WorkflowPage.actions.hitUndo();
		WorkflowPage.getters.canvasNodes().should('have.have.length', 2);
		WorkflowPage.getters.nodeConnections().should('have.length', 1);
		WorkflowPage.actions.hitRedo();
		WorkflowPage.getters.canvasNodes().should('have.have.length', 0);
		WorkflowPage.getters.nodeConnections().should('have.length', 0);
	});

	it('should undo/redo moving nodes', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		WorkflowPage.actions.addCodeNodeToCanvas();

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

				WorkflowPage.actions.hitUndo();

				getCanvasNodes()
					.last()
					.then(($node) => {
						const { x: x3, y: y3 } = $node[0].getBoundingClientRect();
						expect(x3).to.equal(x1);
						expect(y3).to.equal(y1);
					});

				WorkflowPage.actions.hitRedo();

				getCanvasNodes()
					.last()
					.then(($node) => {
						const { x: x4, y: y4 } = $node[0].getBoundingClientRect();
						expect(x4).to.be.greaterThan(x1);
						expect(y4).to.be.greaterThan(y1);
					});
			});
	});

	it('should undo/redo deleting a connection using context menu', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addCodeNodeToCanvas();
		WorkflowPage.actions.deleteNodeBetweenNodes(SCHEDULE_TRIGGER_NODE_NAME, CODE_NODE_DISPLAY_NAME);
		WorkflowPage.getters.nodeConnections().should('have.length', 0);
		WorkflowPage.actions.hitUndo();
		WorkflowPage.getters.nodeConnections().should('have.length', 1);
		WorkflowPage.actions.hitRedo();
		WorkflowPage.getters.nodeConnections().should('have.length', 0);
	});

	it('should undo/redo disabling a node using context menu', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addCodeNodeToCanvas();
		WorkflowPage.actions.disableNode(CODE_NODE_DISPLAY_NAME);
		WorkflowPage.getters.disabledNodes().should('have.length', 1);
		WorkflowPage.actions.hitUndo();
		WorkflowPage.getters.disabledNodes().should('have.length', 0);
		WorkflowPage.actions.hitRedo();
		WorkflowPage.getters.disabledNodes().should('have.length', 1);
	});

	it('should undo/redo disabling a node using keyboard shortcut', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addCodeNodeToCanvas();
		WorkflowPage.getters.canvasNodes().last().click();
		WorkflowPage.actions.hitDisableNodeShortcut();
		WorkflowPage.getters.disabledNodes().should('have.length', 1);
		WorkflowPage.actions.hitUndo();
		WorkflowPage.getters.disabledNodes().should('have.length', 0);
		WorkflowPage.actions.hitRedo();
		WorkflowPage.getters.disabledNodes().should('have.length', 1);
	});

	it('should undo/redo disabling multiple nodes', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addCodeNodeToCanvas();
		cy.get('body').type('{esc}');
		cy.get('body').type('{esc}');
		WorkflowPage.actions.hitSelectAll();
		WorkflowPage.actions.hitDisableNodeShortcut();
		WorkflowPage.getters.disabledNodes().should('have.length', 2);
		WorkflowPage.actions.hitUndo();
		WorkflowPage.getters.disabledNodes().should('have.length', 0);
		WorkflowPage.actions.hitRedo();
		WorkflowPage.getters.disabledNodes().should('have.length', 2);
	});

	it('should undo/redo duplicating a node', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addCodeNodeToCanvas();
		WorkflowPage.actions.duplicateNode(CODE_NODE_DISPLAY_NAME);
		WorkflowPage.actions.hitUndo();
		WorkflowPage.getters.canvasNodes().should('have.length', 2);
		WorkflowPage.actions.hitRedo();
		WorkflowPage.getters.canvasNodes().should('have.length', 3);
	});

	it('should undo/redo pasting nodes', () => {
		cy.fixture('Test_workflow-actions_paste-data.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
			WorkflowPage.actions.zoomToFit();
			WorkflowPage.getters.canvasNodes().should('have.have.length', 5);
			WorkflowPage.actions.hitUndo();
			WorkflowPage.getters.canvasNodes().should('have.have.length', 0);
			WorkflowPage.actions.hitRedo();
			WorkflowPage.getters.canvasNodes().should('have.have.length', 5);
		});
	});

	it('should be able to copy and paste pinned data nodes in workflows with dynamic Switch node', () => {
		cy.fixture('Test_workflow_form_switch.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});
		WorkflowPage.actions.zoomToFit();

		WorkflowPage.getters.canvasNodes().should('have.length', 2);
		WorkflowPage.getters.nodeConnections().should('have.length', 1);
		cy.get(WorkflowPage.getters.getEndpointSelector('input', 'Switch')).should('have.length', 1);

		cy.wait(1000); // Clipboard paste is throttled
		cy.fixture('Test_workflow_form_switch.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});
		WorkflowPage.getters.canvasNodes().should('have.length', 4);
		WorkflowPage.getters.nodeConnections().should('have.length', 2);

		WorkflowPage.actions.hitUndo();

		WorkflowPage.getters.canvasNodes().should('have.length', 2);
		WorkflowPage.getters.nodeConnections().should('have.length', 1);
		cy.get(WorkflowPage.getters.getEndpointSelector('input', 'Switch')).should('have.length', 1);
	});

	it('should not undo/redo when NDV or a modal is open', () => {
		WorkflowPage.actions.addInitialNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME, { keepNdvOpen: true });
		// Try while NDV is open
		WorkflowPage.actions.hitUndo();
		WorkflowPage.getters.canvasNodes().should('have.have.length', 1);
		ndv.getters.backToCanvas().click();
		// Try while modal is open
		cy.getByTestId('menu-item').contains('About n8n').click({ force: true });
		cy.getByTestId('about-modal').should('be.visible');
		WorkflowPage.actions.hitUndo();
		WorkflowPage.getters.canvasNodes().should('have.have.length', 1);
		cy.getByTestId('close-about-modal-button').click();
		// Should work now
		WorkflowPage.actions.hitUndo();
		WorkflowPage.getters.canvasNodes().should('have.have.length', 0);
	});

	it('should not undo/redo when NDV or a prompt is open', () => {
		WorkflowPage.actions.addInitialNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME, { keepNdvOpen: false });
		WorkflowPage.getters.workflowMenu().click();
		WorkflowPage.getters.workflowMenuItemImportFromURLItem().should('be.visible');
		WorkflowPage.getters.workflowMenuItemImportFromURLItem().click();
		// Try while prompt is open
		WorkflowPage.getters.inputURLImportWorkflowFromURL().click();
		WorkflowPage.actions.hitUndo();
		WorkflowPage.getters.canvasNodes().should('have.have.length', 1);
		// Close prompt and try again
		WorkflowPage.getters.cancelActionImportWorkflowFromURL().click();
		WorkflowPage.actions.hitUndo();
		WorkflowPage.getters.canvasNodes().should('have.have.length', 0);
	});
});
