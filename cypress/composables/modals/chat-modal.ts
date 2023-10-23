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

/**
 * Composables
 */

export function useManualChatModal() {
	return {
		sendManualChatMessage,
		closeManualChatModal,
	};
}
