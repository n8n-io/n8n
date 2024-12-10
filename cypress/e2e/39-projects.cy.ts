import * as projects from '../composables/projects';
import {
	INSTANCE_ADMIN,
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
	MainSidebar,
} from '../pages';
import { clearNotifications } from '../pages/notifications';
import { getVisibleDropdown, getVisibleModalOverlay, getVisibleSelect } from '../utils';

const workflowsPage = new WorkflowsPage();
const workflowPage = new WorkflowPage();
const credentialsPage = new CredentialsPage();
const credentialsModal = new CredentialsModal();
const executionsTab = new WorkflowExecutionsTab();
const ndv = new NDV();
const mainSidebar = new MainSidebar();

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
		projects.getProjectTabs().should('have.length', 3);

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
		projects.getProjectTabs().should('have.length', 4);

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
		menuItems.filter(':contains("Overview")[class*=active_]').should('exist');

		projects.getMenuItems().first().click();

		menuItems = cy.getByTestId('menu-item');

		menuItems.filter('[class*=active_]').should('have.length', 1);
		menuItems.filter(':contains("Development")[class*=active_]').should('exist');

		cy.intercept('GET', '/rest/workflows/*').as('loadWorkflow');
		workflowsPage.getters.workflowCards().first().findChildByTestId('card-content').click();

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
		menuItems.filter(':contains("Overview")[class*=active_]').should('exist');

		workflowsPage.getters.workflowCards().should('have.length', 2).first().click();

		cy.wait('@loadWorkflow');
		cy.getByTestId('execute-workflow-button').should('be.visible');

		menuItems = cy.getByTestId('menu-item');
		menuItems.filter(':contains("Overview")[class*=active_]').should('not.exist');

		menuItems = cy.getByTestId('menu-item');
		menuItems.filter('[class*=active_]').should('have.length', 1);
		menuItems.filter(':contains("Development")[class*=active_]').should('exist');
	});

	it('should not show project add button and projects to a member if not invited to any project', () => {
		cy.signinAsMember(1);
		cy.visit(workflowsPage.url);

		cy.getByTestId('add-project-menu-item').should('not.exist');
		projects.getMenuItems().should('not.exist');
	});

	it('should not show viewer role if not licensed', () => {
		cy.signinAsOwner();
		cy.visit(workflowsPage.url);

		projects.getMenuItems().first().click();
		projects.getProjectTabSettings().click();

		cy.get(
			`[data-test-id="user-list-item-${INSTANCE_MEMBERS[0].email}"] [data-test-id="projects-settings-user-role-select"]`,
		).click();

		cy.get('.el-select-dropdown__item.is-disabled')
			.should('contain.text', 'Viewer')
			.get('span:contains("Upgrade")')
			.filter(':visible')
			.click();

		getVisibleModalOverlay().should('contain.text', 'Upgrade to unlock additional roles');
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
			projects.getAddProjectButton().click();
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
			cy.signinAsOwner();
			cy.visit(workflowsPage.url);

			// Create a workflow and a credential in the Home project
			workflowsPage.getters.workflowCards().should('not.have.length');
			workflowsPage.getters.newWorkflowButtonCard().click();
			projects.createWorkflow('Test_workflow_1.json', 'Workflow in Home project');
			clearNotifications();

			projects.getHomeButton().click();
			projects.getProjectTabCredentials().should('be.visible').click();
			credentialsPage.getters.emptyListCreateCredentialButton().click();
			projects.createCredential('Credential in Home project');

			clearNotifications();

			// Create a project and add a credential and a workflow to it
			projects.createProject('Project 1');
			clearNotifications();
			projects.getProjectTabCredentials().click();
			credentialsPage.getters.emptyListCreateCredentialButton().click();
			projects.createCredential('Credential in Project 1');
			clearNotifications();

			projects.getProjectTabWorkflows().click();
			workflowsPage.getters.newWorkflowButtonCard().click();
			projects.createWorkflow('Test_workflow_1.json', 'Workflow in Project 1');

			clearNotifications();

			// Create another project and add a credential and a workflow to it
			projects.createProject('Project 2');
			clearNotifications();
			projects.getProjectTabCredentials().click();
			credentialsPage.getters.emptyListCreateCredentialButton().click();
			projects.createCredential('Credential in Project 2');
			clearNotifications();

			projects.getProjectTabWorkflows().click();
			workflowsPage.getters.newWorkflowButtonCard().click();
			projects.createWorkflow('Test_workflow_1.json', 'Workflow in Project 2');
			clearNotifications();

			// Move the workflow Personal from Home to Project 1
			projects.getHomeButton().click();
			workflowsPage.getters
				.workflowCards()
				.should('have.length', 3)
				.filter(':contains("Personal")')
				.should('exist');
			workflowsPage.getters.workflowCardActions('Workflow in Home project').click();
			workflowsPage.getters.workflowMoveButton().click();

			projects
				.getResourceMoveModal()
				.should('be.visible')
				.find('button:contains("Move workflow")')
				.should('be.disabled');
			projects.getProjectMoveSelect().click();
			getVisibleSelect()
				.find('li')
				.should('have.length', 5)
				.filter(':contains("Project 1")')
				.click();
			projects.getResourceMoveModal().find('button:contains("Move workflow")').click();
			clearNotifications();

			workflowsPage.getters
				.workflowCards()
				.should('have.length', 3)
				.filter(':contains("Personal")')
				.should('not.exist');

			// Move the workflow from Project 1 to Project 2
			projects.getMenuItems().first().click();
			workflowsPage.getters.workflowCards().should('have.length', 2);
			workflowsPage.getters.workflowCardActions('Workflow in Home project').click();
			workflowsPage.getters.workflowMoveButton().click();

			projects
				.getResourceMoveModal()
				.should('be.visible')
				.find('button:contains("Move workflow")')
				.should('be.disabled');
			projects.getProjectMoveSelect().click();
			getVisibleSelect()
				.find('li')
				.should('have.length', 5)
				.filter(':contains("Project 2")')
				.click();
			projects.getResourceMoveModal().find('button:contains("Move workflow")').click();

			// Move the workflow from Project 2 to a member user
			projects.getMenuItems().last().click();
			workflowsPage.getters.workflowCards().should('have.length', 2);
			workflowsPage.getters.workflowCardActions('Workflow in Home project').click();
			workflowsPage.getters.workflowMoveButton().click();
			clearNotifications();

			projects
				.getResourceMoveModal()
				.should('be.visible')
				.find('button:contains("Move workflow")')
				.should('be.disabled');
			projects.getProjectMoveSelect().click();
			getVisibleSelect()
				.find('li')
				.should('have.length', 5)
				.filter(`:contains("${INSTANCE_MEMBERS[0].email}")`)
				.click();

			projects.getResourceMoveModal().find('button:contains("Move workflow")').click();
			workflowsPage.getters.workflowCards().should('have.length', 1);

			// Move the workflow from member user back to Home
			projects.getHomeButton().click();
			workflowsPage.getters
				.workflowCards()
				.should('have.length', 3)
				.filter(':has(.n8n-badge:contains("Project"))')
				.should('have.length', 2);
			workflowsPage.getters.workflowCardActions('Workflow in Home project').click();
			workflowsPage.getters.workflowMoveButton().click();

			projects
				.getResourceMoveModal()
				.should('be.visible')
				.find('button:contains("Move workflow")')
				.should('be.disabled');
			projects.getProjectMoveSelect().click();
			getVisibleSelect()
				.find('li')
				.should('have.length', 5)
				.filter(`:contains("${INSTANCE_OWNER.email}")`)
				.click();

			projects.getResourceMoveModal().find('button:contains("Move workflow")').click();
			clearNotifications();
			workflowsPage.getters
				.workflowCards()
				.should('have.length', 3)
				.filter(':contains("Personal")')
				.should('have.length', 1);

			// Move the credential from Project 1 to Project 2
			projects.getMenuItems().first().click();
			projects.getProjectTabCredentials().click();
			credentialsPage.getters.credentialCards().should('have.length', 1);
			credentialsPage.getters.credentialCardActions('Credential in Project 1').click();
			credentialsPage.getters.credentialMoveButton().click();

			projects
				.getResourceMoveModal()
				.should('be.visible')
				.find('button:contains("Move credential")')
				.should('be.disabled');
			projects.getProjectMoveSelect().click();
			getVisibleSelect()
				.find('li')
				.should('have.length', 5)
				.filter(':contains("Project 2")')
				.click();
			projects.getResourceMoveModal().find('button:contains("Move credential")').click();
			clearNotifications();
			credentialsPage.getters.credentialCards().should('not.have.length');

			// Move the credential from Project 2 to admin user
			projects.getMenuItems().last().click();
			projects.getProjectTabCredentials().click();
			credentialsPage.getters.credentialCards().should('have.length', 2);

			credentialsPage.getters.credentialCardActions('Credential in Project 1').click();
			credentialsPage.getters.credentialMoveButton().click();

			projects
				.getResourceMoveModal()
				.should('be.visible')
				.find('button:contains("Move credential")')
				.should('be.disabled');
			projects.getProjectMoveSelect().click();
			getVisibleSelect()
				.find('li')
				.should('have.length', 5)
				.filter(`:contains("${INSTANCE_ADMIN.email}")`)
				.click();
			projects.getResourceMoveModal().find('button:contains("Move credential")').click();
			credentialsPage.getters.credentialCards().should('have.length', 1);

			// Move the credential from admin user back to instance owner
			projects.getHomeButton().click();
			projects.getProjectTabCredentials().click();
			credentialsPage.getters.credentialCards().should('have.length', 3);

			credentialsPage.getters.credentialCardActions('Credential in Project 1').click();
			credentialsPage.getters.credentialMoveButton().click();

			projects
				.getResourceMoveModal()
				.should('be.visible')
				.find('button:contains("Move credential")')
				.should('be.disabled');
			projects.getProjectMoveSelect().click();
			getVisibleSelect()
				.find('li')
				.should('have.length', 5)
				.filter(`:contains("${INSTANCE_OWNER.email}")`)
				.click();
			projects.getResourceMoveModal().find('button:contains("Move credential")').click();

			clearNotifications();

			credentialsPage.getters
				.credentialCards()
				.should('have.length', 3)
				.filter(':contains("Personal")')
				.should('have.length', 2);

			// Move the credential from admin user back to its original project (Project 1)
			credentialsPage.getters.credentialCardActions('Credential in Project 1').click();
			credentialsPage.getters.credentialMoveButton().click();

			projects
				.getResourceMoveModal()
				.should('be.visible')
				.find('button:contains("Move credential")')
				.should('be.disabled');
			projects.getProjectMoveSelect().click();
			getVisibleSelect()
				.find('li')
				.should('have.length', 5)
				.filter(':contains("Project 1")')
				.click();
			projects.getResourceMoveModal().find('button:contains("Move credential")').click();

			projects.getMenuItems().first().click();
			projects.getProjectTabCredentials().click();
			credentialsPage.getters
				.credentialCards()
				.filter(':contains("Credential in Project 1")')
				.should('have.length', 1);
		});

		it('should allow to change inaccessible credential when the workflow was moved to a team project', () => {
			cy.signinAsOwner();
			cy.visit(workflowsPage.url);

			// Create a credential in the Home project
			projects.getProjectTabCredentials().should('be.visible').click();
			credentialsPage.getters.emptyListCreateCredentialButton().click();
			projects.createCredential('Credential in Home project');

			// Create a workflow in the Home project
			projects.getHomeButton().click();
			workflowsPage.getters.workflowCards().should('not.have.length');
			workflowsPage.getters.newWorkflowButtonCard().click();

			workflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
			workflowPage.actions.addNodeToCanvas(NOTION_NODE_NAME, true, true);
			ndv.getters.backToCanvas().click();
			workflowPage.actions.saveWorkflowOnButtonClick();

			// Create a project and add a user to it
			projects.createProject('Project 1');
			projects.addProjectMember(INSTANCE_MEMBERS[0].email);
			projects.getProjectSettingsSaveButton().click();

			// Move the workflow from Home to Project 1
			projects.getHomeButton().click();
			workflowsPage.getters
				.workflowCards()
				.should('have.length', 1)
				.filter(':contains("Personal")')
				.should('exist');
			workflowsPage.getters.workflowCardActions('My workflow').click();
			workflowsPage.getters.workflowMoveButton().click();

			projects
				.getResourceMoveModal()
				.should('be.visible')
				.find('button:contains("Move workflow")')
				.should('be.disabled');
			projects.getProjectMoveSelect().click();
			getVisibleSelect()
				.find('li')
				.should('have.length', 4)
				.filter(':contains("Project 1")')
				.click();
			projects.getResourceMoveModal().find('button:contains("Move workflow")').click();

			workflowsPage.getters
				.workflowCards()
				.should('have.length', 1)
				.filter(':contains("Personal")')
				.should('not.exist');

			//Log out with instance owner and log in with the member user
			mainSidebar.actions.openUserMenu();
			cy.getByTestId('user-menu-item-logout').click();

			cy.get('input[name="email"]').type(INSTANCE_MEMBERS[0].email);
			cy.get('input[name="password"]').type(INSTANCE_MEMBERS[0].password);
			cy.getByTestId('form-submit-button').click();

			// Open the moved workflow
			workflowsPage.getters.workflowCards().should('have.length', 1);
			workflowsPage.getters.workflowCards().first().findChildByTestId('card-content').click();

			// Check if the credential can be changed
			workflowPage.getters.canvasNodeByName(NOTION_NODE_NAME).should('be.visible').dblclick();
			ndv.getters.credentialInput().find('input').should('be.enabled');
		});

		it('should handle viewer role', () => {
			cy.enableFeature('projectRole:viewer');
			cy.signinAsOwner();
			cy.visit(workflowsPage.url);

			projects.createProject('Development');
			projects.addProjectMember(INSTANCE_MEMBERS[0].email, 'Viewer');
			projects.getProjectSettingsSaveButton().click();

			projects.getProjectTabWorkflows().click();
			workflowsPage.getters.newWorkflowButtonCard().click();
			projects.createWorkflow('Test_workflow_4_executions_view.json', 'WF with random error');
			executionsTab.actions.createManualExecutions(2);
			executionsTab.actions.toggleNodeEnabled('Error');
			executionsTab.actions.createManualExecutions(2);
			workflowPage.actions.saveWorkflowUsingKeyboardShortcut();

			projects.getMenuItems().first().click();
			projects.getProjectTabCredentials().click();
			credentialsPage.getters.emptyListCreateCredentialButton().click();
			projects.createCredential('Notion API');

			mainSidebar.actions.openUserMenu();
			cy.getByTestId('user-menu-item-logout').click();

			cy.get('input[name="email"]').type(INSTANCE_MEMBERS[0].email);
			cy.get('input[name="password"]').type(INSTANCE_MEMBERS[0].password);
			cy.getByTestId('form-submit-button').click();

			projects.getMenuItems().last().click();
			projects.getProjectTabExecutions().click();
			cy.getByTestId('global-execution-list-item').first().find('td:last button').click();
			getVisibleDropdown()
				.find('li')
				.filter(':contains("Retry")')
				.should('have.class', 'is-disabled');
			getVisibleDropdown()
				.find('li')
				.filter(':contains("Delete")')
				.should('have.class', 'is-disabled');

			projects.getMenuItems().first().click();
			cy.getByTestId('workflow-card-name').should('be.visible').first().click();
			workflowPage.getters.nodeViewRoot().should('be.visible');
			workflowPage.getters.executeWorkflowButton().should('not.exist');
			workflowPage.getters.nodeCreatorPlusButton().should('not.exist');
			workflowPage.getters.canvasNodes().should('have.length', 3).last().click();
			cy.get('body').type('{backspace}');
			workflowPage.getters.canvasNodes().should('have.length', 3).last().rightclick();
			getVisibleDropdown()
				.find('li')
				.should('be.visible')
				.filter(
					':contains("Open"), :contains("Copy"), :contains("Select all"), :contains("Clear selection")',
				)
				.should('not.have.class', 'is-disabled');
			cy.get('body').type('{esc}');

			executionsTab.actions.switchToExecutionsTab();
			cy.getByTestId('retry-execution-button')
				.should('be.visible')
				.find('.is-disabled')
				.should('exist');
			cy.get('button:contains("Debug")').should('be.disabled');
			cy.get('button[title="Retry execution"]').should('be.disabled');
			cy.get('button[title="Delete this execution"]').should('be.disabled');

			projects.getMenuItems().first().click();
			projects.getProjectTabCredentials().click();
			credentialsPage.getters.credentialCards().filter(':contains("Notion")').click();
			cy.getByTestId('node-credentials-config-container')
				.should('be.visible')
				.find('input')
				.should('not.have.length');
		});
	});
});
