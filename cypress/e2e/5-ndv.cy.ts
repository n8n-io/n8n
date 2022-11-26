import { WorkflowsPage, WorkflowPage } from '../pages';
import { v4 as uuid } from 'uuid';

const workflowsPage = new WorkflowsPage();
const workflowPage = new WorkflowPage();

describe('NDV', () => {
	beforeEach(() => {
		cy.task('db:reset');
		cy.skipSetup();
		workflowsPage.actions.createWorkflowFromCard();
		workflowPage.actions.renameWorkflow(uuid());
		workflowPage.actions.saveWorkflowOnButtonClick();
	});

	it('should show up when double clicked on a node and close when Back to canvas clicked', () => {
		workflowPage.actions.addInitialNodeToCanvas('Manual Trigger');
		workflowPage.getters.canvasNodes().first().dblclick();
		cy.getByTestId('ndv').should('be.visible');
		cy.getByTestId('back-to-canvas').click()
		cy.getByTestId('ndv').should('not.be.visible');
	});

	it('should test webhook node', () => {
		workflowPage.actions.addInitialNodeToCanvas('Webhook');
		workflowPage.getters.canvasNodes().first().dblclick();

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

		cy.getByTestId('ndv-run-data-display-mode').should('have.length.at.least', 1).and('be.visible');
	});

	it('should change input', () => {
		cy.createFixtureWorkflow('NDV-test-select-input.json', `NDV test select input ${uuid()}`);
		workflowPage.actions.zoomToFit();
		workflowPage.getters.canvasNodes().last().dblclick();
		cy.getByTestId('ndv-input-select').click();
		cy.getByTestId('ndv-input-option').last().click();
		cy.getByTestId('ndv-input-panel').within(() => {
			cy.getByTestId('ndv-data-container').should('contain', 'start');
		});
	});
});
