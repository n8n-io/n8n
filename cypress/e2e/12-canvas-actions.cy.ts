import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';
import { successToast } from '../pages/notifications';
import {
	MANUAL_TRIGGER_NODE_NAME,
	MANUAL_TRIGGER_NODE_DISPLAY_NAME,
	CODE_NODE_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
	EDIT_FIELDS_SET_NODE_NAME,
	IF_NODE_NAME,
	HTTP_REQUEST_NODE_NAME,
} from './../constants';

const WorkflowPage = new WorkflowPageClass();
describe('Canvas Actions', () => {
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
		WorkflowPage.actions.addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME);
		WorkflowPage.getters.nodeViewBackground().click(600, 200, { force: true });
		cy.get('.jtk-connector').should('have.length', 1);

		WorkflowPage.getters.nodeViewBackground().click(600, 400, { force: true });
		WorkflowPage.actions.addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME);

		// Change connection from Set to Set1
		cy.draganddrop(
			WorkflowPage.getters.getEndpointSelector('input', EDIT_FIELDS_SET_NODE_NAME),
			WorkflowPage.getters.getEndpointSelector('input', `${EDIT_FIELDS_SET_NODE_NAME}1`),
		);

		WorkflowPage.getters
			.canvasNodeInputEndpointByName(`${EDIT_FIELDS_SET_NODE_NAME}1`)
			.should('have.class', 'jtk-endpoint-connected');

		cy.get('.jtk-connector').should('have.length', 1);
		// Disconnect Set1
		cy.drag(
			WorkflowPage.getters.getEndpointSelector('input', `${EDIT_FIELDS_SET_NODE_NAME}1`),
			[-200, 100],
		);
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

	it('should add a connected node dragging from node creator', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		cy.get('.plus-endpoint').should('be.visible').click();
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
		cy.get('.plus-endpoint').should('be.visible').click();
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
		WorkflowPage.getters.nodeViewBackground().click({ force: true });
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
			const editFieldsNodeLeft = parseFloat($editFieldsNode.css('left'));

			WorkflowPage.getters.canvasNodeByName(HTTP_REQUEST_NODE_NAME).then(($httpNode) => {
				const httpNodeLeft = parseFloat($httpNode.css('left'));
				expect(httpNodeLeft).to.be.lessThan(editFieldsNodeLeft);
			});
		});
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

	describe('Node hover actions', () => {
		it('should execute node', () => {
			WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
			WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
			WorkflowPage.getters
				.canvasNodes()
				.last()
				.findChildByTestId('execute-node-button')
				.click({ force: true });
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
		successToast().should('contain', 'Copied!');

		WorkflowPage.actions.copyNode(CODE_NODE_NAME);
		successToast().should('contain', 'Copied!');
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

	it('should not break lasso selection when dragging node action buttons', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.getters
			.canvasNodes()
			.last()
			.findChildByTestId('execute-node-button')
			.as('executeNodeButton');
		cy.drag('@executeNodeButton', [200, 200]);
		WorkflowPage.actions.testLassoSelection([100, 100], [200, 200]);
	});

	it('should not break lasso selection with multiple clicks on node action buttons', () => {
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.actions.testLassoSelection([100, 100], [200, 200]);
		WorkflowPage.getters.canvasNodes().last().as('lastNode');
		cy.get('@lastNode').findChildByTestId('execute-node-button').as('executeNodeButton');
		for (let i = 0; i < 20; i++) {
			cy.get('@lastNode').realHover();
			cy.get('@executeNodeButton').should('be.visible');
			cy.get('@executeNodeButton').realTouch();
			cy.getByTestId('execute-workflow-button').realHover();
			WorkflowPage.actions.testLassoSelection([100, 100], [200, 200]);
		}
	});
});
