import { DEFAULT_USER_EMAIL, DEFAULT_USER_PASSWORD } from "../constants";
import { randFirstName, randLastName } from "@ngneat/falso";
import { CredentialsPage, CredentialsModal } from '../pages';

const email = DEFAULT_USER_EMAIL;
const password = DEFAULT_USER_PASSWORD;
const firstName = randFirstName();
const lastName = randLastName();
const credentialsPage = new CredentialsPage();
const credentialsModal = new CredentialsModal();

describe('Credentials', () => {
	before(() => {
		cy.resetAll();
		cy.setup({ email, firstName, lastName, password });
	});

	beforeEach(() => {
		cy.on('uncaught:exception', (err, runnable) => {
			expect(err.message).to.include('Not logged in');

			return false;
		})

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
});
