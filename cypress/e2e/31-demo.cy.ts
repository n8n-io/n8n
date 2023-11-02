import workflow from '../fixtures/Manual_wait_set.json';
import { DemoPage } from '../pages/demo';
import { WorkflowPage } from '../pages/workflow';

const demoPage = new DemoPage();
const workflowPage = new WorkflowPage();

describe('Demo', () => {
	it('can import template', () => {
		demoPage.actions.visit();
		demoPage.actions.importWorkflow(workflow);
		workflowPage.getters.canvasNodes().should('have.length', 3);
	});

	it('can override theme to dark', () => {
		demoPage.actions.visit('dark');
		cy.get('body').should('have.attr', 'data-theme', 'dark');
	});

	it('can override theme to light', () => {
		demoPage.actions.visit('light');
		cy.get('body').should('have.attr', 'data-theme', 'light');
	});
});
