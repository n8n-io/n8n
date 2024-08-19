import { overrideFeatureFlag } from '../composables/featureFlags';
import { NDV, WorkflowPage } from '../pages';

const AI_ASSISTANT_FEATURE = {
	flagName: '021_ai_debug_helper',
	enabledFor: 'variant',
	disabledFor: 'control',
};

const wf = new WorkflowPage();
const ndv = new NDV();

describe('AI Assistant::disabled', () => {
	beforeEach(() => {
		overrideFeatureFlag(AI_ASSISTANT_FEATURE.flagName, AI_ASSISTANT_FEATURE.disabledFor);
		wf.actions.visit();
	});

	it('does not show assistant button if feature is disabled', () => {
		wf.getters.askAssistantFloatingButton().should('not.exist');
	});
});

describe('AI Assistant::enabled', () => {
	beforeEach(() => {
		overrideFeatureFlag(AI_ASSISTANT_FEATURE.flagName, AI_ASSISTANT_FEATURE.enabledFor);
		wf.actions.visit();
	});

	it('renders placeholder UI', () => {
		wf.getters.askAssistantFloatingButton().should('be.visible');
		wf.getters.askAssistantFloatingButton().click();
		wf.getters.askAssistantChat().should('be.visible');
		wf.getters.aiAssistantPlaceholderMessage().should('be.visible');
		wf.getters.aiAssistantChatInputWrapper().should('not.exist');
		wf.getters.aiAssistantCloseButton().should('be.visible');
		wf.getters.aiAssistantCloseButton().click();
		wf.getters.askAssistantChat().should('not.exist');
	});

	it('should resize assistant chat up', () => {
		wf.getters.askAssistantFloatingButton().should('be.visible');
		wf.getters.askAssistantFloatingButton().click();
		wf.getters.askAssistantChat().should('be.visible');
		wf.getters.askAssistantSidebarResizer().should('be.visible');
		wf.getters.askAssistantChat().then((element) => {
			const { width, left } = element[0].getBoundingClientRect();
			cy.drag(wf.getters.askAssistantSidebarResizer(), [left - 10, 0], {
				abs: true,
				clickToFinish: true,
			});
			wf.getters.askAssistantChat().then((newElement) => {
				const newWidth = newElement[0].getBoundingClientRect().width;
				expect(newWidth).to.be.greaterThan(width);
			});
		});
	});

	it('should resize assistant chat down', () => {
		wf.getters.askAssistantFloatingButton().should('be.visible');
		wf.getters.askAssistantFloatingButton().click();
		wf.getters.askAssistantChat().should('be.visible');
		wf.getters.askAssistantSidebarResizer().should('be.visible');
		wf.getters.askAssistantChat().then((element) => {
			const { width, left } = element[0].getBoundingClientRect();
			cy.drag(wf.getters.askAssistantSidebarResizer(), [left + 10, 0], {
				abs: true,
				clickToFinish: true,
			});
			wf.getters.askAssistantChat().then((newElement) => {
				const newWidth = newElement[0].getBoundingClientRect().width;
				expect(newWidth).to.be.lessThan(width);
			});
		});
	});

	it('should start chat session from node error view', () => {
		cy.intercept('POST', '/rest/ai-assistant/chat', {
			statusCode: 200,
			fixture: 'aiAssistant/simple_message_response.json',
		}).as('chatRequest');
		cy.createFixtureWorkflow('aiAssistant/test_workflow.json');
		wf.actions.openNode('Stop and Error');
		ndv.getters.nodeExecuteButton().click();
		ndv.getters.nodeErrorViewAssistantButton().should('be.visible');
		ndv.getters.nodeErrorViewAssistantButton().click();
		cy.wait('@chatRequest');
		wf.getters.aiAssistantChatMessagesAll().should('have.length', 1);
		wf.getters
			.aiAssistantChatMessagesAll()
			.eq(0)
			.should('contain.text', 'Hey, this is an assistant message');
		ndv.getters.nodeErrorViewAssistantButton().should('be.disabled');
	});

	it('should render chat input correctly', () => {
		cy.intercept('POST', '/rest/ai-assistant/chat', {
			statusCode: 200,
			fixture: 'aiAssistant/simple_message_response.json',
		}).as('chatRequest');
		cy.createFixtureWorkflow('aiAssistant/test_workflow.json');
		wf.actions.openNode('Stop and Error');
		ndv.getters.nodeExecuteButton().click();
		ndv.getters.nodeErrorViewAssistantButton().should('be.visible');
		ndv.getters.nodeErrorViewAssistantButton().click();
		cy.wait('@chatRequest');
		// Send button should be disabled when input is empty
		wf.getters.aiAssistantSendButton().should('be.disabled');
		wf.getters.aiAssistantChatInput().type('Yo ');
		wf.getters.aiAssistantSendButton().should('not.be.disabled');
		wf.getters.aiAssistantChatInput().then((element) => {
			const { height } = element[0].getBoundingClientRect();
			// Shift + Enter should add a new line
			wf.getters.aiAssistantChatInput().type('Hello{shift+enter}there');
			wf.getters.aiAssistantChatInput().then((newElement) => {
				const newHeight = newElement[0].getBoundingClientRect().height;
				// Chat input should grow as user adds new lines
				expect(newHeight).to.be.greaterThan(height);
				wf.getters.aiAssistantSendButton().click();
				cy.wait('@chatRequest');
				// New lines should be rendered as <br> in the chat
				wf.getters.aiAssistantUserMessages().should('have.length', 1);
				wf.getters.aiAssistantUserMessages().eq(0).find('br').should('have.length', 1);
				// Chat input should be cleared now
				wf.getters.aiAssistantChatInput().should('have.value', '');
			});
		});
	});

	it('should render and handle quick replies', () => {
		cy.intercept('POST', '/rest/ai-assistant/chat', {
			statusCode: 200,
			fixture: 'aiAssistant/quick_reply_message_response.json',
		}).as('chatRequest');
		cy.createFixtureWorkflow('aiAssistant/test_workflow.json');
		wf.actions.openNode('Stop and Error');
		ndv.getters.nodeExecuteButton().click();
		ndv.getters.nodeErrorViewAssistantButton().should('be.visible');
		ndv.getters.nodeErrorViewAssistantButton().click();
		cy.wait('@chatRequest');
		wf.getters.aiAssistantQuickReplies().should('have.length', 2);
		wf.getters.aiAssistantQuickReplies().eq(0).click();
		cy.wait('@chatRequest');
		wf.getters.aiAssistantUserMessages().should('have.length', 1);
		wf.getters.aiAssistantUserMessages().eq(0).should('contain.text', "Sure, let's do it");
	});

	it('should send message to assistant when node is executed', () => {
		cy.intercept('POST', '/rest/ai-assistant/chat', {
			statusCode: 200,
			fixture: 'aiAssistant/simple_message_response.json',
		}).as('chatRequest');
		cy.createFixtureWorkflow('aiAssistant/test_workflow.json');
		wf.actions.openNode('Edit Fields');
		ndv.getters.nodeExecuteButton().click();
		ndv.getters.nodeErrorViewAssistantButton().should('be.visible');
		ndv.getters.nodeErrorViewAssistantButton().click();
		cy.wait('@chatRequest');
		wf.getters.aiAssistantChatMessagesAssistant().should('have.length', 1);
		// Executing the same node should sende a new message to the assistant automatically
		ndv.getters.nodeExecuteButton().click();
		cy.wait('@chatRequest');
		wf.getters.aiAssistantChatMessagesAssistant().should('have.length', 2);
	});

	it('should warn before starting a new session', () => {
		cy.intercept('POST', '/rest/ai-assistant/chat', {
			statusCode: 200,
			fixture: 'aiAssistant/simple_message_response.json',
		}).as('chatRequest');
		cy.createFixtureWorkflow('aiAssistant/test_workflow.json');
		wf.actions.openNode('Edit Fields');
		ndv.getters.nodeExecuteButton().click();
		ndv.getters.nodeErrorViewAssistantButton().should('be.visible');
		ndv.getters.nodeErrorViewAssistantButton().click();
		cy.wait('@chatRequest');
		wf.getters.aiAssistantCloseButton().click();
		ndv.getters.backToCanvas().click();
		wf.actions.openNode('Stop and Error');
		ndv.getters.nodeExecuteButton().click();
		ndv.getters.nodeErrorViewAssistantButton().click();
		// Since we already have an active session, a warning should be shown
		wf.getters.newAssistantSessionModal().should('be.visible');
		wf.getters.newAssistantSessionModal().find('button').contains('Start new session').click();
		cy.wait('@chatRequest');
		// New session should start with initial assistant message
		wf.getters.aiAssistantChatMessagesAll().should('have.length', 1);
	});

	it('should apply code diff to code node', () => {
		cy.intercept('POST', '/rest/ai-assistant/chat', {
			statusCode: 200,
			fixture: 'aiAssistant/code_diff_suggestion_response.json',
		}).as('chatRequest');
		cy.intercept('POST', '/rest/ai-assistant/chat/apply-suggestion', {
			statusCode: 200,
			fixture: 'aiAssistant/apply_code_diff_response.json',
		}).as('applySuggestion');
		cy.createFixtureWorkflow('aiAssistant/test_workflow.json');
		wf.actions.openNode('Code');
		ndv.getters.nodeExecuteButton().click();
		ndv.getters.nodeErrorViewAssistantButton().click({ force: true });
		cy.wait('@chatRequest');
		// Should have two assistant messages
		wf.getters.aiAssistantChatMessagesAll().should('have.length', 2);
		wf.getters.aiAssistantCodeDiffs().should('have.length', 1);
		wf.getters.aiAssistantApplyCodeDiffButtons().should('have.length', 1);
		wf.getters.aiAssistantApplyCodeDiffButtons().first().click();
		cy.wait('@applySuggestion');
		wf.getters.aiAssistantApplyCodeDiffButtons().should('have.length', 0);
		wf.getters.aiAssistantUndoReplaceCodeButtons().should('have.length', 1);
		wf.getters.aiAssistantCodeReplacedMessage().should('be.visible');
		ndv.getters
			.parameterInput('jsCode')
			.get('.cm-content')
			.should('contain.text', 'item.json.myNewField = 1');
		// Clicking undo should revert the code back but not call the assistant
		wf.getters.aiAssistantUndoReplaceCodeButtons().first().click();
		wf.getters.aiAssistantApplyCodeDiffButtons().should('have.length', 1);
		wf.getters.aiAssistantCodeReplacedMessage().should('not.exist');
		cy.get('@applySuggestion.all').then((interceptions) => {
			expect(interceptions).to.have.length(1);
		});
		ndv.getters
			.parameterInput('jsCode')
			.get('.cm-content')
			.should('contain.text', 'item.json.myNewField = 1aaa');
		// Replacing the code again should also not call the assistant
		cy.get('@applySuggestion.all').then((interceptions) => {
			expect(interceptions).to.have.length(1);
		});
		wf.getters.aiAssistantApplyCodeDiffButtons().should('have.length', 1);
		wf.getters.aiAssistantApplyCodeDiffButtons().first().click();
		ndv.getters
			.parameterInput('jsCode')
			.get('.cm-content')
			.should('contain.text', 'item.json.myNewField = 1');
	});
});
