import type { McpServerCallStatus } from '@n8n/api-types';
import { BaseRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, MoreThanOrEqual } from '@n8n/typeorm';
import type { EntityTarget, FindOptionsWhere, ObjectLiteral } from '@n8n/typeorm';

import {
	McpServerApiKeyEntity,
	McpServerCallEntity,
	McpServerEntity,
	McpServerResourceEntity,
	McpServerToolEntity,
} from './mcp-server.entities';

class Table<T extends ObjectLiteral> extends BaseRepository<T> {
	constructor(
		target: EntityTarget<T>,
		dataSource: DataSource,
		transactionRunner: TransactionRunner,
	) {
		super(target, dataSource.manager, transactionRunner);
	}
}

export type NewServerRow = Pick<McpServerEntity, 'slug' | 'name' | 'ownerId'> &
	Partial<Omit<McpServerEntity, 'id' | 'createdAt' | 'updatedAt'>>;

export type ServerChanges = Partial<
	Pick<
		McpServerEntity,
		| 'slug'
		| 'name'
		| 'description'
		| 'instructions'
		| 'active'
		| 'accessMode'
		| 'rateLimitPerMinute'
		| 'shareVisibility'
		| 'confirmDestructive'
		| 'confirmWrite'
		| 'captureIntent'
		| 'missingCapabilityTool'
		| 'revokedUserIds'
	>
>;

export type NewToolRow = Pick<McpServerToolEntity, 'serverId' | 'kind' | 'targetId'> &
	Partial<Pick<McpServerToolEntity, 'name' | 'description' | 'behavior' | 'position'>>;

export type ToolChanges = Partial<
	Pick<
		McpServerToolEntity,
		'targetId' | 'name' | 'description' | 'behavior' | 'inputs' | 'enabled' | 'position'
	>
>;

export type NewResourceRow = Pick<
	McpServerResourceEntity,
	'serverId' | 'kind' | 'targetId' | 'name' | 'description' | 'content' | 'mimeType'
>;

export type NewCallRow = Pick<
	McpServerCallEntity,
	| 'serverId'
	| 'kind'
	| 'name'
	| 'callerType'
	| 'caller'
	| 'callerUserId'
	| 'apiKeyId'
	| 'clientName'
	| 'status'
	| 'durationMs'
	| 'input'
	| 'output'
	| 'error'
	| 'executionId'
	| 'workflowId'
	| 'intent'
	| 'sessionId'
>;

export interface CallFilters {
	tool?: string;
	caller?: string;
	status?: McpServerCallStatus;
	session?: string;
	limit: number;
}

/** The only reader and writer of the MCP server tables. */
@Service()
export class McpServerRepository {
	private readonly servers: Table<McpServerEntity>;

	private readonly tools: Table<McpServerToolEntity>;

	private readonly resources: Table<McpServerResourceEntity>;

	private readonly apiKeys: Table<McpServerApiKeyEntity>;

