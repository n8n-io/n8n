import * as credentialsComposables from '../composables/credentialsComposables';
import { saveCredential } from '../composables/modals/credential-modal';
import * as projects from '../composables/projects';
import { INSTANCE_MEMBERS, INSTANCE_OWNER, INSTANCE_ADMIN, NOTION_NODE_NAME } from '../constants';
import {
	CredentialsModal,
	CredentialsPage,
	NDV,
	WorkflowPage,
	WorkflowSharingModal,
	WorkflowsPage,
} from '../pages';
import { getVisibleDropdown, getVisiblePopper, getVisibleSelect } from '../utils';

/**
 * User U1 - Instance owner
 * User U2 - User, owns C1, W1, W2
 * User U3 - User, owns C2
 *
 * W1 - Workflow owned by User U2, shared with User U3
 * W2 - Workflow owned by User U2
 *
 * C1 - Credential owned by User U2
 * C2 - Credential owned by User U3, shared with User U1 and User U2
 */

const credentialsPage = new CredentialsPage();
const credentialsModal = new CredentialsModal();

const workflowsPage = new WorkflowsPage();
const workflowPage = new WorkflowPage();
const workflowSharingModal = new WorkflowSharingModal();
const ndv = new NDV();

describe('Sharing', { disableAutoLogin: true }, () => {
	before(() => cy.enableFeature('sharing'));

	let workflowW2Url = '';
	it('should create C1, W1, W2, share W1 with U3, as U2', () => {
		cy.signinAsMember(0);

		credentialsComposables.loadCredentialsPage(credentialsPage.url);
		credentialsPage.getters.emptyListCreateCredentialButton().click();
		credentialsModal.getters.newCredentialTypeOption('Notion API').click();
		credentialsModal.getters.newCredentialTypeButton().click();
		credentialsModal.getters.connectionParameter('Internal Integration Secret').type('1234567890');
		credentialsModal.actions.setName('Credential C1');
		credentialsModal.actions.save();
		credentialsModal.actions.close();

		workflowPage.actions.visit();
		workflowPage.actions.setWorkflowName('Workflow W1');
		workflowPage.actions.addInitialNodeToCanvas('Manual Trigger');
		workflowPage.actions.addNodeToCanvas('Notion', true, true);
		ndv.getters.credentialInput().find('input').should('have.value', 'Credential C1');
		ndv.actions.close();

		workflowPage.actions.openShareModal();
		workflowSharingModal.actions.addUser(INSTANCE_MEMBERS[1].email);
		workflowSharingModal.actions.save();
		workflowPage.actions.saveWorkflowOnButtonClick();

		cy.visit(workflowsPage.url);
		workflowsPage.getters.createWorkflowButton().click();
		cy.createFixtureWorkflow('Test_workflow_1.json', 'Workflow W2');
		workflowPage.actions.saveWorkflowOnButtonClick();
		cy.url().then((url) => {
			workflowW2Url = url;
		});
	});

	it('should create C2, share C2 with U1 and U2, as U3', () => {
		cy.signinAsMember(1);

		credentialsComposables.loadCredentialsPage(credentialsPage.url);
		credentialsPage.getters.emptyListCreateCredentialButton().click();
		credentialsModal.getters.newCredentialTypeOption('Airtable Personal Access Token API').click();
		credentialsModal.getters.newCredentialTypeButton().click();
		credentialsModal.getters.connectionParameter('Access Token').type('1234567890');
		credentialsModal.actions.setName('Credential C2');
		credentialsModal.actions.changeTab('Sharing');
		credentialsModal.actions.addUser(INSTANCE_OWNER.email);
		credentialsModal.actions.addUser(INSTANCE_MEMBERS[0].email);
		credentialsModal.actions.save();
		credentialsModal.actions.close();
	});

	it('should open W1, add node using C2 as U3', () => {
		cy.signinAsMember(1);

		cy.visit(workflowsPage.url);
		workflowsPage.getters.workflowCards().should('have.length', 1);
		workflowsPage.getters.workflowCardContent('Workflow W1').click();
		workflowPage.actions.addNodeToCanvas('Airtable', true, true);
		ndv.getters.credentialInput().find('input').should('have.value', 'Credential C2');
		ndv.actions.close();
		workflowPage.actions.saveWorkflowOnButtonClick();

		workflowPage.actions.openNode('Append a block');
		ndv.getters.credentialInput().should('have.value', 'Credential C1').should('be.disabled');
		ndv.actions.close();
	});

	it('should open W1, add node using C2 as U2', () => {
		cy.signinAsMember(0);

		cy.visit(workflowsPage.url);
		workflowsPage.getters.workflowCards().should('have.length', 2);
		workflowsPage.getters.workflowCardContent('Workflow W1').click();
		workflowPage.actions.addNodeToCanvas('Airtable', true, true);
		ndv.getters.credentialInput().find('input').should('have.value', 'Credential C2');
		ndv.actions.close();
		workflowPage.actions.saveWorkflowOnButtonClick();

		workflowPage.actions.openNode('Append a block');
		ndv.getters
			.credentialInput()
			.find('input')
			.should('have.value', 'Credential C1')
			.should('be.enabled');
		ndv.actions.close();
	});

	it('should not have access to W2, as U3', () => {
		cy.signinAsMember(1);

		cy.visit(workflowW2Url);
		cy.waitForLoad();
		cy.location('pathname', { timeout: 10000 }).should('eq', '/entity-not-authorized/workflow');
	});

	it('should have access to W1, W2, as U1', () => {
		cy.signinAsOwner();

		cy.visit(workflowsPage.url);
		workflowsPage.getters.workflowCards().should('have.length', 2);
		workflowsPage.getters.workflowCardContent('Workflow W1').click();
		workflowPage.actions.openNode('Append a block');
		ndv.getters
			.credentialInput()
			.find('input')
			.should('have.value', 'Credential C1')
			.should('be.enabled');
		ndv.actions.close();

		cy.waitForLoad();
		cy.visit(workflowsPage.url);
		workflowsPage.getters.workflowCardContent('Workflow W2').click('top');
		workflowPage.actions.executeWorkflow();
	});

	it('should automatically test C2 when opened by U2 sharee', () => {
		cy.signinAsMember(0);

		credentialsComposables.loadCredentialsPage(credentialsPage.url);
		credentialsPage.getters.credentialCard('Credential C2').click();
		credentialsModal.getters.testSuccessTag().should('be.visible');
	});

	it('should work for admin role on credentials created by others (also can share it with themselves)', () => {
		cy.signinAsMember(0);

		credentialsComposables.loadCredentialsPage(credentialsPage.url);
		credentialsPage.getters.createCredentialButton().click();
		credentialsModal.getters.newCredentialTypeOption('Notion API').click();
		credentialsModal.getters.newCredentialTypeButton().click({ force: true });
		credentialsModal.getters.connectionParameter('Internal Integration Secret').type('1234567890');
		credentialsModal.actions.setName('Credential C3');
		credentialsModal.actions.save();
		credentialsModal.actions.close();

		cy.signout();
		cy.signinAsAdmin();
		credentialsComposables.loadCredentialsPage(credentialsPage.url);
		credentialsPage.getters.credentialCard('Credential C3').click();
		credentialsModal.getters.testSuccessTag().should('be.visible');
		cy.get('input').should('not.have.length');
		credentialsModal.actions.changeTab('Sharing');
		cy.contains(
			'Sharing a credential allows people to use it in their workflows. They cannot access credential details.',
		).should('be.visible');

		credentialsModal.getters.usersSelect().click();
		getVisiblePopper()
			.find('[data-test-id="project-sharing-info"]')
			.filter(':visible')
			.should('have.length', 3)
			.contains(INSTANCE_ADMIN.email)
			.should('have.length', 1);
		getVisibleSelect().contains(INSTANCE_OWNER.email.toLowerCase()).click();

		credentialsModal.actions.addUser(INSTANCE_MEMBERS[1].email);
		credentialsModal.actions.addUser(INSTANCE_ADMIN.email);
		credentialsModal.actions.saveSharing();
		credentialsModal.actions.close();
	});

	it('credentials should work between team and personal projects', () => {
		cy.resetDatabase();
		cy.enableFeature('sharing');
		cy.enableFeature('advancedPermissions');
		cy.enableFeature('projectRole:admin');
		cy.enableFeature('projectRole:editor');
		cy.changeQuota('maxTeamProjects', -1);

		cy.signinAsOwner();
		cy.visit('/');

		projects.createProject('Development');

		projects.getHomeButton().click();
		workflowsPage.getters.newWorkflowButtonCard().click();
		projects.createWorkflow('Test_workflow_1.json', 'Test workflow');

		projects.getHomeButton().click();
		projects.getProjectTabCredentials().click();
		credentialsPage.getters.emptyListCreateCredentialButton().click();
		projects.createCredential('Notion API');

		credentialsPage.getters.credentialCard('Notion API').click();
		credentialsModal.actions.changeTab('Sharing');
		credentialsModal.getters.usersSelect().click();
		getVisibleSelect()
			.find('li')
			.should('have.length', 4)
			.filter(':contains("Development")')
			.should('have.length', 1)
			.click();
		saveCredential();
		credentialsModal.actions.close();

		projects.getProjectTabWorkflows().click();
		workflowsPage.getters.workflowCardActions('Test workflow').click();
		getVisibleDropdown().find('li').contains('Share').click();

		workflowSharingModal.getters.usersSelect().filter(':visible').click();
		getVisibleSelect().find('li').should('have.length', 3).first().click();
		workflowSharingModal.getters.saveButton().click();

		projects.getMenuItems().first().click();
		workflowsPage.getters.newWorkflowButtonCard().click();
		projects.createWorkflow('Test_workflow_1.json', 'Test workflow 2');
		workflowPage.actions.openShareModal();
		workflowSharingModal.getters.usersSelect().should('not.exist');

		cy.get('body').type('{esc}');

		projects.getMenuItems().first().click();
		projects.getProjectTabCredentials().click();
		credentialsPage.getters.createCredentialButton().click();
		projects.createCredential('Notion API 2', false);
		credentialsModal.actions.changeTab('Sharing');
		credentialsModal.getters.usersSelect().click();
		getVisibleSelect().find('li').should('have.length', 4).first().click();
		saveCredential();
		credentialsModal.actions.close();

		credentialsPage.getters
			.credentialCards()
			.should('have.length', 2)
			.filter(':contains("Personal")')
			.should('have.length', 1);
	});
});

