import { HTTP_REQUEST_NODE_TYPE } from './../../packages/editor-ui/src/constants';
import {
	NEW_NOTION_ACCOUNT_NAME,
	NOTION_NODE_NAME,
	PIPEDRIVE_NODE_NAME,
	HTTP_REQUEST_NODE_NAME,
	NEW_QUERY_AUTH_ACCOUNT_NAME,
} from './../constants';
import { visit } from 'recast';
import {
	DEFAULT_USER_EMAIL,
	DEFAULT_USER_PASSWORD,
	GMAIL_NODE_NAME,
	NEW_GOOGLE_ACCOUNT_NAME,
	NEW_TRELLO_ACCOUNT_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
	TRELLO_NODE_NAME,
} from '../constants';
import { randFirstName, randLastName } from '@ngneat/falso';
import { CredentialsPage, CredentialsModal, WorkflowPage, NDV } from '../pages';

const email = DEFAULT_USER_EMAIL;
const password = DEFAULT_USER_PASSWORD;
const firstName = randFirstName();
const lastName = randLastName();
const credentialsPage = new CredentialsPage();
const credentialsModal = new CredentialsModal();
const workflowPage = new WorkflowPage();
const nodeDetailsView = new NDV();

const NEW_CREDENTIAL_NAME = 'Something else';

