import { TemplatesPage } from '../pages/templates';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

const templatesPage = new TemplatesPage();
const WorkflowPage = new WorkflowPageClass();

describe('Templates', () => {
	// it('can open onboarding flow', () => {
	// 	templatesPage.actions.openOnboardingFlow();

	// 	WorkflowPage.getters.canvasNodes().should('have.length', 4);
	// 	WorkflowPage.getters.stickies().should('have.length', 2);
	// });

	it('can import template', () => {
		templatesPage.actions.openTemplateImportFlow();

		WorkflowPage.getters.canvasNodes().should('have.length', 4);
		WorkflowPage.getters.stickies().should('have.length', 2);
	});
});
