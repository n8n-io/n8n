import { BasePage } from './base';

export class TemplateWorkflowPage extends BasePage {
	url = '/templates';

	getters = {
		useTemplateButton: () => cy.get('[data-test-id="use-template-button"]'),
	};

	actions = {
		visit: (templateId: number) => {
			cy.visit(`${this.url}/${templateId}`);
		},

		clickUseThisWorkflowButton: () => {
			this.getters.useTemplateButton().click();
		},
	};
}
