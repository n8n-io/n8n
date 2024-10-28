/**
 * Getters
 */

export function getManualChatModal() {
	return cy.getByTestId('lmChat-modal');
}

export function getManualChatInput() {
	return getManualChatModal().get('.chat-inputs textarea');
}

export function getManualChatSendButton() {
	return getManualChatModal().get('.chat-input-send-button');
}

export function getManualChatMessages() {
	return getManualChatModal().get('.chat-messages-list .chat-message');
}

export function getManualChatModalCloseButton() {
	return getManualChatModal().get('.el-dialog__close');
}

export function getManualChatModalLogs() {
	return getManualChatModal().getByTestId('lm-chat-logs');
}
export function getManualChatDialog() {
	return getManualChatModal().getByTestId('workflow-lm-chat-dialog');
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
