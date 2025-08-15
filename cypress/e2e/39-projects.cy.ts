import { createResource } from '../composables/create';
import { transferWorkflow } from '../composables/folders';
import { setCredentialValues } from '../composables/modals/credential-modal';
import {
	clickCreateNewCredential,
	getNdvContainer,
	selectResourceLocatorAddResourceItem,
	clickGetBackToCanvas,
} from '../composables/ndv';
import * as projects from '../composables/projects';
import {
	EDIT_FIELDS_SET_NODE_NAME,
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
	NDV,
	MainSidebar,
} from '../pages';
import { clearNotifications, successToast } from '../pages/notifications';
import { getVisibleSelect } from '../utils';

const workflowsPage = new WorkflowsPage();
const workflowPage = new WorkflowPage();
const credentialsPage = new CredentialsPage();
const credentialsModal = new CredentialsModal();
const ndv = new NDV();
const mainSidebar = new MainSidebar();

// Migrated to Playwright
// eslint-disable-next-line n8n-local-rules/no-skipped-tests
describe.skip('Projects', { disableAutoLogin: true }, () => {
	describe('when starting from scratch', () => {
		beforeEach(() => {
			cy.resetDatabase();
			cy.enableFeature('sharing');
			cy.enableFeature('folders');
			cy.enableFeature('advancedPermissions');
			cy.enableFeature('projectRole:admin');
			cy.enableFeature('projectRole:editor');
			cy.changeQuota('maxTeamProjects', -1);
		});

		it('should not show project add button and projects to a member if not invited to any project', () => {
			cy.signinAsMember(1);
			cy.visit(workflowsPage.url);

			cy.getByTestId('add-project-menu-item').should('not.exist');
			projects.getMenuItems().should('not.exist');
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
				.should('have.length', 1)
				.first()
				.should('contain.text', 'Notion account project 1');
			ndv.getters.backToCanvas().click();
			workflowPage.actions.saveWorkflowOnButtonClick();

			cy.reload();
			cy.wait('@getCredentialsForWorkflow').then((interception) => {
				expect(interception.request.query).not.to.have.property('projectId');
				expect(interception.request.query).to.have.property('workflowId');
			});
			workflowPage.getters.canvasNodeByName('Append a block').should('be.visible').dblclick();
			workflowPage.getters.nodeCredentialsSelect().first().click();
			getVisibleSelect()
				.find('li')
				.should('have.length', 1)
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
				.should('have.length', 1)
				.first()
				.should('contain.text', 'Notion account project 2');
			ndv.getters.backToCanvas().click();
			workflowPage.actions.saveWorkflowOnButtonClick();

			cy.reload();
			workflowPage.getters.canvasNodeByName('Append a block').should('be.visible').dblclick();
			workflowPage.getters.nodeCredentialsSelect().first().click();
			getVisibleSelect()
				.find('li')
				.should('have.length', 1)
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
				.should('have.length', 1)
				.first()
				.should('contain.text', 'Notion account personal project');
			ndv.getters.backToCanvas().click();
			workflowPage.actions.saveWorkflowOnButtonClick();

			cy.reload();
			workflowPage.getters.canvasNodeByName('Append a block').should('be.visible').dblclick();
			workflowPage.getters.nodeCredentialsSelect().first().click();
			getVisibleSelect()
				.find('li')
				.should('have.length', 1)
				.first()
				.should('contain.text', 'Notion account personal project');
		});

		it('should allow changing an inaccessible credential when the workflow was moved to a team project', () => {
			cy.intercept('GET', /\/rest\/(workflows|credentials).*/).as('getResources');

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

			clearNotifications();
			projects.getProjectSettingsSaveButton().click();

			// Move the workflow from Home to Project 1
			projects.getPersonalProjectsButton().click();
			workflowsPage.getters.workflowCards().should('have.length', 1);
			workflowsPage.getters.workflowCardActions('My workflow').click();
			workflowsPage.getters.workflowMoveButton().click();

			transferWorkflow('My workflow', 'Project 1', 'No folder (project root)');

			projects.getMenuItems().filter(':contains("Project 1")').click();

			clearNotifications();
			cy.wait('@getResources');

			workflowsPage.getters
				.workflowCards()
				.should('have.length', 1)
				.filter(':contains("Personal")')
				.should('not.exist');

			//Log out with instance owner and log in with the member user
			mainSidebar.actions.openUserMenu();
			cy.getByTestId('user-menu-item-logout').click();

			cy.get('input[name="emailOrLdapLoginId"]').type(INSTANCE_MEMBERS[0].email);
			cy.get('input[name="password"]').type(INSTANCE_MEMBERS[0].password);
			cy.getByTestId('form-submit-button').click();

			// Open the moved workflow
			workflowsPage.getters.workflowCards().should('have.length', 1);
			workflowsPage.getters.workflowCards().first().findChildByTestId('card-content').click();

			// Check if the credential can be changed
			workflowPage.getters.canvasNodeByName('Append a block').should('be.visible').dblclick();
			ndv.getters.credentialInput().find('input').should('be.enabled');
		});

		it('should create sub-workflow and credential in the sub-workflow in the same project', () => {
			cy.signinAsOwner();
			cy.visit(workflowsPage.url);

			projects.createProject('Dev');
			projects.getProjectTabWorkflows().click();
			workflowsPage.getters.newWorkflowButtonCard().click();
			workflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
			workflowPage.actions.saveWorkflowOnButtonClick();
			workflowPage.actions.addNodeToCanvas('Execute Workflow', true, true);

			cy.interceptNewTab();
			selectResourceLocatorAddResourceItem('workflowId', 'Create a');

			cy.visitInterceptedTab();
			getNdvContainer().should('be.visible');
			clickGetBackToCanvas();
			workflowPage.actions.addNodeToCanvas(NOTION_NODE_NAME, true, true);
			clickCreateNewCredential();
			setCredentialValues({
				apiKey: 'abc123',
			});
			ndv.actions.close();
			workflowPage.actions.saveWorkflowOnButtonClick();

			projects.getMenuItems().last().click();
			workflowsPage.getters.workflowCards().should('have.length', 2);

			projects.getProjectTabCredentials().click();
			credentialsPage.getters.credentialCards().should('have.length', 1);
		});

		it('should create credential from workflow in the correct project after editor page refresh', () => {
			cy.signinAsOwner();
			cy.visit(workflowsPage.url);

			projects.createProject('Dev');
			projects.getProjectTabWorkflows().click();
			workflowsPage.getters.newWorkflowButtonCard().click();
			workflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
			workflowPage.actions.saveWorkflowOnButtonClick();

			cy.reload();

			workflowPage.actions.addNodeToCanvas(NOTION_NODE_NAME, true, true);
			clickCreateNewCredential();
			setCredentialValues({
				apiKey: 'abc123',
			});
			ndv.actions.close();
			workflowPage.actions.saveWorkflowOnButtonClick();

			projects.getMenuItems().last().click();
			projects.getProjectTabCredentials().click();
			credentialsPage.getters.credentialCards().should('have.length', 1);
		});

		it('should set and update project icon', () => {
			const DEFAULT_ICON = 'layers';
			const NEW_PROJECT_NAME = 'Test Project';

			cy.signinAsAdmin();
			cy.visit(workflowsPage.url);
			projects.createProject(NEW_PROJECT_NAME);
			// New project should have default icon
			projects.getIconPickerButton().find('svg').should('have.attr', 'data-icon', DEFAULT_ICON);
			// Choose another icon
			projects.getIconPickerButton().click();
			projects.getIconPickerTab('Emojis').click();
			projects.getIconPickerEmojis().first().click();
			// Project should be updated with new icon
			successToast().contains('Project icon updated successfully');
			projects.getIconPickerButton().should('contain', '😀');
			projects.getMenuItems().contains(NEW_PROJECT_NAME).should('contain', '😀');
		});

		it('should be able to create a workflow when in the workflow editor', () => {
			cy.signinAsOwner();
			workflowPage.actions.visit();
			workflowPage.actions.addInitialNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
			workflowPage.actions.addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME);
			workflowPage.actions.saveWorkflowOnButtonClick();

			cy.url().then((url) => {
				createResource('workflow', 'Personal');
				cy.get('body').click();
				workflowPage.getters.canvasNodes().should('not.have.length');
				cy.go('back');

				cy.url().should('eq', url);
				workflowPage.getters.canvasNodes().should('have.length', 2);

				createResource('workflow', 'Personal');
				cy.url().then((url) => {
					const urlObj = new URL(url);
					expect(urlObj.pathname).to.include('/workflow/new');
					workflowPage.getters.canvasNodes().should('not.have.length');
				});
			});
		});
	});

	describe('when moving resources between projects', () => {
		before(() => {
			cy.resetDatabase();
			cy.enableFeature('sharing');
			cy.enableFeature('folders');
			cy.enableFeature('advancedPermissions');
			cy.enableFeature('projectRole:admin');
			cy.enableFeature('projectRole:editor');
			cy.changeQuota('maxTeamProjects', -1);
		});

		it('should create a workflow and a credential in the Home project', () => {
			cy.intercept('GET', /\/rest\/(workflows|credentials).*/).as('getResources');
			cy.signinAsOwner();
			cy.visit(workflowsPage.url);

			cy.log('Create a workflow and a credential in the Home project');
			workflowsPage.getters.workflowCards().should('not.have.length');
			workflowsPage.getters.newWorkflowButtonCard().click();
			projects.createWorkflow('Test_workflow_1.json', 'Workflow in Home project');
			clearNotifications();

			projects.getHomeButton().click();
			projects.getProjectTabCredentials().should('be.visible').click();
			credentialsPage.getters.emptyListCreateCredentialButton().click();
			projects.createCredential('Credential in Home project');
			clearNotifications();

			cy.log('Create a project and add a credential and a workflow to it');
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

			cy.log('Create another project and add a credential and a workflow to it');
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
		});

		it('should move the workflow to expected projects', () => {
			cy.intercept('GET', /\/rest\/(workflows|credentials).*/).as('getResources');
			cy.signinAsOwner();
			cy.visit(workflowsPage.url);

			projects.getPersonalProjectsButton().click();
			workflowsPage.getters.workflowCards().should('have.length', 1);
			workflowsPage.getters.workflowCardActions('Workflow in Home project').click();
			workflowsPage.getters.workflowMoveButton().click();

			transferWorkflow('Workflow in Home project', 'Project 2', 'No folder (project root)');
			clearNotifications();

			workflowsPage.getters.workflowCards().should('have.length', 0);

			cy.log('Move the workflow from Project 1 to Project 2');
			projects.getMenuItems().first().click();
			workflowsPage.getters.workflowCards().should('have.length', 1);
			workflowsPage.getters.workflowCardActions('Workflow in Project 1').click();
			workflowsPage.getters.workflowMoveButton().click();

			transferWorkflow('Workflow in Project 1', 'Project 2', 'No folder (project root)');
			clearNotifications();

			cy.log('Move the workflow from Project 2 to a member user');
			projects.getMenuItems().last().click();
			workflowsPage.getters.workflowCards().should('have.length', 3);
			workflowsPage.getters.workflowCardActions('Workflow in Home project').click();
			workflowsPage.getters.workflowMoveButton().click();

			transferWorkflow('Workflow in Home project', INSTANCE_MEMBERS[0].email);
			clearNotifications();

			workflowsPage.getters.workflowCards().should('have.length', 2);
		});

		it('should move the credential to expected projects', () => {
			cy.intercept('GET', /\/rest\/(workflows|credentials).*/).as('getResources');
			cy.signinAsOwner();
			cy.visit(workflowsPage.url);

			projects.getMenuItems().first().click();
			projects.getProjectTabCredentials().click();
			credentialsPage.getters.credentialCards().should('have.length', 1);
			credentialsPage.getters.credentialCardActions('Credential in Project 1').click();
			credentialsPage.getters.credentialMoveButton().click();

			projects
				.getResourceMoveModal()
				.should('be.visible')
				.contains('button', 'Move credential')
				.should('be.disabled');
			projects.getProjectMoveSelect().click();
			getVisibleSelect().find('li').should('have.length', 5);
			getVisibleSelect().find('li').filter(':contains("Project 2")').click();
			projects.getResourceMoveModal().contains('button', 'Move credential').click();
			clearNotifications();
			cy.wait('@getResources');

			credentialsPage.getters.credentialCards().should('not.have.length');

			cy.log('Move the credential from Project 2 to admin user');
			projects.getMenuItems().last().click();
			projects.getProjectTabCredentials().click();
			credentialsPage.getters.credentialCards().should('have.length', 2);

			credentialsPage.getters.credentialCardActions('Credential in Project 1').click();
			credentialsPage.getters.credentialMoveButton().click();

			projects
				.getResourceMoveModal()
				.should('be.visible')
				.contains('button', 'Move credential')
				.should('be.disabled');
			projects.getProjectMoveSelect().click();
			getVisibleSelect().find('li').should('have.length', 5);
			getVisibleSelect().find('li').filter(`:contains("${INSTANCE_ADMIN.email}")`).click();
			projects.getResourceMoveModal().contains('button', 'Move credential').click();
			clearNotifications();
			cy.wait('@getResources');

			credentialsPage.getters.credentialCards().should('have.length', 1);

			cy.log('Move the credential from admin user back to instance owner');
			projects.getHomeButton().click();
			projects.getProjectTabCredentials().click();
			credentialsPage.getters.credentialCards().should('have.length', 3);

			credentialsPage.getters.credentialCardActions('Credential in Project 1').click();
			credentialsPage.getters.credentialMoveButton().click();

			projects
				.getResourceMoveModal()
				.should('be.visible')
				.contains('button', 'Move credential')
				.should('be.disabled');
			projects.getProjectMoveSelect().click();
			getVisibleSelect().find('li').should('have.length', 5);
			getVisibleSelect().find('li').filter(`:contains("${INSTANCE_OWNER.email}")`).click();

			projects.getResourceMoveModal().contains('button', 'Move credential').click();
			clearNotifications();
			cy.wait('@getResources');

			credentialsPage.getters.credentialCards().should('have.length', 3);
			credentialsPage.getters
				.credentialCards()
				.filter(':contains("Personal")')
				.should('have.length', 2);

			cy.log('Move the credential from admin user back to its original project (Project 1)');
			credentialsPage.getters.credentialCardActions('Credential in Project 1').click();
			credentialsPage.getters.credentialMoveButton().click();

			projects
				.getResourceMoveModal()
				.should('be.visible')
				.contains('button', 'Move credential')
				.should('be.disabled');
			projects.getProjectMoveSelect().click();
			getVisibleSelect().find('li').should('have.length', 5);
			getVisibleSelect().find('li').filter(':contains("Project 1")').click();
			projects.getResourceMoveModal().contains('button', 'Move credential').click();
			clearNotifications();

			projects.getMenuItems().first().click();
			projects.getProjectTabCredentials().click();
			credentialsPage.getters
				.credentialCards()
				.filter(':contains("Credential in Project 1")')
				.should('have.length', 1);
		});
	});
});
