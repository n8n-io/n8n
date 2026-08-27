import { BaseListChatMessageHistory } from '@langchain/core/chat_history';
import type { BaseMessage, StoredMessage } from '@langchain/core/messages';
import { mapChatMessagesToStoredMessages, mapStoredMessagesToChatMessages } from '@langchain/core/messages';
import { BufferWindowMemory } from '@langchain/classic/memory';
import { getConnectionHintNoticeField, logWrapper } from '@n8n/ai-utilities';
import { getSessionId } from '@utils/helpers';
import type { Collection, MongoClient } from 'mongodb';
import {
	NodeConnectionTypes,
	NodeOperationError,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import {
	connectDocumentDatabaseClient,
	sanitizeDocumentDatabaseUriInMessage,
	validateAndResolveDocumentDatabaseCredentials,
} from 'n8n-nodes-base/dist/nodes/DocumentDb/GenericFunctions';

import {
	contextWindowLengthProperty,
	expressionSessionKeyProperty,
	scopedSessionHint,
	sessionIdOption,
	sessionKeyProperty,
} from '../descriptions';

interface DocumentDbChatMessage {
	sessionId: string;
	message: StoredMessage;
	createdAt: Date;
}

export class DocumentDbChatMessageHistory extends BaseListChatMessageHistory {
	lc_namespace = ['n8n', 'documentdb', 'chat_history'];

	constructor(
		private readonly collection: Collection<DocumentDbChatMessage>,
		private readonly sessionId: string,
	) {
		super();
	}

	async getMessages(): Promise<BaseMessage[]> {
		const documents = await this.collection
			.find({ sessionId: this.sessionId })
			.sort({ createdAt: 1, _id: 1 })
			.toArray();

		return mapStoredMessagesToChatMessages(documents.map(({ message }) => message));
	}

	async addMessage(message: BaseMessage): Promise<void> {
		const [storedMessage] = mapChatMessagesToStoredMessages([message]);
		if (!storedMessage) return;

		await this.collection.insertOne({
			sessionId: this.sessionId,
			message: storedMessage,
			createdAt: new Date(),
		});
	}

	async clear(): Promise<void> {
		await this.collection.deleteMany({ sessionId: this.sessionId });
	}
}

export class MemoryDocumentDbChat implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'DocumentDB Chat Memory',
		name: 'memoryDocumentDbChat',
		icon: 'file:documentdb.png',
		group: ['transform'],
		version: [1, 1.1],
		description: 'Stores the chat history in a DocumentDB collection.',
		defaults: {
			name: 'DocumentDB Chat Memory',
		},
		credentials: [
			{
				name: 'documentDb',
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
				primaryDocumentation: [{ url: 'https://documentdb.io/docs/' }],
			},
		},
		inputs: [],
		outputs: [NodeConnectionTypes.AiMemory],
		outputNames: ['Memory'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
			sessionIdOption,
			expressionSessionKeyProperty(1),
			scopedSessionHint(1.1),
			sessionKeyProperty,
			{
				displayName: 'Collection Name',
				name: 'collectionName',
				type: 'string',
				default: 'n8n_chat_histories',
				description:
					'The collection name to store the chat history in. If the collection does not exist, it will be created.',
			},
			{
				displayName: 'Database Name',
				name: 'databaseName',
				type: 'string',
				default: '',
				description:
					'The database name to store the chat history in. If not provided, the database from credentials will be used.',
			},
			contextWindowLengthProperty,
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('documentDb');
		const node = this.getNode();
		const { connectionString, database } = validateAndResolveDocumentDatabaseCredentials(
			node,
			credentials,
		);
		const databaseName = (this.getNodeParameter('databaseName', itemIndex, '') as string).trim();
		const collectionName = this.getNodeParameter(
			'collectionName',
			itemIndex,
			'n8n_chat_histories',
		) as string;
		const sessionId = getSessionId(this, itemIndex);
		const resolvedDatabaseName = databaseName || database;

		if (!resolvedDatabaseName) {
			throw new NodeOperationError(
				node,
				'Database name must be provided either in credentials or in node parameters',
			);
		}

		let client: MongoClient | undefined;
		try {
			client = await connectDocumentDatabaseClient(
				connectionString,
				node.typeVersion,
				credentials,
			);
			const collection = client
				.db(resolvedDatabaseName)
				.collection<DocumentDbChatMessage>(collectionName);
			const chatHistory = new DocumentDbChatMessageHistory(collection, sessionId);
			const memory = new BufferWindowMemory({
				memoryKey: 'chat_history',
				chatHistory,
				returnMessages: true,
				inputKey: 'input',
				outputKey: 'output',
				k: this.getNodeParameter('contextWindowLength', itemIndex, 5) as number,
			});
			const connectedClient = client;

			return {
				async closeFunction() {
					await connectedClient.close();
				},
				response: logWrapper(memory, this),
			};
		} catch (error) {
			void client?.close().catch(() => {});
			throw new NodeOperationError(
				node,
				`DocumentDB connection error: ${sanitizeDocumentDatabaseUriInMessage(error, connectionString)}`,
			);
		}
	}
}