import { WorkflowPage, NDV, CredentialsModal } from '../pages';
import { getPopper, getVisiblePopper, getVisibleSelect } from '../utils';

const workflowPage = new WorkflowPage();
const ndv = new NDV();

describe('Resource Mapper', () => {
	beforeEach(() => {
		workflowPage.actions.visit();
	});

	it('should not retrieve list options when required params throw errors', () => {
		workflowPage.actions.addInitialNodeToCanvas('E2e Test', {action: 'Resource Mapping Component'});

		ndv.getters.resourceMapperFieldsContainer().should('be.visible').findChildByTestId('parameter-input').should('have.length', 2);

		ndv.actions.typeIntoParameterInput('fieldId', "=");
		ndv.actions.typeIntoParameterInput('fieldId', "{{ $('unkown')", {parseSpecialCharSequences: false});
		ndv.actions.validateExpressionPreview('fieldId', `node doesn't exist`);

		ndv.actions.refreshResourceMapperColumns();
		ndv.getters.resourceMapperFieldsContainer().should('not.exist');
	});

	it('should retrieve list options when required params throw errors', () => {
		workflowPage.actions.addInitialNodeToCanvas('E2e Test', {action: 'Resource Mapping Component'});

		ndv.getters.resourceMapperFieldsContainer().should('be.visible').findChildByTestId('parameter-input').should('have.length', 2);

		ndv.actions.typeIntoParameterInput('otherField', "=");
		ndv.actions.typeIntoParameterInput('otherField', "{{ $('unkown')", {parseSpecialCharSequences: false});
		ndv.actions.validateExpressionPreview('otherField', `node doesn't exist`);

		ndv.actions.refreshResourceMapperColumns();
		ndv.getters.resourceMapperFieldsContainer().should('be.visible').findChildByTestId('parameter-input').should('have.length', 2);
	});
});
