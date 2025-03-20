import {
	getCancelSaveChangesButton,
	getCloseSaveChangesButton,
	getSaveChangesModal,
} from '../composables/modals/save-changes-modal';
import { getHomeButton } from '../composables/projects';
import {
	getCreateWorkflowButton,
	getWorkflowsPageUrl,
	visitWorkflowsPage,
} from '../composables/workflowsPage';
import { EDIT_FIELDS_SET_NODE_NAME } from '../constants';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';
import { WorkflowsPage as WorkflowsPageClass } from '../pages/workflows';

const WorkflowsPage = new WorkflowsPageClass();
const WorkflowPage = new WorkflowPageClass();

describe('Workflows', () => {
	beforeEach(() => {
		visitWorkflowsPage();
	});

	it('should ask to save unsaved changes before leaving route', () => {
		WorkflowsPage.getters.newWorkflowButtonCard().should('be.visible');
		WorkflowsPage.getters.newWorkflowButtonCard().click();

		cy.createFixtureWorkflow('Test_workflow_1.json', 'Empty State Card Workflow');

		WorkflowPage.actions.addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME);

		getHomeButton().click();

		getSaveChangesModal().should('be.visible');
	});

	it('should correct route after cancelling saveChangesModal', () => {
		getCreateWorkflowButton().click();

		cy.createFixtureWorkflow('Test_workflow_1.json', 'Empty State Card Workflow');
		WorkflowPage.actions.addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME);

		// Here we go back via browser rather than the home button
		// As this already updates the route
		cy.go(-1);

		cy.url().should('include', getWorkflowsPageUrl());

		getSaveChangesModal().should('be.visible');
		getCloseSaveChangesButton().click();

		// Confirm the url is back to the workflow
		cy.url().should('include', '/workflow/');
	});
});
