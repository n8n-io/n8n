import { BasePage } from '../base';

/**
 * @deprecated Use functional composables from @composables instead.
 * If a composable doesn't exist for your use case, please create a new one in:
 * cypress/composables
 *
 * This class-based approach is being phased out in favor of more modular functional composables.
 * Each getter and action in this class should be moved to individual composable functions.
 */
export class AIAssistant extends BasePage {
	url = '/workflows/new';

	getters = {
		askAssistantFloatingButton: () => cy.getByTestId('ask-assistant-floating-button'),
		askAssistantCanvasActionButton: () => cy.getByTestId('ask-assistant-canvas-action-button'),
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
		quickReplies: () => cy.getByTestId('quick-replies'),
		quickReplyButtons: () => this.getters.quickReplies().find('button'),
		newAssistantSessionModal: () => cy.getByTestId('new-assistant-session-modal'),
		codeDiffs: () => cy.getByTestId('code-diff-suggestion'),
		applyCodeDiffButtons: () => cy.getByTestId('replace-code-button'),
		undoReplaceCodeButtons: () => cy.getByTestId('undo-replace-button'),
		codeReplacedMessage: () => cy.getByTestId('code-replaced-message'),
		nodeErrorViewAssistantButton: () =>
			cy.getByTestId('node-error-view-ask-assistant-button').find('button').first(),
		credentialEditAssistantButton: () => cy.getByTestId('credential-edit-ask-assistant-button'),
		codeSnippet: () => cy.getByTestId('assistant-code-snippet-content'),
	};

	actions = {
		enableAssistant: () => {
			cy.enableFeature('aiAssistant');
		},
		disableAssistant: () => {
			cy.disableFeature('aiAssistant');
		},
		sendMessage: (message: string) => {
			this.getters.chatInput().type(message).type('{shift+enter}');
		},
		closeChat: () => {
			this.getters.closeChatButton().click();
			this.getters.askAssistantChat().should('not.be.visible');
		},
		openChatFromCanvas: () => {
			this.getters.askAssistantCanvasActionButton().click();
			this.getters.askAssistantChat().should('be.visible');
		},
		openChatFromNdv: () => {
			this.getters.askAssistantFloatingButton().click();
			this.getters.askAssistantChat().should('be.visible');
		},
	};
}
