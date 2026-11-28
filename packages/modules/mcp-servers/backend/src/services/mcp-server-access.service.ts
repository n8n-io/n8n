import {
	mcpServerPersonSchema,
	mcpServerSchema,
	type McpServerBlockResponse,
	type McpServerConnectionsResponse,
	type McpServerPerson,
} from '@n8n/api-types';
import { EventService } from '@n8n/backend-services';
import { isPerson, TransactionRunner, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, NotFoundError, UnexpectedError } from '@n8n/errors';

import type { McpServerBlock } from '../database/entities/mcp-server-block.entity';
import type { McpServerActor } from '../mcp-server-events';
import type { McpServer } from '../database/entities/mcp-server.entity';
import { McpServerRepository } from '../database/repositories/mcp-server.repository';
import { McpServerProtectedResource } from '../runtime/mcp-server-protected-resource';
import { McpServerBlockRepository } from './mcp-server-block.repository';
import { McpServerConnectionRepository } from './mcp-server-connection.repository';
import { RefreshTokenPort } from './refresh-token-port';

// An id that is not a UUID cannot exist, and Postgres refuses it in a uuid column.
const isServerId = (id: string) => mcpServerSchema.shape.id.safeParse(id).success;
const isUserId = (id: string) => mcpServerPersonSchema.shape.userId.safeParse(id).success;

function toBlockResponse(block: McpServerBlock, person: McpServerPerson): McpServerBlockResponse {
	return {
		...person,
		blockedById: block.blockedById,
		blockedAt: block.blockedAt.toISOString(),
	};
}

/**
 * Who connected to a server, and the builder actions on a person: block, restore access, and
 * remove. A block applies to the person, so all of their clients lose access at once. The REST
 * controller checks the project scopes, and the Assistant tool calls the same methods.
 */
@Service()
export class McpServerAccessService {
	constructor(
		private readonly servers: McpServerRepository,
		private readonly connections: McpServerConnectionRepository,
		private readonly blocks: McpServerBlockRepository,
		private readonly users: UserRepository,
		private readonly resources: McpServerProtectedResource,
		private readonly refreshTokens: RefreshTokenPort,
		private readonly txRunner: TransactionRunner,
		private readonly events: EventService,
	) {}

	async list(projectId: string, serverId: string): Promise<McpServerConnectionsResponse> {
		const server = await this.findServer(projectId, serverId);
		const [connections, blocks] = await Promise.all([
			this.connections.listByServer(server.id),
			this.blocks.listByServer(server.id),
		]);
		const people = await this.people([
			...connections.map((connection) => connection.userId),
			...blocks.map((block) => block.userId),
		]);
		const personOf = (userId: string) => people.get(userId) ?? this.unknownPerson(userId);
		return {
			connections: connections.map((connection) => ({
				...personOf(connection.userId),
				oauthClientId: connection.oauthClientId,
				clientName: connection.clientName,
				firstUsedAt: connection.firstUsedAt.toISOString(),
				lastUsedAt: connection.lastUsedAt.toISOString(),
			})),
			blocks: blocks.map((block) => toBlockResponse(block, personOf(block.userId))),
		};
	}

	/**
	 * Blocks the person and deletes their refresh tokens for this server. Their access tokens
	 * stay valid for up to one hour, but the block check refuses them on the next request.
	 */
	async block(
		projectId: string,
		serverId: string,
		userId: string,
		actor: McpServerActor,
	): Promise<McpServerBlockResponse> {
		const server = await this.findServer(projectId, serverId);
		const person = (await this.people([userId])).get(userId);
		if (!person) throw new NotFoundError('User not found');

		const isNew = await this.blocks.insertIfAbsent({
			serverId: server.id,
			userId,
			blockedById: actor.userId,
		});
		// The row is committed. Send the event first, because a retry finds the row and sends none.
		if (isNew) {
			this.events.emit('mcp-server-person-blocked', {
				...actor,
				serverId: server.id,
				blockedUserId: userId,
			});
		}
		await this.refreshTokens.deleteForPerson(this.resources.serverUrl(server), userId);

		const block = await this.blocks.findForPerson(server.id, userId);
		// The insert above wrote the row, or found the row of an earlier block.
		if (!block) throw new UnexpectedError('MCP server block not found after insert');
		return toBlockResponse(block, person);
	}

	/**
	 * Deletes the block and, one more time, the refresh tokens of the person for this server. The
	 * connection rows stay. An access token from before the block works again until it ends, at
	 * most one hour later, and then the client signs in again.
	 */
	async restore(
		projectId: string,
		serverId: string,
		userId: string,
		actor: McpServerActor,
	): Promise<void> {
		const server = await this.findServer(projectId, serverId);
		if (!isUserId(userId) || !(await this.blocks.isBlocked(server.id, userId))) {
			throw new NotFoundError('User is not blocked');
		}
		// A refresh that ran during the block can have written a new token. Delete it first, so the
		// client signs in again. If the delete fails, the block stays and a retry works.
		await this.refreshTokens.deleteForPerson(this.resources.serverUrl(server), userId);
		if (!(await this.blocks.deleteForPerson(server.id, userId))) {
			throw new NotFoundError('User is not blocked');
		}
		this.events.emit('mcp-server-access-restored', {
			...actor,
			serverId: server.id,
			restoredUserId: userId,
		});
	}

	/**
	 * Removes a blocked person from the list: deletes their connection rows and their block. As a
	 * project member, the person can connect again with a new sign-in.
	 */
	async remove(projectId: string, serverId: string, userId: string): Promise<void> {
		const server = await this.findServer(projectId, serverId);
		if (!isUserId(userId)) throw new NotFoundError('User not found');
		await this.txRunner.run({}, async (ctx) => {
			if (!(await this.blocks.deleteForPerson(server.id, userId, ctx))) {
				throw new BadRequestError('Only a blocked person can be removed. Block the person first.');
			}
			await this.connections.deleteForPerson(server.id, userId, ctx);
		});
		// A refresh that ran during the block can have written a new token, as for restore.
		await this.refreshTokens.deleteForPerson(this.resources.serverUrl(server), userId);
	}

	private async findServer(projectId: string, serverId: string): Promise<McpServer> {
		const server = isServerId(serverId)
			? await this.servers.findInProject(projectId, serverId)
			: null;
		if (!server) throw new NotFoundError('MCP server not found');
		return server;
	}

	private async people(userIds: string[]): Promise<Map<string, McpServerPerson>> {
		const ids = [...new Set(userIds)].filter(isUserId);
		if (ids.length === 0) return new Map();
		// Only a person signs in with an AI client. A service account has no connection to show.
		const users = (await this.users.findManyByIds(ids)).filter(isPerson);
		return new Map(
			users.map((user) => [
				user.id,
				{ userId: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email },
			]),
		);
	}

	/** A row of a deleted user. The user delete normally deletes the rows too. */
	private unknownPerson(userId: string): McpServerPerson {
		return { userId, firstName: null, lastName: null, email: null };
	}
}
