import { IF_NODE_NAME } from '../constants';
import { WorkflowPage, NDV } from '../pages';

const workflowPage = new WorkflowPage();
const ndv = new NDV();

const FILTER_PARAM_NAME = 'conditions';

describe('If Node (filter component)', () => {
	beforeEach(() => {
		workflowPage.actions.visit();
	});

	it('should be able to create and delete multiple conditions', () => {
		workflowPage.actions.addInitialNodeToCanvas(IF_NODE_NAME, { keepNdvOpen: true });

		// Default state
		ndv.getters.filterComponent(FILTER_PARAM_NAME).should('exist');
		ndv.getters.filterConditions(FILTER_PARAM_NAME).should('have.length', 1);
		ndv.getters
			.filterConditionOperator(FILTER_PARAM_NAME)
			.find('input')
			.should('have.value', 'is equal to');

		// Add
		ndv.actions.addFilterCondition(FILTER_PARAM_NAME);
		ndv.getters.filterConditionLeft(FILTER_PARAM_NAME, 0).find('input').type('first left');
		ndv.getters.filterConditionLeft(FILTER_PARAM_NAME, 1).find('input').type('second left');
		ndv.actions.addFilterCondition(FILTER_PARAM_NAME);
		ndv.getters.filterConditions(FILTER_PARAM_NAME).should('have.length', 3);

		// Delete
		ndv.actions.removeFilterCondition(FILTER_PARAM_NAME, 0);
		ndv.getters.filterConditions(FILTER_PARAM_NAME).should('have.length', 2);
		ndv.getters
			.filterConditionLeft(FILTER_PARAM_NAME, 0)
			.find('input')
			.should('have.value', 'second left');
		ndv.actions.removeFilterCondition(FILTER_PARAM_NAME, 1);
		ndv.getters.filterConditions(FILTER_PARAM_NAME).should('have.length', 1);
	});

	it('should correctly evaluate conditions', () => {
		cy.fixture('Test_workflow_filter.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});

		workflowPage.actions.zoomToFit();
		workflowPage.actions.executeWorkflow();

		workflowPage.actions.openNode('Then');
		ndv.getters.outputPanel().contains('3 items').should('exist');
		ndv.actions.close();

		workflowPage.actions.openNode('Else');
		ndv.getters.outputPanel().contains('1 item').should('exist');
	});
});
