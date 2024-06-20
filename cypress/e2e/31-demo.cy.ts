import workflow from '../fixtures/Manual_wait_set.json';
import { importWorkflow, vistDemoPage } from '../pages/demo';
import { WorkflowPage } from '../pages/workflow';

const workflowPage = new WorkflowPage();

describe('Demo', () => {
	it('can import template', () => {
		vistDemoPage();
		importWorkflow(workflow);
		workflowPage.getters.canvasNodes().should('have.length', 3);
	});

	it('can override theme to dark', () => {
		vistDemoPage('dark');
		cy.get('body').should('have.attr', 'data-theme', 'dark');
	});

	it('can override theme to light', () => {
		vistDemoPage('light');
		cy.get('body').should('have.attr', 'data-theme', 'light');
	});
});
