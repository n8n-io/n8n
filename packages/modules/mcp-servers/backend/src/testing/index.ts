// Fixtures for tests outside this package. They read, write, and clear the module tables here,
// so integration tests never import entities or repositories directly.
import type { McpServerToolDraftSource, McpServerToolKind } from '@n8n/api-types';
import { Container } from '@n8n/di';

import { McpServerBlockRepository } from '../database/repositories/mcp-server-block.repository';
import {
	McpServerConnectionRepository,
	type McpServerConnectionKey,
} from '../database/repositories/mcp-server-connection.repository';
import { McpServerToolRepository } from '../database/repositories/mcp-server-tool.repository';
import { McpServerRepository } from '../database/repositories/mcp-server.repository';

export type McpServerFixture = {
	id?: string;
	projectId: string;
	name: string;
	slug: string;
	description?: string;
	createdById?: string | null;
	deletedAt?: Date | null;
};

export type McpServerToolFixture = {
	id?: string;
	serverId: string;
	kind?: McpServerToolKind;
	targetId?: string | null;
	toolName: string;
	description?: string;
	draftSource?: McpServerToolDraftSource;
	toolData?: Record<string, unknown> | null;
	position?: number;
};

export type McpServerConnectionFixture = {
	serverId: string;
	userId: string;
	oauthClientId: string;
	clientName: string;
	firstUsedAt?: Date;
	lastUsedAt?: Date;
};

export type McpServerBlockFixture = {
	serverId: string;
	userId: string;
	blockedById?: string | null;
	blockedAt?: Date;
};

export type { McpServerConnectionKey };

/** Inserts a server row and reads it back. Omitted optional columns keep their database defaults. */
export async function createMcpServer(fixture: McpServerFixture) {
	return await Container.get(McpServerRepository).insertFixture(fixture);
}

/** Reads a server row by ID, including soft-deleted servers. */
export async function findMcpServer(serverId: string) {
	return await Container.get(McpServerRepository).findById(serverId);
}

/** Soft-deletes a server row by ID or slug. */
export async function softDeleteMcpServer(where: { id: string } | { slug: string }): Promise<void> {
	await Container.get(McpServerRepository).markDeleted(where);
}

/** Inserts a tool row and reads it back. Omitted optional columns keep their database defaults. */
export async function createMcpServerTool(fixture: McpServerToolFixture) {
	return await Container.get(McpServerToolRepository).insertFixture(fixture);
}

/** Lists all tools of a server in position order. */
export async function findMcpServerTools(serverId: string) {
	return await Container.get(McpServerToolRepository).listByServer(serverId);
}

/** Inserts a connection row and reads it back. Omitted dates keep their database defaults. */
export async function createMcpServerConnection(fixture: McpServerConnectionFixture) {
	return await Container.get(McpServerConnectionRepository).insertFixture(fixture);
}

/** Reads one connection row by server, user, and OAuth client ID. */
export async function findMcpServerConnection(key: McpServerConnectionKey) {
	return await Container.get(McpServerConnectionRepository).findForClient(key);
}

/** Lists all connections of one server, or every connection across all servers. */
export async function findMcpServerConnections(serverId?: string) {
	const repo = Container.get(McpServerConnectionRepository);
	return serverId ? await repo.listByServer(serverId) : await repo.findAll();
}

/** Sets the `lastUsedAt` timestamp of one connection row. */
export async function updateMcpServerConnectionLastUsedAt(
	key: McpServerConnectionKey,
	lastUsedAt: Date,
): Promise<void> {
	await Container.get(McpServerConnectionRepository).setLastUsedAt(key, lastUsedAt);
}

/** Inserts a block row and reads it back. Omitted `blockedAt` keeps its database default. */
export async function createMcpServerBlock(fixture: McpServerBlockFixture) {
	return await Container.get(McpServerBlockRepository).insertFixture(fixture);
}

/** Lists all blocks of one server, or every block across all servers. */
export async function findMcpServerBlocks(serverId?: string) {
	const repo = Container.get(McpServerBlockRepository);
	return serverId ? await repo.listByServer(serverId) : await repo.findAll();
}

/** Deletes every row from the four MCP server tables. */
export async function clearMcpServerTables(): Promise<void> {
	await Container.get(McpServerConnectionRepository).deleteAll();
	await Container.get(McpServerBlockRepository).deleteAll();
	await Container.get(McpServerToolRepository).deleteAll();
	await Container.get(McpServerRepository).deleteAll();
}
