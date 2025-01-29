import { setCredentialValues } from '../composables/modals/credential-modal';
import { clickCreateNewCredential, selectResourceLocatorItem } from '../composables/ndv';
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

describe('Projects', { disableAutoLogin: true }, () => {
	before(() => {
		cy.resetDatabase();
		cy.enableFeature('sharing');
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

	describe('when starting from scratch', () => {
		beforeEach(() => {
			cy.resetDatabase();
			cy.enableFeature('sharing');
			cy.enableFeature('advancedPermissions');
			cy.enableFeature('projectRole:admin');
			cy.enableFeature('projectRole:editor');
			cy.changeQuota('maxTeamProjects', -1);
		});

		/**
		 * @TODO: New Canvas - Fix this test
		 */
		// eslint-disable-next-line n8n-local-rules/no-skipped-tests
		it.skip('should filter credentials by project ID when creating new workflow or hard reloading an opened workflow', () => {
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
			workflowPage.getters.canvasNodeByName(NOTION_NODE_NAME).should('be.visible').dblclick();
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
			workflowPage.getters.canvasNodeByName(NOTION_NODE_NAME).should('be.visible').dblclick();
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
			workflowPage.getters.canvasNodeByName(NOTION_NODE_NAME).should('be.visible').dblclick();
			workflowPage.getters.nodeCredentialsSelect().first().click();
			getVisibleSelect()
				.find('li')
				.should('have.length', 1)
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
				.contains('button', 'Move workflow')
				.should('be.disabled');
			projects.getProjectMoveSelect().click();
			getVisibleSelect()
				.find('li')
				.should('have.length', 5)
				.filter(':contains("Project 1")')
				.click();
			projects.getResourceMoveModal().contains('button', 'Move workflow').click();
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
				.contains('button', 'Move workflow')
				.should('be.disabled');
			projects.getProjectMoveSelect().click();
			getVisibleSelect()
				.find('li')
				.should('have.length', 5)
				.filter(':contains("Project 2")')
				.click();
			projects.getResourceMoveModal().contains('button', 'Move workflow').click();

			// Move the workflow from Project 2 to a member user
			projects.getMenuItems().last().click();
			workflowsPage.getters.workflowCards().should('have.length', 2);
			workflowsPage.getters.workflowCardActions('Workflow in Home project').click();
			workflowsPage.getters.workflowMoveButton().click();
			clearNotifications();

			projects
				.getResourceMoveModal()
				.should('be.visible')
				.contains('button', 'Move workflow')
				.should('be.disabled');
			projects.getProjectMoveSelect().click();
			getVisibleSelect()
				.find('li')
				.should('have.length', 5)
				.filter(`:contains("${INSTANCE_MEMBERS[0].email}")`)
				.click();

			projects.getResourceMoveModal().contains('button', 'Move workflow').click();
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
				.contains('button', 'Move workflow')
				.should('be.disabled');
			projects.getProjectMoveSelect().click();
			getVisibleSelect()
				.find('li')
				.should('have.length', 5)
				.filter(`:contains("${INSTANCE_OWNER.email}")`)
				.click();

			projects.getResourceMoveModal().contains('button', 'Move workflow').click();
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
				.contains('button', 'Move credential')
				.should('be.disabled');
			projects.getProjectMoveSelect().click();
			getVisibleSelect()
				.find('li')
				.should('have.length', 5)
				.filter(':contains("Project 2")')
				.click();
			projects.getResourceMoveModal().contains('button', 'Move credential').click();
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
				.contains('button', 'Move credential')
				.should('be.disabled');
			projects.getProjectMoveSelect().click();
			getVisibleSelect()
				.find('li')
				.should('have.length', 5)
				.filter(`:contains("${INSTANCE_ADMIN.email}")`)
				.click();
			projects.getResourceMoveModal().contains('button', 'Move credential').click();
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
				.contains('button', 'Move credential')
				.should('be.disabled');
			projects.getProjectMoveSelect().click();
			getVisibleSelect()
				.find('li')
				.should('have.length', 5)
				.filter(`:contains("${INSTANCE_OWNER.email}")`)
				.click();
			projects.getResourceMoveModal().contains('button', 'Move credential').click();

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
				.contains('button', 'Move credential')
				.should('be.disabled');
			projects.getProjectMoveSelect().click();
			getVisibleSelect()
				.find('li')
				.should('have.length', 5)
				.filter(':contains("Project 1")')
				.click();
			projects.getResourceMoveModal().contains('button', 'Move credential').click();

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
				.contains('button', 'Move workflow')
				.should('be.disabled');
			projects.getProjectMoveSelect().click();
			getVisibleSelect()
				.find('li')
				.should('have.length', 4)
				.filter(':contains("Project 1")')
				.click();
			projects.getResourceMoveModal().contains('button', 'Move workflow').click();

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

		it('should create sub-workflow and credential in the sub-workflow in the same project', () => {
			cy.signinAsOwner();
			cy.visit(workflowsPage.url);

			projects.createProject('Dev');
			projects.getProjectTabWorkflows().click();
			workflowsPage.getters.newWorkflowButtonCard().click();
			workflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
			workflowPage.actions.saveWorkflowOnButtonClick();
			workflowPage.actions.addNodeToCanvas('Execute Workflow', true, true);

			cy.window().then((win) => {
				cy.stub(win, 'open').callsFake((url) => {
					cy.visit(url);
				});
			});

			selectResourceLocatorItem('workflowId', 0, 'Create a');

			cy.get('body').type('{esc}');
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
	});

	it('should set and update project icon', () => {
		const DEFAULT_ICON = 'fa-layer-group';
		const NEW_PROJECT_NAME = 'Test Project';

		cy.signinAsAdmin();
		cy.visit(workflowsPage.url);
		projects.createProject(NEW_PROJECT_NAME);
		// New project should have default icon
		projects.getIconPickerButton().find('svg').should('have.class', DEFAULT_ICON);
		// Choose another icon
		projects.getIconPickerButton().click();
		projects.getIconPickerTab('Emojis').click();
		projects.getIconPickerEmojis().first().click();
		// Project should be updated with new icon
		successToast().contains('Project icon updated successfully');
		projects.getIconPickerButton().should('contain', '😀');
		projects.getMenuItems().contains(NEW_PROJECT_NAME).should('contain', '😀');
	});
});
