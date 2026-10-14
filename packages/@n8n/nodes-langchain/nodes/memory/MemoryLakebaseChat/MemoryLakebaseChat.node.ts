import { BufferWindowMemory } from '@langchain/classic/memory';
import { BaseListChatMessageHistory } from '@langchain/core/chat_history';
import type { BaseMessage, StoredMessage } from '@langchain/core/messages';
import {
	mapChatMessagesToStoredMessages,
	mapStoredMessagesToChatMessages,
} from '@langchain/core/messages';
import { getConnectionHintNoticeField, logWrapper } from '@n8n/ai-utilities';
import { isRecord } from '@n8n/utils/is-record';
import { resolveLakebaseTableUrl } from 'n8n-nodes-base/dist/nodes/Databricks/actions/lakebase/helpers';
import {
	LAKEBASE_MAX_PAGES,
	LAKEBASE_PAGE_SIZE,
} from 'n8n-nodes-base/dist/nodes/Databricks/constants';
import {
	getLakebaseBranches,
	getLakebaseChatHistoryTables,
	getLakebaseDatabases,
	getLakebaseProjects,
	getLakebaseSchemas,
} from 'n8n-nodes-base/dist/nodes/Databricks/methods/listSearch';
import { lakebaseLocators } from 'n8n-nodes-base/dist/nodes/Databricks/resources/lakebase/parameters';
import { lakebaseApiRequest } from 'n8n-nodes-base/dist/nodes/Databricks/transport';
import type {
	IHttpRequestOptions,
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { getSessionId } from '@utils/helpers';
import { escapeSqlIdentifier } from '@utils/sqlIdentifier';

import {
	contextWindowLengthProperty,
	expressionSessionKeyProperty,
	scopedSessionHint,
	sessionIdOption,
	sessionKeyProperty,
} from '../descriptions';

/** One row of the memory table; the jsonb column holds `{ ...data, type }` like the Postgres store */
type StoredRow = { message: StoredMessage['data'] & { type: string } };

type LakebaseTarget = { tableUrl: string; schema: string; table: string; sessionId: string };

function missingTableHint(schema: string, table: string): string {
	const qualified = `${escapeSqlIdentifier(schema)}.${escapeSqlIdentifier(table)}`;
	const sequence = `${escapeSqlIdentifier(schema)}.${escapeSqlIdentifier(`${table}_id_seq`)}`;
	return [
		'The Lakebase Data API cannot create tables. Run this in the Databricks SQL editor, replace <your-role> with the Postgres role of the OAuth2 identity (user email or service principal application ID), then retry.',
		`CREATE TABLE ${qualified} (id SERIAL PRIMARY KEY, session_id VARCHAR(255) NOT NULL, message JSONB NOT NULL);`,
		`CREATE INDEX ON ${qualified} (session_id, id);`,
		`GRANT SELECT, INSERT, DELETE ON ${qualified} TO "<your-role>";`,
		`GRANT USAGE ON SEQUENCE ${sequence} TO "<your-role>";`,
	].join('\n');
}

export class LakebaseChatMessageHistory extends BaseListChatMessageHistory {
	lc_namespace = ['n8n', 'stores', 'message', 'lakebase'];

	constructor(
		private readonly context: ISupplyDataFunctions,
		private readonly target: LakebaseTarget,
	) {
		super();
	}

	private async request(options: Omit<IHttpRequestOptions, 'url'>) {
		try {
			return await lakebaseApiRequest(this.context, {
				...options,
				url: this.target.tableUrl,
				json: true,
			});
		} catch (error) {
			// The transport already retried PGRST205 once, so here it means the table is missing
			if (
				error instanceof NodeApiError &&
				isRecord(error.context.data) &&
				error.context.data.code === 'PGRST205'
			) {
				const { schema, table } = this.target;
				throw new NodeOperationError(
					this.context.getNode(),
					`Table ${schema}.${table} does not exist`,
					{ description: missingTableHint(schema, table) },
				);
			}
			throw error;
		}
	}

	async getMessages(): Promise<BaseMessage[]> {
		const rows: StoredRow[] = [];
		// ponytail: stops silently after LAKEBASE_MAX_PAGES * LAKEBASE_PAGE_SIZE rows, like Get Many
		for (let page = 0; page < LAKEBASE_MAX_PAGES; page++) {
			const response: { body?: StoredRow[]; headers?: Record<string, unknown> } =
				await this.request({
					method: 'GET',
					qs: {
						session_id: `eq.${this.target.sessionId}`,
						order: 'id.asc',
						limit: LAKEBASE_PAGE_SIZE,
						offset: rows.length,
					},
					headers: { Accept: 'application/json', Prefer: 'count=exact' },
					returnFullResponse: true,
				});
			const batch = Array.isArray(response.body) ? response.body : [];
			rows.push(...batch);
			// PostgREST answers count=exact with `Content-Range: 0-9/10`; without the header the loop ends on the first empty page
			const total = Number(/\/(\d+)$/.exec(String(response.headers?.['content-range']))?.[1]);
			if (batch.length === 0 || rows.length >= total) break;
		}
		return mapStoredMessagesToChatMessages(
			rows.map(({ message: { type, ...data } }) => ({ type, data })),
		);
	}

	async addMessage(message: BaseMessage): Promise<void> {
		const { data, type } = mapChatMessagesToStoredMessages([message])[0];
		await this.request({
			method: 'POST',
			body: { session_id: this.target.sessionId, message: { ...data, type } },
		});
	}

	async clear(): Promise<void> {
		await this.request({
			method: 'DELETE',
			qs: { session_id: `eq.${this.target.sessionId}` },
		});
	}
}

export class MemoryLakebaseChat implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Databricks Lakebase Chat Memory',
		name: 'memoryLakebaseChat',
		icon: {
			light: 'file:../../shared/icons/databricks.svg',
			dark: 'file:../../shared/icons/databricks.dark.svg',
		},
		group: ['transform'],
		version: [1],
		description: 'Stores the chat history in a Databricks Lakebase table.',
		defaults: {
			name: 'Databricks Lakebase Chat Memory',
		},
		credentials: [
			{
				name: 'databricksOAuth2Api',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorylakebasechat/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiMemory],
		outputNames: ['Memory'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
			// Read by getActiveCredentialType in nodes-base; the Data API accepts OAuth2 only
			{ displayName: 'Authentication', name: 'authentication', type: 'hidden', default: 'oAuth2' },
			...lakebaseLocators.map((p) =>
				p.name === 'lakebaseTable'
					? {
							...p,
							default: {
								mode: 'list',
								value: 'n8n_chat_histories',
								cachedResultName: 'n8n_chat_histories',
							},
						}
					: p,
			),
			sessionIdOption,
			expressionSessionKeyProperty(1),
			scopedSessionHint(1),
			sessionKeyProperty,
			contextWindowLengthProperty,
		],
	};

	methods = {
		listSearch: {
			getLakebaseProjects,
			getLakebaseBranches,
			getLakebaseDatabases,
			getLakebaseSchemas,
			// The shared locator names this method
			getLakebaseTables: getLakebaseChatHistoryTables,
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		// Validates every locator first, so an empty one fails here and not inside the agent
		const tableUrl = await resolveLakebaseTableUrl(this, itemIndex);
		const schema = String(
			this.getNodeParameter('lakebaseSchema', itemIndex, '', { extractValue: true }),
		);
		const table = String(
			this.getNodeParameter('lakebaseTable', itemIndex, '', { extractValue: true }),
		);
		const sessionId = getSessionId(this, itemIndex);

		const chatHistory = new LakebaseChatMessageHistory(this, {
			tableUrl,
			schema,
			table,
			sessionId,
		});
		const memory = new BufferWindowMemory({
			memoryKey: 'chat_history',
			chatHistory,
			returnMessages: true,
			inputKey: 'input',
			outputKey: 'output',
			k: Number(this.getNodeParameter('contextWindowLength', itemIndex)),
		});

		return {
			response: logWrapper(memory, this),
		};
	}
}
