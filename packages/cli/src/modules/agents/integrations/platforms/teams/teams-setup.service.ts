import type { AgentTeamsIntegrationSettings, TeamsAgentSetupState } from '@n8n/api-types';
import { Service } from '@n8n/di';

import { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { UrlService } from '@/services/url.service';

import { TeamsArmTemplateService } from './teams-arm-template.service';
import { TeamsDiscoveryService } from './teams-discovery.service';
import { TeamsManifestService } from './teams-manifest.service';
import type { Agent } from '../../../entities/agent.entity';
import { AgentRepository } from '../../../repositories/agent.repository';
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
		private readonly credentialsService: CredentialsService,
		private readonly manifestService: TeamsManifestService,
		private readonly armTemplateService: TeamsArmTemplateService,
		private readonly discoveryService: TeamsDiscoveryService,
		private readonly urlService: UrlService,
	) {}

	/**
	 * The deployment comes first and needs no credential: creating the bot is how
	 * the user gets one. The package comes last and does need it, because the
	 * manifest carries the bot's client ID.
	 */
	async getSetupState(scope: AgentScope): Promise<TeamsAgentSetupState> {
		const agent = await this.getAgent(scope);
		const identity = await this.findBotIdentity(agent);

		return {
			messagingEndpointUrl: this.messagingEndpointUrl(scope),
			botId: identity?.clientId ?? (await this.discoveredClientId(scope)),
			deployToAzureUrl: this.armTemplateService.buildDeployUrl(scope.projectId, scope.agentId),
		};
	}

	/**
	 * The manifest needs the bot's client ID, not a working credential, so this
	 * also accepts the one discovery found. Otherwise the package could only be
	 * downloaded after connecting — and connecting closes the setup, putting the
	 * download behind a round trip through the edit view.
	 */
	async buildPackage(scope: AgentScope): Promise<Buffer> {
		const agent = await this.getAgent(scope);
		const botId =
			(await this.findBotIdentity(agent))?.clientId ?? (await this.discoveredClientId(scope));
		if (!botId) {
			throw new BadRequestError('Connect the bot before downloading the app package.');
		}

		return await this.manifestService.buildPackage({
			agentName: agent.name,
			agentId: agent.id,
			botId,
			agentUpdatedAt: agent.updatedAt,
			availability: this.availabilityOf(agent),
		});
	}

	private async discoveredClientId(scope: AgentScope): Promise<string | null> {
		const state = await this.discoveryService.getState(scope);
		return state.status === 'found' ? state.clientId : null;
	}

	/**
	 * Reached by the Azure portal, which carries no n8n session, so the signed
	 * token is the whole authorisation check.
	 */
	async buildArmTemplate(scope: AgentScope & { token: string }): Promise<Record<string, unknown>> {
		if (!this.armTemplateService.verifyToken(scope.projectId, scope.agentId, scope.token)) {
			throw new NotFoundError('This deployment link has expired. Open the setup steps again.');
		}

		const agent = await this.getAgent(scope);
		// Absent on a first run, present when repointing a bot that is already
		// connected. Either way the blade opens; only these two fields differ.
		const identity = await this.findBotIdentity(agent);

		return this.armTemplateService.buildTemplate({
			agentName: agent.name,
			agentId: agent.id,
			msaAppId: identity?.clientId ?? '',
			msaAppTenantId: identity?.tenantId ?? '',
			messagingEndpoint: this.messagingEndpointUrl(scope),
		});
	}

	/**
	 * The availability toggles live on the connected integration, because they
	 * are what the user chose for this agent's Teams app.
	 */
	private availabilityOf(agent: Agent): AgentTeamsIntegrationSettings | undefined {
		const integration = agent.integrations?.find((item) => item.type === 'teams');
		return integration?.settings;
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
	private async findBotIdentity(agent: Agent): Promise<BotIdentity | null> {
		const credentialId = agent.integrations?.find((item) => item.type === 'teams')?.credentialId;
		if (!credentialId) return null;

		const projectCredentials = await this.credentialsService.findAllCredentialIdsForProject(
			agent.projectId,
		);
		const globalCredentials = await this.credentialsService.findAllGlobalCredentialIds(true);
		const credential =
			projectCredentials.find((item) => item.id === credentialId) ??
			globalCredentials.find((item) => item.id === credentialId);
		if (!credential || credential.type !== TEAMS_CREDENTIAL_TYPE) return null;

		const data = await this.credentialsService.decrypt(credential, true);
		const clientId = stringProperty(data, 'clientId');
		const tenantId = stringProperty(data, 'tenantId');
		return clientId && tenantId ? { clientId, tenantId } : null;
	}

	private messagingEndpointUrl(scope: AgentScope): string {
		// getWebhookBaseUrl returns the URL with a trailing slash.
		return `${this.urlService.getWebhookBaseUrl()}rest/projects/${scope.projectId}/agents/v2/${scope.agentId}/webhooks/teams`;
	}
}
