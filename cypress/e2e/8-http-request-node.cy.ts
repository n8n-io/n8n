import { randFirstName, randLastName } from '@ngneat/falso';
import { DEFAULT_USER_EMAIL, DEFAULT_USER_PASSWORD } from '../constants';
import { WorkflowPage, NDV } from '../pages';

const workflowPage = new WorkflowPage();
const ndv = new NDV();

const email = DEFAULT_USER_EMAIL;
const password = DEFAULT_USER_PASSWORD;
const firstName = randFirstName();
const lastName = randLastName();

describe('HTTP Request node', () => {
	before(() => {
		cy.setup({ email, firstName, lastName, password });
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
