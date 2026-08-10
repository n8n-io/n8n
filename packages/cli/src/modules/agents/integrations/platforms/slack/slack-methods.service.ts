import type { AgentIntegrationConfig, SlackAgentAppManifest } from '@n8n/api-types';
import { OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';

import { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { UrlService } from '@/services/url.service';

import { AgentIntegrationManagementService } from '../../../agent-integration-management.service';
import type { Agent } from '../../../entities/agent.entity';
import { AgentRepository } from '../../../repositories/agent.repository';

const DEFAULT_SLACK_APP_NAME = 'n8n Agent';
const SLACK_CREDENTIAL_TYPE = 'slackApi';

const REQUIRED_BOT_EVENTS = [
	'app_mention',
	'assistant_thread_started',
	'assistant_thread_context_changed',
	'message.channels',
	'message.groups',
	'message.im',
	'message.mpim',
] as const;

const REQUIRED_BOT_SCOPES = [
	'app_mentions:read',
	'assistant:write',
	'channels:history',
	'channels:join',
	'channels:manage',
	'channels:read',
	'chat:write',
	'chat:write.customize',
	'files:read',
	'files:write',
	'groups:history',
	'groups:read',
	'im:history',
	'im:read',
	'im:write',
	'mpim:history',
	'mpim:read',
	'mpim:write',
	'reactions:write',
	'search:read.public',
	'users:read',
	'users:read.email',
] as const;

@Service()
export class SlackMethodsService {
	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly agentRepository: AgentRepository,
		private readonly integrationManagementService: AgentIntegrationManagementService,
		private readonly urlService: UrlService,
		private readonly outboundHttp: OutboundHttp,
	) {}

	async callSlackApi(
		method: string,
		params: Record<string, string>,
		headers: Record<string, string> = {},
	): Promise<Record<string, unknown>> {
		try {
			const response = await this.outboundHttp.requests({ ssrf: 'disabled' }).request({
				method: 'POST',
				url: `https://slack.com/api/${method}`,
				headers: {
					...headers,
					'content-type': 'application/x-www-form-urlencoded',
				},
				body: params,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
			});
			const data: unknown = response.body;
			return isRecord(data) ? data : { ok: false, error: 'invalid_response' };
		} catch {
			return { ok: false, error: 'slack_request_failed' };
		}
	}

	slackError(action: string, response: Record<string, unknown>): BadRequestError {
		const error = this.stringProperty(response, 'error') ?? 'unknown_error';
		return new BadRequestError(`Slack could not ${action}: ${error}`);
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
		options: { redirectUrl?: string } = {},
	): SlackAgentAppManifest {
		const slackAppName = this.sanitiseSlackAppName(agentName);
		const webhookUrl = this.webhookUrl(projectId, agentId);
		return {
			display_information: { name: slackAppName },
			features: {
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
				scopes: { bot: [...REQUIRED_BOT_SCOPES] },
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

	async createAndConnectBotCredential(options: {
		agent: Agent;
		user: User;
		accessToken: string;
		signingSecret: string;
	}): Promise<string> {
		const credential = await this.credentialsService.createUnmanagedCredential(
			{
				name: this.credentialName(options.agent.name),
				type: SLACK_CREDENTIAL_TYPE,
				data: {
					accessToken: options.accessToken,
					signatureSecret: options.signingSecret,
				},
				projectId: options.agent.projectId,
			},
			options.user,
		);
		const integration = {
			type: 'slack',
			credentialId: credential.id,
		} satisfies AgentIntegrationConfig;
		await this.integrationManagementService.connect({
			agent: options.agent,
			user: options.user,
			integration,
		});
		return credential.id;
	}

	childRecord(record: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
		const child = record[key];
		return isRecord(child) ? child : undefined;
	}

	stringProperty(record: Record<string, unknown> | undefined, key: string): string | undefined {
		const value = record?.[key];
		return typeof value === 'string' ? value : undefined;
	}

	private webhookUrl(projectId: string, agentId: string): string {
		return `${this.urlService.getWebhookBaseUrl()}rest/projects/${projectId}/agents/v2/${agentId}/webhooks/slack`;
	}

	private credentialName(agentName: string): string {
		return `Slack - ${agentName || DEFAULT_SLACK_APP_NAME}`.slice(0, 128);
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
