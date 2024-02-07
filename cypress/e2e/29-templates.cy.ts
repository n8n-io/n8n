import { TemplatesPage } from '../pages/templates';
import { WorkflowPage } from '../pages/workflow';

import OnboardingWorkflow from '../fixtures/Onboarding_workflow.json';

const templatesPage = new TemplatesPage();
const workflowPage = new WorkflowPage();

describe('Templates', () => {
	beforeEach(() => {
		cy.intercept('GET', '**/api/templates/search?page=1&rows=20&category=&search=', { fixture: 'templates_search/all_templates_search_response.json' }).as('searchRequest');
		cy.intercept('GET', '**/api/templates/search?page=1&rows=20&category=Sales*', { fixture: 'templates_search/sales_templates_search_response.json' }).as('categorySearchRequest');
		cy.intercept('GET', '**/api/templates/workflows/*', { fixture: 'templates_search/test_template_preview.json' }).as('singleTemplateRequest');
		cy.intercept('GET', '**/api/workflows/templates/*', { fixture: 'templates_search/test_template_import.json' }).as('singleTemplateRequest');
	});

	it('can open onboarding flow', () => {
		templatesPage.actions.openOnboardingFlow(1234, OnboardingWorkflow.name, OnboardingWorkflow);
		cy.url().then(($url) => {
			expect($url).to.match(/.*\/workflow\/.*?onboardingId=1234$/);
		})

		workflowPage.actions.shouldHaveWorkflowName(`Demo: ${name}`);

		workflowPage.getters.canvasNodes().should('have.length', 4);
		workflowPage.getters.stickies().should('have.length', 1);
		workflowPage.getters.canvasNodes().first().should('have.descendants', '.node-pin-data-icon');
	});

	it('can import template', () => {
		templatesPage.actions.importTemplate(1234, OnboardingWorkflow.name, OnboardingWorkflow);

		cy.url().then(($url) => {
			expect($url).to.include('/workflow/new?templateId=1234');
		});

		workflowPage.getters.canvasNodes().should('have.length', 4);
		workflowPage.getters.stickies().should('have.length', 1);
		workflowPage.actions.shouldHaveWorkflowName(OnboardingWorkflow.name);
	});
});