describe('Credential Usage in Cross Shared Workflows', () => {
	beforeEach(() => {
		cy.resetDatabase();
		cy.enableFeature('sharing');
		cy.enableFeature('advancedPermissions');
		cy.enableFeature('projectRole:admin');
		cy.enableFeature('projectRole:editor');
		cy.changeQuota('maxTeamProjects', -1);
		cy.reload();
		cy.signinAsOwner();
		credentialsComposables.loadCredentialsPage(credentialsPage.url);
	});

	it('should only show credentials from the same team project', () => {
		// Create a notion credential in the home project
		credentialsPage.getters.emptyListCreateCredentialButton().click();
		credentialsModal.actions.createNewCredential('Notion API');

		// Create a notion credential in one project
		projects.createProject('Development');
		projects.getProjectTabCredentials().click();
		credentialsPage.getters.emptyListCreateCredentialButton().click();
		credentialsModal.actions.createNewCredential('Notion API');

		// Create a notion credential in another project
		projects.createProject('Test');
		projects.getProjectTabCredentials().click();
		credentialsPage.getters.emptyListCreateCredentialButton().click();
		credentialsModal.actions.createNewCredential('Notion API');
		// Create a workflow with a notion node in the same project
		projects.getProjectTabWorkflows().click();
		workflowsPage.actions.createWorkflowFromCard();
		workflowPage.actions.addNodeToCanvas(NOTION_NODE_NAME, true, true);

		// Only the credential in this project should be in the dropdown
		workflowPage.getters.nodeCredentialsSelect().click();
		getVisibleSelect().find('li').should('have.length', 1);
	});

	it('should only show credentials in their personal project for members', () => {
		// Create a notion credential as the owner
		credentialsPage.getters.emptyListCreateCredentialButton().click();
		credentialsModal.actions.createNewCredential('Notion API');

		// Create another notion credential as the owner, but share it with member
		// 0
		credentialsPage.getters.createCredentialButton().click();
		credentialsModal.actions.createNewCredential('Notion API', false);
		credentialsModal.actions.changeTab('Sharing');
		credentialsModal.actions.addUser(INSTANCE_MEMBERS[0].email);
		credentialsModal.actions.saveSharing();

		// As the member, create a new notion credential and a workflow
		cy.signinAsMember();
		credentialsComposables.loadCredentialsPage(credentialsPage.url);
		credentialsPage.getters.createCredentialButton().click();
		credentialsModal.actions.createNewCredential('Notion API');
		cy.visit(workflowsPage.url);
		workflowsPage.actions.createWorkflowFromCard();
		workflowPage.actions.addNodeToCanvas(NOTION_NODE_NAME, true, true);

		// Only the own credential the shared one should be in the dropdown
		workflowPage.getters.nodeCredentialsSelect().click();
		getVisibleSelect().find('li').should('have.length', 2);
	});

	it('should only show credentials in their personal project for members if the workflow was shared with them', () => {
		const workflowName = 'Test workflow';

		// Create a notion credential as the owner and a workflow that is shared
		// with member 0
		credentialsPage.getters.emptyListCreateCredentialButton().click();
		credentialsModal.actions.createNewCredential('Notion API');
		//cy.visit(workflowsPage.url);
		projects.getProjectTabWorkflows().click();
		workflowsPage.actions.createWorkflowFromCard();
		workflowPage.actions.setWorkflowName(workflowName);
		workflowPage.actions.openShareModal();
		workflowSharingModal.actions.addUser(INSTANCE_MEMBERS[0].email);
		workflowSharingModal.actions.save();

		// As the member, create a new notion credential
		cy.signinAsMember();
		credentialsComposables.loadCredentialsPage(credentialsPage.url);
		credentialsPage.getters.emptyListCreateCredentialButton().click();
		credentialsModal.actions.createNewCredential('Notion API');
		cy.visit(workflowsPage.url);
		workflowsPage.getters.workflowCardContent(workflowName).click();
		workflowPage.actions.addNodeToCanvas(NOTION_NODE_NAME, true, true);

		// Only the own credential the shared one should be in the dropdown
		workflowPage.getters.nodeCredentialsSelect().click();
		getVisibleSelect().find('li').should('have.length', 1);
	});

	it("should show all credentials from all personal projects the workflow's been shared into for the global owner", () => {
		const workflowName = 'Test workflow';

		// As member 1, create a new notion credential. This should not show up.
		cy.signinAsMember(1);
		credentialsComposables.loadCredentialsPage(credentialsPage.url);
		credentialsPage.getters.emptyListCreateCredentialButton().click();
		credentialsModal.actions.createNewCredential('Notion API');

		// As admin, create a new notion credential. This should show up.
		cy.signinAsAdmin();
		credentialsComposables.loadCredentialsPage(credentialsPage.url);
		credentialsPage.getters.createCredentialButton().click();
		credentialsModal.actions.createNewCredential('Notion API');

		// As member 0, create a new notion credential and a workflow and share it
		// with the global owner and the admin.
		cy.signinAsMember();
		credentialsComposables.loadCredentialsPage(credentialsPage.url);
		credentialsPage.getters.emptyListCreateCredentialButton().click();
		credentialsModal.actions.createNewCredential('Notion API');
		cy.visit(workflowsPage.url);
		workflowsPage.actions.createWorkflowFromCard();
		workflowPage.actions.setWorkflowName(workflowName);
		workflowPage.actions.openShareModal();
		workflowSharingModal.actions.addUser(INSTANCE_OWNER.email);
		workflowSharingModal.actions.addUser(INSTANCE_ADMIN.email);
		workflowSharingModal.actions.save();

		// As the global owner, create a new notion credential and open the shared
		// workflow
		cy.signinAsOwner();
		credentialsComposables.loadCredentialsPage(credentialsPage.url);

		credentialsPage.getters.createCredentialButton().click();
		credentialsModal.actions.createNewCredential('Notion API');
		cy.visit(workflowsPage.url);
		workflowsPage.getters.workflowCardContent(workflowName).click();
		workflowPage.actions.addNodeToCanvas(NOTION_NODE_NAME, true, true);

		// Only the personal credentials of the workflow owner and the global owner should show up.
		workflowPage.getters.nodeCredentialsSelect().click();
		getVisibleSelect().find('li').should('have.length', 3);
	});

	it('should show all personal credentials if the global owner owns the workflow', () => {
		// As member 0, create a new notion credential.
		cy.signinAsMember();
		credentialsComposables.loadCredentialsPage(credentialsPage.url);
		credentialsPage.getters.emptyListCreateCredentialButton().click();
		credentialsModal.actions.createNewCredential('Notion API');

		// As the global owner, create a workflow and add a notion node
		cy.signinAsOwner();
		cy.visit(workflowsPage.url);
		workflowsPage.actions.createWorkflowFromCard();
		workflowPage.actions.addNodeToCanvas(NOTION_NODE_NAME, true, true);

		// Show all personal credentials
		workflowPage.getters.nodeCredentialsSelect().click();
		getVisibleSelect().find('li').should('have.have.length', 1);
	});
});
