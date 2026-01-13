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
import { ChatHubMessageHistory } from './ChatHubMessageHistory';

export class MemoryChatHub implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'n8n Memory',
		name: 'memoryChatHub',
		icon: 'fa:comments',
		iconColor: 'blue',
		group: ['transform'],
		version: 1,
		description: "Stores chat memory in n8n's local database for persistent conversations",
		defaults: {
			name: 'n8n Memory',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorychathub/',
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
					"This memory stores conversations in n8n's local database, enabling simple persistent chat memory with support for Chat Hub's message edits and retries.",
				name: 'chatHubNotice',
				type: 'notice',
				default: '',
			},
			sessionIdOption,
			expressionSessionKeyProperty(1),
			sessionKeyProperty,
			contextWindowLengthProperty,
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
		const sessionId = getSessionId(this, itemIndex);
		const contextWindowLength = this.getNodeParameter('contextWindowLength', itemIndex) as number;
		const turnId = this.getNodeParameter('turnId', itemIndex) as string | null;
		const previousTurnIds = this.getNodeParameter('previousTurnIds', itemIndex) as string[] | null;

		const node = this.getNode();
		const memoryNodeId = node.id;

		// turnId is a correlation ID generated before execution starts.
		// When provided by Chat Hub, it links memory entries to the chat hub messages for edit/retry support.
		// When null (manual executions), the proxy generates a random one to enable basic linear history.
		// previousTurnIds contains the turnIds of messages in the active message history chain for loading correct memory.
		const memoryService = await this.helpers.getChatHubProxy?.(
			sessionId,
			memoryNodeId,
			turnId,
			previousTurnIds,
		);

		if (!memoryService) {
			throw new NodeOperationError(
				node,
				'Chat Hub module is not available. Ensure the chat-hub module is enabled.',
			);
		}

		const chatHistory = new ChatHubMessageHistory({
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
}
