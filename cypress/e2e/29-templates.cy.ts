import { TemplatesPage } from '../pages/templates';
import { WorkflowPage } from '../pages/workflow';

const templatesPage = new TemplatesPage();
const workflowPage = new WorkflowPage();

describe('Templates', () => {
	it('can open onboarding flow', () => {
		templatesPage.actions.openOnboardingFlow();

		workflowPage.getters.canvasNodes().should('have.length', 4);
		workflowPage.getters.stickies().should('have.length', 2);
	});

	it('can import template', () => {
		templatesPage.actions.openTemplateImportFlow();

		workflowPage.getters.canvasNodes().should('have.length', 4);
		workflowPage.getters.stickies().should('have.length', 2);
	});
});
