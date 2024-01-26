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
			.should('have.length', 3);

		ndv.actions.setInvalidExpression({ fieldName: 'fieldId' });

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
			.should('have.length', 3);

		ndv.actions.setInvalidExpression({ fieldName: 'otherField' });

		ndv.actions.refreshResourceMapperColumns();
		ndv.getters
			.resourceMapperFieldsContainer()
			.should('be.visible')
			.findChildByTestId('parameter-input')
			.should('have.length', 3);
	});

	it('should correctly delete single field', () => {
		workflowPage.actions.addInitialNodeToCanvas('E2e Test', {
			action: 'Resource Mapping Component',
		});
		ndv.getters.parameterInput('id').type('001');
		ndv.getters.parameterInput('name').type('John');
		ndv.getters.parameterInput('age').type('30');
		ndv.getters.nodeExecuteButton().click();
		ndv.getters.outputTableHeaderByText('id').should('exist');
		ndv.getters.outputTableHeaderByText('name').should('exist');
		ndv.getters.outputTableHeaderByText('age').should('exist');
		// Remove the 'name' field
		ndv.getters.resourceMapperRemoveFieldButton('name').should('exist').click({ force: true });
		ndv.getters.nodeExecuteButton().click();
		ndv.getters.parameterInput('id').should('exist');
		ndv.getters.outputTableHeaderByText('id').should('exist');
		// After removing the field, text field and the output table column for the 'name' should not be there anymore
		ndv.getters.parameterInput('age').should('exist');
		ndv.getters.outputTableHeaderByText('age').should('exist');
		ndv.getters.parameterInput('name').should('not.exist');
		ndv.getters.outputTableHeaderByText('name').should('not.exist');
	});

	it('should correctly delete all fields', () => {
		workflowPage.actions.addInitialNodeToCanvas('E2e Test', {
			action: 'Resource Mapping Component',
		});
		ndv.getters.parameterInput('id').type('001');
		ndv.getters.parameterInput('name').type('John');
		ndv.getters.parameterInput('age').type('30');
		ndv.getters.nodeExecuteButton().click();
		ndv.getters.outputTableHeaderByText('id').should('exist');
		ndv.getters.outputTableHeaderByText('name').should('exist');
		ndv.getters.outputTableHeaderByText('age').should('exist');
		ndv.getters.resourceMapperColumnsOptionsButton().click();
		// Click on the 'Remove All Fields' option
		ndv.getters.resourceMapperRemoveAllFieldsOption().should('be.visible').click();
		ndv.getters.nodeExecuteButton().click();
		ndv.getters.parameterInput('id').should('exist');
		ndv.getters.outputTableHeaderByText('id').should('exist');
		// After removing the all fields, only required one should be in UI and output table
		ndv.getters.parameterInput('name').should('not.exist');
		ndv.getters.outputTableHeaderByText('name').should('not.exist');
		ndv.getters.parameterInput('age').should('not.exist');
		ndv.getters.outputTableHeaderByText('age').should('not.exist');
	});
});
