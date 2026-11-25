import type { McpServerShare, McpServerSharePublic } from '@n8n/api-types';
import { EventService } from '@n8n/backend-services';
import { isPerson, UserRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';

import type { McpServer } from '../database/entities/mcp-server.entity';
import { McpServerRepository } from '../database/repositories/mcp-server.repository';
import { McpServerToolsService } from './mcp-server-tools.service';
import { McpServerProtectedResource } from '../runtime/mcp-server-protected-resource';

/**
 * The share page of a server. Anyone with the link sees how to connect. Only a person who can
 * connect also sees the description and the tools.
 */
@Service()
export class McpServerShareService {
	constructor(
		private readonly resources: McpServerProtectedResource,
		private readonly servers: McpServerRepository,
		private readonly tools: McpServerToolsService,
		private readonly users: UserRepository,
		private readonly events: EventService,
	) {}

	/** `null` for an unknown server, and for every server when the flag is off. */
	async publicShare(slug: string): Promise<McpServerSharePublic | null> {
		const server = await this.resources.findServer(slug);
		const share = server ? await this.toPublic(server) : null;
		this.trackView(share);
		return share;
	}

	async shareFor(slug: string, user: User): Promise<McpServerShare | null> {
		const share = await this.findShareFor(slug, user);
		this.trackView(share, user.id);
		return share;
	}

	private async findShareFor(slug: string, user: User): Promise<McpServerShare | null> {
		const server = await this.resources.findServer(slug);
		if (!server) return null;
		const share = await this.toPublic(server);
		if (!share || !(await this.resources.canConnect(server, user))) return share;

		// A broken tool fails on each call, so the page does not offer it.
		const tools = await this.tools.listTools(server.projectId, server.id);
		return {
			...share,
			canConnect: true,
			description: server.description,
			tools: tools
				.filter((tool) => tool.brokenReason === null)
				.map(({ toolName, description }) => ({ toolName, description })),
		};
	}

	/**
	 * The backend sends the page view, because the editor starts telemetry only after a sign-in.
	 * Each page load reads exactly one of the two routes.
	 */
	private trackView(share: McpServerShare | null, userId?: string) {
		this.events.emit('mcp-server-share-viewed', {
			serverId: share?.id,
			userId,
			canConnect: share?.canConnect ?? false,
			result: share ? 'found' : 'not_found',
		});
	}

	private async toPublic(server: McpServer): Promise<McpServerSharePublic | null> {
		const [row] = await this.servers.withProjects([server]);
		if (!row) return null;
		return {
			id: server.id,
			slug: server.slug,
			name: server.name,
			serverUrl: this.resources.serverUrl(server),
			projectName:
				row.project.type === 'personal' ? await this.ownerName(server.projectId) : row.project.name,
			projectType: row.project.type,
			canConnect: false,
		};
	}

	/** The name of a personal project also holds the email, which the page must not show. */
	private async ownerName(projectId: string): Promise<string | null> {
		const owner = await this.users.findPersonalOwnerForProject(projectId);
		if (!owner || !isPerson(owner)) return null;
		const name = [owner.firstName, owner.lastName].filter(Boolean).join(' ');
		return name || null;
	}
}
