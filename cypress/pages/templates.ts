import { BasePage } from './base';

export class TemplatesPage extends BasePage {
	url = '/templates';

	getters = {
		useTemplateButton: () => cy.getByTestId('use-template-button'),
		templateCards: () => cy.getByTestId('template-card'),
		firstTemplateCard: () => this.getters.templateCards().first(),
		allCategoriesFilter: () => cy.getByTestId('template-filter-all-categories'),
		searchInput: () => cy.getByTestId('template-search-input'),
		categoryFilters: () => cy.get('[data-test-id^=template-filter]'),
		categoryFilter: (category: string) => cy.getByTestId(`template-filter-${category}`),
		collectionCountLabel: () => cy.getByTestId('collection-count-label'),
		templateCountLabel: () => cy.getByTestId('template-count-label'),
		templatesLoadingContainer: () => cy.getByTestId('templates-loading-container'),
		expandCategoriesButton: () => cy.getByTestId('expand-categories-button'),
	};

	actions = {
		openSingleTemplateView: (templateId: number) => {
			cy.visit(`${this.url}/${templateId}`);
			cy.waitForLoad();
		},

		openOnboardingFlow: (id: number, name: string, workflow: object, templatesHost: string) => {
			const apiResponse = {
				id,
				name,
				workflow,
			};
			cy.intercept('POST', '/rest/workflows').as('createWorkflow');
			cy.intercept('GET', `${templatesHost}/api/workflows/templates/${id}`, {
				statusCode: 200,
				body: apiResponse,
			}).as('getTemplate');
			cy.intercept('GET', 'rest/workflows/**').as('getWorkflow');

			cy.visit(`/workflows/onboarding/${id}`);

			cy.wait('@getTemplate');
			cy.wait(['@createWorkflow', '@getWorkflow']);
		},

		importTemplate: (id: number, name: string, workflow: object, templatesHost: string) => {
			const apiResponse = {
				id,
				name,
				workflow,
			};
			cy.intercept('GET', `${templatesHost}/api/workflows/templates/${id}`, {
				statusCode: 200,
				body: apiResponse,
			}).as('getTemplate');
			cy.intercept('GET', 'rest/workflows/**').as('getWorkflow');

			cy.visit(`/workflows/templates/${id}`);

			cy.wait('@getTemplate');
			cy.wait('@getWorkflow');
		},
	};
}
