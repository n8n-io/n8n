import { WorkflowsPage, WorkflowPage } from '../pages';
import {v4 as uuid} from 'uuid';

const workflowsPage = new WorkflowsPage();
const workflowPage = new WorkflowPage();

describe('NDV', () => {
	const workflowName = `Webhook Code Set ${uuid()}`;

	beforeEach(() => {
		cy.skipSetup();
		workflowsPage.getters.newWorkflowButtonCard().should('be.visible');
		workflowsPage.getters.newWorkflowButtonCard().click();

		cy.createFixtureWorkflow('Webhook-Code-Set-nodes.json', workflowName);
	});

	afterEach(() => {
		cy.deleteWorkflowByName(workflowName);
	});

	it('should test webhook node', () => {
		const webhookNode = workflowPage.getters.nodeByName('Webhook')

		webhookNode.should('be.visible');
		webhookNode.dblclick();

		cy.getByTestId('ndv').should('be.visible');

		cy.getByTestId('node-execute-button').first().click();
		cy.getByTestId('copy-input').click();

		cy.wrap(Cypress.automation('remote:debugger:protocol', {
			command: 'Browser.grantPermissions',
			params: {
				permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
				origin: window.location.origin,
			},
		}));

		cy.window().its('navigator.permissions')
			.invoke('query', {name: 'clipboard-read'})
			.its('state').should('equal', 'granted');

		cy.window().its('navigator.clipboard').invoke('readText').then(url => {
			cy.request({
				method: 'GET',
				url,
			}).then((resp) => {
				expect(resp.status).to.eq(200)
			})
		});

		cy.getByTestId('ndv-run-data-display-mode').should('have.length.at.least', 1);
	});
});
