import {
	MANUAL_TRIGGER_NODE_NAME,
	MANUAL_TRIGGER_NODE_DISPLAY_NAME,
	CODE_NODE_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
	EDIT_FIELDS_SET_NODE_NAME,
	HTTP_REQUEST_NODE_NAME,
} from './../constants';
import { getCanvasPane } from '../composables/workflow';
import { successToast } from '../pages/notifications';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

const WorkflowPage = new WorkflowPageClass();
describe('Canvas Actions', () => {
	beforeEach(() => {
		WorkflowPage.actions.visit();
	});

	it('should add first step', () => {
		WorkflowPage.getters.canvasPlusButton().should('be.visible');
		WorkflowPage.actions.addInitialNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodes().should('have.length', 1);
	});

	it('should add a connected node using plus endpoint', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodePlusEndpointByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		WorkflowPage.getters.nodeCreatorSearchBar().should('be.visible');
		WorkflowPage.getters.nodeCreatorSearchBar().type(CODE_NODE_NAME);
		WorkflowPage.getters.nodeCreatorSearchBar().type('{enter}');
		cy.get('body').type('{esc}');
		WorkflowPage.getters.canvasNodes().should('have.length', 2);
		WorkflowPage.getters.nodeConnections().should('have.length', 1);
	});

	it('should add a connected node dragging from node creator', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodePlusEndpointByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		WorkflowPage.getters.nodeCreatorSearchBar().should('be.visible');
		WorkflowPage.getters.nodeCreatorSearchBar().type(CODE_NODE_NAME);
		cy.drag(WorkflowPage.getters.nodeCreatorNodeItems().first(), [100, 100], {
			realMouse: true,
			abs: true,
		});
		cy.get('body').type('{esc}');
		WorkflowPage.getters.canvasNodes().should('have.length', 2);
		WorkflowPage.getters.nodeConnections().should('have.length', 1);
	});

	it('should open a category when trying to drag and drop it on the canvas', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodePlusEndpointByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		WorkflowPage.getters.nodeCreatorSearchBar().should('be.visible');
		WorkflowPage.getters.nodeCreatorSearchBar().type(CODE_NODE_NAME);
		cy.drag(WorkflowPage.getters.nodeCreatorActionItems().first(), [100, 100], {
			realMouse: true,
			abs: true,
		});
		WorkflowPage.getters.nodeCreatorCategoryItems().its('length').should('be.gt', 0);
		WorkflowPage.getters.canvasNodes().should('have.length', 1);
		WorkflowPage.getters.nodeConnections().should('have.length', 0);
	});

	it('should add disconnected node if nothing is selected', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		// Deselect nodes
		getCanvasPane().click({ force: true });
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.getters.canvasNodes().should('have.length', 2);
		WorkflowPage.getters.nodeConnections().should('have.length', 0);
	});

	it('should add node between two connected nodes', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME);
		WorkflowPage.actions.zoomToFit();
		WorkflowPage.getters.canvasNodes().should('have.length', 3);
		WorkflowPage.getters.nodeConnections().should('have.length', 2);
		WorkflowPage.actions.addNodeBetweenNodes(
			CODE_NODE_NAME,
			EDIT_FIELDS_SET_NODE_NAME,
			HTTP_REQUEST_NODE_NAME,
		);
		WorkflowPage.getters.canvasNodes().should('have.length', 4);
		WorkflowPage.getters.nodeConnections().should('have.length', 3);

		WorkflowPage.getters.canvasNodeByName(EDIT_FIELDS_SET_NODE_NAME).then(($editFieldsNode) => {
			const editFieldsNodeLeft = WorkflowPage.getters.getNodeLeftPosition($editFieldsNode);

			WorkflowPage.getters.canvasNodeByName(HTTP_REQUEST_NODE_NAME).then(($httpNode) => {
				const httpNodeLeft = WorkflowPage.getters.getNodeLeftPosition($httpNode);
				expect(httpNodeLeft).to.be.lessThan(editFieldsNodeLeft);
			});
		});
	});

	it('should delete node by pressing keyboard backspace', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(CODE_NODE_NAME).click();
		cy.get('body').type('{backspace}');
		WorkflowPage.getters.nodeConnections().should('have.length', 0);
	});

	it('should delete connections by clicking on the delete button', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.getters.nodeConnections().first().realHover();
		WorkflowPage.actions.deleteNodeBetweenNodes(MANUAL_TRIGGER_NODE_DISPLAY_NAME, CODE_NODE_NAME);

		WorkflowPage.getters.nodeConnections().should('have.length', 0);
	});

	describe('Node hover actions', () => {
		it('should execute node', () => {
			WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
			WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
			WorkflowPage.getters
				.canvasNodes()
				.last()
				.findChildByTestId('execute-node-button')
				.click({ force: true });

			successToast().should('have.length', 1);

			WorkflowPage.actions.executeNode(CODE_NODE_NAME);

			successToast().should('have.length', 2);
			successToast().should('contain.text', 'Node executed successfully');
		});

		it('should disable and enable node', () => {
			WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
			WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
			const disableButton = WorkflowPage.getters
				.canvasNodes()
				.last()
				.findChildByTestId('disable-node-button');
			disableButton.click({ force: true });
			WorkflowPage.getters.disabledNodes().should('have.length', 1);
			disableButton.click({ force: true });
			WorkflowPage.getters.disabledNodes().should('have.length', 0);
		});

		it('should delete node', () => {
			WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
			WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
			WorkflowPage.getters
				.canvasNodes()
				.last()
				.find('[data-test-id="delete-node-button"]')
				.click({ force: true });
			WorkflowPage.getters.canvasNodes().should('have.length', 1);
		});
	});

	it('should copy selected nodes', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.actions.hitSelectAll();

		WorkflowPage.actions.hitCopy();
		successToast().should('contain', 'Copied to clipboard');

		WorkflowPage.actions.copyNode(CODE_NODE_NAME);
		successToast().should('contain', 'Copied to clipboard');
	});

	it('should select/deselect all nodes', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.actions.hitSelectAll();
		WorkflowPage.getters.selectedNodes().should('have.length', 2);
		WorkflowPage.actions.deselectAll();
		WorkflowPage.getters.selectedNodes().should('have.length', 0);
	});

	it('should select nodes using arrow keys', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		cy.wait(500);
		cy.get('body').type('{leftArrow}');
		const selectedCanvasNodes = () => WorkflowPage.getters.canvasNodes().parent();

		selectedCanvasNodes().first().should('have.class', 'selected');
		cy.get('body').type('{rightArrow}');
		selectedCanvasNodes().last().should('have.class', 'selected');
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
