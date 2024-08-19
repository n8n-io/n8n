import { overrideFeatureFlag } from '../composables/featureFlags';
import { WorkflowPage } from '../pages';

const AI_ASSISTANT_FEATURE = '021_ai_debug_helper';

const wf = new WorkflowPage();

describe('AI Assistant::disabled', () => {
	beforeEach(() => {
		overrideFeatureFlag(AI_ASSISTANT_FEATURE, 'control');
		wf.actions.visit();
	});

	it('does not render AI Assistant UI', () => {
		wf.getters.askAssistantFloatingButton().should('not.exist');
	});
});

describe('AI Assistant::enabled', () => {
	beforeEach(() => {
		overrideFeatureFlag(AI_ASSISTANT_FEATURE, 'variant');
		wf.actions.visit();
	});

	it('renders AI Assistant UI', () => {
		wf.getters.askAssistantFloatingButton().should('be.visible');
		wf.getters.askAssistantFloatingButton().click();
		wf.getters.askAssistantChat().should('be.visible');
		wf.getters.aiAssistantPlaceholderMessage().should('be.visible');
		wf.getters.aiAssistantCloseButton().should('be.visible');
		wf.getters.aiAssistantCloseButton().click();
		wf.getters.askAssistantChat().should('not.exist');
	});
});
