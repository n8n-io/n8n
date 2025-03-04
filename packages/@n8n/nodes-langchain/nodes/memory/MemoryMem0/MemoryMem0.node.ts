/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type ISupplyDataFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
	NodeOperationError,
} from 'n8n-workflow';

import { logWrapper } from '../../../utils/logWrapper';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';
import { expressionSessionKeyProperty, sessionIdOption, sessionKeyProperty } from '../descriptions';
import { getSessionId } from '../../../utils/helpers';
import type { BaseChatMemory } from '@langchain/core/memory';
import type { InputValues, MemoryVariables } from '@langchain/core/memory';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { ChatMessageHistory } from '@langchain/community/stores/message/in_memory';

/**
 * Implementation of mem0.ai memory integration for langchain
 */
class Mem0Memory implements BaseChatMemory {
	private apiKey: string;
	private apiUrl: string = 'https://api.mem0.ai/v1';
	private userId: string;
	private sessionId: string;
	private chatHistory: ChatMessageHistory;
	
	constructor(fields: {
		apiKey: string;
		userId: string;
		sessionId: string;
		apiUrl?: string;
	}) {
		this.apiKey = fields.apiKey;
		this.userId = fields.userId;
		this.sessionId = fields.sessionId;
		if (fields.apiUrl) {
			this.apiUrl = fields.apiUrl;
		}
		this.chatHistory = new ChatMessageHistory();
	}

	get memoryKeys() {
		return ["chat_history"];
	}

	get memoryVariables(): string[] {
		return ["chat_history"];
	}

	// Load previous messages from mem0
	async loadMemoryVariables(_values: InputValues): Promise<MemoryVariables> {
		try {
			// Prepare the search payload
			const payload = {
				query: this.sessionId, // Using sessionId as the query to find relevant memories
				user_id: this.userId,
			};

			// Make the API request
			const response = await fetch(`${this.apiUrl}/memories/search/`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Token ${this.apiKey}`,
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Failed to load memories: ${response.status} ${errorText}`);
			}

			const results = await response.json();
			
			// Clear existing chat history
			this.chatHistory = new ChatMessageHistory();
			
			// Process and add each memory to chat history
			for (const result of results) {
				const memory = result.memory;
				if (memory && typeof memory === 'string') {
					// Try to parse the memory string to extract role and content
					try {
						// Check if memory contains a role marker
						if (memory.startsWith('user:')) {
							await this.chatHistory.addMessage(
								new HumanMessage(memory.substring(5).trim())
							);
						} else if (memory.startsWith('assistant:')) {
							await this.chatHistory.addMessage(
								new AIMessage(memory.substring(10).trim())
							);
						} else {
							// If no role marker, assume it's a user message
							await this.chatHistory.addMessage(new HumanMessage(memory));
						}
					} catch (e) {
						console.error('Error parsing memory:', e);
					}
				}
			}

			// Return the chat history in the format expected by langchain
			const messages = await this.chatHistory.getMessages();
			return {
				chat_history: messages,
			};
		} catch (error) {
			console.error('Error loading memory variables:', error);
			return { chat_history: [] };
		}
	}

	// Save messages to mem0
	async saveContext(inputValues: InputValues, outputValues: InputValues): Promise<void> {
		try {
			const input = inputValues.input;
			const output = outputValues.output;

			if (!input || !output) {
				return;
			}

			// Add messages to local chat history
			await this.chatHistory.addMessage(new HumanMessage(input));
			await this.chatHistory.addMessage(new AIMessage(output));

			// Prepare payload for mem0
			const payload = {
				messages: [
					{ role: 'user', content: input },
					{ role: 'assistant', content: output }
				],
				user_id: this.userId,
				metadata: { session_id: this.sessionId }
			};

			// Make API request to add memory
			const response = await fetch(`${this.apiUrl}/memories/`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Token ${this.apiKey}`,
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Failed to save memory: ${response.status} ${errorText}`);
			}
		} catch (error) {
			console.error('Error saving context:', error);
		}
	}

	// Clear memory for the current session
	async clear(): Promise<void> {
		this.chatHistory = new ChatMessageHistory();
		// Note: mem0 API doesn't seem to have a direct way to clear memories
		// This implementation only clears the local chat history
	}
}

export class MemoryMem0 implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mem0',
		name: 'memoryMem0',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:mem0.png', // You'll need to add this icon to your project
		group: ['transform'],
		version: [1],
		description: 'Use Mem0 Memory',
		defaults: {
			name: 'Mem0',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Memory'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorymem0/',
					},
				],
			},
		},
		inputs: [],
		outputs: [NodeConnectionType.AiMemory],
		outputNames: ['Memory'],
		credentials: [
			{
				name: 'mem0Api',
				required: true,
			},
		],
		properties: [
			getConnectionHintNoticeField([NodeConnectionType.AiAgent]),
			{
				...sessionIdOption,
			},
			expressionSessionKeyProperty(1),
			sessionKeyProperty,
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'string',
				default: '={{ $json.userId }}',
				required: true,
				description: 'The user ID to use for memory operations',
			},
			{
				displayName: 'API URL',
				name: 'apiUrl',
				type: 'string',
				default: 'https://api.mem0.ai/v1',
				description: 'The URL of the Mem0 API',
				required: false,
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials<{
			apiKey: string;
		}>('mem0Api');

		if (!credentials.apiKey) {
			throw new NodeOperationError(this.getNode(), 'API key is required to use Mem0');
		}

		const sessionId = getSessionId(this, itemIndex);
		const userId = this.getNodeParameter('userId', itemIndex) as string;
		const apiUrl = this.getNodeParameter('apiUrl', itemIndex, 'https://api.mem0.ai/v1') as string;

		if (!userId) {
			throw new NodeOperationError(this.getNode(), 'User ID is required for Mem0 memory');
		}

		const memory = new Mem0Memory({
			apiKey: credentials.apiKey,
			userId,
			sessionId,
			apiUrl,
		});

		return {
			response: logWrapper(memory, this),
		};
	}
}
