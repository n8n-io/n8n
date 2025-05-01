import {
	assertInlineExpressionValid,
	getParameterExpressionPreviewValue,
} from '../composables/ndv';
import {
	clickZoomToFit,
	executeWorkflowAndWait,
	navigateToNewWorkflowPage,
	openNode,
	pasteWorkflow,
} from '../composables/workflow';
import Workflow from '../fixtures/Test_9999-SUG-38.json';

describe('SUG-38 Inline expression previews are not displayed in NDV', () => {
	it("should show resolved inline expression preview in NDV if the node's input data is populated", () => {
		navigateToNewWorkflowPage();
		pasteWorkflow(Workflow);
		clickZoomToFit();
		executeWorkflowAndWait();
		openNode('Repro1');
		assertInlineExpressionValid();
		getParameterExpressionPreviewValue().should('have.text', 'hello there');
	});
});
