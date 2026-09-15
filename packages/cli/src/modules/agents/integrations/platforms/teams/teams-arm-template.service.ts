import { Service } from '@n8n/di';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { InstanceSettings } from 'n8n-core';

import { UrlService } from '@/services/url.service';

/**
 * The Azure portal fetches the template itself, so the link stays usable only
 * long enough to click it.
 */
const TOKEN_TTL_MS = 15 * 60 * 1000;

const BOT_API_VERSION = '2022-09-15';

export interface TeamsArmTemplateOptions {
	agentName: string;
	agentId: string;
	/**
	 * Application (client) ID of the Entra app backing the bot. Empty before the
	 * bot exists: the user is creating that app in the portal, and the deployment
	 * blade is where they paste its ID.
	 */
	msaAppId: string;
	/** Directory (tenant) ID, so the bot is registered single-tenant. */
	msaAppTenantId: string;
	messagingEndpoint: string;
}

@Service()
export class TeamsArmTemplateService {
	constructor(
		private readonly instanceSettings: InstanceSettings,
		private readonly urlService: UrlService,
	) {}

	/**
	 * Every value the user would otherwise copy is a parameter default, because
	 * the portal pre-fills the blade from defaults and offers no way to pass
	 * values in the URL.
	 *
	 * The two Entra IDs are the exception, and only on a first run: the user is
	 * creating that app registration in the portal right now, so nothing here
	 * knows them yet and they arrive blank. Everything that is easy to get wrong
	 * — the endpoint, the Teams channel, the single-tenant type — is already
	 * filled in, and the next step reads those IDs back off the first activity
	 * so they are never typed into n8n.
	 */
	buildTemplate(options: TeamsArmTemplateOptions): Record<string, unknown> {
		return {
			$schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
			contentVersion: '1.0.0.0',
			parameters: {
				botName: { type: 'string', defaultValue: this.buildBotName(options.agentId) },
				msaAppId: { type: 'string', defaultValue: options.msaAppId },
				msaAppTenantId: { type: 'string', defaultValue: options.msaAppTenantId },
				messagingEndpoint: { type: 'string', defaultValue: options.messagingEndpoint },
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
						displayName: this.sanitiseDisplayName(options.agentName),
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

	buildDeployUrl(projectId: string, agentId: string): string {
		return `https://portal.azure.com/#create/Microsoft.Template/uri/${encodeURIComponent(
			this.buildTemplateUrl(projectId, agentId),
		)}`;
	}

	buildTemplateUrl(projectId: string, agentId: string): string {
		const token = this.signToken(projectId, agentId, Date.now() + TOKEN_TTL_MS);
		return `${this.urlService.getWebhookBaseUrl()}rest/projects/${projectId}/agents/v2/${agentId}/integrations/teams/arm-template?token=${token}`;
	}

	/**
	 * The portal fetches the template with no n8n session, so the token is the
	 * only thing standing between this endpoint and the open internet.
	 */
	verifyToken(projectId: string, agentId: string, token: string): boolean {
		const [expiry, signature] = token.split('.');
		const expiresAt = Number(expiry);
		if (!Number.isSafeInteger(expiresAt) || expiresAt < Date.now()) return false;
		if (!signature) return false;

		const expected = Buffer.from(this.sign(projectId, agentId, expiresAt), 'hex');
		const received = Buffer.from(signature, 'hex');
		return expected.length === received.length && timingSafeEqual(expected, received);
	}

	private signToken(projectId: string, agentId: string, expiresAt: number): string {
		return `${expiresAt}.${this.sign(projectId, agentId, expiresAt)}`;
	}

	private sign(projectId: string, agentId: string, expiresAt: number): string {
		return createHmac('sha256', this.instanceSettings.encryptionKey)
			.update(`teams-arm:${projectId}:${agentId}:${expiresAt}`)
			.digest('hex');
	}

	/**
	 * An Azure Bot resource name is globally unique, so the obvious name would
	 * collide for the second person who tries it. The agent id makes it ours.
	 */
	private buildBotName(agentId: string): string {
		const suffix = createHmac('sha256', 'teams-bot-name')
			.update(agentId)
			.digest('hex')
			.slice(0, 12);
		return `n8n-agent-${suffix}`;
	}

	private sanitiseDisplayName(raw: string): string {
		const cleaned = raw
			.replace(/[^a-zA-Z0-9 ._-]/g, '')
			.replace(/\s+/g, ' ')
			.trim()
			.slice(0, 42);
		return cleaned.length > 0 ? cleaned : 'n8n Agent';
	}
}
