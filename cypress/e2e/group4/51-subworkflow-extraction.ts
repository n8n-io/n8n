import {
	clickContextMenuAction,
	clickZoomToFit,
	executeWorkflow,
	getCanvasNodeByName,
	getCanvasNodes,
	hitUndo,
	navigateToNewWorkflowPage,
	openContextMenu,
	pasteWorkflow,
	saveWorkflowOnButtonClick,
	selectRight,
} from '../composables/workflow';
import SubworkflowExtractionFixture from '../fixtures/Subworkflow-extraction-workflow.json';
import { clearAnyNotifications, successToast } from '../pages/notifications';

const EDIT_FIELDS_NAMES = [
	'Edit Fields0',
	'Edit Fields1',
	'Edit Fields2',
	'Edit Fields3',
	'Edit Fields4',
	'Edit Fields5',
] as const;

function selectNode(nodeName: string) {
	getCanvasNodeByName(nodeName).click();
}

function executeAndConfirmSuccess() {
	executeWorkflow();
	successToast().should('contain.text', 'Workflow executed successfully');
	clearAnyNotifications();
}

describe('Subworkflow Extraction', () => {
	beforeEach(() => {
		navigateToNewWorkflowPage();
		// this selects all nodes
		pasteWorkflow(SubworkflowExtractionFixture);
		saveWorkflowOnButtonClick();
		getCanvasNodes().should('have.length', 7);
		clickZoomToFit();

		executeAndConfirmSuccess();

		openContextMenu();
		clickContextMenuAction('deselect_all');
	});

	describe('can extract a valid selection and still execute the workflow', () => {
		it('should extract a node and succeed execution, and then undo and succeed executions', () => {
			for (const name of EDIT_FIELDS_NAMES) {
				selectNode(name);
				openContextMenu(name);
				clickContextMenuAction('extract_sub_workflow');
				cy.getByTestId('submit-button').click();

				executeAndConfirmSuccess();
			}

			for (const _ of EDIT_FIELDS_NAMES) {
				hitUndo();

				executeAndConfirmSuccess();
			}
		});

		it('should extract all nodes besides trigger and succeed execution', () => {
			selectNode(EDIT_FIELDS_NAMES[0]);
			selectRight();
			openContextMenu();
			clickContextMenuAction('extract_sub_workflow');

			cy.getByTestId('submit-button').click();

			executeAndConfirmSuccess();
		});
	});
});
