import { WEBHOOK_NODE_NAME } from './../constants';
import { clickGetBackToCanvas } from '../composables/ndv';
import {
	addNodeToCanvas,
	navigateToNewWorkflowPage,
	openNode,
	saveWorkflow,
} from '../composables/workflow';

describe('ADO-2270 Save button resets on webhook node open', () => {
	beforeEach(() => {
		navigateToNewWorkflowPage();
	});

	it('should not reset the save button if webhook node is opened and closed', () => {
		addNodeToCanvas(WEBHOOK_NODE_NAME);
		saveWorkflow();
		openNode(WEBHOOK_NODE_NAME);

		cy.ifCanvasVersion(
			() => cy.getByTestId('workflow-save-button').should('not.contain', 'Saved'),
			() => cy.getByTestId('workflow-save-button').should('contain', 'Saved'),
		);
	});
});
