import { BACKEND_BASE_URL } from '../constants';
import { NDV, WorkflowPage } from '../pages';
import { getVisibleSelect } from '../utils';

export const waitForWebhook = 500;

export interface SimpleWebhookCallOptions {
	method: string;
	webhookPath: string;
	responseCode?: number;
	respondWith?: string;
	executeNow?: boolean;
	responseData?: string;
	authentication?: string;
}

const workflowPage = new WorkflowPage();
const ndv = new NDV();

export const simpleWebhookCall = (options: SimpleWebhookCallOptions) => {
	const {
		authentication,
		method,
		webhookPath,
		responseCode,
		respondWith,
		responseData,
		executeNow = true,
	} = options;

	workflowPage.actions.addInitialNodeToCanvas('Webhook');
	workflowPage.actions.openNode('Webhook');

	cy.getByTestId('parameter-input-httpMethod').click();
	getVisibleSelect().find('.option-headline').contains(method).click();
	cy.getByTestId('parameter-input-path')
		.find('.parameter-input')
		.find('input')
		.clear()
		.type(webhookPath);

	if (authentication) {
		cy.getByTestId('parameter-input-authentication').click();
		getVisibleSelect().find('.option-headline').contains(authentication).click();
	}

	if (responseCode) {
		cy.get('.param-options').click();
		getVisibleSelect().contains('Response Code').click();
		cy.get('.parameter-item-wrapper > .parameter-input-list-wrapper').children().click();
		getVisibleSelect().contains('201').click();
	}

	if (respondWith) {
		cy.getByTestId('parameter-input-responseMode').click();
		getVisibleSelect().find('.option-headline').contains(respondWith).click();
	}

	if (responseData) {
		cy.getByTestId('parameter-input-responseData').click();
		getVisibleSelect().find('.option-headline').contains(responseData).click();
	}

	const callEndpoint = (fn: (response: Cypress.Response<unknown>) => void) => {
		cy.request(method, `${BACKEND_BASE_URL}/webhook-test/${webhookPath}`).then(fn);
	};

	if (executeNow) {
		ndv.actions.execute();
		cy.wait(waitForWebhook);

		callEndpoint((response) => {
			expect(response.status).to.eq(200);
			ndv.getters.outputPanel().contains('headers');
		});
	}

	return {
		callEndpoint,
	};
};
