import * as workflow from '../composables/workflow';
import { EDIT_FIELDS_SET_NODE_NAME, LOOP_OVER_ITEMS_NODE_NAME } from '../constants';
import { NodeCreator } from '../pages/features/node-creator';
import { NDV } from '../pages/ndv';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';
const nodeCreatorFeature = new NodeCreator();
const WorkflowPage = new WorkflowPageClass();
const NDVModal = new NDV();

describe('CAT-726 Node connectors not rendered when nodes inserted on the canvas', () => {
	beforeEach(() => {
		WorkflowPage.actions.visit();
	});

	it('should correctly append a No Op node when Loop Over Items node is added (from add button)', () => {
		nodeCreatorFeature.actions.openNodeCreator();
		nodeCreatorFeature.getters.searchBar().find('input').type(EDIT_FIELDS_SET_NODE_NAME);
		nodeCreatorFeature.getters.getCreatorItem(EDIT_FIELDS_SET_NODE_NAME).click();
		NDVModal.actions.close();

		workflow.executeWorkflowAndWait();

		cy.getByTestId('edge-label').realHover();
		cy.getByTestId('add-connection-button').realClick();

		nodeCreatorFeature.getters.searchBar().find('input').type(LOOP_OVER_ITEMS_NODE_NAME);
		nodeCreatorFeature.getters.getCreatorItem(LOOP_OVER_ITEMS_NODE_NAME).click();
		NDVModal.actions.close();

		WorkflowPage.getters.canvasNodes().should('have.length', 4);
		WorkflowPage.getters.nodeConnections().should('have.length', 4);

		WorkflowPage.getters
			.getConnectionBetweenNodes(LOOP_OVER_ITEMS_NODE_NAME, 'Replace Me')
			.should('exist')
			.should('be.visible');
		WorkflowPage.getters
			.getConnectionBetweenNodes(LOOP_OVER_ITEMS_NODE_NAME, EDIT_FIELDS_SET_NODE_NAME)
			.should('exist')
			.should('be.visible');
		WorkflowPage.getters
			.getConnectionBetweenNodes('Replace Me', LOOP_OVER_ITEMS_NODE_NAME)
			.should('exist')
			.should('be.visible');
	});
});
