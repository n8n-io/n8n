import { WorkflowPage, NDV } from '../pages';

const workflowPage = new WorkflowPage();
const ndv = new NDV();

describe('Resource Mapper', () => {
	beforeEach(() => {
		workflowPage.actions.visit();
	});

	it('should not retrieve list options when required params throw errors', () => {
		workflowPage.actions.addInitialNodeToCanvas('E2e Test', {action: 'Resource Mapping Component'});

		ndv.getters.resourceMapperFieldsContainer().should('be.visible').findChildByTestId('parameter-input').should('have.length', 2);

		ndv.actions.setInvalidExpression('fieldId');

		ndv.actions.refreshResourceMapperColumns();
		ndv.getters.resourceMapperFieldsContainer().should('not.exist');
	});

	it('should retrieve list options when optional params throw errors', () => {
		workflowPage.actions.addInitialNodeToCanvas('E2e Test', {action: 'Resource Mapping Component'});

		ndv.getters.resourceMapperFieldsContainer().should('be.visible').findChildByTestId('parameter-input').should('have.length', 2);

		ndv.actions.setInvalidExpression('otherField');

		ndv.actions.refreshResourceMapperColumns();
		ndv.getters.resourceMapperFieldsContainer().should('be.visible').findChildByTestId('parameter-input').should('have.length', 2);
	});
});
