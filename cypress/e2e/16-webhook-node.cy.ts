import { nanoid } from 'nanoid';

import { simpleWebhookCall, waitForWebhook } from '../composables/webhooks';
import { BACKEND_BASE_URL, EDIT_FIELDS_SET_NODE_NAME } from '../constants';
import { WorkflowPage, NDV, CredentialsModal } from '../pages';
import { cowBase64 } from '../support/binaryTestFiles';
import { getVisibleSelect } from '../utils';

const workflowPage = new WorkflowPage();
const ndv = new NDV();
const credentialsModal = new CredentialsModal();

describe('Webhook Trigger node', () => {
	beforeEach(() => {
		workflowPage.actions.visit();
	});

	it('should listen for a GET request', () => {
		simpleWebhookCall({ method: 'GET', webhookPath: nanoid(), executeNow: true });
	});

	it('should listen for a POST request', () => {
		simpleWebhookCall({ method: 'POST', webhookPath: nanoid(), executeNow: true });
	});

	it('should listen for a DELETE request', () => {
		simpleWebhookCall({ method: 'DELETE', webhookPath: nanoid(), executeNow: true });
	});
	it('should listen for a HEAD request', () => {
		simpleWebhookCall({ method: 'HEAD', webhookPath: nanoid(), executeNow: true });
	});
	it('should listen for a PATCH request', () => {
		simpleWebhookCall({ method: 'PATCH', webhookPath: nanoid(), executeNow: true });
	});
	it('should listen for a PUT request', () => {
		simpleWebhookCall({ method: 'PUT', webhookPath: nanoid(), executeNow: true });
	});

	it('should listen for a GET request and respond with Respond to Webhook node', () => {
		const webhookPath = nanoid();
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

		cy.request<{ MyValue: number }>('GET', `${BACKEND_BASE_URL}/webhook-test/${webhookPath}`).then(
			(response) => {
				expect(response.status).to.eq(200);
				expect(response.body.MyValue).to.eq(1234);
			},
		);
	});

	it('should listen for a GET request and respond custom status code 201', () => {
		const webhookPath = nanoid();
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
		const webhookPath = nanoid();
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

		cy.request<{ MyValue: number }>('GET', `${BACKEND_BASE_URL}/webhook-test/${webhookPath}`).then(
			(response) => {
				expect(response.status).to.eq(200);
				expect(response.body.MyValue).to.eq(1234);
			},
		);
	});

	it('should listen for a GET request and respond with last node binary data', () => {
		const webhookPath = nanoid();
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
		ndv.getters.assignmentCollectionAdd('assignments').click();
		ndv.getters.assignmentName('assignments').type('data').find('input').blur();
		ndv.getters.assignmentType('assignments').click();
		ndv.getters.assignmentValue('assignments').paste(cowBase64);

		ndv.getters.backToCanvas().click();

		workflowPage.actions.addNodeToCanvas('Convert to File');
		workflowPage.actions.zoomToFit();

		workflowPage.actions.openNode('Convert to File');
		cy.getByTestId('parameter-input-operation').click();
		getVisibleSelect().find('.option-headline').contains('Convert to JSON').click();
		cy.getByTestId('parameter-input-mode').click();
		getVisibleSelect().find('.option-headline').contains('Each Item to Separate File').click();
		ndv.getters.backToCanvas().click();

		workflowPage.actions.executeWorkflow();
		cy.wait(waitForWebhook);

		cy.request<{ data: unknown }>('GET', `${BACKEND_BASE_URL}/webhook-test/${webhookPath}`).then(
			(response) => {
				expect(response.status).to.eq(200);
				expect(Object.keys(response.body).includes('data')).to.be.true;
			},
		);
	});

	it('should listen for a GET request and respond with an empty body', () => {
		const webhookPath = nanoid();
		simpleWebhookCall({
			method: 'GET',
			webhookPath,
			executeNow: false,
			respondWith: 'Last Node',
			responseData: 'No Response Body',
		});
		ndv.actions.execute();
		cy.wait(waitForWebhook);
		cy.request<{ MyValue: unknown }>('GET', `${BACKEND_BASE_URL}/webhook-test/${webhookPath}`).then(
			(response) => {
				expect(response.status).to.eq(200);
				expect(response.body.MyValue).to.be.undefined;
			},
		);
	});

	it('should listen for a GET request with Basic Authentication', () => {
		const webhookPath = nanoid();
		simpleWebhookCall({
			method: 'GET',
			webhookPath,
			executeNow: false,
			authentication: 'Basic Auth',
		});
		// add credentials
		workflowPage.getters.nodeCredentialsSelect().click();
		workflowPage.getters.nodeCredentialsCreateOption().click();
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
		const webhookPath = nanoid();
		simpleWebhookCall({
			method: 'GET',
			webhookPath,
			executeNow: false,
			authentication: 'Header Auth',
		});
		// add credentials
		workflowPage.getters.nodeCredentialsSelect().click();
		workflowPage.getters.nodeCredentialsCreateOption().click();
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
	ndv.getters.assignmentCollectionAdd('assignments').click();
	ndv.getters.assignmentName('assignments').type('MyValue').find('input').blur();
	ndv.getters.assignmentType('assignments').click();
	getVisibleSelect().find('li').contains('Number').click();
	ndv.getters.assignmentValue('assignments').type('1234');
};
