import { BasePage } from './base';

/**
 * @deprecated Use functional composables from @composables instead.
 * If a composable doesn't exist for your use case, please create a new one in:
 * cypress/composables
 *
 * This class-based approach is being phased out in favor of more modular functional composables.
 * Each getter and action in this class should be moved to individual composable functions.
 */
export class CredentialsPage extends BasePage {
	url = '/home/credentials';

	getters = {
		emptyListCreateCredentialButton: () => cy.getByTestId('empty-resources-list').find('button'),
		createCredentialButton: () => {
			cy.getByTestId('add-resource').should('be.visible').click();
			cy.getByTestId('add-resource').getByTestId('action-credential').should('be.visible');
			return cy.getByTestId('add-resource').getByTestId('action-credential');
		},
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
			cy.getByTestId('action-toggle-dropdown').filter(':visible').contains('Change owner'),
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
