import { randFirstName, randLastName } from '@ngneat/falso';
import { DEFAULT_USER_EMAIL, DEFAULT_USER_PASSWORD } from '../constants';
import { SettingsUsersPage, SignupPage, WorkflowsPage, WorkflowPage, CredentialsPage, CredentialsModal, MessageBox } from '../pages';

import { MainSidebar, SettingsSidebar } from "../pages/sidebar";

const mainSidebar = new MainSidebar();
const settingsSidebar = new SettingsSidebar();

const workflowsPage = new WorkflowsPage();
const signupPage = new SignupPage();
const workflowPage = new WorkflowPage();

const credentialsPage = new CredentialsPage();
const credentialsModal = new CredentialsModal();

const settingsUsersPage = new SettingsUsersPage();

const messageBox = new MessageBox();

const email = DEFAULT_USER_EMAIL;
const password = DEFAULT_USER_PASSWORD;
const firstName = randFirstName();
const lastName = randLastName();

describe('Default owner', () => {
	before(() => {
		cy.resetAll();
	});
	beforeEach(() => {
		cy.visit('/');
	})

	it('should skip owner setup', () => {
		cy.skipSetup();
	});

	it('should be able to create workflows', () => {
		workflowsPage.getters.newWorkflowButtonCard().should('be.visible');
		workflowsPage.getters.newWorkflowButtonCard().click();

		cy.createFixtureWorkflow('Test_workflow_1.json', `Test workflow`);

		// reload page, ensure owner still has access
		cy.reload();

		workflowPage.getters.workflowNameInput().should('contain.value', 'Test workflow');
	});

	it('should be able to add new credentials', () => {
		cy.visit(credentialsPage.url);

		credentialsPage.getters.emptyListCreateCredentialButton().click();

		credentialsModal.getters.newCredentialModal().should('be.visible');
		credentialsModal.getters.newCredentialTypeSelect().should('be.visible');
		credentialsModal.getters.newCredentialTypeOption('Notion API').click();

		credentialsModal.getters.newCredentialTypeButton().click();

		credentialsModal.getters.connectionParameter('API Key').type('1234567890');

		credentialsModal.actions.setName('My awesome Notion account');
		credentialsModal.actions.save();

		credentialsModal.actions.close();

		credentialsModal.getters.newCredentialModal().should('not.exist');
		credentialsModal.getters.editCredentialModal().should('not.exist');

		credentialsPage.getters.credentialCards().should('have.length', 1);
	});

	it('should be able to setup UM from settings', () => {
		mainSidebar.getters.settings().should('be.visible');
		mainSidebar.actions.goToSettings();
		cy.url().should('include', settingsUsersPage.url);

		settingsUsersPage.actions.goToOwnerSetup();

		cy.url().should('include', signupPage.url);
	});

	it('should be able to setup instance and migrate workflows and credentials', () => {
		cy.setup({ email, firstName, lastName, password });

		messageBox.getters.content().should('contain.text', '1 existing workflow and 1 credential')

		messageBox.actions.confirm();
		cy.url().should('include', settingsUsersPage.url);
		settingsSidebar.actions.back();

		cy.url().should('include', workflowsPage.url);

		workflowsPage.getters.workflowCards().should('have.length', 1);
	});

	it('can click back to main menu and have migrated credential after setup', () => {
		cy.signin({ email, password });
		cy.visit(workflowsPage.url);

		mainSidebar.actions.goToCredentials();

		cy.url().should('include', credentialsPage.url);

		credentialsPage.getters.credentialCards().should('have.length', 1);
	});
});

