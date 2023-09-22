import { WorkflowPage, NDV, CredentialsModal } from '../pages';
import { v4 as uuid } from 'uuid';
import { cowBase64 } from '../support/binaryTestFiles';
import { BACKEND_BASE_URL, EDIT_FIELDS_SET_NODE_NAME } from '../constants';
import { getVisibleSelect } from '../utils';

const workflowPage = new WorkflowPage();
const ndv = new NDV();
const credentialsModal = new CredentialsModal();

const waitForWebhook = 500;

interface SimpleWebhookCallOptions {
	method: string;
	webhookPath: string;
	responseCode?: number;
	respondWith?: string;
	executeNow?: boolean;
	responseData?: string;
	authentication?: string;
}

const simpleWebhookCall = (options: SimpleWebhookCallOptions) => {
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
		cy.getByTestId('parameter-input-responseCode')
			.find('.parameter-input')
			.find('input')
			.clear()
			.type(responseCode.toString());
	}

	if (respondWith) {
		cy.getByTestId('parameter-input-responseMode').click();
		getVisibleSelect().find('.option-headline').contains(respondWith).click();
	}

	if (responseData) {
		cy.getByTestId('parameter-input-responseData').click();
		getVisibleSelect().find('.option-headline').contains(responseData).click();
	}

	if (executeNow) {
		ndv.actions.execute();
		cy.wait(waitForWebhook);

		cy.request(method, `${BACKEND_BASE_URL}/webhook-test/${webhookPath}`).then((response) => {
			expect(response.status).to.eq(200);
			ndv.getters.outputPanel().contains('headers');
		});
	}
};

