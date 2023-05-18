import { DEFAULT_USER_EMAIL, DEFAULT_USER_PASSWORD } from '../constants';
import {
	CredentialsModal,
	CredentialsPage,
	NDV,
	WorkflowPage,
	WorkflowSharingModal,
	WorkflowsPage,
} from '../pages';

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

const instanceOwner = {
	email: `${DEFAULT_USER_EMAIL}one`,
	password: DEFAULT_USER_PASSWORD,
	firstName: 'User',
	lastName: 'U1',
};

const users = [
	{
		email: `${DEFAULT_USER_EMAIL}two`,
		password: DEFAULT_USER_PASSWORD,
		firstName: 'User',
		lastName: 'U2',
	},
	{
		email: `${DEFAULT_USER_EMAIL}three`,
		password: DEFAULT_USER_PASSWORD,
		firstName: 'User',
		lastName: 'U3',
	},
];

describe('Sharing', () => {
	before(() => {
		cy.resetAll();
		cy.setupOwner(instanceOwner);
	});

	beforeEach(() => {
		cy.on('uncaught:exception', (err, runnable) => {
			expect(err.message).to.include('Not logged in');
			return false;
		});
	});

	it('should invite User U2 and User U3 to instance', () => {
		cy.inviteUsers({ instanceOwner, users });
	});

	let workflowW2Url = '';
	it('should create C1, W1, W2, share W1 with U3, as U2', () => {
		cy.signin(users[0]);

		cy.visit(credentialsPage.url);
		credentialsPage.getters.emptyListCreateCredentialButton().click();
		credentialsModal.getters.newCredentialTypeOption('Notion API').click();
		credentialsModal.getters.newCredentialTypeButton().click();
		credentialsModal.getters.connectionParameter('API Key').type('1234567890');
		credentialsModal.actions.setName('Credential C1');
		credentialsModal.actions.save();
		credentialsModal.actions.close();

		workflowPage.actions.visit();
		workflowPage.actions.setWorkflowName('Workflow W1');
		workflowPage.actions.addInitialNodeToCanvas('Manual Trigger');
		workflowPage.actions.addNodeToCanvas('Notion', true, true);
		ndv.getters.credentialInput().should('contain', 'Credential C1');
		ndv.actions.close();

		workflowPage.actions.openShareModal();
		workflowSharingModal.actions.addUser(users[1].email);
		workflowSharingModal.actions.save();
		workflowPage.actions.saveWorkflowOnButtonClick();

		cy.visit(workflowsPage.url);
		workflowsPage.getters.createWorkflowButton().click();
		cy.createFixtureWorkflow('Test_workflow_1.json', 'Workflow W2');
		cy.url().then((url) => {
			workflowW2Url = url;
		});
	});

	it('should create C2, share C2 with U1 and U2, as U3', () => {
		cy.signin(users[1]);

		cy.visit(credentialsPage.url);
		credentialsPage.getters.emptyListCreateCredentialButton().click();
		credentialsModal.getters.newCredentialTypeOption('Airtable API').click();
		credentialsModal.getters.newCredentialTypeButton().click();
		credentialsModal.getters.connectionParameter('API Key').type('1234567890');
		credentialsModal.actions.setName('Credential C2');
		credentialsModal.actions.changeTab('Sharing');
		credentialsModal.actions.addUser(instanceOwner.email);
		credentialsModal.actions.addUser(users[0].email);
		credentialsModal.actions.save();
		credentialsModal.actions.close();
	});

	it('should open W1, add node using C2 as U3', () => {
		cy.signin(users[1]);

		cy.visit(workflowsPage.url);
		workflowsPage.getters.workflowCards().should('have.length', 1);
		workflowsPage.getters.workflowCard('Workflow W1').click();
		workflowPage.actions.addNodeToCanvas('Airtable', true, true);
		ndv.getters.credentialInput().should('contain', 'Credential C2');
		ndv.actions.close();
		workflowPage.actions.saveWorkflowOnButtonClick();

		workflowPage.actions.openNode('Notion');
		ndv.getters
			.credentialInput()
			.find('input')
			.should('have.value', 'Credential C1')
			.should('be.disabled');
		ndv.actions.close();
	});

	it('should not have access to W2, as U3', () => {
		cy.signin(users[1]);

		cy.visit(workflowW2Url);
		cy.waitForLoad();
		cy.wait(1000);
		cy.get('.el-notification').contains('Could not find workflow').should('be.visible');
	});

	it('should have access to W1, W2, as U1', () => {
		cy.signin(instanceOwner);

		cy.visit(workflowsPage.url);
		workflowsPage.getters.workflowCards().should('have.length', 2);
		workflowsPage.getters.workflowCard('Workflow W1').click();
		workflowPage.actions.openNode('Notion');
		ndv.getters
			.credentialInput()
			.find('input')
			.should('have.value', 'Credential C1')
			.should('be.disabled');
		ndv.actions.close();

		cy.waitForLoad();
		cy.visit(workflowsPage.url);
		workflowsPage.getters.workflowCard('Workflow W2').click('top');
		workflowPage.actions.executeWorkflow();
	});

	it('should automatically test C2 when opened by U2 sharee', () => {
		cy.signin(users[0]);

		cy.visit(credentialsPage.url);
		credentialsPage.getters.credentialCard('Credential C2').click();
		credentialsModal.getters.testSuccessTag().should('be.visible');
	});
});
