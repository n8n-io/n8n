import { BasePage } from './base';

export class TemplatesPage extends BasePage {
	url = '/templates';

	getters = {
		useTemplateButton: () => cy.getByTestId('use-template-button'),
		description: () => cy.getByTestId('template-description'),
		templateCards: () => cy.getByTestId('template-card'),
		firstTemplateCard: () => this.getters.templateCards().first(),
		allCategoriesFilter: () => cy.getByTestId('template-filter-all-categories'),
		searchInput: () => cy.getByTestId('template-search-input'),
		categoryFilters: () => cy.get('[data-test-id^=template-filter]'),
		categoryFilter: (category: string) => cy.getByTestId(`template-filter-${category}`),
		collectionCountLabel: () => cy.getByTestId('collection-count-label'),
		templateCountLabel: () => cy.getByTestId('template-count-label'),
		templatesLoadingContainer: () => cy.getByTestId('templates-loading-container'),
	};

	actions = {
		openOnboardingFlow: () => {
			cy.intercept('POST', '/rest/workflows').as('createWorkflow');
			cy.intercept('GET', 'rest/workflows/**').as('getWorkflow');

			cy.visit('/workflows/onboarding/1');
			cy.window().then((win) => {
				win.preventNodeViewBeforeUnload = true;
			});

			cy.wait(['@getTemplate', '@createWorkflow', '@getWorkflow']);
		},

		importTemplate: () => {
			cy.intercept('GET', 'rest/workflows/**').as('getWorkflow');

			cy.visit('/workflows/templates/1');
			cy.window().then((win) => {
				win.preventNodeViewBeforeUnload = true;
			});

			cy.wait(['@getTemplate', '@getWorkflow']);
		},
	};
}
