/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { RedisChatMessageHistoryInput } from '@langchain/redis';
import { RedisChatMessageHistory } from '@langchain/redis';
import { BufferMemory, BufferWindowMemory } from 'langchain/memory';
import {
	NodeOperationError,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
	NodeConnectionTypes,
} from 'n8n-workflow';
import type { RedisClientOptions } from 'redis';
import { createClient } from 'redis';

import { getSessionId } from '@utils/helpers';
import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

import {
	sessionIdOption,
	sessionKeyProperty,
	contextWindowLengthProperty,
	expressionSessionKeyProperty,
} from '../descriptions';

export class MemoryRedisChat implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Redis Chat Memory',
		name: 'memoryRedisChat',
		icon: 'file:redis.svg',
		group: ['transform'],
		version: [1, 1.1, 1.2, 1.3, 1.4, 1.5],
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
				Memory: ['Other memories'],
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
		outputs: [NodeConnectionTypes.AiMemory],
		outputNames: ['Memory'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
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
			expressionSessionKeyProperty(1.4),
			sessionKeyProperty,
			{
				displayName: 'Session Time To Live',
				name: 'sessionTTL',
				type: 'number',
				default: 0,
				description:
					'For how long the session should be stored in seconds. If set to 0 it will not expire.',
			},
			{
				...contextWindowLengthProperty,
				displayOptions: { hide: { '@version': [{ _cnd: { lt: 1.3 } }] } },
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('redis');
		const nodeVersion = this.getNode().typeVersion;

		const sessionTTL = this.getNodeParameter('sessionTTL', itemIndex, 0) as number;

		let sessionId;

		if (nodeVersion >= 1.2) {
			sessionId = getSessionId(this, itemIndex);
		} else {
			sessionId = this.getNodeParameter('sessionKey', itemIndex) as string;
		}

		const redisOptions: RedisClientOptions = {
			socket: {
				host: credentials.host as string,
				port: credentials.port as number,
				tls: credentials.ssl === true,
			},
			database: credentials.database as number,
		};

		if (credentials.user && nodeVersion >= 1.5) {
			redisOptions.username = credentials.user as string;
		}
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
			sessionId,
		};

		if (sessionTTL > 0) {
			redisChatConfig.sessionTTL = sessionTTL;
		}
		const redisChatHistory = new RedisChatMessageHistory(redisChatConfig);

		const memClass = this.getNode().typeVersion < 1.3 ? BufferMemory : BufferWindowMemory;
		const kOptions =
			this.getNode().typeVersion < 1.3
				? {}
				: { k: this.getNodeParameter('contextWindowLength', itemIndex) };

		const memory = new memClass({
			memoryKey: 'chat_history',
			chatHistory: redisChatHistory,
			returnMessages: true,
			inputKey: 'input',
			outputKey: 'output',
			...kOptions,
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
