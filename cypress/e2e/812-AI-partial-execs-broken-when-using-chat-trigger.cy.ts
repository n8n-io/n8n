import { getManualChatMessages, getManualChatModal, sendManualChatMessage } from '../composables/modals/chat-modal';
import { clickExecuteNode } from '../composables/ndv';
import { clickZoomToFit, openNode, navigateToNewWorkflowPage, openContextMenu, clickContextMenuAction, clickClearExecutionDataButton } from '../composables/workflow';
import { clearNotifications } from '../pages/notifications';

describe('AI-812-partial-execs-broken-when-using-chat-trigger', () => {
	beforeEach(() => {
		navigateToNewWorkflowPage();
		cy.createFixtureWorkflow('Test_chat_partial_execution.json');
		clearNotifications();
		clickZoomToFit();
	});

	// Check if the full execution still behaves as expected after the partial execution tests
	afterEach(() => {
		clearNotifications();
		clickClearExecutionDataButton();
		sendManualChatMessage('Test 2');
		getManualChatMessages().should('have.length', 4);
		getManualChatMessages().should('contain', 'Set 3');
	});

	it('should do partial execution when using chat trigger and clicking NDV execute node', () => {
		openNode('Edit Fields1');
		clickExecuteNode();
		getManualChatModal().should('exist');
		sendManualChatMessage('Test');
	});

	it('should do partial execution when using chat trigger and context-menu execute node', () => {
		openContextMenu('Edit Fields');
		clickContextMenuAction('execute');
		getManualChatModal().should('exist');
		sendManualChatMessage('Test');

		getManualChatMessages().should('have.length', 2);
		getManualChatMessages().should('contain', 'Test');
		getManualChatMessages().should('contain', 'Set 1');
	});
});
