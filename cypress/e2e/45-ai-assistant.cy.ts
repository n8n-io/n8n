import { type ICredentialType } from 'n8n-workflow';

import { clickCreateNewCredential, openCredentialSelect } from '../composables/ndv';
import { GMAIL_NODE_NAME, SCHEDULE_TRIGGER_NODE_NAME } from '../constants';
import { CredentialsModal, CredentialsPage, NDV, WorkflowPage } from '../pages';
import { AIAssistant } from '../pages/features/ai-assistant';
import { getVisibleSelect } from '../utils';

const wf = new WorkflowPage();
const ndv = new NDV();
const aiAssistant = new AIAssistant();
const credentialsPage = new CredentialsPage();
const credentialsModal = new CredentialsModal();

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
		aiAssistant.getters.chatInput().should('be.visible');
		aiAssistant.getters.sendMessageButton().should('be.disabled');
		aiAssistant.getters.closeChatButton().should('be.visible');
		aiAssistant.getters.closeChatButton().click();
		aiAssistant.getters.askAssistantChat().should('not.be.visible');
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
		aiAssistant.getters.quickReplyButtons().should('have.length', 2);
		aiAssistant.getters.quickReplyButtons().eq(0).click();
		cy.wait('@chatRequest');
		aiAssistant.getters.chatMessagesUser().should('have.length', 1);
		aiAssistant.getters.chatMessagesUser().eq(0).should('contain.text', "Sure, let's do it");
	});

	it('should show quick replies when node is executed after new suggestion', () => {
		cy.intercept('POST', '/rest/ai-assistant/chat', (req) => {
			req.reply((res) => {
				if (['init-error-helper', 'message'].includes(req.body.payload.type)) {
					res.send({ statusCode: 200, fixture: 'aiAssistant/simple_message_response.json' });
				} else if (req.body.payload.type === 'event') {
					res.send({ statusCode: 200, fixture: 'aiAssistant/node_execution_error_response.json' });
				} else {
					res.send({ statusCode: 500 });
				}
			});
		}).as('chatRequest');
		cy.createFixtureWorkflow('aiAssistant/test_workflow.json');
		wf.actions.openNode('Edit Fields');
		ndv.getters.nodeExecuteButton().click();
		aiAssistant.getters.nodeErrorViewAssistantButton().click();
		cy.wait('@chatRequest');
		aiAssistant.getters.chatMessagesAssistant().should('have.length', 1);
		ndv.getters.nodeExecuteButton().click();
		cy.wait('@chatRequest');
		// Respond 'Yes' to the quick reply (request new suggestion)
		aiAssistant.getters.quickReplies().contains('Yes').click();
		cy.wait('@chatRequest');
		// No quick replies at this point
		aiAssistant.getters.quickReplies().should('not.exist');
		ndv.getters.nodeExecuteButton().click();
		// But after executing the node again, quick replies should be shown
		aiAssistant.getters.chatMessagesAssistant().should('have.length', 4);
		aiAssistant.getters.quickReplies().should('have.length', 2);
	});

	it('should warn before starting a new session', () => {
		cy.intercept('POST', '/rest/ai-assistant/chat', {
			statusCode: 200,
			fixture: 'aiAssistant/simple_message_response.json',
		}).as('chatRequest');
		cy.createFixtureWorkflow('aiAssistant/test_workflow.json');
		wf.actions.openNode('Edit Fields');
		ndv.getters.nodeExecuteButton().click();
		aiAssistant.getters.nodeErrorViewAssistantButton().click({ force: true });
		cy.wait('@chatRequest');
		aiAssistant.getters.closeChatButton().click();
		ndv.getters.backToCanvas().click();
		wf.actions.openNode('Stop and Error');
		ndv.getters.nodeExecuteButton().click();
		aiAssistant.getters.nodeErrorViewAssistantButton().click({ force: true });
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

	it('should reset session after it ended and sidebar is closed', () => {
		cy.intercept('POST', '/rest/ai-assistant/chat', (req) => {
			req.reply((res) => {
				if (['init-support-chat'].includes(req.body.payload.type)) {
					res.send({ statusCode: 200, fixture: 'aiAssistant/simple_message_response.json' });
				} else {
					res.send({ statusCode: 200, fixture: 'aiAssistant/end_session_response.json' });
				}
			});
		}).as('chatRequest');
		aiAssistant.actions.openChat();
		aiAssistant.actions.sendMessage('Hello');
		cy.wait('@chatRequest');
		aiAssistant.actions.closeChat();
		aiAssistant.actions.openChat();
		// After closing and reopening the chat, all messages should be still there
		aiAssistant.getters.chatMessagesAll().should('have.length', 2);
		// End the session
		aiAssistant.actions.sendMessage('Thanks, bye');
		cy.wait('@chatRequest');
		aiAssistant.getters.chatMessagesSystem().should('have.length', 1);
		aiAssistant.getters.chatMessagesSystem().first().should('contain.text', 'session has ended');
		aiAssistant.actions.closeChat();
		aiAssistant.actions.openChat();
		// Now, session should be reset
		aiAssistant.getters.placeholderMessage().should('be.visible');
	});

	it('Should not reset assistant session when workflow is saved', () => {
		cy.intercept('POST', '/rest/ai-assistant/chat', {
			statusCode: 200,
			fixture: 'aiAssistant/simple_message_response.json',
		}).as('chatRequest');
		wf.actions.addInitialNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		aiAssistant.actions.openChat();
		aiAssistant.actions.sendMessage('Hello');
		wf.actions.openNode(SCHEDULE_TRIGGER_NODE_NAME);
		ndv.getters.nodeExecuteButton().click();
		wf.getters.isWorkflowSaved();
		aiAssistant.getters.placeholderMessage().should('not.exist');
	});
});

