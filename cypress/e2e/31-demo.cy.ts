import workflow from '../fixtures/Manual_wait_set.json';
import { importWorkflow, visitDemoPage } from '../pages/demo';
import { errorToast } from '../pages/notifications';
import { WorkflowPage } from '../pages/workflow';

const workflowPage = new WorkflowPage();

describe('Demo', () => {
	beforeEach(() => {
		cy.overrideSettings({ previewMode: true });
		cy.signout();
	});

	it('can import template', () => {
		visitDemoPage();
		errorToast().should('not.exist');
		importWorkflow(workflow);
		workflowPage.getters.canvasNodes().should('have.length', 3);
	});

	it('can override theme to dark', () => {
		visitDemoPage('dark');
		cy.get('body').should('have.attr', 'data-theme', 'dark');
		errorToast().should('not.exist');
	});

	it('can override theme to light', () => {
		visitDemoPage('light');
		cy.get('body').should('have.attr', 'data-theme', 'light');
		errorToast().should('not.exist');
	});
});
