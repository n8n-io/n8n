import { BaseChatMessageHistory } from '@langchain/core/chat_history';
import {
	HumanMessage,
	AIMessage,
	SystemMessage,
	ToolMessage,
	type MessageContent,
	type BaseMessage,
} from '@langchain/core/messages';
import type { IDataTableProjectService, INode } from 'n8n-workflow';
import { NodeOperationError, jsonParse } from 'n8n-workflow';

export interface DataTableChatMessageHistoryOptions {
	dataTableProxy: IDataTableProjectService;
	sessionId: string;
	node: INode;
}

export class DataTableChatMessageHistory extends BaseChatMessageHistory {
	lc_namespace = ['langchain', 'stores', 'message', 'datatable'];

	private dataTableProxy: IDataTableProjectService;

	private sessionId: string;

	private node: INode;

	private initialized: boolean = false;

	constructor(options: DataTableChatMessageHistoryOptions) {
		super();
		this.dataTableProxy = options.dataTableProxy;
		this.sessionId = options.sessionId;
		this.node = options.node;
	}

	async getMessages(): Promise<BaseMessage[]> {
		await this.ensureTableExists();

		const result = await this.dataTableProxy.getManyRowsAndCount({
			filter: {
				type: 'and',
				filters: [{ columnName: 'sessionId', condition: 'eq', value: this.sessionId }],
			},
			sortBy: ['createdAt', 'ASC'],
		});

		return result.data.map((row) => {
			const metadata = row.metadata
				? jsonParse<Record<string, unknown>>(row.metadata as string)
				: {};
			const content = row.message as string;

			switch (row.type) {
				case 'human':
					return new HumanMessage({ content, ...metadata });
				case 'ai':
					return new AIMessage({ content, ...metadata });
				case 'system':
					return new SystemMessage({ content, ...metadata });
				case 'tool':
					return new ToolMessage({ content, tool_call_id: metadata.tool_call_id, ...metadata });
				default:
					// Generic message type
					// For unknown message types, return as HumanMessage (safe fallback)
					return new HumanMessage({ content, ...metadata });
			}
		});
	}

	async addMessage(message: BaseMessage): Promise<void> {
		await this.ensureTableExists();

		const messageType = message._getType();
		const content =
			typeof message.content === 'string' ? message.content : JSON.stringify(message.content);

		// Serialize metadata
		const metadata: Record<string, unknown> = {};
		if (message.name) metadata.name = message.name;
		if (message.additional_kwargs && Object.keys(message.additional_kwargs).length > 0) {
			metadata.additional_kwargs = message.additional_kwargs;
		}
		if (
			'response_metadata' in message &&
			message.response_metadata &&
			Object.keys(message.response_metadata).length > 0
		) {
			metadata.response_metadata = message.response_metadata;
		}
		// For ToolMessage, store tool_call_id
		if ('tool_call_id' in message && message.tool_call_id) {
			metadata.tool_call_id = message.tool_call_id;
		}

		await this.dataTableProxy.insertRows(
			[
				{
					sessionId: this.sessionId,
					type: messageType,
					message: content,
					metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
				},
			],
			'count',
		);
	}

	async addUserMessage(message: string | MessageContent): Promise<void> {
		const content = typeof message === 'string' ? message : JSON.stringify(message);
		await this.addMessage(new HumanMessage(content));
	}

	async addAIMessage(message: string | MessageContent): Promise<void> {
		const content = typeof message === 'string' ? message : JSON.stringify(message);
		await this.addMessage(new AIMessage(content));
	}

	async clear(): Promise<void> {
		await this.ensureTableExists();

		await this.dataTableProxy.deleteRows({
			filter: {
				type: 'and',
				filters: [{ columnName: 'sessionId', condition: 'eq', value: this.sessionId }],
			},
		});
	}

	private async ensureTableExists(): Promise<void> {
		if (this.initialized) return;

		try {
			const columns = await this.dataTableProxy.getColumns();

			// Validate required columns exist
			const requiredColumns = ['sessionId', 'type', 'message'];
			const columnNames = columns.map((c) => c.name);
			const missingColumns = requiredColumns.filter((name) => !columnNames.includes(name));

			if (missingColumns.length > 0) {
				throw new NodeOperationError(
					this.node,
					`Data table is missing required columns: ${missingColumns.join(', ')}. ` +
						'Expected columns: sessionId (string), type (string), message (string), metadata (string, optional)',
				);
			}

			// Validate column types
			const columnTypeMap = Object.fromEntries(columns.map((c) => [c.name, c.type]));
			const typeErrors: string[] = [];

			if (columnTypeMap.sessionId !== 'string') {
				typeErrors.push('sessionId must be type "string"');
			}
			if (columnTypeMap.type !== 'string') {
				typeErrors.push('type must be type "string"');
			}
			if (columnTypeMap.message !== 'string') {
				typeErrors.push('message must be type "string"');
			}
			if (columnTypeMap.metadata && columnTypeMap.metadata !== 'string') {
				typeErrors.push('metadata must be type "string" (if present)');
			}

			if (typeErrors.length > 0) {
				throw new NodeOperationError(
					this.node,
					`Data table has incorrect column types:\n${typeErrors.join('\n')}`,
				);
			}

			this.initialized = true;
		} catch (error) {
			// If it's already a NodeOperationError, rethrow it
			if (error instanceof NodeOperationError) {
				throw error;
			}
			// Otherwise, wrap it
			throw new NodeOperationError(
				this.node,
				`Failed to validate data table schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}
}
