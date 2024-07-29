import { WorkflowsPage as WorkflowsPageClass } from '../pages/workflows';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';
import { EDIT_FIELDS_SET_NODE_NAME } from '../constants';
import { getSaveChangesModal } from '../composables/modals/save-changes-modal';

const WorkflowsPage = new WorkflowsPageClass();
const WorkflowPage = new WorkflowPageClass();

describe('Workflows', () => {
	beforeEach(() => {
		cy.visit(WorkflowsPage.url);
	});

	it('should ask to save unsaved changes before leaving route', () => {
		WorkflowsPage.getters.newWorkflowButtonCard().should('be.visible');
		WorkflowsPage.getters.newWorkflowButtonCard().click();

		cy.createFixtureWorkflow('Test_workflow_1.json', 'Empty State Card Workflow');

		WorkflowPage.actions.addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME);

		cy.getByTestId('project-home-menu-item').click();

		getSaveChangesModal().should('be.visible');
	});
});
