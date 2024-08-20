import { overrideFeatureFlag } from '../../composables/featureFlags';
import { BasePage } from '../base';

const AI_ASSISTANT_FEATURE = {
	name: 'aiAssistant',
	experimentName: '021_ai_debug_helper',
	enabledFor: 'variant',
	disabledFor: 'control',
};

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

	actions = {
		enableAssistant(): void {
			overrideFeatureFlag(AI_ASSISTANT_FEATURE.experimentName, AI_ASSISTANT_FEATURE.enabledFor);
			cy.enableFeature(AI_ASSISTANT_FEATURE.name);
		},
		disableAssistant(): void {
			overrideFeatureFlag(AI_ASSISTANT_FEATURE.experimentName, AI_ASSISTANT_FEATURE.disabledFor);
			cy.disableFeature(AI_ASSISTANT_FEATURE.name);
		},
	};
}
