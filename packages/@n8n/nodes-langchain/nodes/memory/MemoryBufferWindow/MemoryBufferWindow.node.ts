import { BufferWindowMemory } from '@langchain/classic/memory';
import {
	NodeConnectionTypes,
	NodeOperationError,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { getSessionId } from '@utils/helpers';
import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

import {
	sessionIdOption,
	sessionKeyProperty,
	contextWindowLengthProperty,
	expressionSessionKeyProperty,
} from '../descriptions';
import { ChatMemoryMessageHistory } from './ChatMemoryMessageHistory';
import { MemoryChatBufferSingleton } from './MemoryChatBufferSingleton';

export class MemoryBufferWindow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Simple Memory',
		name: 'memoryBufferWindow',
		icon: 'fa:database',
		iconColor: 'black',
		group: ['transform'],
		version: [1, 1.1, 1.2, 1.3, 1.4],
		description: 'Stores memory in n8n, so no credentials required',
		defaults: {
			name: 'Simple Memory',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Memory'],
				Memory: ['For beginners'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorybufferwindow/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiMemory],
		outputNames: ['Memory'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
			{
				displayName:
					'This node stores memory locally in the n8n instance memory. It is not compatible with Queue Mode or Multi-Main setups, as memory will not be shared across workers. For production use with scaling, consider using an external memory store such as Redis, Postgres, or another persistent memory node.',
				name: 'scalingNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { lte: 1.3 } }],
					},
				},
			},
			{
				displayName:
					'This node stores memory locally in the n8n instance memory. It is not compatible with Queue Mode or Multi-Main setups, as memory will not be shared across workers. For production use with scaling, consider using Persistent Memory option, an external memory store such as Redis, Postgres, or another persistent memory node.',
				name: 'scalingNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.4 } }],
						persistentMemory: [false],
					},
				},
			},
			{
				displayName: 'Session Key',
				name: 'sessionKey',
				type: 'string',
				default: 'chat_history',
				description: 'The key to use to store the memory in the workflow data',
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
			},
			{
				displayName: 'Session ID',
				name: 'sessionKey',
				type: 'string',
				default: '={{ $json.sessionId }}',
				description: 'The key to use to store the memory',
				displayOptions: {
					show: {
						'@version': [1.1],
					},
				},
			},
			{
				...sessionIdOption,
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.2 } }],
					},
				},
			},
			expressionSessionKeyProperty(1.3),
			sessionKeyProperty,
			contextWindowLengthProperty,
			{
				displayName: 'Persistent Memory',
				name: 'persistentMemory',
				type: 'boolean',
				default: true,
				noDataExpression: true,
				description:
					'Whether to store memory in local n8n database (with edit/retry support on Chat Hub)',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.4 } }],
					},
				},
			},
			{
				// Hidden parameter for turnId - injected by Chat Hub service before workflow execution.
				// This is a correlation ID generated BEFORE the workflow runs, linking memory entries
				// to the AI message that will be created for this execution turn.
				// On regeneration, a new turnId is generated, so old memory is automatically excluded.
				displayName: 'Turn ID',
				name: 'turnId',
				type: 'hidden',
				default: null,
				description: 'Correlation ID for this execution turn (set by Chat Hub)',
			},
			{
				// Hidden parameter for previousTurnIds - injected by Chat Hub service before workflow execution.
				// This is a JSON array of turnIds from AI messages in the conversation history.
				// Used to load memory for the correct branch without re-querying messages.
				displayName: 'Previous Turn IDs',
				name: 'previousTurnIds',
				type: 'hidden',
				default: null,
				description: 'String array of turnIds for memory loading (set by Chat Hub)',
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const contextWindowLength = this.getNodeParameter('contextWindowLength', itemIndex) as number;
		const workflowId = this.getWorkflow().id;
		const memoryInstance = MemoryChatBufferSingleton.getInstance();

		const node = this.getNode();
		const nodeVersion = node.typeVersion;

		let sessionId;

		if (nodeVersion >= 1.2) {
			sessionId = getSessionId(this, itemIndex);
		} else {
			sessionId = this.getNodeParameter('sessionKey', itemIndex) as string;
		}

		const persistentMemory =
			nodeVersion >= 1.4 && this.getNodeParameter('persistentMemory', itemIndex, false) === true;

		if (persistentMemory) {
			const turnId = this.getNodeParameter('turnId', itemIndex) as string | null;
			const previousTurnIds = this.getNodeParameter('previousTurnIds', itemIndex) as
				| string[]
				| null;

			// turnId is a correlation ID generated before execution starts.
			// When provided by Chat Hub, it links memory entries to the chat hub messages for edit/retry support.
			// When null (manual executions), the proxy generates a random one to enable basic linear history.
			// previousTurnIds contains the turnIds of messages in the active message history chain for loading correct memory.
			const memoryService = await this.helpers.getChatMemoryProxy?.(
				sessionId,
				turnId,
				previousTurnIds,
			);

			if (!memoryService) {
				throw new NodeOperationError(
					node,
					'Chat Hub module is not available. Ensure the chat-hub module is enabled.',
				);
			}

			const chatHistory = new ChatMemoryMessageHistory({
				memoryService,
			});

			const memory = new BufferWindowMemory({
				k: contextWindowLength,
				memoryKey: 'chat_history',
				chatHistory,
				returnMessages: true,
				inputKey: 'input',
				outputKey: 'output',
			});

			return {
				response: logWrapper(memory, this),
			};
		}

		const memory = await memoryInstance.getMemory(`${workflowId}__${sessionId}`, {
			k: contextWindowLength,
			inputKey: 'input',
			memoryKey: 'chat_history',
			outputKey: 'output',
			returnMessages: true,
		});

		return {
			response: logWrapper(memory, this),
		};
	}
}
