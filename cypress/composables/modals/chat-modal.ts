/**
 * Getters
 */

export function getManualChatModal() {
	return cy.getByTestId('lmChat-modal');
}

export function getManualChatInput() {
	return cy.getByTestId('workflow-chat-input');
}

export function getManualChatSendButton() {
	return getManualChatModal().getByTestId('workflow-chat-send-button');
}

export function getManualChatMessages() {
	return getManualChatModal().get('.messages .message');
}

export function getManualChatModalCloseButton() {
	return getManualChatModal().get('.el-dialog__close');
}

export function getManualChatModalLogs() {
	return getManualChatModal().getByTestId('lm-chat-logs');
}

export function getManualChatModalLogsTree() {
	return getManualChatModalLogs().getByTestId('lm-chat-logs-tree');
}

export function getManualChatModalLogsEntries() {
	return getManualChatModalLogs().getByTestId('lm-chat-logs-entry');
}

/**
 * Actions
 */

export function sendManualChatMessage(message: string) {
	getManualChatInput().type(message);
	getManualChatSendButton().click();
}

export function closeManualChatModal() {
	getManualChatModalCloseButton().click();
}
