import type { AgentTeamsIntegrationSettings, TeamsAgentSetupState } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { BadRequestError, NotFoundError } from '@n8n/errors';
import { UrlService } from '@n8n/backend-services';

import { adminConsentRedirectUri, adminConsentUrl } from './teams-admin-consent';
import { TeamsArmTemplateService } from './teams-arm-template.service';
import { botResourceId } from './teams-bot-provisioning.service';
import { TeamsManifestService } from './teams-manifest.service';
import type { Agent } from '../../../entities/agent.entity';
import { AgentRepository } from '../../../repositories/agent.repository';
import { AgentCredentialLookupService } from '../../agent-credential-lookup.service';
import { stringProperty } from '../../integration-helpers';

const TEAMS_CREDENTIAL_TYPE = 'microsoftEntraServicePrincipalApi';

const GUID = /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/;

interface AgentScope {
	projectId: string;
	agentId: string;
}

interface BotIdentity {
	clientId: string;
	tenantId: string;
	/** Written by the recommended setup, so a hand-made credential lacks it. */
	provisionedForAgentId?: string;
	azureBotName?: string;
	azureSubscriptionId?: string;
	/** The manifest n8n last handed over, as `TeamsManifestService.fingerprint` reads it. */
	teamsAppFingerprint?: string;
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
	 * `selectedCredentialId` is the one picked in the setup but not yet connected
	 * to the agent, which is what the deployment is pre-filled from: the agent
	 * holds no credential until the very last step.
	 */
	async getSetupState(
		user: User,
		scope: AgentScope,
		selectedCredentialId?: string,
	): Promise<TeamsAgentSetupState> {
		const agent = await this.getAgent(scope);
		const credentialId = selectedCredentialId ?? this.connectedCredentialId(agent);
		const [identity, claimedBy] = await Promise.all([
			credentialId ? this.readIdentity(agent.projectId, credentialId, user) : null,
			credentialId ? this.credentialClaimedBy(agent.id, credentialId) : null,
		]);

		const provisionedByN8n = identity?.provisionedForAgentId === agent.id;

		return {
			messagingEndpointUrl: this.messagingEndpointUrl(scope),
			botId: identity?.clientId ?? null,
			// Withheld while the credential is taken: the deployment would fail in
			// the portal, and the user would read Azure's wording for an n8n-side
			// choice they can still change here.
			deployToAzureUrl:
				credentialId && identity && !claimedBy
					? this.armTemplateService.buildDeployUrl(scope.projectId, scope.agentId, credentialId)
					: null,
			credentialClaimedBy: claimedBy,
			provisionedByN8n,
			fileAccessConsentUrl: provisionedByN8n ? this.fileAccessConsentUrl(scope, identity) : null,
			azureBot: provisionedByN8n ? this.azureBot(identity) : null,
			appOutdated: this.appOutdated(agent, identity),
			...this.defaultIdentity(agent.name),
		};
	}

