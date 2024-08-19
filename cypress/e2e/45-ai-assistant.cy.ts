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
		wf.actions.addNodeToCanvas('Stop and error', true, true);
		ndv.getters.parameterInput('errorMessage').type('This is an error message');
		ndv.getters.nodeExecuteButton().click();
		ndv.getters.nodeErrorViewAssistantButton().should('be.visible');
		ndv.getters.nodeErrorViewAssistantButton().click();
		cy.wait('@chatRequest');
		wf.getters.aiAssistantChatMessages().should('have.length', 1);
		wf.getters
			.aiAssistantChatMessages()
			.eq(0)
			.should('contain.text', 'Hey, this is an assistant message');
		ndv.getters.nodeErrorViewAssistantButton().should('be.disabled');
	});
});
