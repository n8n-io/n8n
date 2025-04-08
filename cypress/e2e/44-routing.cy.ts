import {
	getCancelSaveChangesButton,
	getCloseSaveChangesButton,
	getSaveChangesModal,
} from '../composables/modals/save-changes-modal';
import { getHomeButton } from '../composables/projects';
import { addNodeToCanvas } from '../composables/workflow';
import {
	getCreateWorkflowButton,
	getNewWorkflowCardButton,
	getWorkflowsPageUrl,
	visitWorkflowsPage,
} from '../composables/workflowsPage';
import { EDIT_FIELDS_SET_NODE_NAME } from '../constants';

describe('Workflows', () => {
	beforeEach(() => {
		visitWorkflowsPage();
	});

	it('should ask to save unsaved changes before leaving route', () => {
		getNewWorkflowCardButton().should('be.visible');
		getNewWorkflowCardButton().click();

		cy.createFixtureWorkflow('Test_workflow_1.json', 'Empty State Card Workflow');

		addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME);

		getHomeButton().click();

		// We expect to still be on the workflow route here
		cy.url().should('include', '/workflow/');

		getSaveChangesModal().should('be.visible');
		getCancelSaveChangesButton().click();

		// Only now do we switch
		cy.url().should('include', getWorkflowsPageUrl());
	});

	it('should correct route after cancelling saveChangesModal', () => {
		getCreateWorkflowButton().click();

		cy.createFixtureWorkflow('Test_workflow_1.json', 'Empty State Card Workflow');
		addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME);

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
