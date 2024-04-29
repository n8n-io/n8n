import { BasePage } from './base';

export class TemplateWorkflowPage extends BasePage {
	url = '/templates';

	getters = {
		useTemplateButton: () => cy.get('[data-test-id="use-template-button"]'),
		description: () => cy.get('[data-test-id="template-description"]'),
	};

	actions = {
		visit: (templateId: number) => {
			cy.visit(`${this.url}/${templateId}`);
		},

		clickUseThisWorkflowButton: () => {
			this.getters.useTemplateButton().click();
		},

		openTemplate: (template: {
			workflow: {
				id: number;
				name: string;
				description: string;
				user: { username: string };
				image: { id: number; url: string }[];
			};
		}, templateHost: string) => {
			cy.intercept('GET', `${templateHost}/api/templates/workflows/${template.workflow.id}`, {
				statusCode: 200,
				body: template,
			}).as('getTemplate');

			this.actions.visit(template.workflow.id);
			cy.wait('@getTemplate');
		},
	};
}
