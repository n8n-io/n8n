import { WorkflowPage, WorkflowsPage, NDV } from '../pages';

const workflowsPage = new WorkflowsPage();
const workflowPage = new WorkflowPage();
const ndv = new NDV();

describe('HTTP Request node', () => {
	beforeEach(() => {
		cy.resetAll();
		cy.skipSetup();
	});

	it('should make a request with a URL and receive a response', () => {
		cy.visit(workflowsPage.url);

		workflowsPage.actions.createWorkflowFromCard();
		workflowPage.actions.addInitialNodeToCanvas('Manual Trigger');
		workflowPage.actions.addNodeToCanvas('HTTP Request');
		workflowPage.actions.openNode('HTTP Request');
		ndv.actions.typeIntoParameterInput('url', 'https://catfact.ninja/fact');

		ndv.actions.execute();

		ndv.getters.outputPanel().contains('fact');
	});
});