describe('Webhook Trigger node', async () => {
	beforeEach(() => {
		workflowPage.actions.visit();
	});

	it('should listen for a GET request', () => {
		simpleWebhookCall({ method: 'GET', webhookPath: uuid(), executeNow: true });
	});

	it('should listen for a POST request', () => {
		simpleWebhookCall({ method: 'POST', webhookPath: uuid(), executeNow: true });
	});

	it('should listen for a DELETE request', () => {
		simpleWebhookCall({ method: 'DELETE', webhookPath: uuid(), executeNow: true });
	});
	it('should listen for a HEAD request', () => {
		simpleWebhookCall({ method: 'HEAD', webhookPath: uuid(), executeNow: true });
	});
	it('should listen for a PATCH request', () => {
		simpleWebhookCall({ method: 'PATCH', webhookPath: uuid(), executeNow: true });
	});
	it('should listen for a PUT request', () => {
		simpleWebhookCall({ method: 'PUT', webhookPath: uuid(), executeNow: true });
	});

	it('should listen for a GET request and respond with Respond to Webhook node', () => {
		const webhookPath = uuid();
		simpleWebhookCall({
			method: 'GET',
			webhookPath,
			executeNow: false,
			respondWith: 'Respond to Webhook',
		});

		ndv.getters.backToCanvas().click();

		addEditFields();

		ndv.getters.backToCanvas().click({ force: true });

		workflowPage.actions.addNodeToCanvas('Respond to Webhook');

		workflowPage.actions.executeWorkflow();
		cy.wait(waitForWebhook);

		cy.request('GET', `${BACKEND_BASE_URL}/webhook-test/${webhookPath}`).then((response) => {
			expect(response.status).to.eq(200);
			expect(response.body.MyValue).to.eq(1234);
		});
	});

	it('should listen for a GET request and respond custom status code 201', () => {
		const webhookPath = uuid();
		simpleWebhookCall({
			method: 'GET',
			webhookPath,
			executeNow: false,
			responseCode: 201,
		});

		ndv.actions.execute();
		cy.wait(waitForWebhook);

		cy.request('GET', `${BACKEND_BASE_URL}/webhook-test/${webhookPath}`).then((response) => {
			expect(response.status).to.eq(201);
		});
	});

	it('should listen for a GET request and respond with last node', () => {
		const webhookPath = uuid();
		simpleWebhookCall({
			method: 'GET',
			webhookPath,
			executeNow: false,
			respondWith: 'Last Node',
		});
		ndv.getters.backToCanvas().click();

		addEditFields();

		ndv.getters.backToCanvas().click({ force: true });

		workflowPage.actions.executeWorkflow();
		cy.wait(waitForWebhook);

		cy.request('GET', `${BACKEND_BASE_URL}/webhook-test/${webhookPath}`).then((response) => {
			expect(response.status).to.eq(200);
			expect(response.body.MyValue).to.eq(1234);
		});
	});

	it('should listen for a GET request and respond with last node binary data', () => {
		const webhookPath = uuid();
		simpleWebhookCall({
			method: 'GET',
			webhookPath,
			executeNow: false,
			respondWith: 'Last Node',
			responseData: 'First Entry Binary',
		});
		ndv.getters.backToCanvas().click();

		workflowPage.actions.addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME);
		workflowPage.actions.openNode(EDIT_FIELDS_SET_NODE_NAME);
		cy.get('.fixed-collection-parameter > :nth-child(2) > .button > span').click();
		ndv.getters.nthParam(2).type('data');
		ndv.getters.nthParam(4).invoke('val', cowBase64).trigger('blur');

		ndv.getters.backToCanvas().click();

		workflowPage.actions.addNodeToCanvas('Move Binary Data');
		workflowPage.actions.zoomToFit();

		workflowPage.actions.openNode('Move Binary Data');
		cy.getByTestId('parameter-input-mode').click();
		getVisibleSelect().find('.option-headline').contains('JSON to Binary').click();
		ndv.getters.backToCanvas().click();

		workflowPage.actions.executeWorkflow();
		cy.wait(waitForWebhook);

		cy.request('GET', `${BACKEND_BASE_URL}/webhook-test/${webhookPath}`).then((response) => {
			expect(response.status).to.eq(200);
			expect(Object.keys(response.body).includes('data')).to.be.true;
		});
	});

	it('should listen for a GET request and respond with an empty body', () => {
		const webhookPath = uuid();
		simpleWebhookCall({
			method: 'GET',
			webhookPath,
			executeNow: false,
			respondWith: 'Last Node',
			responseData: 'No Response Body',
		});
		ndv.actions.execute();
		cy.wait(waitForWebhook);
		cy.request('GET', `${BACKEND_BASE_URL}/webhook-test/${webhookPath}`).then((response) => {
			expect(response.status).to.eq(200);
			expect(response.body.MyValue).to.be.undefined;
		});
	});

	it('should listen for a GET request with Basic Authentication', () => {
		const webhookPath = uuid();
		simpleWebhookCall({
			method: 'GET',
			webhookPath,
			executeNow: false,
			authentication: 'Basic Auth',
		});
		// add credentials
		workflowPage.getters.nodeCredentialsSelect().click();
		getVisibleSelect().find('li').last().click();
		credentialsModal.getters.credentialsEditModal().should('be.visible');
		credentialsModal.actions.fillCredentialsForm();

		ndv.actions.execute();
		cy.wait(waitForWebhook);
		cy.request({
			method: 'GET',
			url: `${BACKEND_BASE_URL}/webhook-test/${webhookPath}`,
			auth: {
				user: 'username',
				pass: 'password',
			},
			failOnStatusCode: false,
		})
			.then((response) => {
				expect(response.status).to.eq(403);
			})
			.then(() => {
				cy.request({
					method: 'GET',
					url: `${BACKEND_BASE_URL}/webhook-test/${webhookPath}`,
					auth: {
						user: 'test',
						pass: 'test',
					},
					failOnStatusCode: true,
				}).then((response) => {
					expect(response.status).to.eq(200);
				});
			});
	});

	it('should listen for a GET request with Header Authentication', () => {
		const webhookPath = uuid();
		simpleWebhookCall({
			method: 'GET',
			webhookPath,
			executeNow: false,
			authentication: 'Header Auth',
		});
		// add credentials
		workflowPage.getters.nodeCredentialsSelect().click();
		getVisibleSelect().find('li').last().click();
		credentialsModal.getters.credentialsEditModal().should('be.visible');
		credentialsModal.actions.fillCredentialsForm();

		ndv.actions.execute();
		cy.wait(waitForWebhook);
		cy.request({
			method: 'GET',
			url: `${BACKEND_BASE_URL}/webhook-test/${webhookPath}`,
			headers: {
				test: 'wrong',
			},
			failOnStatusCode: false,
		})
			.then((response) => {
				expect(response.status).to.eq(403);
			})
			.then(() => {
				cy.request({
					method: 'GET',
					url: `${BACKEND_BASE_URL}/webhook-test/${webhookPath}`,
					headers: {
						test: 'test',
					},
					failOnStatusCode: true,
				}).then((response) => {
					expect(response.status).to.eq(200);
				});
			});
	});
});

const addEditFields = () => {
	workflowPage.actions.addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME);
	workflowPage.actions.openNode(EDIT_FIELDS_SET_NODE_NAME);
	cy.get('.fixed-collection-parameter > :nth-child(2) > .button > span').click();
	ndv.getters.nthParam(2).type('MyValue');
	ndv.getters.nthParam(3).click();
	cy.get('div').contains('Number').click();
	ndv.getters.nthParam(4).type('1234');
};
