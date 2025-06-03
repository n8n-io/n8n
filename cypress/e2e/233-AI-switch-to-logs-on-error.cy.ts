import type { ExecutionError } from 'n8n-workflow';

import * as logs from '../composables/logs';
import {
	closeManualChatModal,
	getManualChatMessages,
	sendManualChatMessage,
} from '../composables/modals/chat-modal';
import { setCredentialValues } from '../composables/modals/credential-modal';
import {
	clickCreateNewCredential,
	clickExecuteNode,
	clickGetBackToCanvas,
} from '../composables/ndv';
import {
	addLanguageModelNodeToParent,
	addMemoryNodeToParent,
	addNodeToCanvas,
	addToolNodeToParent,
	navigateToNewWorkflowPage,
	openNode,
} from '../composables/workflow';
import {
	AGENT_NODE_NAME,
	AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
	AI_MEMORY_POSTGRES_NODE_NAME,
	AI_TOOL_CALCULATOR_NODE_NAME,
	CHAT_TRIGGER_NODE_DISPLAY_NAME,
	MANUAL_CHAT_TRIGGER_NODE_NAME,
	MANUAL_TRIGGER_NODE_DISPLAY_NAME,
	MANUAL_TRIGGER_NODE_NAME,
} from '../constants';
import { NDV, WorkflowPage as WorkflowPageClass } from '../pages';
import { createMockNodeExecutionData, getVisibleSelect, runMockWorkflowExecution } from '../utils';

const ndv = new NDV();
const WorkflowPage = new WorkflowPageClass();

function createRunDataWithError(inputMessage: string) {
	return [
		createMockNodeExecutionData(MANUAL_CHAT_TRIGGER_NODE_NAME, {
			jsonData: {
				main: { input: inputMessage },
			},
		}),
		createMockNodeExecutionData(AI_MEMORY_POSTGRES_NODE_NAME, {
			jsonData: {
				ai_memory: {
					json: {
						action: 'loadMemoryVariables',
						values: {
							input: inputMessage,
							system_message: 'You are a helpful assistant',
							formatting_instructions:
								'IMPORTANT: Always call `format_final_json_response` to format your final response!',
						},
					},
				},
			},
			inputOverride: {
				ai_memory: [
					[
						{
							json: {
								action: 'loadMemoryVariables',
								values: {
									input: inputMessage,
									system_message: 'You are a helpful assistant',
									formatting_instructions:
										'IMPORTANT: Always call `format_final_json_response` to format your final response!',
								},
							},
						},
					],
				],
			},
			source: [{ previousNode: AGENT_NODE_NAME, previousNodeRun: 0 }],
			error: {
				message: 'Internal error',
				timestamp: 1722591723244,
				name: 'NodeOperationError',
				description: 'Internal error',
				context: {},
				cause: {
					name: 'error',
					severity: 'FATAL',
					code: '3D000',
					file: 'postinit.c',
					line: '885',
					routine: 'InitPostgres',
				} as unknown as Error,
			} as ExecutionError,
			metadata: {
				subRun: [
					{
						node: 'Postgres Chat Memory',
						runIndex: 0,
					},
				],
			},
		}),
		createMockNodeExecutionData(AGENT_NODE_NAME, {
			executionStatus: 'error',
			error: {
				level: 'error',
				tags: {
					packageName: 'workflow',
				},
				context: {},
				functionality: 'configuration-node',
				name: 'NodeOperationError',
				timestamp: 1722591723244,
				node: {
					parameters: {
						notice: '',
						sessionIdType: 'fromInput',
						tableName: 'n8n_chat_histories',
					},
					id: '6b9141da-0135-4e9d-94d1-2d658cbf48b5',
					name: 'Postgres Chat Memory',
					type: '@n8n/n8n-nodes-langchain.memoryPostgresChat',
					typeVersion: 1,
					position: [1140, 500],
					credentials: {
						postgres: {
							id: 'RkyZetVpGsSfEAhQ',
							name: 'Postgres account',
						},
					},
				},
				messages: ['database "chat11" does not exist'],
				description: 'Internal error',
				message: 'Internal error',
			} as unknown as ExecutionError,
		}),
	];
}

