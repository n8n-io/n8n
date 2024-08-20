import { NDV, WorkflowPage } from '../pages';
import { AIAssistant } from '../pages/features/ai-assistant';

const wf = new WorkflowPage();
const ndv = new NDV();
const aiAssistant = new AIAssistant();

describe('AI Assistant::disabled', () => {
	beforeEach(() => {
		aiAssistant.actions.disableAssistant();
		wf.actions.visit();
	});

	it('does not show assistant button if feature is disabled', () => {
		aiAssistant.getters.askAssistantFloatingButton().should('not.exist');
	});
});

describe('AI Assistant::enabled', () => {
	beforeEach(() => {
		aiAssistant.actions.enableAssistant();
		wf.actions.visit();
	});

	after(() => {
		aiAssistant.actions.disableAssistant();
	});

	it('renders placeholder UI', () => {
		aiAssistant.getters.askAssistantFloatingButton().should('be.visible');
		aiAssistant.getters.askAssistantFloatingButton().click();
		aiAssistant.getters.askAssistantChat().should('be.visible');
		aiAssistant.getters.placeholderMessage().should('be.visible');
		aiAssistant.getters.chatInputWrapper().should('not.exist');
		aiAssistant.getters.closeChatButton().should('be.visible');
		aiAssistant.getters.closeChatButton().click();
		aiAssistant.getters.askAssistantChat().should('not.exist');
	});

	it('should resize assistant chat up', () => {
		aiAssistant.getters.askAssistantFloatingButton().click();
		aiAssistant.getters.askAssistantSidebarResizer().should('be.visible');
		aiAssistant.getters.askAssistantChat().then((element) => {
			const { width, left } = element[0].getBoundingClientRect();
			cy.drag(aiAssistant.getters.askAssistantSidebarResizer(), [left - 10, 0], {
				abs: true,
				clickToFinish: true,
			});
			aiAssistant.getters.askAssistantChat().then((newElement) => {
				const newWidth = newElement[0].getBoundingClientRect().width;
				expect(newWidth).to.be.greaterThan(width);
			});
		});
	});

	it('should resize assistant chat down', () => {
		aiAssistant.getters.askAssistantFloatingButton().click();
		aiAssistant.getters.askAssistantSidebarResizer().should('be.visible');
		aiAssistant.getters.askAssistantChat().then((element) => {
			const { width, left } = element[0].getBoundingClientRect();
			cy.drag(aiAssistant.getters.askAssistantSidebarResizer(), [left + 10, 0], {
				abs: true,
				clickToFinish: true,
			});
			aiAssistant.getters.askAssistantChat().then((newElement) => {
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
		aiAssistant.getters.nodeErrorViewAssistantButton().click();
		cy.wait('@chatRequest');
		aiAssistant.getters.chatMessagesAll().should('have.length', 1);
		aiAssistant.getters
			.chatMessagesAll()
			.eq(0)
			.should('contain.text', 'Hey, this is an assistant message');
		aiAssistant.getters.nodeErrorViewAssistantButton().should('be.disabled');
	});

	it('should render chat input correctly', () => {
		cy.intercept('POST', '/rest/ai-assistant/chat', {
			statusCode: 200,
			fixture: 'aiAssistant/simple_message_response.json',
		}).as('chatRequest');
		cy.createFixtureWorkflow('aiAssistant/test_workflow.json');
		wf.actions.openNode('Stop and Error');
		ndv.getters.nodeExecuteButton().click();
		aiAssistant.getters.nodeErrorViewAssistantButton().click();
		cy.wait('@chatRequest');
		// Send button should be disabled when input is empty
		aiAssistant.getters.sendMessageButton().should('be.disabled');
		aiAssistant.getters.chatInput().type('Yo ');
		aiAssistant.getters.sendMessageButton().should('not.be.disabled');
		aiAssistant.getters.chatInput().then((element) => {
			const { height } = element[0].getBoundingClientRect();
			// Shift + Enter should add a new line
			aiAssistant.getters.chatInput().type('Hello{shift+enter}there');
			aiAssistant.getters.chatInput().then((newElement) => {
				const newHeight = newElement[0].getBoundingClientRect().height;
				// Chat input should grow as user adds new lines
				expect(newHeight).to.be.greaterThan(height);
				aiAssistant.getters.sendMessageButton().click();
				cy.wait('@chatRequest');
				// New lines should be rendered as <br> in the chat
				aiAssistant.getters.chatMessagesUser().should('have.length', 1);
				aiAssistant.getters.chatMessagesUser().eq(0).find('br').should('have.length', 1);
				// Chat input should be cleared now
				aiAssistant.getters.chatInput().should('have.value', '');
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
		aiAssistant.getters.nodeErrorViewAssistantButton().click();
		cy.wait('@chatRequest');
		aiAssistant.getters.quickReplies().should('have.length', 2);
		aiAssistant.getters.quickReplies().eq(0).click();
		cy.wait('@chatRequest');
		aiAssistant.getters.chatMessagesUser().should('have.length', 1);
		aiAssistant.getters.chatMessagesUser().eq(0).should('contain.text', "Sure, let's do it");
	});

	it('should send message to assistant when node is executed', () => {
		cy.intercept('POST', '/rest/ai-assistant/chat', {
			statusCode: 200,
			fixture: 'aiAssistant/simple_message_response.json',
		}).as('chatRequest');
		cy.createFixtureWorkflow('aiAssistant/test_workflow.json');
		wf.actions.openNode('Edit Fields');
		ndv.getters.nodeExecuteButton().click();
		aiAssistant.getters.nodeErrorViewAssistantButton().click();
		cy.wait('@chatRequest');
		aiAssistant.getters.chatMessagesAssistant().should('have.length', 1);
		// Executing the same node should sende a new message to the assistant automatically
		ndv.getters.nodeExecuteButton().click();
		cy.wait('@chatRequest');
		aiAssistant.getters.chatMessagesAssistant().should('have.length', 2);
	});

	it('should warn before starting a new session', () => {
		cy.intercept('POST', '/rest/ai-assistant/chat', {
			statusCode: 200,
			fixture: 'aiAssistant/simple_message_response.json',
		}).as('chatRequest');
		cy.createFixtureWorkflow('aiAssistant/test_workflow.json');
		wf.actions.openNode('Edit Fields');
		ndv.getters.nodeExecuteButton().click();
		aiAssistant.getters.nodeErrorViewAssistantButton().click();
		cy.wait('@chatRequest');
		aiAssistant.getters.closeChatButton().click();
		ndv.getters.backToCanvas().click();
		wf.actions.openNode('Stop and Error');
		ndv.getters.nodeExecuteButton().click();
		aiAssistant.getters.nodeErrorViewAssistantButton().click();
		// Since we already have an active session, a warning should be shown
		aiAssistant.getters.newAssistantSessionModal().should('be.visible');
		aiAssistant.getters
			.newAssistantSessionModal()
			.find('button')
			.contains('Start new session')
			.click();
		cy.wait('@chatRequest');
		// New session should start with initial assistant message
		aiAssistant.getters.chatMessagesAll().should('have.length', 1);
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
		aiAssistant.getters.nodeErrorViewAssistantButton().click({ force: true });
		cy.wait('@chatRequest');
		// Should have two assistant messages
		aiAssistant.getters.chatMessagesAll().should('have.length', 2);
		aiAssistant.getters.codeDiffs().should('have.length', 1);
		aiAssistant.getters.applyCodeDiffButtons().should('have.length', 1);
		aiAssistant.getters.applyCodeDiffButtons().first().click();
		cy.wait('@applySuggestion');
		aiAssistant.getters.applyCodeDiffButtons().should('have.length', 0);
		aiAssistant.getters.undoReplaceCodeButtons().should('have.length', 1);
		aiAssistant.getters.codeReplacedMessage().should('be.visible');
		ndv.getters
			.parameterInput('jsCode')
			.get('.cm-content')
			.should('contain.text', 'item.json.myNewField = 1');
		// Clicking undo should revert the code back but not call the assistant
		aiAssistant.getters.undoReplaceCodeButtons().first().click();
		aiAssistant.getters.applyCodeDiffButtons().should('have.length', 1);
		aiAssistant.getters.codeReplacedMessage().should('not.exist');
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
		aiAssistant.getters.applyCodeDiffButtons().should('have.length', 1);
		aiAssistant.getters.applyCodeDiffButtons().first().click();
		ndv.getters
			.parameterInput('jsCode')
			.get('.cm-content')
			.should('contain.text', 'item.json.myNewField = 1');
	});

	it('should end chat session when `end_session` event is received', () => {
		cy.intercept('POST', '/rest/ai-assistant/chat', {
			statusCode: 200,
			fixture: 'aiAssistant/end_session_response.json',
		}).as('chatRequest');
		cy.createFixtureWorkflow('aiAssistant/test_workflow.json');
		wf.actions.openNode('Stop and Error');
		ndv.getters.nodeExecuteButton().click();
		aiAssistant.getters.nodeErrorViewAssistantButton().click();
		cy.wait('@chatRequest');
		aiAssistant.getters.chatMessagesSystem().should('have.length', 1);
		aiAssistant.getters.chatMessagesSystem().first().should('contain.text', 'session has ended');
	});
});
