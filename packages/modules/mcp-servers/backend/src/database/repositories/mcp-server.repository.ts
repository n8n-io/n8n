import type { ProjectType } from '@n8n/api-types';
import {
	BaseRepository,
	isUniqueConstraintError,
	Project,
	TransactionRunner,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import { DataSource, In, IsNull } from '@n8n/typeorm';
import { v7 as uuidv7 } from 'uuid';

import { McpServer } from '../entities/mcp-server.entity';

class McpServerTable extends BaseRepository<McpServer> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(McpServer, dataSource.manager, transactionRunner);
	}
}

export type NewMcpServer = Pick<
	McpServer,
	'projectId' | 'name' | 'slug' | 'description' | 'createdById'
>;

export type McpServerChanges = Partial<Pick<McpServer, 'name' | 'description'>>;

export type McpServerProject = { name: string; type: ProjectType };

export type McpServerWithProject = { server: McpServer; project: McpServerProject };

/** `reserved`: a deleted server used the slug. A slug never goes back to the pool. */
export type McpServerSlugStatus = 'free' | 'taken' | 'reserved';

/** The servers that `deletedAt` marks as deleted are hidden from every method, except the slug check. */
@Service()
export class McpServerRepository {
	private readonly table: McpServerTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new McpServerTable(dataSource, transactionRunner);
	}

	async create(row: NewMcpServer, ctx: OperationContext = {}): Promise<McpServer> {
		const manager = this.table.managerFor(ctx);
		const server = manager.create(McpServer, { ...row, id: uuidv7(), deletedAt: null });
		try {
			await manager.insert(McpServer, server);
		} catch (error) {
			if (isUniqueConstraintError(error)) {
				throw new ConflictError('Another MCP server uses this URL. Choose another URL.');
			}
			throw error;
		}
		return await manager.findOneByOrFail(McpServer, { id: server.id });
	}

	async findInProject(
		projectId: string,
		serverId: string,
		ctx: OperationContext = {},
	): Promise<McpServer | null> {
		return await this.table
			.managerFor(ctx)
			.findOneBy(McpServer, { id: serverId, projectId, deletedAt: IsNull() });
	}

	/** The server that serves this URL slug. A deleted server serves nothing. */
	async findBySlug(slug: string, ctx: OperationContext = {}): Promise<McpServer | null> {
		return await this.table.managerFor(ctx).findOneBy(McpServer, { slug, deletedAt: IsNull() });
	}

	/** Newest change first. `null` lists the servers of all projects. */
	async listInProjects(
		projectIds: string[] | null,
		ctx: OperationContext = {},
	): Promise<McpServer[]> {
		if (projectIds?.length === 0) return [];
		return await this.table.managerFor(ctx).find(McpServer, {
			where: {
				deletedAt: IsNull(),
				...(projectIds !== null && { projectId: In(projectIds) }),
			},
			order: { updatedAt: 'DESC', id: 'ASC' },
		});
	}

	async withProjects(
		servers: McpServer[],
		ctx: OperationContext = {},
	): Promise<McpServerWithProject[]> {
		const projectIds = [...new Set(servers.map((server) => server.projectId))];
		if (projectIds.length === 0) return [];
		const projects = await this.table
			.managerFor(ctx)
			.find(Project, { select: ['id', 'name', 'type'], where: { id: In(projectIds) } });
		const byId = new Map(projects.map((project) => [project.id, project]));
		return servers.flatMap((server) => {
			const project = byId.get(server.projectId);
			return project ? [{ server, project: { name: project.name, type: project.type } }] : [];
		});
	}

	async slugStatus(slug: string, ctx: OperationContext = {}): Promise<McpServerSlugStatus> {
		const server = await this.table
			.managerFor(ctx)
			.findOne(McpServer, { select: ['id', 'deletedAt'], where: { slug } });
		if (!server) return 'free';
		return server.deletedAt ? 'reserved' : 'taken';
	}

	async update(
		projectId: string,
		serverId: string,
		changes: McpServerChanges,
		ctx: OperationContext = {},
	): Promise<McpServer | null> {
		return await this.table.runInTransaction(ctx, async (manager) => {
			const where = { id: serverId, projectId, deletedAt: IsNull() };
			const result = await manager.update(McpServer, where, {
				...changes,
				updatedAt: new Date(),
			});
			if (!result.affected) return null;
			return await manager.findOneBy(McpServer, where);
		});
	}

	/** Sets the delete date. The row stays, so that its slug stays reserved. */
	async softDelete(
		projectId: string,
		serverId: string,
		ctx: OperationContext = {},
	): Promise<boolean> {
		const result = await this.table
			.managerFor(ctx)
			.update(
				McpServer,
				{ id: serverId, projectId, deletedAt: IsNull() },
				{ deletedAt: new Date(), updatedAt: new Date() },
			);
		return result.affected === 1;
	}

	async projectExists(projectId: string, ctx: OperationContext = {}): Promise<boolean> {
		return await this.table.managerFor(ctx).existsBy(Project, { id: projectId });
	}
}
