import { type ICredentialType } from 'n8n-workflow';

import * as credentialsComposables from '../composables/credentialsComposables';
import { getCredentialSaveButton, saveCredential } from '../composables/modals/credential-modal';
import {
	AGENT_NODE_NAME,
	AI_TOOL_HTTP_NODE_NAME,
	GMAIL_NODE_NAME,
	HTTP_REQUEST_NODE_NAME,
	NEW_GOOGLE_ACCOUNT_NAME,
	NEW_NOTION_ACCOUNT_NAME,
	NEW_QUERY_AUTH_ACCOUNT_NAME,
	NEW_TRELLO_ACCOUNT_NAME,
	NOTION_NODE_NAME,
	PIPEDRIVE_NODE_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
	TRELLO_NODE_NAME,
} from '../constants';
import { CredentialsModal, CredentialsPage, NDV, WorkflowPage } from '../pages';
import { errorToast, successToast } from '../pages/notifications';
import { getVisibleSelect } from '../utils';

const credentialsPage = new CredentialsPage();
const credentialsModal = new CredentialsModal();
const workflowPage = new WorkflowPage();
const nodeDetailsView = new NDV();

const NEW_CREDENTIAL_NAME = 'Something else';
const NEW_CREDENTIAL_NAME2 = 'Something else entirely';

function createNotionCredential() {
	workflowPage.actions.addNodeToCanvas(NOTION_NODE_NAME);
	workflowPage.actions.openNode(NOTION_NODE_NAME);
	workflowPage.getters.nodeCredentialsSelect().click();
	workflowPage.getters.nodeCredentialsCreateOption().click();
	credentialsModal.actions.fillCredentialsForm();
	cy.get('body').type('{esc}');
	workflowPage.actions.deleteNode(NOTION_NODE_NAME);
}

function deleteSelectedCredential() {
	workflowPage.getters.nodeCredentialsEditButton().click();
	credentialsModal.getters.deleteButton().click();
	cy.get('.el-message-box').find('button').contains('Yes').click();
}