	/**
	 * Built from the selected credential, not only the connected one: connecting
	 * closes the setup, so waiting for it would put the download behind a round
	 * trip through the edit view.
	 */
	async buildPackage(
		user: User,
		scope: AgentScope,
		selectedCredentialId?: string,
		selectedSettings?: AgentTeamsIntegrationSettings,
	): Promise<{ archive: Buffer; fingerprint: string; credentialId: string }> {
		const agent = await this.getAgent(scope);
		const credentialId = selectedCredentialId ?? this.connectedCredentialId(agent);
		const identity = credentialId
			? await this.readIdentity(agent.projectId, credentialId, user)
			: null;
		if (!credentialId || !identity) {
			throw new BadRequestError('Add the credential before downloading the app package.');
		}

		// Teams rejects a package whose botId is not a GUID, and it says so only
		// at upload, by which point the cause is three steps behind.
		if (!GUID.test(identity.clientId)) {
			throw new BadRequestError(
				"This credential's Application (client) ID is not a GUID, which Teams requires.",
			);
		}

		// The manifest names this credential's bot, so a credential another agent
		// holds would build that agent's app under this agent's name.
		const claimedBy = await this.credentialClaimedBy(agent.id, credentialId);
		if (claimedBy) {
			throw new BadRequestError(
				`This credential already backs the Teams channel of "${claimedBy}". Pick a different one.`,
			);
		}

		const options = {
			agentName: agent.name,
			agentId: agent.id,
			botId: identity.clientId,
			// Settings supplied by the caller are not stored yet, so the agent's own
			// timestamp does not move with them. Stamping now keeps the version
			// rising, which is the only way Teams applies the package.
			versionAt: selectedSettings
				? new Date(Math.max(Date.now(), agent.updatedAt.getTime()))
				: agent.updatedAt,
			// The open form wins over what is stored: during setup nothing is stored
			// yet, and in the settings view the fields sit above this button.
			settings: selectedSettings ?? this.teamsSettingsOf(agent),
		};
		return {
			archive: await this.manifestService.buildPackage(options),
			fingerprint: this.manifestService.fingerprint(
				this.manifestService.buildManifest(options),
				agent.schema?.personalisation,
			),
			credentialId,
		};
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
			displayName: this.teamsSettingsOf(agent)?.displayName,
			msaAppId: identity.clientId,
			msaAppTenantId: identity.tenantId,
			messagingEndpoint: this.messagingEndpointUrl(scope),
		});
	}

	/**
	 * Looked up across projects, because the clash is at Microsoft rather than in
	 * n8n. Connecting is still refused only within the project, by the shared
	 * precondition every channel uses.
	 */
	private async credentialClaimedBy(agentId: string, credentialId: string): Promise<string | null> {
		const others = await this.agentRepository.findByIntegrationCredentialAnyProject(
			'teams',
			credentialId,
			agentId,
		);
		return others[0]?.name ?? null;
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

	/** The name the provisioned Entra app and Teams app are built from. */
	async agentNameFor(projectId: string, agentId: string): Promise<string> {
		const agent = await this.getAgent({ projectId, agentId });
		return agent.name;
	}

	/**
	 * What the bot has to be created against: the Entra app it signs as, and
	 * where Teams should deliver to. Both are read here so the provisioned bot
	 * and the Deploy to Azure template agree on every value.
	 */
	async botIdentityFor(
		user: User,
		scope: AgentScope,
		credentialId: string,
	): Promise<{
		clientId: string;
		tenantId: string;
		messagingEndpoint: string;
		agentName: string;
	}> {
		const agent = await this.getAgent(scope);
		const identity = await this.readIdentity(agent.projectId, credentialId, user);
		if (!identity) {
			throw new BadRequestError('Create the Teams app before deploying the bot.');
		}

		// An Azure bot carries one messaging endpoint. Creating one against a
		// credential another agent holds re-points that agent's bot at this
		// endpoint, so its messages would arrive here instead.
		const claimedBy = await this.credentialClaimedBy(agent.id, credentialId);
		if (claimedBy) {
			throw new BadRequestError(
				`This credential already backs the Teams channel of "${claimedBy}". Pick a different one.`,
			);
		}

		return {
			...identity,
			messagingEndpoint: this.messagingEndpointUrl(scope),
			agentName: agent.name,
		};
	}

	private async getAgent(scope: AgentScope): Promise<Agent> {
		const agent = await this.agentRepository.findByIdAndProjectId(scope.agentId, scope.projectId);
		if (!agent) throw new NotFoundError(`Agent "${scope.agentId}" not found`);
		return agent;
	}

	/**
	 * Resolved through the agent's project rather than a signed-in user, because
	 * the template route has none. The client ID this returns is not a secret: it
	 * ships inside the manifest the user downloads.
	 */
	private connectedCredentialId(agent: Agent): string | undefined {
		return agent.integrations?.find((item) => item.type === 'teams')?.credentialId;
	}

	/**
	 * `user` is absent only on the ARM template route, which has no session and
	 * is authorised by a signed token instead -- and that token is minted only
	 * after a user-scoped read has already allowed the credential.
	 */
	private async readIdentity(
		projectId: string,
		credentialId: string,
		user?: User,
	): Promise<BotIdentity | null> {
		const data = user
			? await this.credentialLookup.decryptForUser(
					user,
					projectId,
					credentialId,
					TEAMS_CREDENTIAL_TYPE,
				)
			: await this.credentialLookup.decryptForProject(
					projectId,
					credentialId,
					TEAMS_CREDENTIAL_TYPE,
				);
		const clientId = stringProperty(data, 'clientId');
		const tenantId = stringProperty(data, 'tenantId');
		const provisionedForAgentId = stringProperty(data, 'provisionedForAgentId');
		return clientId && tenantId
			? {
					clientId,
					tenantId,
					provisionedForAgentId,
					azureBotName: stringProperty(data, 'azureBotName'),
					azureSubscriptionId: stringProperty(data, 'azureSubscriptionId'),
					teamsAppFingerprint: stringProperty(data, 'teamsAppFingerprint'),
				}
			: null;
	}

	/**
	 * Whether the saved channel would build a different app than the one n8n last
	 * handed over, for example after the agent was renamed. n8n sees the download
	 * or the publish, not the upload in Teams, so this is as close as it gets.
	 */
	private appOutdated(agent: Agent, identity: BotIdentity | null): boolean {
		if (!identity?.teamsAppFingerprint) return false;
		const current = this.manifestService.buildManifest({
			agentName: agent.name,
			agentId: agent.id,
			botId: identity.clientId,
			versionAt: agent.updatedAt,
			settings: this.teamsSettingsOf(agent),
		});
		return (
			this.manifestService.fingerprint(current, agent.schema?.personalisation) !==
			identity.teamsAppFingerprint
		);
	}

	private azureBot(identity: BotIdentity | null): TeamsAgentSetupState['azureBot'] {
		if (!identity?.azureBotName || !identity.azureSubscriptionId) return null;
		const resource = botResourceId(identity.azureSubscriptionId, identity.azureBotName);
		return {
			name: identity.azureBotName,
			portalUrl: `https://portal.azure.com/#@${identity.tenantId}/resource${resource}/overview`,
		};
	}

	private fileAccessConsentUrl(scope: AgentScope, identity: BotIdentity | null): string | null {
		const redirectUri = adminConsentRedirectUri(this.urlService.getInstanceBaseUrl(), scope);
		return identity && redirectUri
			? adminConsentUrl(identity.tenantId, identity.clientId, redirectUri)
			: null;
	}

	private messagingEndpointUrl(scope: AgentScope): string {
		// getWebhookBaseUrl returns the URL with a trailing slash.
		return `${this.urlService.getWebhookBaseUrl()}rest/projects/${scope.projectId}/agents/v2/${scope.agentId}/webhooks/teams`;
	}
}
