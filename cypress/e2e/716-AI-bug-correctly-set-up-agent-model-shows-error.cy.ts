import { createNewCredential, getCredentialsPageUrl } from '../composables/credentialsComposables';
import {
	addLanguageModelNodeToParent,
	addNodeToCanvas,
	getNodeIssuesByName,
} from '../composables/workflow';
import { AGENT_NODE_NAME, AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME } from '../constants';

describe('AI-716 Correctly set up agent model shows error', () => {
	beforeEach(() => {
		cy.visit(getCredentialsPageUrl());
		createNewCredential('OpenAi', 'OpenAI Account', 'API Key', 'sk-123', true);
		cy.visit('/workflow/new');
	});

	it('should not show error when adding a sub-node with credential set-up', () => {
		addNodeToCanvas('AI Agent');
		addLanguageModelNodeToParent(
			AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
			AGENT_NODE_NAME,
			true,
		);
		cy.get('body').type('{esc}');

		getNodeIssuesByName(AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME).should('have.length', 0);
	});
});
