/* eslint-disable n8n-local-rules/no-skipped-tests */
import { type ICredentialType } from 'n8n-workflow';

import { clickCreateNewCredential, openCredentialSelect } from '../../composables/ndv';
import { GMAIL_NODE_NAME, SCHEDULE_TRIGGER_NODE_NAME } from '../../constants';
import { CredentialsModal, CredentialsPage, NDV, WorkflowPage } from '../../pages';
import { AIAssistant } from '../../pages/features/ai-assistant';
import { NodeCreator } from '../../pages/features/node-creator';

const wf = new WorkflowPage();
const ndv = new NDV();
const aiAssistant = new AIAssistant();
const credentialsPage = new CredentialsPage();
const credentialsModal = new CredentialsModal();
const nodeCreatorFeature = new NodeCreator();

describe('AI Assistant::enabled', () => {
	beforeEach(() => {
		aiAssistant.actions.enableAssistant();
		cy.overrideSettings({
			aiAssistant: { enabled: true, setup: true },
		});
		wf.actions.visit();
	});

	after(() => {
		aiAssistant.actions.disableAssistant();
	});

	it.skip('renders placeholder UI', () => {
		aiAssistant.getters.askAssistantCanvasActionButton().should('be.visible');
		aiAssistant.getters.askAssistantCanvasActionButton().click();
		aiAssistant.getters.askAssistantChat().should('be.visible');
		aiAssistant.getters.placeholderMessage().should('be.visible');
		aiAssistant.getters.chatInput().should('be.visible');
		aiAssistant.getters.sendMessageButton().should('be.disabled');
		aiAssistant.getters.closeChatButton().should('be.visible');
		aiAssistant.getters.closeChatButton().click();
		aiAssistant.getters.askAssistantChat().should('not.be.visible');
	});

	it('should resize assistant chat up', () => {
		aiAssistant.getters.askAssistantCanvasActionButton().click();
		aiAssistant.getters.askAssistantSidebarResizer().should('be.visible');
		aiAssistant.getters.askAssistantChat().should('be.visible');
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
		aiAssistant.getters.askAssistantCanvasActionButton().click();
		aiAssistant.getters.askAssistantSidebarResizer().should('be.visible');
		aiAssistant.getters.askAssistantChat().should('be.visible');
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

	it.skip('should start chat session from node error view', () => {
		cy.intercept('POST', '/rest/ai/chat', {
			statusCode: 200,
			fixture: 'aiAssistant/responses/simple_message_response.json',
		}).as('chatRequest');
		cy.createFixtureWorkflow('aiAssistant/workflows/test_workflow.json');
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

	it.skip('should render chat input correctly', () => {
		cy.intercept('POST', '/rest/ai/chat', {
			statusCode: 200,
			fixture: 'aiAssistant/responses/simple_message_response.json',
		}).as('chatRequest');
		cy.createFixtureWorkflow('aiAssistant/workflows/test_workflow.json');
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
			// Enter should add a new line
			aiAssistant.getters.chatInput().type('Hello{enter}there');
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

	it.skip('should render and handle quick replies', () => {
		cy.intercept('POST', '/rest/ai/chat', {
			statusCode: 200,
			fixture: 'aiAssistant/responses/quick_reply_message_response.json',
		}).as('chatRequest');
		cy.createFixtureWorkflow('aiAssistant/workflows/test_workflow.json');
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

	it.skip('should warn before starting a new session', () => {
		cy.intercept('POST', '/rest/ai/chat', {
			statusCode: 200,
			fixture: 'aiAssistant/responses/simple_message_response.json',
		}).as('chatRequest');
		cy.createFixtureWorkflow('aiAssistant/workflows/test_workflow.json');
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
		cy.intercept('POST', '/rest/ai/chat', {
			statusCode: 200,
			fixture: 'aiAssistant/responses/code_diff_suggestion_response.json',
		}).as('chatRequest');
		cy.intercept('POST', '/rest/ai/chat/apply-suggestion', {
			statusCode: 200,
			fixture: 'aiAssistant/responses/apply_code_diff_response.json',
		}).as('applySuggestion');
		cy.createFixtureWorkflow('aiAssistant/workflows/test_workflow.json');
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

	it('Should ignore node execution success and error messages after the node run successfully once', () => {
		const getParameter = () => ndv.getters.parameterInput('jsCode').should('be.visible');

		const getEditor = () => getParameter().find('.cm-content').should('exist');

		cy.intercept('POST', '/rest/ai/chat', {
			statusCode: 200,
			fixture: 'aiAssistant/responses/code_diff_suggestion_response.json',
		}).as('chatRequest');

		cy.createFixtureWorkflow('aiAssistant/workflows/test_workflow.json');
		wf.actions.openNode('Code');
		ndv.getters.nodeExecuteButton().click();
		aiAssistant.getters.nodeErrorViewAssistantButton().click({ force: true });
		cy.wait('@chatRequest');

		cy.intercept('POST', '/rest/ai/chat', {
			statusCode: 200,
			fixture: 'aiAssistant/responses/node_execution_succeeded_response.json',
		}).as('chatRequest2');

		getEditor()
			.type('{selectall}')
			.paste(
				'for (const item of $input.all()) {\n  item.json.myNewField = 1;\n}\n\nreturn $input.all();',
			);

		ndv.getters.nodeExecuteButton().click();

		// Wait for a message from AI to be shown
		aiAssistant.getters.chatMessagesAssistant().should('have.length', 3);

		getEditor()
			.type('{selectall}')
			.paste(
				'for (const item of $input.all()) {\n  item.json.myNewField = 1aaaa!;\n}\n\nreturn $input.all();',
			);

		ndv.getters.nodeExecuteButton().click();

		aiAssistant.getters.chatMessagesAssistant().should('have.length', 3);

		aiAssistant.getters
			.chatMessagesAssistant()
			.eq(2)
			.should(
				'contain.text',
				'Code node ran successfully, did my solution help resolve your issue?\nQuick reply 👇Yes, thanksNo, I am still stuck',
			);
	});

	it.skip('should end chat session when `end_session` event is received', () => {
		cy.intercept('POST', '/rest/ai/chat', {
			statusCode: 200,
			fixture: 'aiAssistant/responses/end_session_response.json',
		}).as('chatRequest');
		cy.createFixtureWorkflow('aiAssistant/workflows/test_workflow.json');
		wf.actions.openNode('Stop and Error');
		ndv.getters.nodeExecuteButton().click();
		aiAssistant.getters.nodeErrorViewAssistantButton().click();
		cy.wait('@chatRequest');
		aiAssistant.getters.chatMessagesSystem().should('have.length', 1);
		aiAssistant.getters.chatMessagesSystem().first().should('contain.text', 'session has ended');
	});

	it('should reset session after it ended and sidebar is closed', () => {
		cy.intercept('POST', '/rest/ai/chat', (req) => {
			req.reply((res) => {
				if (['init-support-chat'].includes(req.body.payload.type)) {
					res.send({
						statusCode: 200,
						fixture: 'aiAssistant/responses/simple_message_response.json',
					});
				} else {
					res.send({ statusCode: 200, fixture: 'aiAssistant/responses/end_session_response.json' });
				}
			});
		}).as('chatRequest');
		aiAssistant.actions.openChatFromCanvas();
		aiAssistant.actions.sendMessage('Hello');
		cy.wait('@chatRequest');
		aiAssistant.actions.closeChat();
		aiAssistant.actions.openChatFromCanvas();
		// After closing and reopening the chat, all messages should be still there
		aiAssistant.getters.chatMessagesAll().should('have.length', 2);
		// End the session
		aiAssistant.actions.sendMessage('Thanks, bye');
		cy.wait('@chatRequest');
		aiAssistant.getters.chatMessagesSystem().should('have.length', 1);
		aiAssistant.getters.chatMessagesSystem().first().should('contain.text', 'session has ended');
		aiAssistant.actions.closeChat();
		aiAssistant.actions.openChatFromCanvas();
		// Now, session should be reset
		aiAssistant.getters.placeholderMessage().should('be.visible');
	});

	it('Should not reset assistant session when workflow is saved', () => {
		cy.intercept('POST', '/rest/ai/chat', {
			statusCode: 200,
			fixture: 'aiAssistant/responses/simple_message_response.json',
		}).as('chatRequest');
		wf.actions.addInitialNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		aiAssistant.actions.openChatFromCanvas();
		aiAssistant.actions.sendMessage('Hello');
		wf.actions.openNode(SCHEDULE_TRIGGER_NODE_NAME);
		ndv.getters.nodeExecuteButton().click();
		wf.getters.isWorkflowSaved();
		aiAssistant.getters.placeholderMessage().should('not.exist');
	});

	it('should send message via shift + enter even with global NodeCreator panel opened', () => {
		cy.intercept('POST', '/rest/ai/chat', {
			statusCode: 200,
			fixture: 'aiAssistant/responses/simple_message_response.json',
		}).as('chatRequest');

		wf.actions.addInitialNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		aiAssistant.actions.openChatFromCanvas();
		nodeCreatorFeature.actions.openNodeCreator();
		aiAssistant.getters.chatInput().type('Hello{shift+enter}');

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
		cy.intercept('POST', '/rest/ai/chat', {
			statusCode: 200,
			fixture: 'aiAssistant/responses/simple_message_response.json',
		}).as('chatRequest');
		wf.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		wf.actions.addNodeToCanvas(GMAIL_NODE_NAME);
		wf.actions.openNode('Add label to message');
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
		cy.intercept('POST', '/rest/ai/chat', {
			statusCode: 200,
			fixture: 'aiAssistant/responses/simple_message_response.json',
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
		wf.getters.nodeCredentialsCreateOption().click();
		credentialsModal.getters.credentialAuthTypeRadioButtons().first().click();
		ndv.getters.copyInput().should('not.exist');
		credentialsModal.getters.oauthConnectButton().should('have.length', 1);
		credentialsModal.getters.credentialInputs().should('have.length', 2);
		aiAssistant.getters.credentialEditAssistantButton().should('not.exist');

		credentialsModal.getters.credentialAuthTypeRadioButtons().eq(1).click();
		credentialsModal.getters.credentialInputs().should('have.length', 4);
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
		wf.getters.nodeCredentialsCreateOption().click();
		ndv.getters.copyInput().should('not.exist');
		credentialsModal.getters.oauthConnectButton().should('have.length', 1);
		credentialsModal.getters.credentialInputs().should('have.length', 2);
		aiAssistant.getters.credentialEditAssistantButton().should('not.exist');
	});
});

describe('General help', () => {
	beforeEach(() => {
		aiAssistant.actions.enableAssistant();
		wf.actions.visit();
	});

	it('assistant returns code snippet', () => {
		cy.intercept('POST', '/rest/ai/chat', {
			statusCode: 200,
			fixture: 'aiAssistant/responses/code_snippet_response.json',
		}).as('chatRequest');

		aiAssistant.getters.askAssistantCanvasActionButton().should('be.visible');
		aiAssistant.getters.askAssistantCanvasActionButton().click();
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

	it('should send current context to support chat', () => {
		cy.createFixtureWorkflow('aiAssistant/workflows/simple_http_request_workflow.json');
		cy.intercept('POST', '/rest/ai/chat', {
			statusCode: 200,
			fixture: 'aiAssistant/responses/simple_message_response.json',
		}).as('chatRequest');

		aiAssistant.getters.askAssistantCanvasActionButton().click();
		aiAssistant.actions.sendMessage('What is wrong with this workflow?');

		cy.wait('@chatRequest').then((interception) => {
			const { body } = interception.request;
			// Body should contain the current workflow context
			expect(body.payload).to.have.property('context');
			expect(body.payload.context).to.have.property('currentView');
			expect(body.payload.context.currentView.name).to.equal('NodeViewExisting');
			expect(body.payload.context).to.have.property('currentWorkflow');
		});
	});

	it('should not send workflow context if nothing changed', () => {
		cy.createFixtureWorkflow('aiAssistant/workflows/simple_http_request_workflow.json');
		cy.intercept('POST', '/rest/ai/chat', {
			statusCode: 200,
			fixture: 'aiAssistant/responses/simple_message_response.json',
		}).as('chatRequest');

		aiAssistant.getters.askAssistantCanvasActionButton().click();
		wf.getters.zoomToFitButton().click();

		aiAssistant.actions.sendMessage('What is wrong with this workflow?');
		cy.wait('@chatRequest');

		// Send another message without changing workflow or executing any node
		aiAssistant.actions.sendMessage('And now?');

		cy.wait('@chatRequest').then((interception) => {
			const { body } = interception.request;
			// Workflow context should be empty
			expect(body.payload).to.have.property('context');
			expect(body.payload.context).not.to.have.property('currentWorkflow');
		});

		// Update http request node url
		wf.actions.openNode('HTTP Request');
		ndv.actions.typeIntoParameterInput('url', 'https://example.com');
		ndv.actions.close();
		// Also execute the workflow
		wf.actions.executeWorkflow();

		// Send another message
		aiAssistant.actions.sendMessage('What about now?');
		cy.wait('@chatRequest').then((interception) => {
			const { body } = interception.request;
			// Both workflow and execution context should be sent
			expect(body.payload).to.have.property('context');
			expect(body.payload.context).to.have.property('currentWorkflow');
			expect(body.payload.context.currentWorkflow).not.to.be.empty;
			expect(body.payload.context).to.have.property('executionData');
			expect(body.payload.context.executionData).not.to.be.empty;
		});
	});
});
