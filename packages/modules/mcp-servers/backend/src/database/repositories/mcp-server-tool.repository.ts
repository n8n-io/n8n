import type { McpServerToolDraftSource } from '@n8n/api-types';
import {
	BaseRepository,
	isUniqueConstraintError,
	TransactionRunner,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import { DataSource, In } from '@n8n/typeorm';
import { v7 as uuidv7 } from 'uuid';

import { McpServerTool } from '../entities/mcp-server-tool.entity';

class McpServerToolTable extends BaseRepository<McpServerTool> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(McpServerTool, dataSource.manager, transactionRunner);
	}
}

export type NewWorkflowTool = {
	workflowId: string;
	toolName: string;
	description: string;
};

export type McpServerToolSummary = Pick<
	McpServerTool,
	'id' | 'serverId' | 'kind' | 'targetId' | 'toolName'
>;

export type McpServerToolChanges = Partial<
	Pick<McpServerTool, 'toolName' | 'description'> & { draftSource: McpServerToolDraftSource }
>;

/** The unique index on the server and the tool name refused the write. */
function toNameConflict(error: unknown): unknown {
	return isUniqueConstraintError(error)
		? new ConflictError('The server already has a tool with this name.')
		: error;
}

@Service()
export class McpServerToolRepository {
	private readonly table: McpServerToolTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new McpServerToolTable(dataSource, transactionRunner);
	}

	async listByServer(serverId: string, ctx: OperationContext = {}): Promise<McpServerTool[]> {
		return await this.table.managerFor(ctx).find(McpServerTool, {
			where: { serverId },
			order: { position: 'ASC', createdAt: 'ASC' },
		});
	}

	/** Summaries of every tool across the given servers, in display order. */
	async listSummaryByServers(
		serverIds: string[],
		ctx: OperationContext = {},
	): Promise<Map<string, McpServerToolSummary[]>> {
		if (serverIds.length === 0) return new Map();
		const rows = await this.table.managerFor(ctx).find(McpServerTool, {
			select: ['id', 'serverId', 'kind', 'targetId', 'toolName'],
			where: { serverId: In(serverIds) },
			order: { position: 'ASC', createdAt: 'ASC' },
		});
		const byServer = new Map<string, McpServerToolSummary[]>();
		for (const row of rows) {
			const list = byServer.get(row.serverId) ?? [];
			list.push(row);
			byServer.set(row.serverId, list);
		}
		return byServer;
	}

	async findInServer(
		serverId: string,
		toolId: string,
		ctx: OperationContext = {},
	): Promise<McpServerTool | null> {
		return await this.table.managerFor(ctx).findOneBy(McpServerTool, { id: toolId, serverId });
	}

	async findByName(
		serverId: string,
		toolName: string,
		ctx: OperationContext = {},
	): Promise<McpServerTool | null> {
		return await this.table.managerFor(ctx).findOneBy(McpServerTool, { serverId, toolName });
	}

	/** Appends the tools after the last position, with the default text. All or nothing. */
	async addWorkflowTools(
		serverId: string,
		tools: NewWorkflowTool[],
		ctx: OperationContext = {},
	): Promise<McpServerTool[]> {
		return await this.table.runInTransaction(ctx, async (manager) => {
			const last = await manager.findOne(McpServerTool, {
				where: { serverId },
				order: { position: 'DESC' },
				select: { position: true },
			});
			const start = last ? last.position + 1 : 0;
			const rows = tools.map((tool, index) =>
				manager.create(McpServerTool, {
					id: uuidv7(),
					serverId,
					kind: 'workflow',
					targetId: tool.workflowId,
					toolName: tool.toolName,
					description: tool.description,
					draftSource: 'defaults',
					toolData: null,
					position: start + index,
				}),
			);
			try {
				return await manager.save(McpServerTool, rows);
			} catch (error) {
				throw toNameConflict(error);
			}
		});
	}

	async updateInServer(
		serverId: string,
		toolId: string,
		changes: McpServerToolChanges,
		ctx: OperationContext = {},
	): Promise<McpServerTool | null> {
		// One transaction, so a parallel delete cannot turn a saved edit into a 404.
		return await this.table.runInTransaction(ctx, async (manager) => {
			try {
				await manager.update(McpServerTool, { id: toolId, serverId }, changes);
			} catch (error) {
				throw toNameConflict(error);
			}
			return await manager.findOneBy(McpServerTool, { id: toolId, serverId });
		});
	}

	async deleteInServer(
		serverId: string,
		toolId: string,
		ctx: OperationContext = {},
	): Promise<boolean> {
		const result = await this.table.managerFor(ctx).delete(McpServerTool, { id: toolId, serverId });
		return (result.affected ?? 0) > 0;
	}
}
