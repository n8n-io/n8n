import { INSTANCE_ADMIN, INSTANCE_MEMBERS } from '../constants';
import {
	WorkflowsPage,
	WorkflowPage,
	CredentialsModal,
	CredentialsPage,
	WorkflowExecutionsTab,
} from '../pages';
import * as projects from '../composables/projects';

const workflowsPage = new WorkflowsPage();
const workflowPage = new WorkflowPage();
const credentialsPage = new CredentialsPage();
const credentialsModal = new CredentialsModal();
const executionsTab = new WorkflowExecutionsTab();

describe('Projects', () => {
	beforeEach(() => {
		cy.resetDatabase();
		cy.enableFeature('sharing');
		cy.enableFeature('advancedPermissions');
		cy.enableFeature('projectRole:admin');
		cy.enableFeature('projectRole:editor');
		cy.changeQuota('maxTeamProjects', -1);
	});

	it('should handle workflows and credentials and menu items', () => {
		cy.signin(INSTANCE_ADMIN);
		cy.visit(workflowsPage.url);
		workflowsPage.getters.workflowCards().should('not.have.length');

		workflowsPage.getters.newWorkflowButtonCard().click();

		cy.intercept('POST', '/rest/workflows').as('workflowSave');
		workflowPage.actions.saveWorkflowOnButtonClick();

		cy.wait('@workflowSave').then((interception) => {
			expect(interception.request.body).not.to.have.property('projectId');
		});

		projects.getHomeButton().click();
		projects.getProjectTabs().should('have.length', 2);

		projects.getProjectTabCredentials().click();
		credentialsPage.getters.credentialCards().should('not.have.length');

		credentialsPage.getters.emptyListCreateCredentialButton().click();
		credentialsModal.getters.newCredentialModal().should('be.visible');
		credentialsModal.getters.newCredentialTypeSelect().should('be.visible');
		credentialsModal.getters.newCredentialTypeOption('Notion API').click();
		credentialsModal.getters.newCredentialTypeButton().click();
		credentialsModal.getters.connectionParameter('Internal Integration Secret').type('1234567890');
		credentialsModal.actions.setName('My awesome Notion account');

		cy.intercept('POST', '/rest/credentials').as('credentialSave');
		credentialsModal.actions.save();
		cy.wait('@credentialSave').then((interception) => {
			expect(interception.request.body).not.to.have.property('projectId');
		});

		credentialsModal.actions.close();
		credentialsPage.getters.credentialCards().should('have.length', 1);

		projects.getProjectTabWorkflows().click();
		workflowsPage.getters.workflowCards().should('have.length', 1);

		projects.getMenuItems().should('not.have.length');

		cy.intercept('POST', '/rest/projects').as('projectCreate');
		projects.getAddProjectButton().click();
		cy.wait('@projectCreate');
		projects.getMenuItems().should('have.length', 1);
		projects.getProjectTabs().should('have.length', 3);

		cy.get('input[name="name"]').type('Development');
		projects.addProjectMember(INSTANCE_MEMBERS[0].email);

		cy.intercept('PATCH', '/rest/projects/*').as('projectSettingsSave');
		projects.getProjectSettingsSaveButton().click();
		cy.wait('@projectSettingsSave').then((interception) => {
			expect(interception.request.body).to.have.property('name').and.to.equal('Development');
			expect(interception.request.body).to.have.property('relations').to.have.lengthOf(2);
		});

		projects.getMenuItems().first().click();
		workflowsPage.getters.workflowCards().should('not.have.length');
		projects.getProjectTabs().should('have.length', 3);

		workflowsPage.getters.newWorkflowButtonCard().click();

		cy.intercept('POST', '/rest/workflows').as('workflowSave');
		workflowPage.actions.saveWorkflowOnButtonClick();

		cy.wait('@workflowSave').then((interception) => {
			expect(interception.request.body).to.have.property('projectId');
		});

		projects.getMenuItems().first().click();

		projects.getProjectTabCredentials().click();
		credentialsPage.getters.credentialCards().should('not.have.length');

		credentialsPage.getters.emptyListCreateCredentialButton().click();
		credentialsModal.getters.newCredentialModal().should('be.visible');
		credentialsModal.getters.newCredentialTypeSelect().should('be.visible');
		credentialsModal.getters.newCredentialTypeOption('Notion API').click();
		credentialsModal.getters.newCredentialTypeButton().click();
		credentialsModal.getters.connectionParameter('Internal Integration Secret').type('1234567890');
		credentialsModal.actions.setName('My awesome Notion account');

		cy.intercept('POST', '/rest/credentials').as('credentialSave');
		credentialsModal.actions.save();
		cy.wait('@credentialSave').then((interception) => {
			expect(interception.request.body).to.have.property('projectId');
		});
		credentialsModal.actions.close();

		projects.getAddProjectButton().click();
		projects.getMenuItems().should('have.length', 2);

		let projectId: string;
		projects.getMenuItems().first().click();
		cy.intercept('GET', '/rest/credentials*').as('credentialsList');
		projects.getProjectTabCredentials().click();
		cy.wait('@credentialsList').then((interception) => {
			const url = new URL(interception.request.url);
			const queryParams = new URLSearchParams(url.search);
			const filter = queryParams.get('filter');
			expect(filter).to.be.a('string').and.to.contain('projectId');

			if (filter) {
				projectId = JSON.parse(filter).projectId;
			}
		});

		projects.getMenuItems().last().click();
		cy.intercept('GET', '/rest/credentials*').as('credentialsList');
		projects.getProjectTabCredentials().click();
		cy.wait('@credentialsList').then((interception) => {
			const url = new URL(interception.request.url);
			const queryParams = new URLSearchParams(url.search);
			const filter = queryParams.get('filter');
			expect(filter).to.be.a('string').and.to.contain('projectId');

			if (filter) {
				expect(JSON.parse(filter).projectId).not.to.equal(projectId);
			}
		});

		projects.getHomeButton().click();
		workflowsPage.getters.workflowCards().should('have.length', 2);

		cy.intercept('GET', '/rest/credentials*').as('credentialsList');
		projects.getProjectTabCredentials().click();
		cy.wait('@credentialsList').then((interception) => {
			expect(interception.request.url).not.to.contain('filter');
		});

		let menuItems = cy.getByTestId('menu-item');

		menuItems.filter('[class*=active_]').should('have.length', 1);
		menuItems.filter(':contains("Home")[class*=active_]').should('exist');

		projects.getMenuItems().first().click();

		menuItems = cy.getByTestId('menu-item');

		menuItems.filter('[class*=active_]').should('have.length', 1);
		menuItems.filter(':contains("Development")[class*=active_]').should('exist');

		cy.intercept('GET', '/rest/workflows/*').as('loadWorkflow');
		workflowsPage.getters.workflowCards().first().click();

		cy.wait('@loadWorkflow');
		menuItems = cy.getByTestId('menu-item');

		menuItems.filter('[class*=active_]').should('have.length', 1);
		menuItems.filter(':contains("Development")[class*=active_]').should('exist');

		cy.intercept('GET', '/rest/executions*').as('loadExecutions');
		executionsTab.actions.switchToExecutionsTab();

		cy.wait('@loadExecutions');
		menuItems = cy.getByTestId('menu-item');

		menuItems.filter('[class*=active_]').should('have.length', 1);
		menuItems.filter(':contains("Development")[class*=active_]').should('exist');

		executionsTab.actions.switchToEditorTab();

		menuItems = cy.getByTestId('menu-item');

		menuItems.filter('[class*=active_]').should('have.length', 1);
		menuItems.filter(':contains("Development")[class*=active_]').should('exist');

		cy.getByTestId('menu-item').filter(':contains("Variables")').click();
		cy.getByTestId('unavailable-resources-list').should('be.visible');

		menuItems = cy.getByTestId('menu-item');

		menuItems.filter('[class*=active_]').should('have.length', 1);
		menuItems.filter(':contains("Variables")[class*=active_]').should('exist');

		projects.getHomeButton().click();
		menuItems = cy.getByTestId('menu-item');

		menuItems.filter('[class*=active_]').should('have.length', 1);
		menuItems.filter(':contains("Home")[class*=active_]').should('exist');

		workflowsPage.getters.workflowCards().should('have.length', 2).first().click();

		cy.wait('@loadWorkflow');
		cy.getByTestId('execute-workflow-button').should('be.visible');

		menuItems = cy.getByTestId('menu-item');
		menuItems.filter(':contains("Home")[class*=active_]').should('not.exist');

		menuItems = cy.getByTestId('menu-item');
		menuItems.filter('[class*=active_]').should('have.length', 1);
		menuItems.filter(':contains("Development")[class*=active_]').should('exist');
	});
});
