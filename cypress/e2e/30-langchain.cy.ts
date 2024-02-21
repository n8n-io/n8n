import {
	AGENT_NODE_NAME,
	MANUAL_CHAT_TRIGGER_NODE_NAME,
	AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
	MANUAL_TRIGGER_NODE_NAME,
	AI_MEMORY_WINDOW_BUFFER_MEMORY_NODE_NAME,
	AI_TOOL_CALCULATOR_NODE_NAME,
	AI_OUTPUT_PARSER_AUTO_FIXING_NODE_NAME,
	AI_TOOL_CODE_NODE_NAME,
	AI_TOOL_WIKIPEDIA_NODE_NAME,
	BASIC_LLM_CHAIN_NODE_NAME,
} from './../constants';
import { createMockNodeExecutionData, runMockWorkflowExcution } from '../utils';
import {
	addLanguageModelNodeToParent,
	addMemoryNodeToParent,
	addNodeToCanvas,
	addOutputParserNodeToParent,
	addToolNodeToParent,
	clickManualChatButton,
	navigateToNewWorkflowPage,
	openNode,
} from '../composables/workflow';
import {
	clickCreateNewCredential,
	clickExecuteNode,
	clickGetBackToCanvas,
	getOutputPanelTable,
	getParameterInputByName,
	setParameterInputByName,
	setParameterSelectByContent,
	toggleParameterCheckboxInputByName,
} from '../composables/ndv';
import { setCredentialValues } from '../composables/modals/credential-modal';
import {
	closeManualChatModal,
	getManualChatMessages,
	getManualChatModalLogs,
	getManualChatModalLogsEntries,
	getManualChatModalLogsTree,
	sendManualChatMessage,
} from '../composables/modals/chat-modal';