	private readonly calls: Table<McpServerCallEntity>;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.servers = new Table(McpServerEntity, dataSource, transactionRunner);
		this.tools = new Table(McpServerToolEntity, dataSource, transactionRunner);
		this.resources = new Table(McpServerResourceEntity, dataSource, transactionRunner);
		this.apiKeys = new Table(McpServerApiKeyEntity, dataSource, transactionRunner);
		this.calls = new Table(McpServerCallEntity, dataSource, transactionRunner);
	}

	// --- servers -------------------------------------------------------------

	async listServers() {
		return await this.servers.find({ order: { updatedAt: 'DESC' } });
	}

	async findServer(id: string) {
		return await this.servers.findOneBy({ id });
	}

	async findServerBySlug(slug: string) {
		return await this.servers.findOneBy({ slug });
	}

	async isSlugTaken(slug: string, exceptId?: string) {
		const row = await this.servers.findOneBy({ slug });
		return !!row && row.id !== exceptId;
	}

	async createServer(row: NewServerRow) {
		return await this.servers.save(this.servers.create(row));
	}

	async updateServer(id: string, changes: ServerChanges) {
		// `update` skips the entity hooks, so the timestamp is set here.
		await this.servers.update({ id }, { ...changes, updatedAt: new Date() });
	}

	async touchServer(id: string) {
		await this.servers.update({ id }, { updatedAt: new Date() });
	}

	async deleteServer(id: string) {
		await this.servers.delete({ id });
	}

	// --- tools ---------------------------------------------------------------

	async listTools(serverIds: string[]) {
		if (serverIds.length === 0) return [];
		return await this.tools.find({
			where: { serverId: In(serverIds) },
			order: { position: 'ASC', createdAt: 'ASC' },
		});
	}

	async findTool(serverId: string, toolId: string) {
		return await this.tools.findOneBy({ serverId, id: toolId });
	}

	async createTool(row: NewToolRow) {
		return await this.tools.save(this.tools.create(row));
	}

	async updateTool(serverId: string, toolId: string, changes: ToolChanges) {
		await this.tools.update({ serverId, id: toolId }, { ...changes, updatedAt: new Date() });
	}

	async deleteTool(serverId: string, toolId: string) {
		await this.tools.delete({ serverId, id: toolId });
	}

	// --- resources -----------------------------------------------------------

	async listResources(serverIds: string[]) {
		if (serverIds.length === 0) return [];
		return await this.resources.find({
			where: { serverId: In(serverIds) },
			order: { createdAt: 'ASC' },
		});
	}

	async findResource(serverId: string, resourceId: string) {
		return await this.resources.findOneBy({ serverId, id: resourceId });
	}

	async createResource(row: NewResourceRow) {
		return await this.resources.save(this.resources.create(row));
	}

	async deleteResource(serverId: string, resourceId: string) {
		await this.resources.delete({ serverId, id: resourceId });
	}

	// --- api keys ------------------------------------------------------------

	async listApiKeys(serverIds: string[]) {
		if (serverIds.length === 0) return [];
		return await this.apiKeys.find({
			where: { serverId: In(serverIds) },
			order: { createdAt: 'ASC' },
		});
	}

	async findApiKeyByHash(serverId: string, keyHash: string) {
		return await this.apiKeys.findOneBy({ serverId, keyHash });
	}

	async createApiKey(
		row: Pick<McpServerApiKeyEntity, 'serverId' | 'label' | 'keyHash' | 'keyHint'>,
	) {
		return await this.apiKeys.save(this.apiKeys.create({ ...row, lastUsedAt: null }));
	}

	async markApiKeyUsed(id: string) {
		await this.apiKeys.update({ id }, { lastUsedAt: new Date() });
	}

	async deleteApiKey(serverId: string, keyId: string) {
		await this.apiKeys.delete({ serverId, id: keyId });
	}

	// --- calls ---------------------------------------------------------------

	async insertCall(row: NewCallRow) {
		return await this.calls.save(this.calls.create(row));
	}

	async listCalls(serverId: string, filters: CallFilters) {
		const where: FindOptionsWhere<McpServerCallEntity> = { serverId };
		if (filters.tool) where.name = filters.tool;
		if (filters.caller) where.caller = filters.caller;
		if (filters.status) where.status = filters.status;
		if (filters.session) where.sessionId = filters.session;
		return await this.calls.find({ where, order: { createdAt: 'DESC' }, take: filters.limit });
	}

	async findCall(serverId: string, callId: string) {
		return await this.calls.findOneBy({ serverId, id: callId });
	}

	/** Calls since a time, without the stored input and output, for counts and charts. */
	async listCallStatsSince(serverIds: string[], since: Date) {
		if (serverIds.length === 0) return [];
		return await this.calls.find({
			where: { serverId: In(serverIds), createdAt: MoreThanOrEqual(since) },
			select: {
				id: true,
				serverId: true,
				kind: true,
				name: true,
				callerType: true,
				caller: true,
				callerUserId: true,
				apiKeyId: true,
				clientName: true,
				status: true,
				durationMs: true,
				intent: true,
				sessionId: true,
				createdAt: true,
			},
			order: { createdAt: 'ASC' },
		});
	}

	/** Distinct tool names and callers of one server, for the log filters. */
	async listCallFacets(serverId: string) {
		const rows = await this.calls.find({
			where: { serverId },
			select: { name: true, caller: true },
			order: { createdAt: 'DESC' },
			take: 2000,
		});
		return {
			tools: [...new Set(rows.map((row) => row.name))].sort(),
			callers: [...new Set(rows.map((row) => row.caller))].sort(),
		};
	}

	/** People who called the server through OAuth, with their first and last call. */
	async listOAuthCallers(serverId: string) {
		return await this.calls.find({
			where: { serverId, callerType: 'user' },
			select: { callerUserId: true, caller: true, clientName: true, createdAt: true },
			order: { createdAt: 'ASC' },
			take: 5000,
		});
	}
}
