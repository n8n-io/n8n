import { getOutputTableRow } from '../composables/ndv';
import { getCanvasNodes, openNode } from '../composables/workflow';
import SIMPLE_WORKFLOW from '../fixtures/Manual_wait_set.json';
import WORKFLOW_WITH_PINNED from '../fixtures/Webhook_set_pinned.json';
import { importWorkflow, visitDemoPage } from '../pages/demo';
import { errorToast } from '../pages/notifications';

describe('Demo', () => {
	beforeEach(() => {
		cy.overrideSettings({ previewMode: true });
	});

	it('can import template', () => {
		visitDemoPage();
		errorToast().should('not.exist');
		importWorkflow(SIMPLE_WORKFLOW);
		getCanvasNodes().should('have.length', 3);
	});

	it('can import workflow with pin data', () => {
		visitDemoPage();
		importWorkflow(WORKFLOW_WITH_PINNED);
		getCanvasNodes().should('have.length', 2);
		openNode('Webhook');
		getOutputTableRow(0).should('include.text', 'headers');
		getOutputTableRow(1).should('include.text', 'dragons');
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
