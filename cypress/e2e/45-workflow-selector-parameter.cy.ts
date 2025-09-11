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
			cy.createFixtureWorkflow(`Test_Subworkflow_${workflowName}.json`);
			workflowPage.actions.setWorkflowName(workflowName);
		});
		workflowPage.actions.visit();
		workflowPage.actions.addInitialNodeToCanvas(EXECUTE_WORKFLOW_NODE_NAME, {
			keepNdvOpen: true,
			action: 'Execute A Sub Workflow',
		});
	});
	it('should render sub-workflows list', () => {
		ndv.getters.resourceLocator('workflowId').should('be.visible');
		ndv.getters.resourceLocatorInput('workflowId').click();

		getVisiblePopper()
			.should('have.length', 1)
			.findChildByTestId('rlc-item')
			.should('have.length', 2);

		getVisiblePopper().findChildByTestId('rlc-item-add-resource').should('have.length', 1);
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
			.eq(0)
			.click();

		ndv.getters
			.resourceLocatorInput('workflowId')
			.find('input')
			.should('have.value', 'Get_Weather');
	});

	it('should render sub-workflow links correctly', () => {
		ndv.getters.resourceLocator('workflowId').should('be.visible');
		ndv.getters.resourceLocatorInput('workflowId').click();

		getVisiblePopper().findChildByTestId('rlc-item').eq(1).click();

		ndv.getters.resourceLocatorInput('workflowId').find('a').should('exist');
		cy.getByTestId('radio-button-expression').eq(1).click();
		ndv.getters.resourceLocatorInput('workflowId').find('a').should('not.exist');
	});

	it('should switch to ID mode on expression', () => {
		ndv.getters.resourceLocator('workflowId').should('be.visible');
		ndv.getters.resourceLocatorInput('workflowId').click();

		getVisiblePopper().findChildByTestId('rlc-item').eq(1).click();
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

	it('should render add resource option and redirect to the correct route when clicked', () => {
		cy.window().then((win) => {
			cy.stub(win, 'open').as('windowOpen');
		});

		cy.intercept('POST', '/rest/workflows*').as('createSubworkflow');

		ndv.getters.resourceLocator('workflowId').should('be.visible');
		ndv.getters.resourceLocatorInput('workflowId').click();

		getVisiblePopper().findChildByTestId('rlc-item-add-resource').eq(0).should('exist');
		getVisiblePopper()
			.findChildByTestId('rlc-item-add-resource')
			.eq(0)
			.find('span')
			.should('contain.text', 'Create a'); // Due to some inconsistency we're sometimes in a project and sometimes not, this covers both cases

		getVisiblePopper().findChildByTestId('rlc-item-add-resource').eq(0).click();

		cy.wait('@createSubworkflow').then((interception) => {
			expect(interception.request.body).to.have.property('name').that.includes('Sub-Workflow');
			expect(interception.request.body.nodes).to.be.an('array');
			expect(interception.request.body.nodes).to.have.length(2);
			expect(interception.request.body.nodes[0]).to.have.property(
				'name',
				'When Executed by Another Workflow',
			);
			expect(interception.request.body.nodes[1]).to.have.property(
				'name',
				'Replace me with your logic',
			);
		});

		cy.get('@windowOpen').should('be.calledWithMatch', /\/workflow\/.+/);
	});
});
