/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import { BufferMemory } from 'langchain/memory';
import { PostgresChatMessageHistory } from '@langchain/community/stores/message/postgres';
import type pg from 'pg';
import { configurePostgres } from 'n8n-nodes-base/dist/nodes/Postgres/v2/transport';
import type { PostgresNodeCredentials } from 'n8n-nodes-base/dist/nodes/Postgres/v2/helpers/interfaces';
import { postgresConnectionTest } from 'n8n-nodes-base/dist/nodes/Postgres/v2/methods/credentialTest';
import { logWrapper } from '../../../utils/logWrapper';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';
import { sessionIdOption, sessionKeyProperty } from '../descriptions';
import { getSessionId } from '../../../utils/helpers';

export class MemoryPostgresChat implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Postgres Chat Memory',
		name: 'memoryPostgresChat',
		icon: 'file:postgres.svg',
		group: ['transform'],
		version: [1],
		description: 'Stores the chat history in Postgres table.',
		defaults: {
			name: 'Postgres Chat Memory',
		},
		credentials: [
			{
				name: 'postgres',
				required: true,
				testedBy: 'postgresConnectionTest',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorypostgreschat/',
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
			sessionKeyProperty,
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
			postgresConnectionTest,
		},
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = (await this.getCredentials('postgres')) as PostgresNodeCredentials;
		const tableName = this.getNodeParameter('tableName', itemIndex, 'n8n_chat_histories') as string;
		const sessionId = getSessionId(this, itemIndex);

		const pgConf = await configurePostgres.call(this, credentials);
		const pool = pgConf.db.$pool as unknown as pg.Pool;

		const pgChatHistory = new PostgresChatMessageHistory({
			pool,
			sessionId,
			tableName,
		});

		const memory = new BufferMemory({
			memoryKey: 'chat_history',
			chatHistory: pgChatHistory,
			returnMessages: true,
			inputKey: 'input',
			outputKey: 'output',
		});

		async function closeFunction() {
			void pool.end();
		}

		return {
			closeFunction,
			response: logWrapper(memory, this),
		};
	}
}
