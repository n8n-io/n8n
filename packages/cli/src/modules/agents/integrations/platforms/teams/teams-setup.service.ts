import type { AgentTeamsIntegrationSettings, TeamsAgentSetupState } from '@n8n/api-types';
import { Service } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { UrlService } from '@/services/url.service';

import { TeamsArmTemplateService } from './teams-arm-template.service';
import { TeamsManifestService } from './teams-manifest.service';
import type { Agent } from '../../../entities/agent.entity';
import { AgentRepository } from '../../../repositories/agent.repository';
import { AgentCredentialLookupService } from '../../agent-credential-lookup.service';
import { stringProperty } from '../../integration-helpers';

const TEAMS_CREDENTIAL_TYPE = 'microsoftEntraServicePrincipalApi';

interface AgentScope {
	projectId: string;
	agentId: string;
}

interface BotIdentity {
	clientId: string;
	tenantId: string;
}

@Service()
export class TeamsSetupService {
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly credentialLookup: AgentCredentialLookupService,
		private readonly manifestService: TeamsManifestService,
		private readonly armTemplateService: TeamsArmTemplateService,
		private readonly urlService: UrlService,
	) {}

	/**
	 * Everything downstream needs the Entra IDs, and those only exist once the
	 * user has registered the app — so the credential comes first and the rest is
	 * derived from it.
	 *
	 * `selectedCredentialId` is the one picked in the setup but not yet connected
	 * to the agent. Without it the deployment could not be pre-filled, because
	 * the agent has no credential attached until the very last step.
	 */
	async getSetupState(
		scope: AgentScope,
		selectedCredentialId?: string,
	): Promise<TeamsAgentSetupState> {
		const agent = await this.getAgent(scope);
		const credentialId = selectedCredentialId ?? this.connectedCredentialId(agent);
		const identity = credentialId ? await this.readIdentity(agent.projectId, credentialId) : null;

		return {
			messagingEndpointUrl: this.messagingEndpointUrl(scope),
			botId: identity?.clientId ?? null,
			deployToAzureUrl: credentialId
				? this.armTemplateService.buildDeployUrl(scope.projectId, scope.agentId, credentialId)
				: null,
			...this.defaultIdentity(agent.name),
		};
	}

	/**
	 * Built from the selected credential, not only the connected one: connecting
	 * closes the setup, so waiting for it would put the download behind a round
	 * trip through the edit view.
	 */
	async buildPackage(scope: AgentScope, selectedCredentialId?: string): Promise<Buffer> {
		const agent = await this.getAgent(scope);
		const credentialId = selectedCredentialId ?? this.connectedCredentialId(agent);
		const identity = credentialId ? await this.readIdentity(agent.projectId, credentialId) : null;
		const botId = identity?.clientId;
		if (!botId) {
			throw new BadRequestError('Add the credential before downloading the app package.');
		}

		return await this.manifestService.buildPackage({
			agentName: agent.name,
			agentId: agent.id,
			botId,
			agentUpdatedAt: agent.updatedAt,
			settings: this.teamsSettingsOf(agent),
		});
	}

	/**
	 * Reached by the Azure portal, which carries no n8n session, so the signed
	 * token is the whole authorisation check.
	 */
	async buildArmTemplate(
		scope: AgentScope & { token: string; credentialId: string },
	): Promise<Record<string, unknown>> {
		if (
			!this.armTemplateService.verifyToken(
				scope.projectId,
				scope.agentId,
				scope.credentialId,
				scope.token,
			)
		) {
			throw new NotFoundError('This deployment link has expired. Open the setup steps again.');
		}

		const agent = await this.getAgent(scope);
		const identity = await this.readIdentity(agent.projectId, scope.credentialId);
		if (!identity) {
			throw new BadRequestError('This credential is missing its tenant or client ID.');
		}

		return this.armTemplateService.buildTemplate({
			agentName: agent.name,
			agentId: agent.id,
			msaAppId: identity.clientId,
			msaAppTenantId: identity.tenantId,
			messagingEndpoint: this.messagingEndpointUrl(scope),
		});
	}

	/**
	 * The app's settings live on the connected integration, because they are what
	 * the user chose for this agent's Teams app rather than for the agent itself.
	 */
	private teamsSettingsOf(agent: Agent): AgentTeamsIntegrationSettings | undefined {
		return agent.integrations?.find((item) => item.type === 'teams')?.settings;
	}

	private defaultIdentity(agentName: string) {
		const { displayName, description } = this.manifestService.defaultIdentity(agentName);
		return { defaultDisplayName: displayName, defaultDescription: description };
	}

	private async getAgent(scope: AgentScope): Promise<Agent> {
		const agent = await this.agentRepository.findByIdAndProjectId(scope.agentId, scope.projectId);
		if (!agent) throw new NotFoundError(`Agent "${scope.agentId}" not found`);
		return agent;
	}

	/**
	 * Resolved through the agent's project rather than through a signed-in user,
	 * the same way the channel resolves it when an activity arrives. The template
	 * route has no user at all, and the client ID this returns is not a secret:
	 * it ships inside the manifest the user downloads.
	 */
	private connectedCredentialId(agent: Agent): string | undefined {
		return agent.integrations?.find((item) => item.type === 'teams')?.credentialId;
	}

	private async readIdentity(projectId: string, credentialId: string): Promise<BotIdentity | null> {
		const data = await this.credentialLookup.decryptForProject(
			projectId,
			credentialId,
			TEAMS_CREDENTIAL_TYPE,
		);
		const clientId = stringProperty(data, 'clientId');
		const tenantId = stringProperty(data, 'tenantId');
		return clientId && tenantId ? { clientId, tenantId } : null;
	}

	private messagingEndpointUrl(scope: AgentScope): string {
		// getWebhookBaseUrl returns the URL with a trailing slash.
		return `${this.urlService.getWebhookBaseUrl()}rest/projects/${scope.projectId}/agents/v2/${scope.agentId}/webhooks/teams`;
	}
}
