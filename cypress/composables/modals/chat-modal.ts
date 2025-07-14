/**
 * Getters
 */

export function getManualChatModal() {
	return cy.getByTestId('canvas-chat');
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
	return cy.getByTestId('workflow-chat-button');
}

export function getManualChatDialog() {
	return getManualChatModal().getByTestId('workflow-lm-chat-dialog');
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
