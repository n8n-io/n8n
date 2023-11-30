import { BasePage } from './base';

export class TemplateCollectionPage extends BasePage {
	url = '/collections';

	getters = {};

	actions = {
		visit: (collectionId: number) => {
			cy.visit(`${this.url}/${collectionId}`);
		},

		clickUseWorkflowButton: (workflowTitle: string) => {
			cy.getByTestId('template-card').contains(workflowTitle).realHover();

			cy.getByTestId('use-workflow-button').find(':visible').click();
		},
	};
}
