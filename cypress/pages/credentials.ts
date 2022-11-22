import { BasePage } from "./base";

export class CredentialsPage extends BasePage {
	url = '/credentials';
	getters = {
		emptyListCreateCredentialButton: () => cy.getByTestId('empty-resources-list').find('button'),
		createCredentialButton: () => cy.getByTestId('resources-list-add'),
		searchBar: () => cy.getByTestId('resources-list-search'),
		credentialCards: () => cy.getByTestId('credential-card'),
		credentialCard: (credentialName: string) => cy.getByTestId('credential-card')
			.contains(credentialName)
			.parents('[data-test-id="credential-card"]'),
		credentialCardActions: (credentialName: string) => this.getters.credentialCard(credentialName)
			.findChildByTestId('credential-card-actions'),
		credentialDeleteButton: () => cy.getByTestId('action-toggle-dropdown').filter(':visible').contains('Delete')
	};
}
