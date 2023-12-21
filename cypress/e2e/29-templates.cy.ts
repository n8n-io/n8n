import { TemplatesPage } from '../pages/templates';
import { WorkflowPage } from '../pages/workflow';

import OnboardingWorkflow from '../fixtures/Onboarding_workflow.json';
import WorkflowTemplate from '../fixtures/Workflow_template_write_http_query.json';
import { TemplateWorkflowPage } from '../pages/template-workflow';

const templatesPage = new TemplatesPage();
const workflowPage = new WorkflowPage();
const templateWorkflowPage = new TemplateWorkflowPage();

describe('Templates', () => {
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

	it('can open template with images and hides workflow screenshots', () => {
		templateWorkflowPage.actions.openTemplate(WorkflowTemplate);

		templateWorkflowPage.getters.description().find('img').should('have.length', 1);
	});
});
