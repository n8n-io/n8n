import {
	AGENT_NODE_NAME,
	MANUAL_CHAT_TRIGGER_NODE_NAME,
	OPENAI_CHAT_MODEL_NODE_NAME,
} from './../constants';
import { useWorkflowPage, useNDVPage } from '../composables';
import { useCredentialModal } from '../composables/modals';
import { createNodeExecutionData, executeWorkflow } from '../utils';
import { getManualChatMessages, useManualChatModal } from '../composables/modals/chat-modal';

describe('Langchain Integration', () => {
	beforeEach(() => {
		useWorkflowPage().navigateToNewWorkflowPage();
	});

	it('should add and use manual chat trigger node', () => {
		const { addNodeToCanvas, addLanguageModelNodeToParent, clickManualChatButton } =
			useWorkflowPage();
		const { clickCreateNewCredential, clickGetBackToCanvas } = useNDVPage();
		const { setCredentialValues } = useCredentialModal();
		const { closeManualChatModal, sendManualChatMessage } = useManualChatModal();

		addNodeToCanvas(MANUAL_CHAT_TRIGGER_NODE_NAME, true);
		addNodeToCanvas(AGENT_NODE_NAME, true);

		addLanguageModelNodeToParent(OPENAI_CHAT_MODEL_NODE_NAME, AGENT_NODE_NAME);

		clickCreateNewCredential();
		setCredentialValues({
			apiKey: 'sk_test_123',
		});
		clickGetBackToCanvas();

		clickManualChatButton();

		const inputMessage = 'Hello!';
		const outputMessage = 'Hi there! How can I assist you today?';
		executeWorkflow({
			trigger: () => {
				sendManualChatMessage(inputMessage);
			},
			runData: [
				createNodeExecutionData('On new manual Chat Message', {
					jsonData: {
						main: { input: inputMessage },
					},
				}),
				createNodeExecutionData('OpenAI Chat Model', {
					jsonData: {
						ai_languageModel: {
							response: {
								generations: [
									{
										text: `{
    "action": "Final Answer",
    "action_input": "${outputMessage}"
}`,
										message: {
											lc: 1,
											type: 'constructor',
											id: ['langchain', 'schema', 'AIMessage'],
											kwargs: {
												content: `{
    "action": "Final Answer",
    "action_input": "${outputMessage}"
}`,
												additional_kwargs: {},
											},
										},
										generationInfo: { finish_reason: 'stop' },
									},
								],
								llmOutput: {
									tokenUsage: {
										completionTokens: 26,
										promptTokens: 519,
										totalTokens: 545,
									},
								},
							},
						},
					},
				}),
				createNodeExecutionData('Agent', {
					jsonData: {
						main: { output: 'Hi there! How can I assist you today?' },
					},
				}),
			],
			lastNodeExecuted: 'Agent',
		});

		const messages = getManualChatMessages();
		messages.should('have.length', 2);
		messages.should('contain', inputMessage);
		messages.should('contain', outputMessage);

		closeManualChatModal();
	});
});