describe('Langchain Integration', () => {
	beforeEach(() => {
		navigateToNewWorkflowPage();
	});

	it('should add nodes to all Agent node input types', () => {
		addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME, true);
		addNodeToCanvas(AGENT_NODE_NAME, true, true);
		toggleParameterCheckboxInputByName('hasOutputParser');
		clickGetBackToCanvas();

		addLanguageModelNodeToParent(AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME, AGENT_NODE_NAME, true);
		clickGetBackToCanvas();

		addMemoryNodeToParent(AI_MEMORY_WINDOW_BUFFER_MEMORY_NODE_NAME, AGENT_NODE_NAME);
		clickGetBackToCanvas();

		addToolNodeToParent(AI_TOOL_CALCULATOR_NODE_NAME, AGENT_NODE_NAME);
		clickGetBackToCanvas();

		addOutputParserNodeToParent(AI_OUTPUT_PARSER_AUTO_FIXING_NODE_NAME, AGENT_NODE_NAME);
		clickGetBackToCanvas();
	});

	it('should add multiple tool nodes to Agent node tool input type', () => {
		addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME, true);
		addNodeToCanvas(AGENT_NODE_NAME, true);

		[
			AI_TOOL_CALCULATOR_NODE_NAME,
			AI_TOOL_CODE_NODE_NAME,
			AI_TOOL_CODE_NODE_NAME,
			AI_TOOL_CODE_NODE_NAME,
			AI_TOOL_WIKIPEDIA_NODE_NAME,
		].forEach((tool) => {
			addToolNodeToParent(tool, AGENT_NODE_NAME);
			clickGetBackToCanvas();
		});
	});

	it('should be able to open and execute Basic LLM Chain node', () => {
		addNodeToCanvas(MANUAL_CHAT_TRIGGER_NODE_NAME, true);
		addNodeToCanvas(BASIC_LLM_CHAIN_NODE_NAME, true);

		addLanguageModelNodeToParent(
			AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
			BASIC_LLM_CHAIN_NODE_NAME,
			true
		);

		clickCreateNewCredential();
		setCredentialValues({
			apiKey: 'sk_test_123',
		});
		clickGetBackToCanvas();

		openNode(BASIC_LLM_CHAIN_NODE_NAME);

		setParameterSelectByContent('promptType', 'Define below')
		const inputMessage = 'Hello!';
		const outputMessage = 'Hi there! How can I assist you today?';

		setParameterInputByName('text', inputMessage);

		runMockWorkflowExcution({
			trigger: () => clickExecuteNode(),
			runData: [
				createMockNodeExecutionData(BASIC_LLM_CHAIN_NODE_NAME, {
					jsonData: {
						main: { output: outputMessage },
					},
					metadata: {
						subRun: [{ node: AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME, runIndex: 0 }],
					},
				}),
			],
			lastNodeExecuted: BASIC_LLM_CHAIN_NODE_NAME,
		});

		getOutputPanelTable().should('contain', 'output');
		getOutputPanelTable().should('contain', outputMessage);
	});

	it('should be able to open and execute Agent node', () => {
		addNodeToCanvas(MANUAL_CHAT_TRIGGER_NODE_NAME, true);
		addNodeToCanvas(AGENT_NODE_NAME, true);

		addLanguageModelNodeToParent(AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME, AGENT_NODE_NAME, true);

		clickCreateNewCredential();
		setCredentialValues({
			apiKey: 'sk_test_123',
		});
		clickGetBackToCanvas();

		openNode(AGENT_NODE_NAME);

		const inputMessage = 'Hello!';
		const outputMessage = 'Hi there! How can I assist you today?';

		setParameterSelectByContent('promptType', 'Define below')
		setParameterInputByName('text', inputMessage);

		runMockWorkflowExcution({
			trigger: () => clickExecuteNode(),
			runData: [
				createMockNodeExecutionData(AGENT_NODE_NAME, {
					jsonData: {
						main: { output: outputMessage },
					},
					metadata: {
						subRun: [{ node: AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME, runIndex: 0 }],
					},
				}),
			],
			lastNodeExecuted: AGENT_NODE_NAME,
		});

		getOutputPanelTable().should('contain', 'output');
		getOutputPanelTable().should('contain', outputMessage);
	});

	it('should add and use Manual Chat Trigger node together with Agent node', () => {
		addNodeToCanvas(MANUAL_CHAT_TRIGGER_NODE_NAME, true);
		addNodeToCanvas(AGENT_NODE_NAME, true);

		addLanguageModelNodeToParent(AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME, AGENT_NODE_NAME, true);

		clickCreateNewCredential();
		setCredentialValues({
			apiKey: 'sk_test_123',
		});
		clickGetBackToCanvas();

		clickManualChatButton();

		getManualChatModalLogs().should('not.exist');

		const inputMessage = 'Hello!';
		const outputMessage = 'Hi there! How can I assist you today?';

		runMockWorkflowExcution({
			trigger: () => {
				sendManualChatMessage(inputMessage);
			},
			runData: [
				createMockNodeExecutionData(MANUAL_CHAT_TRIGGER_NODE_NAME, {
					jsonData: {
						main: { input: inputMessage },
					},
				}),
				createMockNodeExecutionData(AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME, {
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
					inputOverride: {
						ai_languageModel: [
							[
								{
									json: {
										messages: [
											{
												lc: 1,
												type: 'constructor',
												id: ['langchain', 'schema', 'SystemMessage'],
												kwargs: {
													content:
														'Assistant is a large language model trained by OpenAI.\n\nAssistant is designed to be able to assist with a wide range of tasks, from answering simple questions to providing in-depth explanations and discussions on a wide range of topics. As a language model, Assistant is able to generate human-like text based on the input it receives, allowing it to engage in natural-sounding conversations and provide responses that are coherent and relevant to the topic at hand.\n\nAssistant is constantly learning and improving, and its capabilities are constantly evolving. It is able to process and understand large amounts of text, and can use this knowledge to provide accurate and informative responses to a wide range of questions. Additionally, Assistant is able to generate its own text based on the input it receives, allowing it to engage in discussions and provide explanations and descriptions on a wide range of topics.\n\nOverall, Assistant is a powerful system that can help with a wide range of tasks and provide valuable insights and information on a wide range of topics. Whether you need help with a specific question or just want to have a conversation about a particular topic, Assistant is here to assist. However, above all else, all responses must adhere to the format of RESPONSE FORMAT INSTRUCTIONS.',
													additional_kwargs: {},
												},
											},
											{
												lc: 1,
												type: 'constructor',
												id: ['langchain', 'schema', 'HumanMessage'],
												kwargs: {
													content:
														'TOOLS\n------\nAssistant can ask the user to use tools to look up information that may be helpful in answering the users original question. The tools the human can use are:\n\n\n\nRESPONSE FORMAT INSTRUCTIONS\n----------------------------\n\nOutput a JSON markdown code snippet containing a valid JSON object in one of two formats:\n\n**Option 1:**\nUse this if you want the human to use a tool.\nMarkdown code snippet formatted in the following schema:\n\n```json\n{\n    "action": string, // The action to take. Must be one of []\n    "action_input": string // The input to the action. May be a stringified object.\n}\n```\n\n**Option #2:**\nUse this if you want to respond directly and conversationally to the human. Markdown code snippet formatted in the following schema:\n\n```json\n{\n    "action": "Final Answer",\n    "action_input": string // You should put what you want to return to use here and make sure to use valid json newline characters.\n}\n```\n\nFor both options, remember to always include the surrounding markdown code snippet delimiters (begin with "```json" and end with "```")!\n\n\nUSER\'S INPUT\n--------------------\nHere is the user\'s input (remember to respond with a markdown code snippet of a json blob with a single action, and NOTHING else):\n\nHello!',
													additional_kwargs: {},
												},
											},
										],
										options: { stop: ['Observation:'], promptIndex: 0 },
									},
								},
							],
						],
					},
				}),
				createMockNodeExecutionData(AGENT_NODE_NAME, {
					jsonData: {
						main: { output: 'Hi there! How can I assist you today?' },
					},
					metadata: {
						subRun: [{ node: AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME, runIndex: 0 }],
					},
				}),
			],
			lastNodeExecuted: AGENT_NODE_NAME,
		});

		const messages = getManualChatMessages();
		messages.should('have.length', 2);
		messages.should('contain', inputMessage);
		messages.should('contain', outputMessage);

		getManualChatModalLogsTree().should('be.visible');
		getManualChatModalLogsEntries().should('have.length', 1);

		closeManualChatModal();
	});
});
