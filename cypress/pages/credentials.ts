import { BasePage } from './base';

export class CredentialsPage extends BasePage {
	url = '/home/credentials';

	getters = {
		emptyListCreateCredentialButton: () => cy.getByTestId('empty-resources-list').find('button'),
		createCredentialButton: () => {
			cy.getByTestId('resource-add').should('be.visible').click();

			cy.getByTestId('navigation-submenu')
				.should('be.visible')
				.filter(':contains("Credential")')
				.last()

				.click();

			return cy
				.getByTestId('navigation-submenu-item')
				.should('be.visible')
				.filter(':contains("Personal")')
				.last();
		},

		// cy.getByTestId('resources-list-add'),
		searchInput: () => cy.getByTestId('resources-list-search'),
		emptyList: () => cy.getByTestId('resources-list-empty'),
		credentialCards: () => cy.getByTestId('resources-list-item'),
		credentialCard: (credentialName: string) =>
			this.getters
				.credentialCards()
				.contains(credentialName)
				.parents('[data-test-id="resources-list-item"]'),
		credentialCardActions: (credentialName: string) =>
			this.getters.credentialCard(credentialName).findChildByTestId('credential-card-actions'),
		credentialDeleteButton: () =>
			cy.getByTestId('action-toggle-dropdown').filter(':visible').contains('Delete'),
		credentialMoveButton: () =>
			cy.getByTestId('action-toggle-dropdown').filter(':visible').contains('Move'),
		sort: () => cy.getByTestId('resources-list-sort').first(),
		sortOption: (label: string) =>
			cy.getByTestId('resources-list-sort-item').contains(label).first(),
		filtersTrigger: () => cy.getByTestId('resources-list-filters-trigger'),
		filtersDropdown: () => cy.getByTestId('resources-list-filters-dropdown'),
	};

	actions = {
		search: (searchString: string) => {
			const searchInput = this.getters.searchInput();
			searchInput.clear();

			if (searchString) {
				searchInput.type(searchString);
			}
		},
		sortBy: (type: 'nameAsc' | 'nameDesc' | 'lastUpdated' | 'lastCreated') => {
			const sortTypes = {
				nameAsc: 'Sort by name (A-Z)',
				nameDesc: 'Sort by name (Z-A)',
				lastUpdated: 'Sort by last updated',
				lastCreated: 'Sort by last created',
			};

			this.getters.sort().click();
			this.getters.sortOption(sortTypes[type]).click();
		},
	};
}
