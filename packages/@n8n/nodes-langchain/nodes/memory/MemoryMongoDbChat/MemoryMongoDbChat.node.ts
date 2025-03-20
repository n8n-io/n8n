/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { MongoDBChatMessageHistory } from '@langchain/mongodb';
import { BufferMemory, BufferWindowMemory } from 'langchain/memory';
import { MongoClient } from 'mongodb';
import type {
	ISupplyDataFunctions,
	INodeType,
	INodeTypeDescription,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';

import { getSessionId } from '@utils/helpers';
import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

import {
	sessionIdOption,
	sessionKeyProperty,
	contextWindowLengthProperty,
	expressionSessionKeyProperty,
} from '../descriptions';

export class MemoryMongoDbChat implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MongoDB Chat Memory',
		name: 'memoryMongoDbChat',
		icon: 'file:mongodb.svg',
		group: ['transform'],
		version: [1, 1.1, 1.2, 1.3],
		description: 'Stores the chat history in MongoDB collection.',
		defaults: {
			name: 'MongoDB Chat Memory',
		},
		credentials: [
			{
				name: 'mongoDb',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorymongochat/',
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
			sessionIdOption,
			expressionSessionKeyProperty(1.2),
			sessionKeyProperty,
			{
				displayName: 'Collection Name',
				name: 'collectionName',
				type: 'string',
				default: 'n8n_chat_histories',
				description:
					'The collection name to store the chat history in. If collection does not exist, it will be created.',
			},
			{
				displayName: 'Database Name',
				name: 'databaseName',
				type: 'string',
				default: '',
				description:
					'The database name to store the chat history in. If not provided, the database from credentials will be used.',
			},
			{
				...contextWindowLengthProperty,
				displayOptions: { hide: { '@version': [{ _cnd: { lt: 1.1 } }] } },
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('mongoDb');
		const collectionName = this.getNodeParameter(
			'collectionName',
			itemIndex,
			'n8n_chat_histories',
		) as string;
		const databaseName = this.getNodeParameter('databaseName', itemIndex, '') as string;
		const sessionId = getSessionId(this, itemIndex);

		let connectionString: string;
		let dbName: string;

		if (credentials.configurationType === 'connectionString') {
			connectionString = credentials.connectionString as string;
			dbName = databaseName || (credentials.database as string);
		} else {
			// Build connection string from individual fields
			const host = credentials.host as string;
			const port = credentials.port as number;
			const user = credentials.user ? encodeURIComponent(credentials.user as string) : '';
			const password = credentials.password
				? encodeURIComponent(credentials.password as string)
				: '';
			const authString = user && password ? `${user}:${password}@` : '';
			const tls = credentials.tls as boolean;

			connectionString = `mongodb://${authString}${host}:${port}/?appname=n8n`;
			if (tls) {
				connectionString += '&ssl=true';
			}

			dbName = databaseName || (credentials.database as string);
		}

		if (!dbName) {
			throw new NodeOperationError(
				this.getNode(),
				'Database name must be provided either in credentials or in node parameters',
			);
		}

		try {
			const client = new MongoClient(connectionString);
			await client.connect();

			const db = client.db(dbName);
			const collection = db.collection(collectionName);

			const mongoDBChatHistory = new MongoDBChatMessageHistory({
				collection,
				sessionId,
			});

			const memory = new BufferWindowMemory({
				memoryKey: 'chat_history',
				chatHistory: mongoDBChatHistory,
				returnMessages: true,
				inputKey: 'input',
				outputKey: 'output',
				k: this.getNodeParameter('contextWindowLength', itemIndex),
			});

			return {
				response: logWrapper(memory, this),
			};
		} catch (error) {
			throw new NodeOperationError(this.getNode(), `MongoDB connection error: ${error.message}`);
		}
	}
}
