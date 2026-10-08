import type { TeamsAzureSubscription, TeamsProvisionedBotSummary } from '@n8n/api-types';
import type { CredentialsEntity, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { OperationalError, UserError } from 'n8n-workflow';
import { withTeamsFailure } from './teams-setup-telemetry.service';

import { CredentialsFinderService } from '@n8n/backend-services';
import { BadRequestError } from '@n8n/errors';

import { armNextLinkPath, type ArmResponse, TeamsArmService } from './teams-arm.service';
import { graphErrorCode } from './teams-graph.service';
import { TeamsArmTemplateService } from './teams-arm-template.service';
import { TEAMS_MANAGER_CREDENTIAL_TYPE } from './teams-managed-setup.service';
import { AZURE_RESOURCE, TeamsManagerTokenService } from './teams-manager-token.service';
import { stringProperty } from '../../integration-helpers';

const SUBSCRIPTIONS_API = '2022-12-01';
const RESOURCE_GROUP_API = '2021-04-01';
const PROVIDER_API = '2021-04-01';
const BOT_API = '2022-09-15';
/** Every provisioned bot lands here. Not configurable: it is Azure jargon in a
 * flow that has none, and a wrong value fails late and confusingly. */
const RESOURCE_GROUP = 'n8n-agents';
/** Bot Service is a global resource; its resource group still needs a region. */
const RESOURCE_GROUP_LOCATION = 'westeurope';

/** `properties.msaAppId` of an existing bot resource. */
function botAppIdOf(body: unknown): string | undefined {
	if (!isRecord(body)) return undefined;
	const properties = body.properties;
	return isRecord(properties) ? stringProperty(properties, 'msaAppId') : undefined;
}

export interface ListSubscriptionsOptions {
	user: User;
	managerCredentialId: string;
}

export interface ProvisionBotOptions extends ListSubscriptionsOptions {
	projectId: string;
	agentId: string;
	agentName: string;
	subscriptionId: string;
	/** Entra application (client) ID the bot signs its messages with. */
	msaAppId: string;
	msaAppTenantId: string;
	messagingEndpoint: string;
}

/**
 * Creates the Bot Service resource that ties the Entra app to this instance's
 * messaging endpoint. Without it Teams accepts the app and shows the bot, but
 * every message goes nowhere.
 *
 * Graph cannot do this: the bot is an Azure resource, so it needs an Azure
 * subscription and rights on it. When either is missing the caller falls back
 * to a rung that does not, which is why the failures here are reported rather
 * than thrown wherever the user could reasonably hit them.
 */
@Service()
export class TeamsBotProvisioningService {
	constructor(
		private readonly arm: TeamsArmService,
		private readonly tokens: TeamsManagerTokenService,
		private readonly armTemplateService: TeamsArmTemplateService,
		private readonly credentialsFinderService: CredentialsFinderService,
	) {}

	/**
	 * Subscriptions the signed-in account can use. An empty list is the normal
	 * answer for a Microsoft 365 tenant, which comes with no Azure subscription
	 * at all — not an error.
	 */
	async listSubscriptions(options: ListSubscriptionsOptions): Promise<TeamsAzureSubscription[]> {
		const token = await this.azureToken(options);
		const response = await this.arm.request(
			token,
			'GET',
			`/subscriptions?api-version=${SUBSCRIPTIONS_API}`,
		);
		// An empty list sends the user down the manual ladder with "your account
		// has no Azure subscription". A refusal means we do not know, and saying
		// so lets the step offer to ask again instead.
		if (!response.ok) {
			throw this.subscriptionsError(response.statusCode, graphErrorCode(response.body));
		}

		// ARM pages this. A tenant past the page size would otherwise be offered a
		// truncated list, with the subscription they wanted missing from it.
		const subscriptions: TeamsAzureSubscription[] = [];
		let page: ArmResponse | undefined = response;
		while (page) {
			const value = isRecord(page.body) ? page.body.value : undefined;
			if (Array.isArray(value)) {
				for (const entry of value) {
					const id = stringProperty(entry, 'subscriptionId');
					// A disabled or expired subscription cannot take a new resource.
					if (!id || stringProperty(entry, 'state') !== 'Enabled') continue;
					subscriptions.push({ id, name: stringProperty(entry, 'displayName') ?? id });
				}
			}

			const next: string | undefined = isRecord(page.body)
				? stringProperty(page.body, 'nextLink')
				: undefined;
			const nextPath: string | undefined = next ? armNextLinkPath(next) : undefined;
			page = nextPath ? await this.arm.request(token, 'GET', nextPath) : undefined;
			if (page && !page.ok) break;
		}
		return subscriptions;
	}

	async provisionBot(options: ProvisionBotOptions): Promise<TeamsProvisionedBotSummary> {
		if (!options.messagingEndpoint.startsWith('https://')) {
			throw withTeamsFailure(
				new UserError(
					"The Teams bot needs an HTTPS messaging endpoint. Set N8N_WEBHOOK_URL to this instance's public HTTPS URL.",
				),
				'endpoint_not_https',
			);
		}

		const token = await this.azureToken(options);

		await this.registerProvider(token, options.subscriptionId);
		await this.ensureResourceGroup(token, options.subscriptionId);

		// An Azure resource cannot be renamed, and the name we would pick is derived
		// from the agent's name — so renaming an agent would otherwise ask Azure for
		// a second bot on the same app registration, which it refuses. Finding the
		// bot by the app it signs for keeps a readable name and survives a rename.
		const botName =
			(await this.findBotByAppId(token, options.subscriptionId, options.msaAppId)) ??
			this.armTemplateService.botNameFor(options.agentName, options.agentId);

		const scope = `/subscriptions/${options.subscriptionId}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.BotService/botServices/${botName}`;

		// The bot name is derived from the agent, so a re-run lands on the bot made
		// last time. Azure fixes a bot's app id at creation, so one left over from
		// an earlier app registration can never be made to work for this one.
		const existing = await this.arm.request(token, 'GET', `${scope}?api-version=${BOT_API}`);
		if (existing.ok) {
			const boundAppId = botAppIdOf(existing.body);
			if (boundAppId && boundAppId.toLowerCase() !== options.msaAppId.toLowerCase()) {
				throw new UserError(
					`An Azure bot named ${botName} already exists and is tied to a different app registration. Azure fixes that at creation, so delete the bot or rename the agent, then try again.`,
				);
			}
		}

		const bot = await this.arm.request(token, 'PUT', `${scope}?api-version=${BOT_API}`, {
			location: 'global',
			kind: 'azurebot',
			sku: { name: 'F0' },
			properties: {
				displayName: botName,
				endpoint: options.messagingEndpoint,
				msaAppId: options.msaAppId,
				// Microsoft stopped accepting new multi-tenant bots, so the bot is
				// bound to the customer's own tenant.
				msaAppType: 'SingleTenant',
				msaAppTenantId: options.msaAppTenantId,
			},
		});

		if (!bot.ok) throw this.botError(bot.statusCode, graphErrorCode(bot.body));

		const channel = await this.arm.request(
			token,
			'PUT',
			`${scope}/channels/MsTeamsChannel?api-version=${BOT_API}`,
			{
				location: 'global',
				properties: { channelName: 'MsTeamsChannel', properties: { isEnabled: true } },
			},
		);
		if (!channel.ok) {
			throw withTeamsFailure(
				new OperationalError(
					'The bot was created but its Microsoft Teams channel could not be turned on.',
				),
				'teams_channel_failed',
			);
		}

		return { botName, resourceGroup: RESOURCE_GROUP, subscriptionId: options.subscriptionId };
	}

	/**
	 * The name of the bot in this resource group that already signs for `msaAppId`,
	 * if there is one. Azure binds an app id to one bot, so at most one can match.
	 */
	private async findBotByAppId(
		token: string,
		subscriptionId: string,
		msaAppId: string,
	): Promise<string | undefined> {
		const response = await this.arm.request(
			token,
			'GET',
			`/subscriptions/${subscriptionId}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.BotService/botServices?api-version=${BOT_API}`,
		);
		// A resource group with no bots yet is the ordinary first run.
		if (!response.ok) return undefined;

		const value = isRecord(response.body) ? response.body.value : undefined;
		if (!Array.isArray(value)) return undefined;

		const match = value.find((bot) => botAppIdOf(bot)?.toLowerCase() === msaAppId.toLowerCase());
		return match ? stringProperty(match, 'name') : undefined;
	}

	/**
	 * A subscription that has never used Bot Service rejects the bot until the
	 * resource provider is registered. Registration is asynchronous and the
	 * documentation says not to block on it, so a refusal here is left to
	 * surface on the create call instead.
	 */
	private async registerProvider(token: string, subscriptionId: string): Promise<void> {
		await this.arm.request(
			token,
			'POST',
			`/subscriptions/${subscriptionId}/providers/Microsoft.BotService/register?api-version=${PROVIDER_API}`,
		);
	}

	/**
	 * A group this tenant already has is used where it stands. Creating it with
	 * our own location would ask ARM to move an existing one, which it refuses
	 * -- and that refusal reads as "this account cannot create resources".
	 */
	private async ensureResourceGroup(token: string, subscriptionId: string): Promise<void> {
		const path = `/subscriptions/${subscriptionId}/resourcegroups/${RESOURCE_GROUP}?api-version=${RESOURCE_GROUP_API}`;
		const existing = await this.arm.request(token, 'GET', path);
		if (existing.ok) return;

		const response = await this.arm.request(token, 'PUT', path, {
			location: RESOURCE_GROUP_LOCATION,
		});
		if (!response.ok) {
			throw this.botError(response.statusCode, graphErrorCode(response.body));
		}
	}

	/**
	 * Nothing is created yet at this point, so the "cannot create resources"
	 * wording of `botError` would send the user after a role they may not need.
	 */
	private subscriptionsError(statusCode: number, code: string | undefined): Error {
		if (statusCode === 403 || code === 'AuthorizationFailed') {
			return withTeamsFailure(
				new UserError('This account cannot read the Azure subscriptions in this tenant.'),
				'no_contributor_role',
			);
		}
		return new OperationalError('Azure did not answer with the subscriptions. Try again.');
	}

	private botError(statusCode: number, code: string | undefined): Error {
		if (statusCode === 403 || code === 'AuthorizationFailed') {
			return withTeamsFailure(
				new UserError(
					'This account cannot create resources in that Azure subscription. It needs the Contributor role.',
				),
				'no_contributor_role',
			);
		}
		if (code === 'MissingSubscriptionRegistration') {
			return withTeamsFailure(
				new OperationalError(
					'Azure is still enabling Bot Service on this subscription. Try again in a minute.',
				),
				'provider_registering',
			);
		}
		return new OperationalError('Azure refused to create the bot. Try again.');
	}

	private async azureToken(options: ListSubscriptionsOptions): Promise<string> {
		const credential = await this.managerCredential(options);
		return await this.tokens.acquire(credential, AZURE_RESOURCE);
	}

	private async managerCredential(options: ListSubscriptionsOptions): Promise<CredentialsEntity> {
		const credential = await this.credentialsFinderService.findCredentialForUser(
			options.managerCredentialId,
			options.user,
			['credential:read'],
		);
		if (!credential || credential.type !== TEAMS_MANAGER_CREDENTIAL_TYPE) {
			throw withTeamsFailure(
				new BadRequestError('Sign in with Microsoft before creating the bot.'),
				'not_signed_in',
			);
		}
		return credential;
	}
}
