import { BufferWindowMemory } from '@langchain/classic/memory';
import { BaseListChatMessageHistory } from '@langchain/core/chat_history';
import type { BaseMessage, StoredMessage } from '@langchain/core/messages';
import {
	mapChatMessagesToStoredMessages,
	mapStoredMessagesToChatMessages,
} from '@langchain/core/messages';
import { getConnectionHintNoticeField, logWrapper } from '@n8n/ai-utilities';
import { resolveLakebaseTableUrl } from 'n8n-nodes-base/dist/nodes/Databricks/actions/lakebase/helpers';
import {
	LAKEBASE_MAX_PAGES,
	LAKEBASE_PAGE_SIZE,
} from 'n8n-nodes-base/dist/nodes/Databricks/constants';
import {
	getLakebaseBranches,
	getLakebaseDatabases,
	getLakebaseProjects,
	getLakebaseSchemas,
} from 'n8n-nodes-base/dist/nodes/Databricks/methods/listSearch';
import { lakebaseLocators } from 'n8n-nodes-base/dist/nodes/Databricks/resources/lakebase/parameters';
import {
	lakebaseApiRequest,
	lakebaseErrorBody,
} from 'n8n-nodes-base/dist/nodes/Databricks/transport';
import type {
	IHttpRequestOptions,
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

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

// The error view renders the description as HTML and strips unknown tags, so the placeholder
// is plain quoted text (like the shared transport hints), the statements are code and the
// lines are joined with <br>
const ROLE_PLACEHOLDER =
	'replace "your-role" with the Postgres role of the OAuth2 identity (user email or service principal application ID), then retry.';

function grantStatements(schema: string, table: string): string[] {
	const qualified = `${escapeSqlIdentifier(schema)}.${escapeSqlIdentifier(table)}`;
	const sequence = `${escapeSqlIdentifier(schema)}.${escapeSqlIdentifier(`${table}_id_seq`)}`;
	return [
		`GRANT USAGE ON SCHEMA ${escapeSqlIdentifier(schema)} TO "your-role";`,
		`GRANT SELECT, INSERT, DELETE ON ${qualified} TO "your-role";`,
		`GRANT USAGE ON SEQUENCE ${sequence} TO "your-role";`,
	];
}

function sqlHint(intro: string, statements: string[]): string {
	return [intro, ...statements.map((statement) => `\`${statement}\``)].join('<br>');
}

function missingTableHint(schema: string, table: string): string {
	const qualified = `${escapeSqlIdentifier(schema)}.${escapeSqlIdentifier(table)}`;
	return sqlHint(
		`The Lakebase Data API cannot create tables. Run this in the Databricks SQL editor, ${ROLE_PLACEHOLDER}`,
		[
			`CREATE TABLE ${qualified} (id SERIAL PRIMARY KEY, session_id VARCHAR(255) NOT NULL, message JSONB NOT NULL);`,
			`CREATE INDEX ON ${qualified} (session_id, id);`,
			...grantStatements(schema, table),
		],
	);
}

function missingGrantHint(schema: string, table: string): string {
	return sqlHint(
		`The table exists but the OAuth2 identity has no rights on it. Run this in the Databricks SQL editor as the table owner, ${ROLE_PLACEHOLDER}`,
		grantStatements(schema, table),
	);
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
			// The transport already retried PGRST205 once, so here it means the table is missing.
			// 42P01 is the Postgres code when the Data API schema cache still lists a dropped table
			const data = lakebaseErrorBody(error) ?? {};
			const { schema, table } = this.target;
			if (data.code === 'PGRST205' || data.code === '42P01') {
				throw new NodeOperationError(
					this.context.getNode(),
					`Table ${schema}.${table} does not exist`,
					{ description: missingTableHint(schema, table) },
				);
			}
			// 42501 also covers "permission denied to set role", which the shared transport hint explains
			if (
				data.code === '42501' &&
				typeof data.message === 'string' &&
				/permission denied for (schema|table|sequence)/.test(data.message)
			) {
				throw new NodeOperationError(
					this.context.getNode(),
					`The OAuth2 identity cannot use table ${schema}.${table}`,
					{ description: missingGrantHint(schema, table) },
				);
			}
			throw error;
		}
	}

	async getMessages(): Promise<BaseMessage[]> {
		const rows: StoredRow[] = [];
		let readToTheEnd = false;
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
			if (batch.length === 0 || rows.length >= total) {
				readToTheEnd = true;
				break;
			}
		}
		// The window takes the newest messages and the Memory Manager rewrites the session from
		// what it read, so a partial read would lose turns. Fail loudly instead, like Get Many.
		if (!readToTheEnd) {
			throw new NodeOperationError(
				this.context.getNode(),
				`The session holds more rows than one run can read (${LAKEBASE_MAX_PAGES * LAKEBASE_PAGE_SIZE})`,
				{ description: 'Clear the session with the Memory Manager node or use a new Session ID.' },
			);
		}
		return mapStoredMessagesToChatMessages(
			rows.map(({ message: { type, ...data } }) => ({ type, data })),
		);
	}

	async addMessage(message: BaseMessage): Promise<void> {
		await this.addMessages([message]);
	}

	/**
	 * The agent saves a tool-calling turn through this method. One array POST inserts the
	 * rows in a single statement, so a failed request leaves no half-written turn behind.
	 */
	async addMessages(messages: BaseMessage[]): Promise<void> {
		if (messages.length === 0) return;
		await this.request({
			method: 'POST',
			body: mapChatMessagesToStoredMessages(messages).map(({ data, type }) => ({
				session_id: this.target.sessionId,
				message: { ...data, type },
			})),
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
			// A plain string rather than the shared table locator: the editor clears a locator whenever
			// a parameter it depends on changes, so the default would not survive picking the project
			...lakebaseLocators.filter((p) => p.name !== 'lakebaseTable'),
			{
				displayName: 'Table Name',
				name: 'lakebaseTable',
				type: 'string',
				default: 'n8n_chat_histories',
				required: true,
				description: 'The table in the schema that stores the chat history',
			},
			{
				displayName:
					'This node cannot create the table. Create it in the Lakebase SQL editor before the first run. A run against a missing table shows the SQL to copy.',
				name: 'createTableNotice',
				type: 'notice',
				default: '',
			},
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
