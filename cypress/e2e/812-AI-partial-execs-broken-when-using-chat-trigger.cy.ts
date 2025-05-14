import {
	getManualChatMessages,
	getManualChatModal,
	sendManualChatMessage,
} from '../composables/modals/chat-modal';
import { clickExecuteNode } from '../composables/ndv';
import {
	clickZoomToFit,
	openNode,
	navigateToNewWorkflowPage,
	openContextMenu,
	clickContextMenuAction,
	clickClearExecutionDataButton,
} from '../composables/workflow';
import { clearNotifications } from '../pages/notifications';

describe('AI-812-partial-execs-broken-when-using-chat-trigger', () => {
	beforeEach(() => {
		navigateToNewWorkflowPage();
		cy.createFixtureWorkflow('Test_chat_partial_execution.json');
		clearNotifications();
		clickZoomToFit();
		openContextMenu('Edit Fields');
		clickContextMenuAction('deselect_all');
	});

	// Check if the full execution still behaves as expected after the partial execution tests
	afterEach(() => {
		clearNotifications();
		clickClearExecutionDataButton();
		sendManualChatMessage('Test Full Execution');
		getManualChatMessages().should('have.length', 4);
		getManualChatMessages().should('contain', 'Set 3 with chatInput: Test Full Execution');
	});

	it('should do partial execution when using chat trigger and clicking NDV execute node', () => {
		openNode('Edit Fields1');
		clickExecuteNode();
		getManualChatModal().should('exist');
		sendManualChatMessage('Test Partial Execution');

		getManualChatMessages().should('have.length', 2);
		getManualChatMessages().should('contain', 'Test Partial Execution');
		getManualChatMessages().should('contain', 'Set 2 with chatInput: Test Partial Execution');
	});

	it('should do partial execution when using chat trigger and context-menu execute node', () => {
		openContextMenu('Edit Fields');
		clickContextMenuAction('execute');
		getManualChatModal().should('exist');
		sendManualChatMessage('Test Partial Execution');

		getManualChatMessages().should('have.length', 2);
		getManualChatMessages().should('contain', 'Test Partial Execution');
		getManualChatMessages().should('contain', 'Set 1 with chatInput: Test Partial Execution');
	});
});
