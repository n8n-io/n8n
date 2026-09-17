import { BufferMemory, BufferWindowMemory } from '@langchain/classic/memory';
import { PostgresChatMessageHistory } from '@langchain/community/stores/message/postgres';
import { logWrapper, getConnectionHintNoticeField } from '@n8n/ai-utilities';
import { configurePostgres } from 'n8n-nodes-base/dist/nodes/Postgres/transport/index';
import type { PostgresNodeCredentials } from 'n8n-nodes-base/dist/nodes/Postgres/v2/helpers/interfaces';
import { postgresConnectionTest } from 'n8n-nodes-base/dist/nodes/Postgres/v2/methods/credentialTest';
import type {
	ISupplyDataFunctions,
	INodeType,
	INodeTypeDescription,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type pg from 'pg';

import { getSessionId } from '@utils/helpers';
import { escapeQualifiedSqlIdentifier, isSafeQualifiedSqlIdentifier } from '@utils/sqlIdentifier';

import {
	sessionIdOption,
	sessionKeyProperty,
	contextWindowLengthProperty,
	expressionSessionKeyProperty,
	scopedSessionHint,
} from '../descriptions';

export class MemoryPostgresChat implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Postgres Chat Memory',
		name: 'memoryPostgresChat',
		icon: 'file:postgres.svg',
		group: ['transform'],
		version: [1, 1.1, 1.2, 1.3, 1.4],
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
				Memory: ['Other memories'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorypostgreschat/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiMemory],
		outputNames: ['Memory'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
			sessionIdOption,
			expressionSessionKeyProperty(1.2),
			scopedSessionHint(1.4),
			sessionKeyProperty,
			{
				displayName: 'Table Name',
				name: 'tableName',
				type: 'string',
				default: 'n8n_chat_histories',
				description:
					'The table name to store the chat history in. If table does not exist, it will be created.',
			},
			{
				...contextWindowLengthProperty,
				displayOptions: { hide: { '@version': [{ _cnd: { lt: 1.1 } }] } },
			},
		],
	};

	methods = {
		credentialTest: {
			postgresConnectionTest,
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials<PostgresNodeCredentials>('postgres');
		// An expression-bound Table Name can resolve to an empty value (e.g. a request
		// field that wasn't provided), so fall back to the default instead of failing.
		const rawTableName =
			(this.getNodeParameter('tableName', itemIndex, 'n8n_chat_histories') as string) ||
			'n8n_chat_histories';
		// The underlying store interpolates the table name directly into SQL.
		// Reject anything that is not a plain (optionally schema-qualified) identifier,
		// then quote it as a defence-in-depth measure so nothing unexpected reaches the database.
		if (!isSafeQualifiedSqlIdentifier(rawTableName)) {
			throw new NodeOperationError(this.getNode(), `Invalid table name "${rawTableName}"`, {
				itemIndex,
				description:
					'Table names may only contain letters, numbers and underscores, with an optional "schema." prefix.',
			});
		}
		const tableName = escapeQualifiedSqlIdentifier(rawTableName);
		const sessionId = getSessionId(this, itemIndex);

		const pgConf = await configurePostgres.call(this, credentials);
		const pool = pgConf.db.$pool as unknown as pg.Pool;

		const pgChatHistory = new PostgresChatMessageHistory({
			pool,
			sessionId,
			tableName,
		});

		const memClass = this.getNode().typeVersion < 1.1 ? BufferMemory : BufferWindowMemory;
		const kOptions =
			this.getNode().typeVersion < 1.1
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