describe('AI Assistant Credential Help', () => {
	beforeEach(() => {
		aiAssistant.actions.enableAssistant();
		wf.actions.visit();
	});

	after(() => {
		aiAssistant.actions.disableAssistant();
	});

	it('should start credential help from node credential', () => {
		cy.intercept('POST', '/rest/ai-assistant/chat', {
			statusCode: 200,
			fixture: 'aiAssistant/simple_message_response.json',
		}).as('chatRequest');
		wf.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		wf.actions.addNodeToCanvas(GMAIL_NODE_NAME);
		wf.actions.openNode('Gmail');
		openCredentialSelect();
		clickCreateNewCredential();
		aiAssistant.getters.credentialEditAssistantButton().find('button').should('be.visible');
		aiAssistant.getters.credentialEditAssistantButton().find('button').click();
		cy.wait('@chatRequest');
		aiAssistant.getters.chatMessagesUser().should('have.length', 1);
		aiAssistant.getters
			.chatMessagesUser()
			.eq(0)
			.should('contain.text', 'How do I set up the credentials for Gmail OAuth2 API?');

		aiAssistant.getters
			.chatMessagesAssistant()
			.eq(0)
			.should('contain.text', 'Hey, this is an assistant message');
		aiAssistant.getters.credentialEditAssistantButton().find('button').should('be.disabled');
	});

	it('should start credential help from credential list', () => {
		cy.intercept('POST', '/rest/ai-assistant/chat', {
			statusCode: 200,
			fixture: 'aiAssistant/simple_message_response.json',
		}).as('chatRequest');

		cy.visit(credentialsPage.url);
		credentialsPage.getters.emptyListCreateCredentialButton().click();

		credentialsModal.getters.newCredentialModal().should('be.visible');
		credentialsModal.getters.newCredentialTypeSelect().should('be.visible');
		credentialsModal.getters.newCredentialTypeOption('Notion API').click();

		credentialsModal.getters.newCredentialTypeButton().click();

		aiAssistant.getters.credentialEditAssistantButton().find('button').should('be.visible');
		aiAssistant.getters.credentialEditAssistantButton().find('button').click();
		cy.wait('@chatRequest');
		aiAssistant.getters.chatMessagesUser().should('have.length', 1);
		aiAssistant.getters
			.chatMessagesUser()
			.eq(0)
			.should('contain.text', 'How do I set up the credentials for Notion API?');

		aiAssistant.getters
			.chatMessagesAssistant()
			.eq(0)
			.should('contain.text', 'Hey, this is an assistant message');
		aiAssistant.getters.credentialEditAssistantButton().find('button').should('be.disabled');
	});

	it('should not show assistant button when click to connect', () => {
		cy.intercept('/types/credentials.json', { middleware: true }, (req) => {
			req.headers['cache-control'] = 'no-cache, no-store';

			req.on('response', (res) => {
				const credentials: ICredentialType[] = res.body || [];

				const index = credentials.findIndex((c) => c.name === 'slackOAuth2Api');

				credentials[index] = {
					...credentials[index],
					__overwrittenProperties: ['clientId', 'clientSecret'],
				};
			});
		});

		wf.actions.visit(true);
		wf.actions.addNodeToCanvas('Manual');
		wf.actions.addNodeToCanvas('Slack', true, true, 'Get a channel');
		wf.getters.nodeCredentialsSelect().should('exist');
		wf.getters.nodeCredentialsSelect().click();
		getVisibleSelect().find('li').last().click();
		credentialsModal.getters.credentialAuthTypeRadioButtons().first().click();
		ndv.getters.copyInput().should('not.exist');
		credentialsModal.getters.oauthConnectButton().should('have.length', 1);
		credentialsModal.getters.credentialInputs().should('have.length', 0);
		aiAssistant.getters.credentialEditAssistantButton().should('not.exist');

		credentialsModal.getters.credentialAuthTypeRadioButtons().eq(1).click();
		credentialsModal.getters.credentialInputs().should('have.length', 1);
		aiAssistant.getters.credentialEditAssistantButton().should('exist');
	});

	it('should not show assistant button when click to connect with some fields', () => {
		cy.intercept('/types/credentials.json', { middleware: true }, (req) => {
			req.headers['cache-control'] = 'no-cache, no-store';

			req.on('response', (res) => {
				const credentials: ICredentialType[] = res.body || [];

				const index = credentials.findIndex((c) => c.name === 'microsoftOutlookOAuth2Api');

				credentials[index] = {
					...credentials[index],
					__overwrittenProperties: ['authUrl', 'accessTokenUrl', 'clientId', 'clientSecret'],
				};
			});
		});

		wf.actions.visit(true);
		wf.actions.addNodeToCanvas('Manual');
		wf.actions.addNodeToCanvas('Microsoft Outlook', true, true, 'Get a calendar');
		wf.getters.nodeCredentialsSelect().should('exist');
		wf.getters.nodeCredentialsSelect().click();
		getVisibleSelect().find('li').last().click();
		ndv.getters.copyInput().should('not.exist');
		credentialsModal.getters.oauthConnectButton().should('have.length', 1);
		credentialsModal.getters.credentialInputs().should('have.length', 1);
		aiAssistant.getters.credentialEditAssistantButton().should('not.exist');
	});
});

