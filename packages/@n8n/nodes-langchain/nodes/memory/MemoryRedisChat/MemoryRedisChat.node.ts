/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeOperationError,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
	NodeConnectionType,
} from 'n8n-workflow';
import { BufferMemory } from 'langchain/memory';
import type { RedisChatMessageHistoryInput } from 'langchain/stores/message/redis';
import { RedisChatMessageHistory } from 'langchain/stores/message/redis';
import type { RedisClientOptions } from 'redis';
import { createClient } from 'redis';
import { logWrapper } from '../../../utils/logWrapper';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';

export class MemoryRedisChat implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Redis Chat Memory',
		name: 'memoryRedisChat',
		icon: 'file:redis.svg',
		group: ['transform'],
		version: [1, 1.1],
		description: 'Stores the chat history in Redis.',
		defaults: {
			name: 'Redis Chat Memory',
		},
		credentials: [
			{
				name: 'redis',
				required: true,
			},
		],
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Memory'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memoryredischat/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiMemory],
		outputNames: ['Memory'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionType.AiAgent]),
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
				displayName: 'Session Time To Live',
				name: 'sessionTTL',
				type: 'number',
				default: 0,
				description:
					'For how long the session should be stored in seconds. If set to 0 it will not expire.',
			},
		],
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('redis');
		const sessionKey = this.getNodeParameter('sessionKey', itemIndex) as string;
		const sessionTTL = this.getNodeParameter('sessionTTL', itemIndex, 0) as number;

		const redisOptions: RedisClientOptions = {
			socket: {
				host: credentials.host as string,
				port: credentials.port as number,
			},
			database: credentials.database as number,
		};

		if (credentials.password) {
			redisOptions.password = credentials.password as string;
		}

		const client = createClient({
			...redisOptions,
		});

		client.on('error', async (error: Error) => {
			await client.quit();
			throw new NodeOperationError(this.getNode(), 'Redis Error: ' + error.message);
		});

		const redisChatConfig: RedisChatMessageHistoryInput = {
			client,
			sessionId: sessionKey,
		};

		if (sessionTTL > 0) {
			redisChatConfig.sessionTTL = sessionTTL;
		}
		const redisChatHistory = new RedisChatMessageHistory(redisChatConfig);

		const memory = new BufferMemory({
			memoryKey: 'chat_history',
			chatHistory: redisChatHistory,
			returnMessages: true,
			inputKey: 'input',
			outputKey: 'output',
		});

		async function closeFunction() {
			void client.disconnect();
		}

		return {
			closeFunction,
			response: logWrapper(memory, this),
		};
	}
}
