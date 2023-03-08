import { WorkflowPage, NDV } from '../pages';

const workflowPage = new WorkflowPage();
const ndv = new NDV();

describe('HTTP Request node', () => {
	before(() => {
		cy.resetAll();
		cy.skipSetup();
	});

	it('should make a request with a URL and receive a response', () => {
		workflowPage.actions.addInitialNodeToCanvas('Manual');
		workflowPage.actions.addNodeToCanvas('HTTP Request');
		workflowPage.actions.openNode('HTTP Request');
		ndv.actions.typeIntoParameterInput('url', 'https://catfact.ninja/fact');

		ndv.actions.execute();

		ndv.getters.outputPanel().contains('fact');
	});
});
