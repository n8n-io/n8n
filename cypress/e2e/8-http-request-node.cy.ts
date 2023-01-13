import { WorkflowPage, WorkflowsPage, NDV } from '../pages';

const workflowsPage = new WorkflowsPage();
const workflowPage = new WorkflowPage();
const ndv = new NDV()

describe('HTTP Request node', () => {
	before(() => {
		cy.resetAll();
		cy.skipSetup();
	});

	it('should make a request with a URL and receive a response', () => {
		workflowsPage.actions.createWorkflowFromCard();
		workflowPage.actions.addInitialNodeToCanvas('Manual Trigger');
		workflowPage.actions.addNodeToCanvas('HTTP Request');
		workflowPage.actions.openNodeNdv('HTTP Request');
		ndv.actions.typeIntoParameterInput('url', 'https://catfact.ninja/fact');

		workflowPage.actions.executeNodeFromNdv();

		ndv.getters.outputPanel().contains('fact');
	});
});