describe('General help', () => {
	beforeEach(() => {
		aiAssistant.actions.enableAssistant();
		wf.actions.visit();
	});

	it('assistant returns code snippet', () => {
		cy.intercept('POST', '/rest/ai-assistant/chat', {
			statusCode: 200,
			fixture: 'aiAssistant/code_snippet_response.json',
		}).as('chatRequest');

		aiAssistant.getters.askAssistantFloatingButton().should('be.visible');
		aiAssistant.getters.askAssistantFloatingButton().click();
		aiAssistant.getters.askAssistantChat().should('be.visible');
		aiAssistant.getters.placeholderMessage().should('be.visible');
		aiAssistant.getters.chatInput().should('be.visible');

		aiAssistant.getters.chatInput().type('Show me an expression');
		aiAssistant.getters.sendMessageButton().click();

		aiAssistant.getters.chatMessagesAll().should('have.length', 3);
		aiAssistant.getters.chatMessagesUser().eq(0).should('contain.text', 'Show me an expression');

		aiAssistant.getters
			.chatMessagesAssistant()
			.eq(0)
			.should('contain.text', 'To use expressions in n8n, follow these steps:');

		aiAssistant.getters
			.chatMessagesAssistant()
			.eq(0)
			.should(
				'include.html',
				`<pre><code class="language-json">[
  {
    "headers": {
      "host": "n8n.instance.address",
      ...
    },
    "params": {},
    "query": {},
    "body": {
      "name": "Jim",
      "age": 30,
      "city": "New York"
    }
  }
]
</code></pre>`,
			);
		aiAssistant.getters.codeSnippet().should('have.text', '{{$json.body.city}}');
	});
});
