import {
	getCancelSaveChangesButton,
	getCloseSaveChangesButton,
	getSaveChangesModal,
} from '../composables/modals/save-changes-modal';
import { getNdvContainer } from '../composables/ndv';
import { getHomeButton } from '../composables/projects';
import { addNodeToCanvas, saveWorkflowOnButtonClick } from '../composables/workflow';
import {
	getCreateWorkflowButton,
	getNewWorkflowCardButton,
	getWorkflowsPageUrl,
	visitWorkflowsPage,
} from '../composables/workflowsPage';
import { EDIT_FIELDS_SET_NODE_NAME } from '../constants';
import { warningToast } from '../pages/notifications';

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
		addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME, true, true);

		// Here we go back via browser rather than the home button
		// As this already updates the route
		cy.go(-1);

		cy.url().should('include', getWorkflowsPageUrl());

		getSaveChangesModal().should('be.visible');
		getCloseSaveChangesButton().click();

		// Confirm the url is back to the workflow
		cy.url().should('include', '/workflow/');
	});

	it('should correct route when opening and closing NDV', () => {
		getCreateWorkflowButton().click();
		saveWorkflowOnButtonClick();
		cy.url().then((startUrl) => {
			cy.createFixtureWorkflow('Test_workflow_1.json', 'Empty State Card Workflow');
			cy.url().should('equal', startUrl);

			addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME, true, true);

			// Getting the generated nodeId is awkward, so we just ensure the URL changed
			cy.url().should('not.equal', startUrl);

			cy.get('body').type('{esc}');

			cy.url().should('equal', startUrl);
		});
	});

	it('should open ndv via URL', () => {
		getCreateWorkflowButton().click();
		saveWorkflowOnButtonClick();
		cy.createFixtureWorkflow('Test_workflow_1.json', 'Empty State Card Workflow');

		addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME, true, true);
		cy.url().then((ndvUrl) => {
			cy.get('body').type('{esc}');
			saveWorkflowOnButtonClick();

			getNdvContainer().should('not.be.visible');

			cy.visit(ndvUrl);

			getNdvContainer().should('be.visible');
		});
	});

	it('should open show warning and drop nodeId from URL if it contained an unknown nodeId', () => {
		getCreateWorkflowButton().click();
		saveWorkflowOnButtonClick();
		cy.createFixtureWorkflow('Test_workflow_1.json', 'Empty State Card Workflow');

		addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME, true, true);
		cy.url().then((ndvUrl) => {
			cy.get('body').type('{esc}');
			saveWorkflowOnButtonClick();

			getNdvContainer().should('not.be.visible');

			cy.visit(ndvUrl + 'thisMessesUpTheNodeId');

			warningToast().should('be.visible');
			cy.url().should('equal', ndvUrl.split('/').slice(0, -1).join('/'));
		});
	});
});
