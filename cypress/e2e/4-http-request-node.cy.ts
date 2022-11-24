import { WorkflowsPage as WorkflowsPageClass } from '../pages/workflows';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

const WorkflowsPage = new WorkflowsPageClass();
const WorkflowPage = new WorkflowPageClass();

describe('HTTP Request node', () => {
	beforeEach(() => {
		cy.skipSetup();
	});

	it('should make a request with a URL and receive a response', () => {
		WorkflowsPage.getters.newWorkflowButtonCard().click();
		WorkflowPage.getters.canvas.addButton().click();
		WorkflowPage.getters.nodeCreator.searchBar().type('Manual Trigger{enter}{esc}');
		WorkflowPage.getters.nodeCreator.addNodeButton().click();
		WorkflowPage.getters.nodeCreator.searchBar().type('HTTP{enter}{esc}');
		WorkflowPage.getters.canvas.nodeBox('n8n-nodes-base.httpRequest').dblclick();
		WorkflowPage.getters.ndv.parameterInput('url').type('https://google.com');
		WorkflowPage.getters.ndv.executeNodeButton().click();
		WorkflowPage.getters.ndv.outputPanel().contains('<!doctype html>');
	});
});
