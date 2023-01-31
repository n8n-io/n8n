import { WorkflowsPage, WorkflowPage, NDV } from '../pages';
import { v4 as uuid } from 'uuid';

const workflowsPage = new WorkflowsPage();
const workflowPage = new WorkflowPage();
const ndv = new NDV();

describe('NDV', () => {
	beforeEach(() => {
		cy.resetAll();
		cy.skipSetup();
		workflowsPage.actions.createWorkflowFromCard();
		workflowPage.actions.renameWorkflow(uuid());
		workflowPage.actions.saveWorkflowOnButtonClick();
	});

	it('should show up when double clicked on a node and close when Back to canvas clicked', () => {
		workflowPage.actions.addInitialNodeToCanvas('Manual Trigger');
		workflowPage.getters.canvasNodes().first().dblclick();
		ndv.getters.container().should('be.visible');
		ndv.getters.backToCanvas().click();
		ndv.getters.container().should('not.be.visible');
	});

	it('should test webhook node', () => {
		workflowPage.actions.addInitialNodeToCanvas('Webhook');
		workflowPage.getters.canvasNodes().first().dblclick();

		ndv.actions.execute();
		ndv.getters.copyInput().click();

		cy.grantBrowserPermissions('clipboardReadWrite', 'clipboardSanitizedWrite');

		cy.readClipboard().then((url) => {
			cy.request({
				method: 'GET',
				url,
			}).then((resp) => {
				expect(resp.status).to.eq(200);
			});
		});

		ndv.getters.runDataDisplayMode().should('have.length.at.least', 1).and('be.visible');
	});

	it('should change input', () => {
		cy.createFixtureWorkflow('NDV-test-select-input.json', `NDV test select input ${uuid()}`);
		workflowPage.actions.zoomToFit();
		workflowPage.getters.canvasNodes().last().dblclick();
		ndv.getters.inputSelect().click();
		ndv.getters.inputOption().last().click();
		ndv.getters.inputDataContainer().should('contain', 'start');
	});

	it('should show correct validation state for resource locator params', () => {
		workflowPage.actions.addNodeToCanvas('Typeform', true, false);
		ndv.getters.container().should('be.visible');
		cy.get('.has-issues').should('have.length', 0);
		cy.get('[class*=hasIssues]').should('have.length', 0);
		ndv.getters.backToCanvas().click();
		// Both credentials and resource locator errors should be visible
		workflowPage.actions.openNode('Typeform');
		cy.get('.has-issues').should('have.length', 1);
		cy.get('[class*=hasIssues]').should('have.length', 1);
	});

	it('should show validation errors only after blur or re-opening of NDV', () => {
		workflowPage.actions.addNodeToCanvas('Manual Trigger');
		workflowPage.actions.addNodeToCanvas('Airtable', true, true);
		ndv.getters.container().should('be.visible');
		cy.get('.has-issues').should('have.length', 0);
		ndv.getters.parameterInput('table').find('input').eq(1).focus().blur();
		ndv.getters.parameterInput('application').find('input').eq(1).focus().blur();
		cy.get('.has-issues').should('have.length', 2);
		ndv.getters.backToCanvas().click();
		workflowPage.actions.openNode('Airtable');
		cy.get('.has-issues').should('have.length', 3);
		cy.get('[class*=hasIssues]').should('have.length', 1);
	});

	it('should show all validation errors when opening pasted node', () => {
		cy.fixture('Test_workflow_ndv_errors.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
			workflowPage.getters.canvasNodes().should('have.have.length', 1);
			workflowPage.actions.openNode('Airtable');
			cy.get('.has-issues').should('have.length', 3);
			cy.get('[class*=hasIssues]').should('have.length', 1);
		});
	});
});
