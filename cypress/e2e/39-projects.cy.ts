import {
	INSTANCE_MEMBERS,
	INSTANCE_OWNER,
	MANUAL_TRIGGER_NODE_NAME,
	NOTION_NODE_NAME,
} from '../constants';
import {
	WorkflowsPage,
	WorkflowPage,
	CredentialsModal,
	CredentialsPage,
	WorkflowExecutionsTab,
	NDV,
} from '../pages';
import * as projects from '../composables/projects';
import { getVisibleSelect } from '../utils';

const workflowsPage = new WorkflowsPage();
const workflowPage = new WorkflowPage();
const credentialsPage = new CredentialsPage();
const credentialsModal = new CredentialsModal();
const executionsTab = new WorkflowExecutionsTab();
const ndv = new NDV();

describe('Projects', { disableAutoLogin: true }, () => {
	before(() => {
		cy.resetDatabase();
		cy.enableFeature('sharing');
		cy.enableFeature('advancedPermissions');
		cy.enableFeature('projectRole:admin');
		cy.enableFeature('projectRole:editor');
		cy.changeQuota('maxTeamProjects', -1);
	});

	it('should handle workflows and credentials and menu items', () => {
		cy.signinAsAdmin();
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
		credentialsPage.getters
			.credentialCards()
			.first()
			.find('.n8n-node-icon img')
			.should('be.visible');

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
		cy.intercept('GET', '/rest/credentials*').as('credentialsListProjectId');
		projects.getProjectTabCredentials().click();
		cy.wait('@credentialsListProjectId').then((interception) => {
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

		cy.intercept('GET', '/rest/credentials*').as('credentialsListUnfiltered');
		projects.getProjectTabCredentials().click();
		cy.wait('@credentialsListUnfiltered').then((interception) => {
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

	it('should not show project add button and projects to a member if not invited to any project', () => {
		cy.signinAsMember(1);
		cy.visit(workflowsPage.url);

		projects.getAddProjectButton().should('not.exist');
		projects.getMenuItems().should('not.exist');
	});

	describe('when starting from scratch', () => {
		beforeEach(() => {
			cy.resetDatabase();
			cy.enableFeature('sharing');
			cy.enableFeature('advancedPermissions');
			cy.enableFeature('projectRole:admin');
			cy.enableFeature('projectRole:editor');
			cy.changeQuota('maxTeamProjects', -1);
		});

		it('should filter credentials by project ID when creating new workflow or hard reloading an opened workflow', () => {
			cy.signinAsOwner();
			cy.visit(workflowsPage.url);

			// Create a project and add a credential to it
			cy.intercept('POST', '/rest/projects').as('projectCreate');
			projects.getAddProjectButton().should('contain', 'Add project').should('be.visible').click();
			cy.wait('@projectCreate');
			projects.getMenuItems().should('have.length', 1);
			projects.getMenuItems().first().click();
			projects.getProjectTabCredentials().click();
			credentialsPage.getters.credentialCards().should('not.have.length');

			credentialsPage.getters.emptyListCreateCredentialButton().click();
			credentialsModal.getters.newCredentialModal().should('be.visible');
			credentialsModal.getters.newCredentialTypeSelect().should('be.visible');
			credentialsModal.getters.newCredentialTypeOption('Notion API').click();
			credentialsModal.getters.newCredentialTypeButton().click();
			credentialsModal.getters
				.connectionParameter('Internal Integration Secret')
				.type('1234567890');
			credentialsModal.actions.setName('Notion account project 1');

			cy.intercept('POST', '/rest/credentials').as('credentialSave');
			credentialsModal.actions.save();
			cy.wait('@credentialSave').then((interception) => {
				expect(interception.request.body).to.have.property('projectId');
			});
			credentialsModal.actions.close();

			// Create another project and add a credential to it
			projects.getAddProjectButton().click();
			cy.wait('@projectCreate');
			projects.getMenuItems().should('have.length', 2);
			projects.getMenuItems().last().click();
			projects.getProjectTabCredentials().click();
			credentialsPage.getters.credentialCards().should('not.have.length');

			credentialsPage.getters.emptyListCreateCredentialButton().click();
			credentialsModal.getters.newCredentialModal().should('be.visible');
			credentialsModal.getters.newCredentialTypeSelect().should('be.visible');
			credentialsModal.getters.newCredentialTypeOption('Notion API').click();
			credentialsModal.getters.newCredentialTypeButton().click();
			credentialsModal.getters
				.connectionParameter('Internal Integration Secret')
				.type('1234567890');
			credentialsModal.actions.setName('Notion account project 2');

			credentialsModal.actions.save();
			cy.wait('@credentialSave').then((interception) => {
				expect(interception.request.body).to.have.property('projectId');
			});
			credentialsModal.actions.close();

			// Create a credential in Home project
			projects.getHomeButton().click();
			projects.getProjectTabCredentials().click();

			credentialsPage.getters.credentialCards().should('have.length', 2);

			credentialsPage.getters.createCredentialButton().click();
			credentialsModal.getters.newCredentialModal().should('be.visible');
			credentialsModal.getters.newCredentialTypeSelect().should('be.visible');
			credentialsModal.getters.newCredentialTypeOption('Notion API').click();
			credentialsModal.getters.newCredentialTypeButton().click();
			credentialsModal.getters
				.connectionParameter('Internal Integration Secret')
				.type('1234567890');
			credentialsModal.actions.setName('Notion account personal project');

			cy.intercept('POST', '/rest/credentials').as('credentialSave');
			credentialsModal.actions.save();
			cy.wait('@credentialSave');
			credentialsModal.actions.close();

			// Go to the first project and create a workflow
			projects.getMenuItems().first().click();
			workflowsPage.getters.workflowCards().should('not.have.length');

			cy.intercept('GET', '/rest/credentials/for-workflow*').as('getCredentialsForWorkflow');
			workflowsPage.getters.newWorkflowButtonCard().click();

			cy.wait('@getCredentialsForWorkflow').then((interception) => {
				expect(interception.request.query).to.have.property('projectId');
				expect(interception.request.query).not.to.have.property('workflowId');
			});

			workflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
			workflowPage.actions.addNodeToCanvas(NOTION_NODE_NAME, true, true);
			workflowPage.getters.nodeCredentialsSelect().first().click();
			getVisibleSelect()
				.find('li')
				.should('have.length', 2)
				.first()
				.should('contain.text', 'Notion account project 1');
			ndv.getters.backToCanvas().click();
			workflowPage.actions.saveWorkflowOnButtonClick();

			cy.reload();
			cy.wait('@getCredentialsForWorkflow').then((interception) => {
				expect(interception.request.query).not.to.have.property('projectId');
				expect(interception.request.query).to.have.property('workflowId');
			});
			workflowPage.getters.canvasNodeByName(NOTION_NODE_NAME).should('be.visible').dblclick();
			workflowPage.getters.nodeCredentialsSelect().first().click();
			getVisibleSelect()
				.find('li')
				.should('have.length', 2)
				.first()
				.should('contain.text', 'Notion account project 1');
			ndv.getters.backToCanvas().click();

			// Go to the second project and create a workflow
			projects.getMenuItems().last().click();
			workflowsPage.getters.workflowCards().should('not.have.length');
			workflowsPage.getters.newWorkflowButtonCard().click();
			workflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
			workflowPage.actions.addNodeToCanvas(NOTION_NODE_NAME, true, true);
			workflowPage.getters.nodeCredentialsSelect().first().click();
			getVisibleSelect()
				.find('li')
				.should('have.length', 2)
				.first()
				.should('contain.text', 'Notion account project 2');
			ndv.getters.backToCanvas().click();
			workflowPage.actions.saveWorkflowOnButtonClick();

			cy.reload();
			workflowPage.getters.canvasNodeByName(NOTION_NODE_NAME).should('be.visible').dblclick();
			workflowPage.getters.nodeCredentialsSelect().first().click();
			getVisibleSelect()
				.find('li')
				.should('have.length', 2)
				.first()
				.should('contain.text', 'Notion account project 2');
			ndv.getters.backToCanvas().click();

			// Go to the Home project and create a workflow
			projects.getHomeButton().click();
			projects.getProjectTabCredentials().click();
			credentialsPage.getters.credentialCards().should('have.length', 3);

			projects.getProjectTabWorkflows().click();
			workflowsPage.getters.workflowCards().should('have.length', 2);
			workflowsPage.getters.createWorkflowButton().click();
			workflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
			workflowPage.actions.addNodeToCanvas(NOTION_NODE_NAME, true, true);
			workflowPage.getters.nodeCredentialsSelect().first().click();
			getVisibleSelect()
				.find('li')
				.should('have.length', 2)
				.first()
				.should('contain.text', 'Notion account personal project');
			ndv.getters.backToCanvas().click();
			workflowPage.actions.saveWorkflowOnButtonClick();

			cy.reload();
			workflowPage.getters.canvasNodeByName(NOTION_NODE_NAME).should('be.visible').dblclick();
			workflowPage.getters.nodeCredentialsSelect().first().click();
			getVisibleSelect()
				.find('li')
				.should('have.length', 2)
				.first()
				.should('contain.text', 'Notion account personal project');
		});

		it('should move resources between projects', () => {
			cy.signin(INSTANCE_OWNER);
			cy.visit(workflowsPage.url);

			// Create a workflow and a credential in the Home project
			workflowsPage.getters.workflowCards().should('not.have.length');
			workflowsPage.getters.newWorkflowButtonCard().click();
			projects.createWorkflow('Test_workflow_1.json', 'Workflow in Home project');

			projects.getHomeButton().click();
			projects.getProjectTabCredentials().should('be.visible').click();
			credentialsPage.getters.emptyListCreateCredentialButton().click();
			projects.createCredential('Credential in Home project');

			// Create a project and add a credential and a workflow to it
			projects.createProject('Project 1');
			projects.getProjectTabCredentials().click();
			credentialsPage.getters.emptyListCreateCredentialButton().click();
			projects.createCredential('Credential in Project 1');

			projects.getProjectTabWorkflows().click();
			workflowsPage.getters.newWorkflowButtonCard().click();
			projects.createWorkflow('Test_workflow_1.json', 'Workflow in Project 1');

			// Create another project and add a credential and a workflow to it
			projects.createProject('Project 2');
			projects.getProjectTabCredentials().click();
			credentialsPage.getters.emptyListCreateCredentialButton().click();
			projects.createCredential('Credential in Project 2');

			projects.getProjectTabWorkflows().click();
			workflowsPage.getters.newWorkflowButtonCard().click();
			projects.createWorkflow('Test_workflow_1.json', 'Workflow in Project 2');

			// Move the workflow owned by me from Home to Project 1
			projects.getHomeButton().click();
			workflowsPage.getters
				.workflowCards()
				.should('have.length', 3)
				.filter(':contains("Owned by me")')
				.should('exist');
			workflowsPage.getters.workflowCardActions('Workflow in Home project').click();
			workflowsPage.getters.workflowMoveButton().click();

			projects
				.getResourceMoveModal()
				.should('be.visible')
				.find('button:contains("Next")')
				.should('be.disabled');
			projects.getProjectMoveSelect().click();
			getVisibleSelect()
				.find('li')
				.should('have.length', 2)
				.first()
				.should('contain.text', 'Project 1')
				.click();
			projects.getResourceMoveModal().find('button:contains("Next")').click();

			projects
				.getResourceMoveConfirmModal()
				.should('be.visible')
				.find('button:contains("Confirm")')
				.should('be.disabled');

			projects
				.getResourceMoveConfirmModal()
				.find('input[type="checkbox"]')
				.first()
				.parents('label')
				.click();
			projects
				.getResourceMoveConfirmModal()
				.find('button:contains("Confirm")')
				.should('be.disabled');
			projects
				.getResourceMoveConfirmModal()
				.find('input[type="checkbox"]')
				.last()
				.parents('label')
				.click();
			projects
				.getResourceMoveConfirmModal()
				.find('button:contains("Confirm")')
				.should('not.be.disabled')
				.click();

			workflowsPage.getters
				.workflowCards()
				.should('have.length', 3)
				.filter(':contains("Owned by me")')
				.should('not.exist');

			// Move the credential from Project 1 to Project 2
			projects.getMenuItems().first().click();
			workflowsPage.getters.workflowCards().should('have.length', 2);
			projects.getProjectTabCredentials().click();
			credentialsPage.getters.credentialCards().should('have.length', 1);
			credentialsPage.getters.credentialCardActions('Credential in Project 1').click();
			credentialsPage.getters.credentialMoveButton().click();

			projects
				.getResourceMoveModal()
				.should('be.visible')
				.find('button:contains("Next")')
				.should('be.disabled');
			projects.getProjectMoveSelect().click();
			getVisibleSelect()
				.find('li')
				.should('have.length', 1)
				.first()
				.should('contain.text', 'Project 2')
				.click();
			projects.getResourceMoveModal().find('button:contains("Next")').click();

			projects
				.getResourceMoveConfirmModal()
				.should('be.visible')
				.find('button:contains("Confirm")')
				.should('be.disabled');

			projects
				.getResourceMoveConfirmModal()
				.find('input[type="checkbox"]')
				.first()
				.parents('label')
				.click();
			projects
				.getResourceMoveConfirmModal()
				.find('button:contains("Confirm")')
				.should('be.disabled');
			projects
				.getResourceMoveConfirmModal()
				.find('input[type="checkbox"]')
				.last()
				.parents('label')
				.click();
			projects
				.getResourceMoveConfirmModal()
				.find('button:contains("Confirm")')
				.should('not.be.disabled')
				.click();
			credentialsPage.getters.credentialCards().should('not.have.length');
			projects.getMenuItems().last().click();
			projects.getProjectTabCredentials().click();
			credentialsPage.getters.credentialCards().should('have.length', 2);
		});
	});
});
