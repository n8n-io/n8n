import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';
import { NDV } from '../pages/ndv';
import { randFirstName, randLastName } from '@ngneat/falso';
import { DEFAULT_USER_EMAIL, DEFAULT_USER_PASSWORD } from '../constants';

const WorkflowPage = new WorkflowPageClass();
const ndv = new NDV();

const email = DEFAULT_USER_EMAIL;
const password = DEFAULT_USER_PASSWORD;
const firstName = randFirstName();
const lastName = randLastName();

describe('Code node', () => {
	before(() => {
		cy.setup({ email, firstName, lastName, password });
	});

	beforeEach(() => {
		cy.signin({ email, password });
		WorkflowPage.actions.visit();
	});

	it('should execute the placeholder in all-items mode successfully', () => {
		WorkflowPage.actions.addInitialNodeToCanvas('Manual');
		WorkflowPage.actions.addNodeToCanvas('Code');
		WorkflowPage.actions.openNode('Code');

		ndv.actions.execute();

		WorkflowPage.getters.successToast().contains('Node executed successfully');
	});

	it('should execute the placeholder in each-item mode successfully', () => {
		WorkflowPage.actions.addInitialNodeToCanvas('Manual');
		WorkflowPage.actions.addNodeToCanvas('Code');
		WorkflowPage.actions.openNode('Code');
		ndv.getters.parameterInput('mode').click();
		ndv.actions.selectOptionInParameterDropdown('mode', 'Run Once for Each Item');

		ndv.actions.execute();

		WorkflowPage.getters.successToast().contains('Node executed successfully');
	});
});
