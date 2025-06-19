import {
	deleteNode,
	getCanvasNodes,
	navigateToNewWorkflowPage,
	pasteWorkflow,
} from '../composables/workflow';
import Workflow from '../fixtures/Switch_node_with_null_connection.json';

describe('ADO-2929 can load Switch nodes', () => {
	it('can load workflows with Switch nodes with null at connection index', () => {
		navigateToNewWorkflowPage();
		pasteWorkflow(Workflow);
		getCanvasNodes().should('have.length', 3);
		deleteNode('Switch');
		getCanvasNodes().should('have.length', 2);
	});
});
