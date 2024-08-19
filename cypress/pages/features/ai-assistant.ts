import { BasePage } from '../base';

export class AIAssistant extends BasePage {
	url = '/workflows/new';

	getters = {
		askAssistantFloatingButton: () => cy.getByTestId('ask-assistant-floating-button'),
		askAssistantSidebar: () => cy.getByTestId('ask-assistant-sidebar'),
		askAssistantSidebarResizer: () =>
			this.getters.askAssistantSidebar().find('[class^=_resizer][data-dir=left]').first(),
		askAssistantChat: () => cy.getByTestId('ask-assistant-chat'),
		placeholderMessage: () => cy.getByTestId('placeholder-message'),
		closeChatButton: () => cy.getByTestId('close-chat-button'),
		chatInputWrapper: () => cy.getByTestId('chat-input-wrapper'),
		chatInput: () => cy.getByTestId('chat-input'),
		sendMessageButton: () => cy.getByTestId('send-message-button'),
		chatMessagesAll: () => cy.get('[data-test-id^=chat-message]'),
		chatMessagesAssistant: () => cy.getByTestId('chat-message-assistant'),
		chatMessagesUser: () => cy.getByTestId('chat-message-user'),
		chatMessagesSystem: () => cy.getByTestId('chat-message-system'),
		quickReplies: () => cy.getByTestId('quick-replies').find('button'),
		newAssistantSessionModal: () => cy.getByTestId('new-assistant-session-modal'),
		codeDiffs: () => cy.getByTestId('code-diff-suggestion'),
		applyCodeDiffButtons: () => cy.getByTestId('replace-code-button'),
		undoReplaceCodeButtons: () => cy.getByTestId('undo-replace-button'),
		codeReplacedMessage: () => cy.getByTestId('code-replaced-message'),
		nodeErrorViewAssistantButton: () =>
			cy.getByTestId('node-error-view-ask-assistant-button').find('button').first(),
	};
}
