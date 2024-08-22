import { EXECUTE_WORKFLOW_NODE_NAME } from '../constants';
import { WorkflowPage as WorkflowPageClass, NDV } from '../pages';
import { getVisiblePopper } from '../utils';

const workflowPage = new WorkflowPageClass();
const ndv = new NDV();

describe('Workflow Selector Parameter', () => {
	beforeEach(() => {
		cy.resetDatabase();
		cy.signinAsOwner();
		['Get_Weather', 'Search_DB'].forEach((workflowName) => {
			workflowPage.actions.visit();
			cy.createFixtureWorkflow(`Test_Subworkflow_${workflowName}.json`, workflowName);
			workflowPage.actions.saveWorkflowOnButtonClick();
		});
		workflowPage.actions.visit();
		workflowPage.actions.addInitialNodeToCanvas(EXECUTE_WORKFLOW_NODE_NAME, {
			keepNdvOpen: true,
			action: 'Call Another Workflow',
		});
	});
	it('should render sub-workflows list', () => {
		ndv.getters.resourceLocator('workflowId').should('be.visible');
		ndv.getters.resourceLocatorInput('workflowId').click();

		getVisiblePopper()
			.should('have.length', 1)
			.findChildByTestId('rlc-item')
			.should('have.length', 2);
	});

	it('should show required parameter warning', () => {
		ndv.getters.resourceLocator('workflowId').should('be.visible');
		ndv.getters.resourceLocatorInput('workflowId').click();
		ndv.getters.parameterInputIssues('workflowId').should('exist');
	});

	it('should filter sub-workflows list', () => {
		ndv.getters.resourceLocator('workflowId').should('be.visible');
		ndv.getters.resourceLocatorInput('workflowId').click();
		ndv.getters.resourceLocatorSearch('workflowId').type('Weather');

		getVisiblePopper()
			.should('have.length', 1)
			.findChildByTestId('rlc-item')
			.should('have.length', 1)
			.click();

		ndv.getters
			.resourceLocatorInput('workflowId')
			.find('input')
			.should('have.value', 'Get_Weather');
	});

	it('should render sub-workflow links correctly', () => {
		ndv.getters.resourceLocator('workflowId').should('be.visible');
		ndv.getters.resourceLocatorInput('workflowId').click();

		getVisiblePopper().findChildByTestId('rlc-item').first().click();

		ndv.getters.resourceLocatorInput('workflowId').find('a').should('exist');
		cy.getByTestId('radio-button-expression').eq(1).click();
		ndv.getters.resourceLocatorInput('workflowId').find('a').should('not.exist');
	});

	it('should switch to ID mode on expression', () => {
		ndv.getters.resourceLocator('workflowId').should('be.visible');
		ndv.getters.resourceLocatorInput('workflowId').click();

		getVisiblePopper().findChildByTestId('rlc-item').first().click();
		ndv.getters
			.resourceLocatorModeSelector('workflowId')
			.find('input')
			.should('have.value', 'From list');
		cy.getByTestId('radio-button-expression').eq(1).click();
		ndv.getters
			.resourceLocatorModeSelector('workflowId')
			.find('input')
			.should('have.value', 'By ID');
	});
});
