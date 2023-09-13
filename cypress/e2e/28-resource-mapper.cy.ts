import { WorkflowPage, NDV } from '../pages';

const workflowPage = new WorkflowPage();
const ndv = new NDV();

describe('Resource Mapper', () => {
	beforeEach(() => {
		workflowPage.actions.visit();
	});

	it('should not retrieve list options when required params throw errors', () => {
		workflowPage.actions.addInitialNodeToCanvas('E2e Test', {
			action: 'Resource Mapping Component',
		});

		ndv.getters
			.resourceMapperFieldsContainer()
			.should('be.visible')
			.findChildByTestId('parameter-input')
			.should('have.length', 2);

		ndv.actions.setInvalidExpression('fieldId');

		ndv.actions.refreshResourceMapperColumns();
		ndv.getters.resourceMapperFieldsContainer().should('not.exist');
	});

	it('should retrieve list options when optional params throw errors', () => {
		workflowPage.actions.addInitialNodeToCanvas('E2e Test', {
			action: 'Resource Mapping Component',
		});

		ndv.getters
			.resourceMapperFieldsContainer()
			.should('be.visible')
			.findChildByTestId('parameter-input')
			.should('have.length', 2);

		ndv.actions.setInvalidExpression('otherField');

		ndv.actions.refreshResourceMapperColumns();
		ndv.getters
			.resourceMapperFieldsContainer()
			.should('be.visible')
			.findChildByTestId('parameter-input')
			.should('have.length', 2);
	});

	it('should delete fields from UI and parameter value when they are deleted', () => {
		workflowPage.actions.addInitialNodeToCanvas('E2e Test', {
			action: 'Resource Mapping Component',
		});
		ndv.getters.parameterInput('id').type('001');
		ndv.getters.parameterInput('name').type('John');
		ndv.getters.nodeExecuteButton().click();
		ndv.getters.outputTableHeaderByText('id').should('exist');
		ndv.getters.outputTableHeaderByText('name').should('exist');
		ndv.getters.resourceMapperRemoveFieldButton('name').should('exist').click({ force: true });
		ndv.getters.nodeExecuteButton().click();
		ndv.getters.parameterInput('id').should('exist');
		ndv.getters.outputTableHeaderByText('id').should('exist');
		// After removing the field, text field and the output table column should not be there anymore
		ndv.getters.parameterInput('name').should('not.exist');
		ndv.getters.outputTableHeaderByText('name').should('not.exist');
	});
});
