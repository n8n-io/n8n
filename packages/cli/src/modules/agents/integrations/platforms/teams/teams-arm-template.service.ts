import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';
import { createHmac } from 'node:crypto';

import { JwtService } from '@/services/jwt.service';
import { UrlService } from '@/services/url.service';

import { sanitiseAppName } from '../../integration-helpers';

/**
 * The Azure portal fetches the template itself, so the link stays usable only
 * long enough to click it.
 */
const TOKEN_TTL = '15m';

/** Scopes the token to this route, so no other n8n-signed token is accepted. */
const TOKEN_SUBJECT = 'teams-arm-template';

interface TeamsArmTokenClaims {
	projectId: string;
	agentId: string;
	credentialId: string;
}

const BOT_API_VERSION = '2022-09-15';

/** Azure caps the bot's display name; the fallback matches the manifest's. */
const BOT_DISPLAY_NAME_MAX = 42;
const DEFAULT_BOT_DISPLAY_NAME = 'n8n Agent';

export interface TeamsArmTemplateOptions {
	/**
	 * Names the Azure resource, which is why it is the agent's own name and not
	 * the Teams display name: the resource name cannot change once the bot
	 * exists, or a second deployment creates a second bot.
	 */
	agentName: string;
	agentId: string;
	/**
	 * What the bot is called in the Azure portal. Follows the name chosen for
	 * Teams when there is one, so the two listings agree.
	 */
	displayName?: string;
	/** Application (client) ID of the Entra app backing the bot. */
	msaAppId: string;
	/** Directory (tenant) ID, so the bot is registered single-tenant. */
	msaAppTenantId: string;
	messagingEndpoint: string;
}

@Service()
export class TeamsArmTemplateService {
	constructor(
		private readonly jwtService: JwtService,
		private readonly urlService: UrlService,
	) {}

	/**
	 * Every value is a parameter default, because the portal pre-fills the blade
	 * from defaults and offers no way to pass values in the URL.
	 */
	buildTemplate(options: TeamsArmTemplateOptions): Record<string, unknown> {
		// Azure Bot Service refuses a plain-http endpoint, and the deployment fails
		// with a message that names neither n8n nor the setting behind it.
		if (!options.messagingEndpoint.startsWith('https://')) {
			throw new UserError(
				"The Teams bot needs an HTTPS messaging endpoint. Set N8N_WEBHOOK_URL to this instance's public HTTPS URL.",
			);
		}

		return {
			$schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
			contentVersion: '1.0.0.0',
			parameters: {
				botName: {
					type: 'string',
					defaultValue: this.buildBotName(options.agentName, options.agentId),
					metadata: { description: 'Name of the Azure Bot resource. Must be globally unique.' },
				},
				// An empty default looks filled in and fails validation only at the end
				// of the deployment; omitting it makes the portal mark the field
				// required up front.
				msaAppId: {
					type: 'string',
					...(options.msaAppId ? { defaultValue: options.msaAppId } : {}),
					metadata: {
						description:
							'Application (client) ID of your Microsoft Entra app registration. Copy it from the app registration overview page.',
					},
				},
				msaAppTenantId: {
					type: 'string',
					...(options.msaAppTenantId ? { defaultValue: options.msaAppTenantId } : {}),
					metadata: {
						description:
							'Directory (tenant) ID of your Microsoft Entra app registration, on the same overview page.',
					},
				},
				messagingEndpoint: {
					type: 'string',
					defaultValue: options.messagingEndpoint,
					metadata: { description: 'Where Teams delivers messages. Filled in by n8n.' },
				},
				// Bot registrations are not regional.
				location: { type: 'string', defaultValue: 'global' },
				sku: { type: 'string', defaultValue: 'F0', allowedValues: ['F0', 'S1'] },
			},
			resources: [
				{
					type: 'Microsoft.BotService/botServices',
					apiVersion: BOT_API_VERSION,
					name: "[parameters('botName')]",
					location: "[parameters('location')]",
					sku: { name: "[parameters('sku')]" },
					kind: 'azurebot',
					properties: {
						displayName: sanitiseAppName(
							options.displayName ?? options.agentName,
							BOT_DISPLAY_NAME_MAX,
							DEFAULT_BOT_DISPLAY_NAME,
						),
						endpoint: "[parameters('messagingEndpoint')]",
						msaAppId: "[parameters('msaAppId')]",
						msaAppType: 'SingleTenant',
						msaAppTenantId: "[parameters('msaAppTenantId')]",
					},
				},
				{
					// Without this the bot exists but Teams cannot reach it, which is
					// the half of the setup a user is most likely to miss.
					type: 'Microsoft.BotService/botServices/channels',
					apiVersion: BOT_API_VERSION,
					name: "[concat(parameters('botName'), '/MsTeamsChannel')]",
					location: "[parameters('location')]",
					dependsOn: ["[resourceId('Microsoft.BotService/botServices', parameters('botName'))]"],
					properties: {
						channelName: 'MsTeamsChannel',
						properties: { isEnabled: true },
					},
				},
			],
			outputs: {
				botName: { type: 'string', value: "[parameters('botName')]" },
			},
		};
	}

	buildDeployUrl(projectId: string, agentId: string, credentialId: string): string {
		return `https://portal.azure.com/#create/Microsoft.Template/uri/${encodeURIComponent(
			this.buildTemplateUrl(projectId, agentId, credentialId),
		)}`;
	}

	/**
	 * The credential is named in the URL because the deployment happens before
	 * the channel is connected, so the agent holds no credential to read it from.
	 */
	buildTemplateUrl(projectId: string, agentId: string, credentialId: string): string {
		const token = this.signToken(projectId, agentId, credentialId);
		const query = new URLSearchParams({ token, credentialId });
		return `${this.urlService.getWebhookBaseUrl()}rest/projects/${projectId}/agents/v2/${agentId}/integrations/teams/arm-template?${query.toString()}`;
	}

	/**
	 * The portal fetches the template with no n8n session, so the token is the
	 * whole authorisation. Every value the template is built from is a claim, so
	 * a token cannot be reused for another agent or another credential.
	 */
	verifyToken(projectId: string, agentId: string, credentialId: string, token: string): boolean {
		try {
			const claims = this.jwtService.verify<TeamsArmTokenClaims>(token, { subject: TOKEN_SUBJECT });
			return (
				claims.projectId === projectId &&
				claims.agentId === agentId &&
				claims.credentialId === credentialId
			);
		} catch {
			return false;
		}
	}

	private signToken(projectId: string, agentId: string, credentialId: string): string {
		return this.jwtService.sign(
			{ projectId, agentId, credentialId },
			{ subject: TOKEN_SUBJECT, expiresIn: TOKEN_TTL },
		);
	}

	/**
	 * A digest is appended because an Azure Bot resource name is globally unique,
	 * so the bare agent name would collide across tenants.
	 */
	private buildBotName(agentName: string, agentId: string): string {
		const suffix = createHmac('sha256', 'teams-bot-name').update(agentId).digest('hex').slice(0, 8);
		const slug = agentName
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			// Azure allows 64 characters; leave room for the digest and separator.
			.slice(0, 40)
			.replace(/-+$/, '');
		// An Azure Bot name must start with a letter.
		return /^[a-z]/.test(slug) ? `${slug}-${suffix}` : `n8n-agent-${suffix}`;
	}
}
