import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';
import { NDV } from '../pages/ndv';

const WorkflowPage = new WorkflowPageClass();
const ndv = new NDV();

describe('Code node', () => {
	beforeEach(() => {
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
