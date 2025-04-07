import { clickGetBackToCanvas, getNdvTitle, getOutputRunSelector } from '../composables/ndv';
import {
	clickOpenNdvButtonOnLogEntryAtRow,
	clickZoomToFit,
	executeWorkflowAndWait,
	navigateToNewWorkflowPage,
	openLogsPanel,
	pasteWorkflow,
} from '../composables/workflow';
import Workflow from '../fixtures/Loop.json';

describe('Logs', () => {
	beforeEach(() => {
		cy.window().then((win) => {
			win.localStorage.setItem('N8N_LOGS_2025_SPRING', 'true');
		});
	});

	it('should open NDV with the run index that corresponds to clicked log entry', () => {
		navigateToNewWorkflowPage();
		pasteWorkflow(Workflow);
		clickZoomToFit();
		executeWorkflowAndWait();
		openLogsPanel();
		clickOpenNdvButtonOnLogEntryAtRow(6);
		getNdvTitle().should('contain.text', 'Loop Over Items');
		getOutputRunSelector().find('input').should('have.value', '3 of 4 (1 item)');
		clickGetBackToCanvas();
		clickOpenNdvButtonOnLogEntryAtRow(8);
		getNdvTitle().should('contain.text', 'Loop Over Items');
		getOutputRunSelector().find('input').should('have.value', '4 of 4 (3 items)');
	});
});