describe('Credentials', () => {
	beforeEach(() => {
		credentialsComposables.loadCredentialsPage(credentialsPage.url);
	});

	it('should create a new credential using empty state', () => {
		credentialsPage.getters.emptyListCreateCredentialButton().click();

		credentialsModal.getters.newCredentialModal().should('be.visible');
		credentialsModal.getters.newCredentialTypeSelect().should('be.visible');
		credentialsModal.getters.newCredentialTypeOption('Notion API').click();

		credentialsModal.getters.newCredentialTypeButton().click();
		credentialsModal.getters.connectionParameter('Internal Integration Secret').type('1234567890');

		credentialsModal.actions.setName('My awesome Notion account');
		credentialsModal.actions.save();
		credentialsModal.actions.close();

		credentialsPage.getters.credentialCards().should('have.length', 1);
	});

	it('should sort credentials', () => {
		credentialsPage.actions.search('');
		credentialsPage.actions.sortBy('nameDesc');
		credentialsPage.getters.credentialCards().eq(0).should('contain.text', 'Notion');
		credentialsPage.actions.sortBy('nameAsc');
	});

	it('should create credentials from NDV for node with multiple auth options', () => {
		workflowPage.actions.visit();
		workflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		workflowPage.actions.addNodeToCanvas(GMAIL_NODE_NAME);
		workflowPage.getters.canvasNodes().last().click();
		cy.get('body').type('{enter}');
		workflowPage.getters.nodeCredentialsSelect().click();
		workflowPage.getters.nodeCredentialsCreateOption().click();
		credentialsModal.getters.credentialsEditModal().should('be.visible');
		credentialsModal.getters.credentialAuthTypeRadioButtons().should('have.length', 2);
		credentialsModal.getters.credentialAuthTypeRadioButtons().first().click();
		credentialsModal.actions.fillCredentialsForm();
		cy.get('.el-message-box').find('button').contains('Close').click();
		workflowPage.getters
			.nodeCredentialsSelect()
			.find('input')
			.should('have.value', NEW_GOOGLE_ACCOUNT_NAME);
	});

	it('should show multiple credential types in the same dropdown', () => {
		workflowPage.actions.visit();
		workflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		workflowPage.actions.addNodeToCanvas(GMAIL_NODE_NAME);
		workflowPage.getters.canvasNodes().last().click();
		cy.get('body').type('{enter}');
		workflowPage.getters.nodeCredentialsSelect().click();
		// Add oAuth credentials
		workflowPage.getters.nodeCredentialsCreateOption().click();
		credentialsModal.getters.credentialsEditModal().should('be.visible');
		credentialsModal.getters.credentialAuthTypeRadioButtons().should('have.length', 2);
		credentialsModal.getters.credentialAuthTypeRadioButtons().first().click();
		credentialsModal.actions.fillCredentialsForm();
		cy.get('.el-message-box').find('button').contains('Close').click();
		workflowPage.getters.nodeCredentialsSelect().click();
		// Add Service account credentials
		workflowPage.getters.nodeCredentialsCreateOption().click();
		credentialsModal.getters.credentialsEditModal().should('be.visible');
		credentialsModal.getters.credentialAuthTypeRadioButtons().should('have.length', 2);
		credentialsModal.getters.credentialAuthTypeRadioButtons().last().click();
		credentialsModal.actions.fillCredentialsForm();
		workflowPage.getters.nodeCredentialsSelect().click();
		getVisibleSelect().find('li').should('have.length', 3);
	});

	it('should correctly render required and optional credentials', () => {
		workflowPage.actions.visit();
		workflowPage.actions.addNodeToCanvas(PIPEDRIVE_NODE_NAME, true, true);
		cy.get('body').type('{downArrow}');
		cy.get('body').type('{enter}');
		// Select incoming authentication
		nodeDetailsView.getters.parameterInput('incomingAuthentication').should('exist');
		nodeDetailsView.getters.parameterInput('incomingAuthentication').click();
		getVisibleSelect().find('li').first().click();
		// There should be two credential fields
		workflowPage.getters.nodeCredentialsSelect().should('have.length', 2);

		workflowPage.getters.nodeCredentialsSelect().first().click();
		workflowPage.getters.nodeCredentialsCreateOption().first().click();
		// This one should show auth type selector
		credentialsModal.getters.credentialAuthTypeRadioButtons().should('have.length', 2);
		cy.get('body').type('{esc}');

		workflowPage.getters.nodeCredentialsSelect().last().click();
		workflowPage.getters.nodeCredentialsCreateOption().last().click();
		// This one should not show auth type selector
		credentialsModal.getters.credentialsAuthTypeSelector().should('not.exist');
	});

	it('should create credentials from NDV for node with no auth options', () => {
		workflowPage.actions.visit();
		workflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		workflowPage.actions.addNodeToCanvas(TRELLO_NODE_NAME);
		workflowPage.getters.canvasNodes().last().click();
		cy.get('body').type('{enter}');
		workflowPage.getters.nodeCredentialsSelect().click();
		workflowPage.getters.nodeCredentialsCreateOption().click();
		credentialsModal.getters.credentialsAuthTypeSelector().should('not.exist');
		credentialsModal.actions.fillCredentialsForm();
		workflowPage.getters
			.nodeCredentialsSelect()
			.find('input')
			.should('have.value', NEW_TRELLO_ACCOUNT_NAME);
	});

	it('should delete credentials from NDV', () => {
		workflowPage.actions.visit();
		workflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		workflowPage.actions.addNodeToCanvas(NOTION_NODE_NAME);
		workflowPage.getters.canvasNodes().last().click();
		cy.get('body').type('{enter}');
		workflowPage.getters.nodeCredentialsSelect().click();
		workflowPage.getters.nodeCredentialsCreateOption().click();
		credentialsModal.actions.fillCredentialsForm();
		workflowPage.getters
			.nodeCredentialsSelect()
			.find('input')
			.should('have.value', NEW_NOTION_ACCOUNT_NAME);

		workflowPage.getters.nodeCredentialsEditButton().click();
		credentialsModal.getters.credentialsEditModal().should('be.visible');
		credentialsModal.getters.deleteButton().click();
		cy.get('.el-message-box').find('button').contains('Yes').click();
		successToast().contains('Credential deleted');
		workflowPage.getters
			.nodeCredentialsSelect()
			.find('input')
			.should('not.have.value', NEW_TRELLO_ACCOUNT_NAME);
	});

	it('should rename credentials from NDV', () => {
		workflowPage.actions.visit();
		workflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		workflowPage.actions.addNodeToCanvas(TRELLO_NODE_NAME);
		workflowPage.getters.canvasNodes().last().click();
		cy.get('body').type('{enter}');
		workflowPage.getters.nodeCredentialsSelect().click();
		workflowPage.getters.nodeCredentialsCreateOption().click();
		credentialsModal.actions.fillCredentialsForm();
		workflowPage.getters.nodeCredentialsEditButton().click();
		credentialsModal.getters.credentialsEditModal().should('be.visible');
		credentialsModal.actions.renameCredential(NEW_CREDENTIAL_NAME);
		saveCredential();
		credentialsModal.getters.closeButton().click();
		workflowPage.getters
			.nodeCredentialsSelect()
			.find('input')
			.should('have.value', NEW_CREDENTIAL_NAME);

		// Reload page to make sure this also works when the credential hasn't been
		// just created.
		nodeDetailsView.actions.close();
		workflowPage.actions.saveWorkflowOnButtonClick();
		cy.reload();
		workflowPage.getters.canvasNodes().last().click();
		cy.get('body').type('{enter}');
		workflowPage.getters.nodeCredentialsEditButton().click();
		credentialsModal.getters.credentialsEditModal().should('be.visible');
		credentialsModal.actions.renameCredential(NEW_CREDENTIAL_NAME2);
		saveCredential();
		credentialsModal.getters.closeButton().click();
		workflowPage.getters
			.nodeCredentialsSelect()
			.find('input')
			.should('have.value', NEW_CREDENTIAL_NAME2);
	});

	it('should edit credential for non-standard credential type', () => {
		workflowPage.actions.visit();
		workflowPage.actions.addNodeToCanvas(AGENT_NODE_NAME);
		workflowPage.actions.addNodeToCanvas(AI_TOOL_HTTP_NODE_NAME);
		workflowPage.getters.canvasNodes().last().click();
		cy.get('body').type('{enter}');
		cy.getByTestId('parameter-input-authentication').click();
		cy.contains('Predefined Credential Type').click();
		cy.getByTestId('credential-select').click();
		cy.contains('Adalo API').click();
		workflowPage.getters.nodeCredentialsSelect().click();
		workflowPage.getters.nodeCredentialsCreateOption().click();
		credentialsModal.actions.fillCredentialsForm();
		workflowPage.getters.nodeCredentialsEditButton().click();
		credentialsModal.getters.credentialsEditModal().should('be.visible');
		credentialsModal.actions.renameCredential(NEW_CREDENTIAL_NAME);
		saveCredential();
		credentialsModal.getters.closeButton().click();
		workflowPage.getters
			.nodeCredentialsSelect()
			.find('input')
			.should('have.value', NEW_CREDENTIAL_NAME);
	});

	it('should set a default credential when adding nodes', () => {
		workflowPage.actions.visit();

		createNotionCredential();

		workflowPage.actions.addNodeToCanvas(NOTION_NODE_NAME, true, true);
		workflowPage.getters
			.nodeCredentialsSelect()
			.find('input')
			.should('have.value', NEW_NOTION_ACCOUNT_NAME);

		deleteSelectedCredential();
	});

	it('should set a default credential when editing a node', () => {
		workflowPage.actions.visit();

		createNotionCredential();

		workflowPage.actions.addNodeToCanvas(HTTP_REQUEST_NODE_NAME, true, true);
		nodeDetailsView.getters.parameterInput('authentication').click();
		getVisibleSelect().find('li').contains('Predefined').click();

		nodeDetailsView.getters.parameterInput('nodeCredentialType').click();
		getVisibleSelect().find('li').contains('Notion API').click();

		workflowPage.getters
			.nodeCredentialsSelect()
			.find('input')
			.should('have.value', NEW_NOTION_ACCOUNT_NAME);

		deleteSelectedCredential();
	});

	it('should setup generic authentication for HTTP node', () => {
		workflowPage.actions.visit();
		workflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		workflowPage.actions.addNodeToCanvas(HTTP_REQUEST_NODE_NAME);
		workflowPage.getters.canvasNodes().last().click();
		cy.get('body').type('{enter}');
		nodeDetailsView.getters.parameterInput('authentication').click();
		getVisibleSelect().find('li').should('have.length', 3);
		getVisibleSelect().find('li').last().click();
		nodeDetailsView.getters.parameterInput('genericAuthType').should('exist');
		nodeDetailsView.getters.parameterInput('genericAuthType').click();
		getVisibleSelect().find('li').should('have.length.greaterThan', 0);
		getVisibleSelect().find('li').last().click();

		workflowPage.getters.nodeCredentialsSelect().should('exist');
		workflowPage.getters.nodeCredentialsSelect().click();
		workflowPage.getters.nodeCredentialsCreateOption().click();
		credentialsModal.actions.fillCredentialsForm();
		workflowPage.getters
			.nodeCredentialsSelect()
			.find('input')
			.should('have.value', NEW_QUERY_AUTH_ACCOUNT_NAME);
	});

	it('should not show OAuth redirect URL section when OAuth2 credentials are overridden', () => {
		cy.intercept('/types/credentials.json', { middleware: true }, (req) => {
			req.headers['cache-control'] = 'no-cache, no-store';

			req.on('response', (res) => {
				const credentials: ICredentialType[] = res.body || [];

				const index = credentials.findIndex((c) => c.name === 'slackOAuth2Api');

				credentials[index] = {
					...credentials[index],
					__overwrittenProperties: ['clientId', 'clientSecret'],
				};
			});
		});

		workflowPage.actions.visit(true);
		workflowPage.actions.addNodeToCanvas('Manual');
		workflowPage.actions.addNodeToCanvas('Slack', true, true, 'Get a channel');
		workflowPage.getters.nodeCredentialsSelect().should('exist');
		workflowPage.getters.nodeCredentialsSelect().click();
		workflowPage.getters.nodeCredentialsCreateOption().click();
		credentialsModal.getters.credentialAuthTypeRadioButtons().first().click();
		nodeDetailsView.getters.copyInput().should('not.exist');
	});

	it('ADO-2583 should show notifications above credential modal overlay', () => {
		// check error notifications because they are sticky
		cy.intercept('POST', '/rest/credentials', { forceNetworkError: true });
		credentialsPage.getters.createCredentialButton().click();

		credentialsModal.getters.newCredentialModal().should('be.visible');
		credentialsModal.getters.newCredentialTypeSelect().should('be.visible');
		credentialsModal.getters.newCredentialTypeOption('Notion API').click();

		credentialsModal.getters.newCredentialTypeButton().click();
		credentialsModal.getters.connectionParameter('Internal Integration Secret').type('1234567890');

		credentialsModal.actions.setName('My awesome Notion account');
		getCredentialSaveButton().click();

		errorToast().should('have.length', 1);
		errorToast().should('be.visible');

		errorToast().should('have.css', 'z-index', '2100');
		cy.get('.el-overlay').should('have.css', 'z-index', '2001');
	});
});
