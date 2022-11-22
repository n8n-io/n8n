import { DEFAULT_USER_EMAIL, DEFAULT_USER_PASSWORD } from "../constants";
import { randFirstName, randLastName } from "@ngneat/falso";
import { CredentialsPage, CredentialsModal } from '../pages';
// import { v4 as uuid } from 'uuid';

const username = DEFAULT_USER_EMAIL;
const password = DEFAULT_USER_PASSWORD;
const firstName = randFirstName();
const lastName = randLastName();
const credentialsPage = new CredentialsPage();
const credentialsModal = new CredentialsModal();

describe('Credentials', () => {
	beforeEach(() => {
		cy.signup(username, firstName, lastName, password);

		cy.on('uncaught:exception', (err, runnable) => {
			expect(err.message).to.include('Not logged in');

			return false;
		})

		cy.signin(username, password);
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
	});
});
