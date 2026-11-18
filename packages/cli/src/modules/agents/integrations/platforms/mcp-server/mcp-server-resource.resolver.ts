import { AGENT_MCP_INTEGRATION_TYPE, isDraftIntegration } from '@n8n/api-types';
import { UrlService } from '@n8n/backend-services';
import type { ProtectedResource, ProtectedResourceResolver } from '@n8n/backend-services/auth';
import { GlobalConfig } from '@n8n/config';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ResourcePrincipal } from '@n8n/inbound-auth';

import { SYSTEM_TRUSTED_SOURCE_ID } from '@/modules/inbound-auth-core/constants';
import { userHasScopes } from '@/permissions.ee/check-access';

import { AgentsSettingsService } from '../../../agents-settings.service';
import type { ProjectAgent } from '../../../entities/agent.entity';
import { AgentRepository } from '../../../repositories/agent.repository';

/** The channel enforces no OAuth scopes. Access is the `agent:execute` check in `authorize`. */
const MCP_SERVER_CHANNEL_SCOPES: string[] = [];

const MCP_PATH_SUFFIX = '/mcp';

/**
 * Resolves the OAuth protected resource of an agent's MCP server channel. The
 * resource exists only while the agent is published with the channel set up,
 * so a token for one agent never opens another agent or the instance MCP server.
 */
@Service()
export class McpServerResourceResolver implements ProtectedResourceResolver {
	readonly id = 'agent-mcp-server';

	readonly scopes = MCP_SERVER_CHANNEL_SCOPES;

	constructor(
		private readonly config: GlobalConfig,
		private readonly urlService: UrlService,
		private readonly agentRepository: AgentRepository,
		private readonly userRepository: UserRepository,
		private readonly settings: AgentsSettingsService,
	) {}

	async resolveByUrl(resourceUrl: string) {
		let pathname: string;
		try {
			pathname = new URL(resourceUrl).pathname;
		} catch {
			return undefined;
		}
		const resource = await this.resolveByPath(pathname);
		// The path alone matches on any host, so the full URL must be the canonical one.
		return resource?.getResourceUrl() === resourceUrl ? resource : undefined;
	}

	async resolveByPath(pathname: string) {
		const agentId = this.agentIdFromPath(pathname);
		if (!agentId) return undefined;
		const agent = await this.findServedAgent(agentId);
		return agent ? this.resourceFor(agent) : undefined;
	}

	/** Returns the agent if it is published, its MCP server channel is set up, and agents are on. */
	async findServedAgent(agentId: string): Promise<ProjectAgent | undefined> {
		const agent = await this.agentRepository.findById(agentId);
		const hasChannel = agent?.integrations?.some(
			(entry) => entry.type === AGENT_MCP_INTEGRATION_TYPE && !isDraftIntegration(entry),
		);
		if (!agent || agent.activeVersionId === null || !hasChannel) return undefined;
		if (!(await this.settings.getEnabled())) return undefined;
		return agent;
	}

	/** Matches `/{agentWebhook}/{agentId}/mcp`. */
	private agentIdFromPath(pathname: string): string | undefined {
		const prefix = `/${this.config.endpoints.agentWebhook}/`;
		if (!pathname.startsWith(prefix) || !pathname.endsWith(MCP_PATH_SUFFIX)) return undefined;
		const encoded = pathname.slice(prefix.length, -MCP_PATH_SUFFIX.length);
		if (!encoded || encoded.includes('/')) return undefined;
		try {
			return decodeURIComponent(encoded);
		} catch {
			return undefined;
		}
	}

	/** The protected resource of a served agent. */
	resourceFor(agent: ProjectAgent): ProtectedResource {
		const resourceUrl = this.urlService.getAgentMcpUrl(agent.id);
		const audiences = [resourceUrl];
		return {
			id: `agent-mcp-server:${agent.id}`,
			surface: 'trigger',
			displayName: agent.name,
			uiHints: { icon: 'mcp' },
			getResourceUrl: () => resourceUrl,
			getAudiences: () => audiences,
			getAcceptedSourceIds: () => [SYSTEM_TRUSTED_SOURCE_ID],
			scopes: MCP_SERVER_CHANNEL_SCOPES,
			authorize: async (principal: ResourcePrincipal) =>
				await this.canExecute(principal.id, agent.projectId),
		};
	}

	/** Only users who can run agents in the agent's project can sign in to its MCP server. */
	private async canExecute(userId: string, projectId: string): Promise<boolean> {
		const user = await this.userRepository.findByIdWithRole(userId);
		if (!user) return false;
		return await userHasScopes(user, ['agent:execute'], false, { projectId });
	}
}