function setupTestWorkflow(chatTrigger: boolean = false) {
	// Setup test workflow with AI Agent, Postgres Memory Node (source of error), Calculator Tool, and OpenAI Chat Model
	if (chatTrigger) {
		addNodeToCanvas(MANUAL_CHAT_TRIGGER_NODE_NAME, true, false, undefined, true);
	} else {
		addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME, true);
	}

	addNodeToCanvas(AGENT_NODE_NAME, true);

	if (!chatTrigger) {
		// Remove chat trigger
		WorkflowPage.getters
			.canvasNodeByName(CHAT_TRIGGER_NODE_DISPLAY_NAME)
			.find('[data-test-id="delete-node-button"]')
			.click({ force: true });

		// Set manual trigger to output standard pinned data
		openNode(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
		ndv.actions.editPinnedData();
		ndv.actions.savePinnedData();
		ndv.actions.close();
	}

	// Calculator is added just to make OpenAI Chat Model work (tools can not be empty with OpenAI model)
	addToolNodeToParent(AI_TOOL_CALCULATOR_NODE_NAME, AGENT_NODE_NAME);
	clickGetBackToCanvas();

	addMemoryNodeToParent(AI_MEMORY_POSTGRES_NODE_NAME, AGENT_NODE_NAME);

	clickCreateNewCredential();
	setCredentialValues({
		password: 'testtesttest',
	});

	ndv.getters.parameterInput('sessionIdType').click();
	getVisibleSelect().contains('Define below').click();
	ndv.getters.parameterInput('sessionKey').type('asdasd');

	clickGetBackToCanvas();

	addLanguageModelNodeToParent(
		AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
		AGENT_NODE_NAME,
		true,
	);

	clickCreateNewCredential();
	setCredentialValues({
		apiKey: 'sk_test_123',
	});
	clickGetBackToCanvas();

	WorkflowPage.actions.zoomToFit();
}

function checkMessages(inputMessage: string, outputMessage: string) {
	const messages = getManualChatMessages();
	messages.should('have.length', 2);
	messages.should('contain', inputMessage);
	messages.should('contain', outputMessage);

	logs.getOverviewPanelBody().should('exist');
	logs.getLogEntries().should('have.length', 2);
	logs.getSelectedLogEntry().should('have.text', 'AI Agent');
	logs.getOutputPanel().should('contain', AI_MEMORY_POSTGRES_NODE_NAME);
}

describe("AI-233 Make root node's logs pane active in case of an error in sub-nodes", () => {
	beforeEach(() => {
		navigateToNewWorkflowPage();
	});

	it('should open logs tab by default when there was an error', () => {
		setupTestWorkflow(true);

		openNode(AGENT_NODE_NAME);

		const inputMessage = 'Test the code tool';

		clickExecuteNode();
		runMockWorkflowExecution({
			trigger: () => sendManualChatMessage(inputMessage),
			runData: createRunDataWithError(inputMessage),
			lastNodeExecuted: AGENT_NODE_NAME,
		});

		checkMessages(inputMessage, '[ERROR: Internal error]');
		closeManualChatModal();

		// Open the AI Agent node to see the logs
		openNode(AGENT_NODE_NAME);

		// Finally check that logs pane is opened by default
		ndv.getters.outputDataContainer().should('be.visible');

		ndv.getters.aiOutputModeToggle().should('be.visible');
		ndv.getters
			.aiOutputModeToggle()
			.find('[role="radio"]')
			.should('have.length', 2)
			.eq(1)
			.should('have.attr', 'aria-checked', 'true');

		ndv.getters
			.outputPanel()
			.findChildByTestId('node-error-message')
			.should('be.visible')
			.should('contain', 'Error in sub-node');
	});

	it('should switch to logs tab on error, when NDV is already opened', () => {
		setupTestWorkflow(false);

		openNode(AGENT_NODE_NAME);

		const inputMessage = 'Test the code tool';

		runMockWorkflowExecution({
			trigger: () => clickExecuteNode(),
			runData: createRunDataWithError(inputMessage),
			lastNodeExecuted: AGENT_NODE_NAME,
		});

		// Check that logs pane is opened by default
		ndv.getters.outputDataContainer().should('be.visible');

		ndv.getters.aiOutputModeToggle().should('be.visible');
		ndv.getters
			.aiOutputModeToggle()
			.find('[role="radio"]')
			.should('have.length', 2)
			.eq(1)
			.should('have.attr', 'aria-checked', 'true');

		ndv.getters
			.outputPanel()
			.findChildByTestId('node-error-message')
			.should('be.visible')
			.should('contain', 'Error in sub-node');
	});
});
