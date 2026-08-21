import type {
	AgentIntegrationConfig,
	SlackAgentAppManifest,
	SlackApiErrorMeta,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { Cipher } from 'n8n-core';

import { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { CacheService } from '@/services/cache/cache.service';
import { UrlService } from '@/services/url.service';

import {
	SLACK_BOT_SCOPES,
	type SlackAppSetupSession,
	slackSetupCacheKey,
} from './slack-setup.types';
import { AgentIntegrationManagementService } from '../../../agent-integration-management.service';
import type { Agent } from '../../../entities/agent.entity';
import { AgentRepository } from '../../../repositories/agent.repository';
import { stringProperty } from '../../integration-helpers';

const SLACK_MANAGED_APP_CACHE_PREFIX = 'agents:slack-managed-app:';
const SLACK_APP_SETUP_TTL_MS = 60 * 60 * 1000;
const DEFAULT_SLACK_APP_NAME = 'n8n Agent';
const SLACK_CREDENTIAL_TYPE = 'slackApi';

const REQUIRED_BOT_EVENTS = [
	'app_mention',
	'app_context_changed',
	'app_home_opened',
	'message.channels',
	'message.groups',
	'message.im',
	'message.mpim',
] as const;

const isLocalhost = (hostname: string): boolean =>
	hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';

class SlackApiError extends BadRequestError {
	override readonly meta: SlackApiErrorMeta;

	constructor(action: string, code: string) {
		super(`Slack could not ${action}: ${code}`);
		this.meta = { integrationType: 'slack', code };
	}
}

@Service()
export class SlackMethodsService {
	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly agentRepository: AgentRepository,
		private readonly integrationManagementService: AgentIntegrationManagementService,
		private readonly urlService: UrlService,
		private readonly outboundHttp: OutboundHttp,
		private readonly cacheService: CacheService,
		private readonly cipher: Cipher,
		private readonly logger: Logger,
	) {}

	async callSlackApi<T extends { [key: string]: unknown }>(
		method: string,
		params: Record<string, string> | FormData,
		headers: Record<string, string> = {},
	): Promise<({ ok: true } & T) | { ok: false; error: string }> {
		try {
			const requestHeaders = { ...headers };
			if (!(params instanceof FormData)) {
				requestHeaders['content-type'] = 'application/x-www-form-urlencoded';
			}
			const response = await this.outboundHttp
				.requests({
					ssrf: 'disabled',
				})
				.request({
					method: 'POST',
					url: `https://slack.com/api/${method}`,
					headers: requestHeaders,
					body: params,
					returnFullResponse: true,
					ignoreHttpStatusErrors: true,
				});
			const data: unknown = response.body;
			return isRecord(data)
				? (data as ({ ok: true } & T) | { ok: false; error: string })
				: { ok: false, error: 'invalid_response' };
		} catch {
			return { ok: false, error: 'slack_request_failed' };
		}
	}

	slackError(action: string, response: Record<string, unknown>): BadRequestError {
		return new SlackApiError(action, stringProperty(response, 'error') ?? 'unknown_error');
	}

	async getAgent(agentId: string, projectId: string): Promise<Agent> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		return agent;
	}

	buildManifest(
		agentName: string,
		projectId: string,
		agentId: string,
		options: { redirectUrl?: string; managed?: boolean } = {},
	): SlackAgentAppManifest {
		const slackAppName = this.sanitiseSlackAppName(agentName);
		const webhookUrl = this.webhookUrl(projectId, agentId);
		return {
			display_information: {
				name: slackAppName,
				...(options.managed
					? { description: `Work with ${slackAppName}, your n8n AI agent, in Slack.` }
					: {}),
			},
			features: {
				agent_view: {
					agent_description: `Chat with ${slackAppName}, an agent powered by n8n.`,
				},
				app_home: {
					home_tab_enabled: false,
					messages_tab_enabled: true,
					messages_tab_read_only_enabled: false,
				},
				bot_user: {
					display_name: slackAppName,
					always_online: true,
				},
			},
			oauth_config: {
				...(options.redirectUrl ? { redirect_urls: [options.redirectUrl] } : {}),
				scopes: { bot: [...SLACK_BOT_SCOPES] },
			},
			settings: {
				event_subscriptions: {
					request_url: webhookUrl,
					bot_events: [...REQUIRED_BOT_EVENTS],
				},
				interactivity: {
					is_enabled: true,
					request_url: webhookUrl,
				},
				org_deploy_enabled: false,
				socket_mode_enabled: false,
				token_rotation_enabled: false,
				...(options.managed
					? {
							managed_app_settings: {
								is_install_from_slack_disabled: true,
								external_app_management_url: this.managedAppUrl(projectId, agentId),
							},
						}
					: {}),
			},
		};
	}

	callbackUrl(projectId: string, agentId: string): string {
		return `${this.urlService.getWebhookBaseUrl()}rest/projects/${projectId}/agents/v2/${agentId}/integrations/slack/oauth/callback`;
	}

	installUrl(oauthAuthorizeUrl: string, state: string, redirectUrl: string): string {
		try {
			const url = new URL(oauthAuthorizeUrl);
			url.searchParams.set('state', state);
			url.searchParams.set('redirect_uri', redirectUrl);
			return url.toString();
		} catch {
			throw new BadRequestError('Slack returned an invalid installation URL');
		}
	}

	async storeSession(state: string, session: SlackAppSetupSession): Promise<void> {
		await this.cacheService.set(
			slackSetupCacheKey(state),
			await this.cipher.encryptV2(JSON.stringify(session)),
			SLACK_APP_SETUP_TTL_MS,
		);
	}

	async connectBotCredential(
		agent: Agent,
		user: User,
		accessToken: string,
		session: SlackAppSetupSession,
	): Promise<string> {
		const credentialData = {
			name: this.credentialName(session.teamName, agent.name),
			type: SLACK_CREDENTIAL_TYPE,
			data: {
				accessToken,
				signatureSecret: session.signingSecret,
				...(session.managerCredentialId
					? {
							managedAppId: session.appId,
							teamId: session.teamId,
							managerCredentialId: session.managerCredentialId,
						}
					: {}),
			},
			projectId: session.projectId,
		};
		const credential = session.managerCredentialId
			? await this.credentialsService.createManagedCredential(credentialData, user)
			: await this.credentialsService.createUnmanagedCredential(credentialData, user);
		const integration = {
			type: 'slack',
			credentialId: credential.id,
			settings: { messagingExperience: 'agent' },
		} satisfies AgentIntegrationConfig;
		try {
			await this.integrationManagementService.connect({
				agent,
				user,
				integration,
			});
		} catch (error) {
			await this.deleteUnreferencedCredential(agent.id, credential.id, user);
			throw error;
		}
		await this.clearManagedAppSession(session);
		return credential.id;
	}

	/**
	 * Undo the credential this setup attempt created, so a failed connect doesn't
	 * leave one behind in the project.
	 *
	 * Keyed on whether the agent durably references it rather than on how the
	 * connect failed: the integration write lands before the steps that settle
	 * publication and release a replaced channel, so a failure there still leaves
	 * the entry persisted, and that entry is what the next publish or reconcile
	 * acts on.
	 *
	 * Only ever called with a credential created moments earlier in the same call
	 * and never handed out on this path, so the agent row is the only place that
	 * can reference it — nothing the user picked or already owned is reachable
	 * from here.
	 */
	private async deleteUnreferencedCredential(
		agentId: string,
		credentialId: string,
		user: User,
	): Promise<void> {
		try {
			const state = await this.agentRepository.findIntegrationState(agentId);
			const referenced = (state?.integrations ?? []).some(
				(entry) => entry.credentialId === credentialId,
			);
			if (referenced) return;

			await this.credentialsService.delete(user, credentialId);
		} catch (error) {
			// Best-effort: the setup failure is what the caller reports.
			this.logger.warn('[SlackMethodsService] Could not clean up the Slack credential', {
				agentId,
				credentialId,
				error,
			});
		}
	}

	private async clearManagedAppSession(session: SlackAppSetupSession): Promise<void> {
		if (session.managerCredentialId && session.teamId) {
			await this.cacheService.delete(
				`${SLACK_MANAGED_APP_CACHE_PREFIX}${session.projectId}:${session.agentId}:${session.managerCredentialId}:${session.teamId}:${session.userId}`,
			);
		}
	}

	private webhookUrl(projectId: string, agentId: string): string {
		return `${this.urlService.getWebhookBaseUrl()}rest/projects/${projectId}/agents/v2/${agentId}/webhooks/slack`;
	}

	private managedAppUrl(projectId: string, agentId: string): string {
		const url = new URL(
			`/projects/${projectId}/agents/${agentId}`,
			`${this.urlService.getInstanceBaseUrl()}/`,
		);
		if (process.env.NODE_ENV === 'development' && isLocalhost(url.hostname)) {
			url.protocol = 'https:';
		}
		return url.toString();
	}

	private credentialName(workspaceName: string | undefined, agentName: string): string {
		return [workspaceName ?? 'Slack', agentName || DEFAULT_SLACK_APP_NAME]
			.filter(Boolean)
			.join(' - ')
			.slice(0, 128);
	}

	private sanitiseSlackAppName(raw: string): string {
		const cleaned = raw
			.replace(/[^a-zA-Z0-9 ._-]/g, '')
			.replace(/\s+/g, ' ')
			.trim()
			.slice(0, 35);
		return cleaned.length > 0 ? cleaned : DEFAULT_SLACK_APP_NAME;
	}
}
