import { PostgresChatMessageHistory } from '@langchain/community/stores/message/postgres';
import { BufferMemory, BufferWindowMemory } from 'langchain/memory';
import { configurePostgres } from 'n8n-nodes-base/dist/nodes/Postgres/transport/index';
import type { PostgresNodeCredentials } from 'n8n-nodes-base/dist/nodes/Postgres/v2/helpers/interfaces';
import { NodeConnectionTypes } from 'n8n-workflow';
import type {
	ISupplyDataFunctions,
	INodeType,
	INodeTypeDescription,
	SupplyData,
} from 'n8n-workflow';
import type pg from 'pg';

import { getSessionId } from '@utils/helpers';
import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

import { xataConnectionTest } from '../../../credentials/XataApi.credentialTest';
import {
	sessionIdOption,
	sessionKeyProperty,
	contextWindowLengthProperty,
	expressionSessionKeyProperty,
} from '../descriptions';

interface XataCredentials {
	databaseConnectionString: string;
}

function parseConnectionString(connectionString: string): PostgresNodeCredentials {
	try {
		const url = new URL(connectionString);

		if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
			throw new Error('Connection string must use postgres:// or postgresql:// protocol');
		}

		const host = url.hostname;
		const port = parseInt(url.port) || 5432;
		const database = url.pathname.slice(1) || 'postgres'; // Remove leading slash, default to postgres.
		const user = url.username;
		const password = url.password;

		if (!host || !database || !user || !password) {
			throw new Error('Connection string must include host, database, user, and password');
		}

		return {
			host,
			port,
			database,
			user,
			password,
			maxConnections: 100,
			allowUnauthorizedCerts: false,
			ssl: 'require',
			sshTunnel: false,
		};
	} catch (error) {
		throw new Error(
			`Failed to parse connection string: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

export class MemoryXata implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Xata',
		name: 'memoryXata',
		icon: 'file:xata.svg',
		group: ['transform'],
		version: [1, 1.1, 1.2, 1.3, 1.4],
		description: 'Use Xata Memory',
		defaults: {
			name: 'Xata',
			// eslint-disable-next-line n8n-nodes-base/node-class-description-non-core-color-present
			color: '#1321A7',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Memory'],
				Memory: ['Other memories'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memoryxata/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiMemory],
		outputNames: ['Memory'],
		credentials: [
			{
				name: 'xataApi',
				required: true,
				testedBy: 'xataConnectionTest',
			},
		],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
			{
				displayName: 'Session ID',
				name: 'sessionId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
			},
			{
				displayName: 'Session ID',
				name: 'sessionId',
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
			sessionKeyProperty,
			expressionSessionKeyProperty(1.4),
			{
				...contextWindowLengthProperty,
				displayOptions: { hide: { '@version': [{ _cnd: { lt: 1.3 } }] } },
			},
			{
				displayName: 'Table Name',
				name: 'tableName',
				type: 'string',
				default: 'n8n_chat_histories',
				description:
					'The table name to store the chat history in. If table does not exist, it will be created.',
			},
		],
	};

	methods = {
		credentialTest: {
			xataConnectionTest,
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials<XataCredentials>('xataApi');
		const tableName = this.getNodeParameter('tableName', itemIndex, 'n8n_chat_histories') as string;
		const nodeVersion = this.getNode().typeVersion;

		let sessionId;

		if (nodeVersion >= 1.2) {
			sessionId = getSessionId(this, itemIndex);
		} else {
			sessionId = this.getNodeParameter('sessionId', itemIndex) as string;
		}

		// Parse the connection string into individual components
		const postgresCredentials = parseConnectionString(credentials.databaseConnectionString);

		// Configure PostgreSQL connection
		const pgConf = await configurePostgres.call(this, postgresCredentials);
		const pool = pgConf.db.$pool as unknown as pg.Pool;

		// Create PostgresChatMessageHistory
		const pgChatHistory = new PostgresChatMessageHistory({
			pool,
			sessionId,
			tableName,
		});

		const memClass = this.getNode().typeVersion < 1.3 ? BufferMemory : BufferWindowMemory;
		const kOptions =
			this.getNode().typeVersion < 1.3
				? {}
				: { k: this.getNodeParameter('contextWindowLength', itemIndex) };

		const memory = new memClass({
			memoryKey: 'chat_history',
			chatHistory: pgChatHistory,
			returnMessages: true,
			inputKey: 'input',
			outputKey: 'output',
			...kOptions,
		});

		return {
			response: logWrapper(memory, this),
		};
	}
}