describe('Credentials', () => {
	before(() => {
		cy.resetAll();
		cy.setup({ email, firstName, lastName, password });
	});

	beforeEach(() => {
		cy.on('uncaught:exception', (err, runnable) => {
			expect(err.message).to.include('Not logged in');

			return false;
		});

		cy.signin({ email, password });
		cy.visit(credentialsPage.url);
	});

	it('should create a new credential using empty state', () => {
		credentialsPage.getters.emptyListCreateCredentialButton().click();

		credentialsModal.getters.newCredentialModal().should('be.visible');
		credentialsModal.getters.newCredentialTypeSelect().should('be.visible');
		credentialsModal.getters.newCredentialTypeOption('Notion API').click();

		credentialsModal.getters.newCredentialTypeButton().click();

		credentialsModal.getters.connectionParameter('API Key').type('1234567890');

		credentialsModal.actions.setName('My awesome Notion account');
		credentialsModal.actions.save();
		credentialsModal.actions.close();

		credentialsPage.getters.credentialCards().should('have.length', 1);
	});

	it('should create a new credential using Add Credential button', () => {
		credentialsPage.getters.createCredentialButton().click();

		credentialsModal.getters.newCredentialModal().should('be.visible');
		credentialsModal.getters.newCredentialTypeSelect().should('be.visible');
		credentialsModal.getters.newCredentialTypeOption('Airtable API').click();

		credentialsModal.getters.newCredentialTypeButton().click();

		credentialsModal.getters.connectionParameter('API Key').type('1234567890');

		credentialsModal.actions.setName('Airtable Account');
		credentialsModal.actions.save();
		credentialsModal.actions.close();

		credentialsPage.getters.credentialCards().should('have.length', 2);
	});

	it('should search credentials', () => {
		// Search by name
		credentialsPage.actions.search('Notion');
		credentialsPage.getters.credentialCards().should('have.length', 1);

		// Search by Credential type
		credentialsPage.actions.search('Airtable API');
		credentialsPage.getters.credentialCards().should('have.length', 1);

		// No results
		credentialsPage.actions.search('Google');
		credentialsPage.getters.credentialCards().should('have.length', 0);
		credentialsPage.getters.emptyList().should('be.visible');
	});

	it('should sort credentials', () => {
		credentialsPage.actions.search('');
		credentialsPage.actions.sortBy('nameDesc');
		credentialsPage.getters.credentialCards().eq(0).should('contain.text', 'Notion');
		credentialsPage.actions.sortBy('nameAsc');
	});

	it('should create credentials from NDV for node with multiple auth options', () => {
		workflowPage.actions.visit();
		cy.waitForLoad();
		workflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		workflowPage.actions.addNodeToCanvas(GMAIL_NODE_NAME);
		workflowPage.getters.canvasNodes().last().click();
		cy.get('body').type('{enter}');
		workflowPage.getters.nodeCredentialsSelect().click();
		workflowPage.getters.nodeCredentialsSelect().find('li').last().click();
		credentialsModal.getters.credentialsEditModal().should('be.visible');
		credentialsModal.getters.credentialAuthTypeRadioButtons().should('have.length', 2);
		credentialsModal.getters.credentialAuthTypeRadioButtons().first().click();
		credentialsModal.actions.fillCredentialsForm();
		cy.get('.el-message-box').find('button').contains('Close').click();
		workflowPage.getters.nodeCredentialsSelect().should('contain', NEW_GOOGLE_ACCOUNT_NAME);
	});

	it('should show multiple credential types in the same dropdown', () => {
		workflowPage.actions.visit();
		cy.waitForLoad();
		workflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		workflowPage.actions.addNodeToCanvas(GMAIL_NODE_NAME);
		workflowPage.getters.canvasNodes().last().click();
		cy.get('body').type('{enter}');
		workflowPage.getters.nodeCredentialsSelect().click();
		// Add oAuth credentials
		workflowPage.getters.nodeCredentialsSelect().find('li').last().click();
		credentialsModal.getters.credentialsEditModal().should('be.visible');
		credentialsModal.getters.credentialAuthTypeRadioButtons().should('have.length', 2);
		credentialsModal.getters.credentialAuthTypeRadioButtons().first().click();
		credentialsModal.actions.fillCredentialsForm();
		cy.get('.el-message-box').find('button').contains('Close').click();
		workflowPage.getters.nodeCredentialsSelect().click();
		// Add Service account credentials
		workflowPage.getters.nodeCredentialsSelect().find('li').last().click();
		credentialsModal.getters.credentialsEditModal().should('be.visible');
		credentialsModal.getters.credentialAuthTypeRadioButtons().should('have.length', 2);
		credentialsModal.getters.credentialAuthTypeRadioButtons().last().click();
		credentialsModal.actions.fillCredentialsForm();
		// Both (+ the 'Create new' option) should be in the dropdown
		workflowPage.getters.nodeCredentialsSelect().find('li').should('have.length.greaterThan', 3);
	});

	it('should correctly render required and optional credentials', () => {
		workflowPage.actions.visit();
		cy.waitForLoad();
		workflowPage.actions.addNodeToCanvas(PIPEDRIVE_NODE_NAME, true, true);
		cy.get('body').type('{downArrow}');
		cy.get('body').type('{enter}');
		// Select incoming authentication
		nodeDetailsView.getters.parameterInput('incomingAuthentication').should('exist');
		nodeDetailsView.getters.parameterInput('incomingAuthentication').click();
		nodeDetailsView.getters.parameterInput('incomingAuthentication').find('li').first().click();
		// There should be two credential fields
		workflowPage.getters.nodeCredentialsSelect().should('have.length', 2);

		workflowPage.getters.nodeCredentialsSelect().first().click();
		workflowPage.getters.nodeCredentialsSelect().first().find('li').last().click();
		// This one should show auth type selector
		credentialsModal.getters.credentialAuthTypeRadioButtons().should('have.length', 2);
		cy.get('body').type('{esc}');

		workflowPage.getters.nodeCredentialsSelect().last().click();
		workflowPage.getters.nodeCredentialsSelect().last().find('li').last().click();
		// This one should not show auth type selector
		credentialsModal.getters.credentialsAuthTypeSelector().should('not.exist');
	});

	it('should create credentials from NDV for node with no auth options', () => {
		workflowPage.actions.visit();
		cy.waitForLoad();
		workflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		workflowPage.actions.addNodeToCanvas(TRELLO_NODE_NAME);
		workflowPage.getters.canvasNodes().last().click();
		cy.get('body').type('{enter}');
		workflowPage.getters.nodeCredentialsSelect().click();
		workflowPage.getters.nodeCredentialsSelect().find('li').last().click();
		credentialsModal.getters.credentialsAuthTypeSelector().should('not.exist');
		credentialsModal.actions.fillCredentialsForm();
		workflowPage.getters.nodeCredentialsSelect().should('contain', NEW_TRELLO_ACCOUNT_NAME);
	});

	it('should delete credentials from NDV', () => {
		workflowPage.actions.visit();
		cy.waitForLoad();
		workflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		workflowPage.actions.addNodeToCanvas(NOTION_NODE_NAME);
		workflowPage.getters.canvasNodes().last().click();
		cy.get('body').type('{enter}');
		workflowPage.getters.nodeCredentialsSelect().click();
		workflowPage.getters.nodeCredentialsSelect().find('li').last().click();
		credentialsModal.actions.fillCredentialsForm();
		workflowPage.getters.nodeCredentialsSelect().should('contain', NEW_NOTION_ACCOUNT_NAME);

		workflowPage.getters.nodeCredentialsEditButton().click();
		credentialsModal.getters.credentialsEditModal().should('be.visible');
		credentialsModal.getters.deleteButton().click();
		cy.get('.el-message-box').find('button').contains('Yes').click();
		workflowPage.getters.successToast().contains('Credential deleted');
		workflowPage.getters.nodeCredentialsSelect().should('not.contain', NEW_TRELLO_ACCOUNT_NAME);
	});

	it('should rename credentials from NDV', () => {
		workflowPage.actions.visit();
		cy.waitForLoad();
		workflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		workflowPage.actions.addNodeToCanvas(TRELLO_NODE_NAME);
		workflowPage.getters.canvasNodes().last().click();
		cy.get('body').type('{enter}');
		workflowPage.getters.nodeCredentialsSelect().click();
		workflowPage.getters.nodeCredentialsSelect().find('li').last().click();
		credentialsModal.actions.fillCredentialsForm();
		workflowPage.getters.nodeCredentialsSelect().should('contain', NEW_TRELLO_ACCOUNT_NAME);

		workflowPage.getters.nodeCredentialsEditButton().click();
		credentialsModal.getters.credentialsEditModal().should('be.visible');
		credentialsModal.getters.name().click();
		credentialsModal.actions.renameCredential(NEW_CREDENTIAL_NAME);
		credentialsModal.getters.saveButton().click();
		credentialsModal.getters.closeButton().click();
		workflowPage.getters.nodeCredentialsSelect().should('contain', NEW_CREDENTIAL_NAME);
	});

	it('should setup generic authentication for HTTP node', () => {
		workflowPage.actions.visit();
		cy.waitForLoad();
		workflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		workflowPage.actions.addNodeToCanvas(HTTP_REQUEST_NODE_NAME);
		workflowPage.getters.canvasNodes().last().click();
		cy.get('body').type('{enter}');
		nodeDetailsView.getters.parameterInput('authentication').click();
		nodeDetailsView.getters.parameterInput('authentication').find('li').should('have.length', 3);
		nodeDetailsView.getters.parameterInput('authentication').find('li').last().click();
		nodeDetailsView.getters.parameterInput('genericAuthType').should('exist');
		nodeDetailsView.getters.parameterInput('genericAuthType').click();
		nodeDetailsView.getters
			.parameterInput('genericAuthType')
			.find('li')
			.should('have.length.greaterThan', 0);
		nodeDetailsView.getters.parameterInput('genericAuthType').find('li').last().click();

		workflowPage.getters.nodeCredentialsSelect().should('exist');
		workflowPage.getters.nodeCredentialsSelect().click();
		workflowPage.getters.nodeCredentialsSelect().find('li').last().click();
		credentialsModal.actions.fillCredentialsForm();
		workflowPage.getters.nodeCredentialsSelect().should('contain', NEW_QUERY_AUTH_ACCOUNT_NAME);
	});
});
