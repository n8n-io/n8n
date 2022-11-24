import { SettingsUsersPage, WorkflowsPage } from '../pages';

import { MainSidebar } from "../pages/sidebar";

const mainSidebar = new MainSidebar();

const workflowsPage = new WorkflowsPage();
// const workflowPage = new WorkflowPage();

// const credentialsPage = new CredentialsPage();
// const credentialsModal = new CredentialsModal();

const settingsUsersPage = new SettingsUsersPage();

describe('Default owner', () => {
	// todo test should redirect to setup if have not skipped

	it('should be able to use n8n without user management', () => {
		describe('should skip owner setup', () => {
			cy.skipSetup();
			cy.url().should('include', workflowsPage.url);
		});

		// todo blocked by db reseting

		// describe('should be able to create workflows', () => {
		// 	WorkflowsPage.getters.newWorkflowButtonCard().should('be.visible');
		// 	WorkflowsPage.getters.newWorkflowButtonCard().click();

		// 	cy.createFixtureWorkflow('Test_workflow_1.json', `Test workflow`);

		// 	// reload page, ensure owner still has access
		// 	cy.reload();

		// 	WorkflowPage.getters.workflowNameInput().should('contain.value', 'Test workflow');
		// });

		// describe('should be able to add new credentials', () => {
		// 	cy.visit(credentialsPage.url);

		// 	credentialsPage.getters.emptyListCreateCredentialButton().click();

		// 	credentialsModal.getters.newCredentialModal().should('be.visible');
		// 	credentialsModal.getters.newCredentialTypeSelect().should('be.visible');
		// 	credentialsModal.getters.newCredentialTypeOption('Notion API').click();

		// 	credentialsModal.getters.newCredentialTypeButton().click();

		// 	credentialsModal.getters.connectionParameter('API Key').type('1234567890');

		// 	credentialsModal.actions.setName('My awesome Notion account');
		// 	credentialsModal.actions.save();

		// 	credentialsModal.actions.close();

		// 	credentialsModal.getters.newCredentialModal().should('not.exist');
		// 	credentialsModal.getters.editCredentialModal().should('not.exist');

		// 	credentialsPage.getters.credentialCards().should('have.length', 1);
		// });

		// todo test for setting up UM again through settings
		// todo test that workflows migrated successfully

		describe('should be able to setup UM from settings', () => {
			mainSidebar.actions.goToSettings();
			cy.url().should('include', settingsUsersPage.url);
		});
	});
});

