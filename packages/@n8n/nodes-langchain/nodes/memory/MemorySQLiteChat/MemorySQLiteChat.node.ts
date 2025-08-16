import { BufferWindowMemory } from 'langchain/memory';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import type {
	ISupplyDataFunctions,
	INodeType,
	INodeTypeDescription,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { Database } from 'sqlite3';
import { promisify } from 'util';

import { getSessionId } from '@utils/helpers';
import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

import {
	sessionIdOption,
	sessionKeyProperty,
	contextWindowLengthProperty,
	expressionSessionKeyProperty,
} from '../descriptions';
import { BaseChatMessageHistory } from '@langchain/core/chat_history';

class SQLiteChatMessageHistory extends BaseChatMessageHistory {
	lc_namespace!: string[];
	private db: Database;
	private sessionId: string;
	private tableName: string;
	private initialized: boolean = false;

	constructor(dbPath: string, sessionId: string, tableName: string = 'chat_history') {
		super();
		this.db = new Database(dbPath);
		this.sessionId = sessionId;
		this.tableName = tableName;
	}

	private async ensureInitialized(): Promise<void> {
		if (this.initialized) return;
		const run = promisify(this.db.run.bind(this.db)) as (sql: string) => Promise<void>;
		await run(`
			CREATE TABLE IF NOT EXISTS ${this.tableName} (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				session_id TEXT NOT NULL,
				type TEXT NOT NULL,
				content TEXT NOT NULL,
				timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
			)
		`);
		this.initialized = true;
	}

	async getMessages(): Promise<BaseMessage[]> {
		await this.ensureInitialized();
		const all = promisify(this.db.all.bind(this.db)) as (
			sql: string,
			params: any[],
		) => Promise<any[]>;
		const rows = (await all(
			`SELECT type, content FROM ${this.tableName} WHERE session_id = ? ORDER BY timestamp ASC`,
			[this.sessionId],
		)) as Array<{ type: string; content: string }>;

		return rows.map((row) =>
			row.type === 'human' ? new HumanMessage(row.content) : new AIMessage(row.content),
		);
	}

	async addMessage(message: BaseMessage): Promise<void> {
		await this.ensureInitialized();
		const run = promisify(this.db.run.bind(this.db)) as (
			sql: string,
			params: any[],
		) => Promise<void>;
		const type = message._getType() === 'human' ? 'human' : 'ai';
		await run(`INSERT INTO ${this.tableName} (session_id, type, content) VALUES (?, ?, ?)`, [
			this.sessionId,
			type,
			message.content,
		]);
	}

	async addUserMessage(message: string): Promise<void> {
		await this.addMessage(new HumanMessage(message));
	}

	async addAIChatMessage(message: string): Promise<void> {
		await this.addMessage(new AIMessage(message));
	}

	async clear(): Promise<void> {
		await this.ensureInitialized();
		const run = promisify(this.db.run.bind(this.db)) as (
			sql: string,
			params: any[],
		) => Promise<void>;
		await run(`DELETE FROM ${this.tableName} WHERE session_id = ?`, [this.sessionId]);
	}
}

export class MemorySQLiteChat implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SQLite Chat Memory',
		name: 'memorySQLiteChat',
		icon: 'file:sqlite.svg',
		group: ['transform'],
		version: [1, 1.1],
		description: 'Stores the chat history in SQLite database.',
		defaults: {
			name: 'SQLite Chat Memory',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorysqlite/',
					},
				],
			},
		},

		inputs: [],
		outputs: [NodeConnectionTypes.AiMemory],
		outputNames: ['Memory'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
			{
				...sessionIdOption,
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.1 } }],
					},
				},
			},
			expressionSessionKeyProperty(1.1),
			sessionKeyProperty,
			{
				displayName: 'Database Path',
				name: 'databasePath',
				type: 'string',
				default: './chat_memory.db',
				description: 'Path to the SQLite database file. Will be created if it does not exist.',
			},
			{
				displayName: 'Table Name',
				name: 'tableName',
				type: 'string',
				default: 'chat_history',
				description:
					'The table name to store the chat history in. Will be created if it does not exist.',
			},
			contextWindowLengthProperty,
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const databasePath = this.getNodeParameter(
			'databasePath',
			itemIndex,
			'./chat_memory.db',
		) as string;
		const tableName = this.getNodeParameter('tableName', itemIndex, 'chat_history') as string;
		const contextWindowLength = this.getNodeParameter(
			'contextWindowLength',
			itemIndex,
			5,
		) as number;
		const sessionId = getSessionId(this, itemIndex);

		const chatHistory = new SQLiteChatMessageHistory(databasePath, sessionId, tableName);

		const memory = new BufferWindowMemory({
			k: contextWindowLength,
			memoryKey: 'chat_history',
			chatHistory: chatHistory,
			returnMessages: true,
			inputKey: 'input',
			outputKey: 'output',
		});

		return {
			response: logWrapper(memory, this),
		};
	}
}
