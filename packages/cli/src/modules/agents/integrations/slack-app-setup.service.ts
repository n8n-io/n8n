import { randomBytes } from 'node:crypto';

import type {
	AgentCredentialIntegrationConfig,
	CreateSlackAgentAppResponse,
	SlackAgentAppManifest,
	SlackAgentAppManifestResponse,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { CacheService } from '@/services/cache/cache.service';
import { UrlService } from '@/services/url.service';

import { AgentsService } from '../agents.service';
import type { Agent } from '../entities/agent.entity';
import { AgentRepository } from '../repositories/agent.repository';
import { ChatIntegrationService } from './chat-integration.service';

const SLACK_APP_SETUP_CACHE_PREFIX = 'agents:slack-app-setup:';
const SLACK_APP_SETUP_TTL_MS = 60 * 60 * 1000;
const DEFAULT_SLACK_APP_NAME = 'n8n Agent';
const SLACK_CREDENTIAL_TYPE = 'slackApi';

const REQUIRED_BOT_EVENTS = [
	'app_mention',
	'assistant_thread_context_changed',
	'message.im',
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
	'groups:read',
	'im:history',
	'im:read',
	'im:write',
	'mpim:read',
	'mpim:write',
	'search:read.public',
	'users:read',
	'users:read.email',
] as const;

interface CreateSlackAppOptions {
	projectId: string;
	agentId: string;
	appConfigurationToken: string;
	user: User;
}

interface GetSlackAppManifestOptions {
	projectId: string;
	agentId: string;
}

interface CompleteSlackAppInstallOptions {
	projectId: string;
	agentId: string;
	code: string;
	state: string;
}

interface SlackAppSetupSession {
	projectId: string;
	agentId: string;
	userId: string;
	appId: string;
	clientId: string;
	clientSecret: string;
	signingSecret: string;
	redirectUrl: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function childRecord(
	record: Record<string, unknown>,
	key: string,
): Record<string, unknown> | undefined {
	const child = record[key];
	return isRecord(child) ? child : undefined;
}

function stringProperty(
	record: Record<string, unknown> | undefined,
	key: string,
): string | undefined {
	const value = record?.[key];
	return typeof value === 'string' ? value : undefined;
}

function hasSessionShape(value: unknown): value is SlackAppSetupSession {
	const keys: Array<keyof SlackAppSetupSession> = [
		'projectId',
		'agentId',
		'userId',
		'appId',
		'clientId',
		'clientSecret',
		'signingSecret',
		'redirectUrl',
	];
	return isRecord(value) && keys.every((k) => typeof value[k] === 'string');
}

@Service()
export class SlackAppSetupService {
	constructor(
		private readonly cacheService: CacheService,
		private readonly credentialsService: CredentialsService,
		private readonly userRepository: UserRepository,
		private readonly agentRepository: AgentRepository,
		private readonly agentsService: AgentsService,
		private readonly chatIntegrationService: ChatIntegrationService,
		private readonly urlService: UrlService,
	) {}

	async createApp(options: CreateSlackAppOptions): Promise<CreateSlackAgentAppResponse> {
		const agent = await this.getAgent(options.agentId, options.projectId, true);
		const appConfigurationToken = options.appConfigurationToken.trim();
		if (!appConfigurationToken) {
			throw new BadRequestError('Slack app configuration token is required');
		}

		const redirectUrl = this.callbackUrl(options.projectId, options.agentId);
		const manifest = this.buildManifest(agent.name, options.projectId, options.agentId, {
			redirectUrl,
		});
		const response = await this.callSlackApi('apps.manifest.create', {
			token: appConfigurationToken,
			manifest: JSON.stringify(manifest),
		});

		if (response.ok !== true) {
			throw this.slackError('create the Slack app', response);
		}

		const credentials = childRecord(response, 'credentials');
		const appId = stringProperty(response, 'app_id');
		const clientId = stringProperty(credentials, 'client_id');
		const clientSecret = stringProperty(credentials, 'client_secret');
		const signingSecret = stringProperty(credentials, 'signing_secret');
		const oauthAuthorizeUrl = stringProperty(response, 'oauth_authorize_url');
		if (!appId || !clientId || !clientSecret || !signingSecret || !oauthAuthorizeUrl) {
			throw new BadRequestError('Slack returned an incomplete app setup response');
		}

		const state = randomBytes(32).toString('hex');
		await this.cacheService.set(
			this.cacheKey(state),
			{
				projectId: options.projectId,
				agentId: options.agentId,
				userId: options.user.id,
				appId,
				clientId,
				clientSecret,
				signingSecret,
				redirectUrl,
			} satisfies SlackAppSetupSession,
			SLACK_APP_SETUP_TTL_MS,
		);

		return {
			appId,
			installUrl: this.installUrl(oauthAuthorizeUrl, state, redirectUrl),
		};
	}

	async getManualManifest(
		options: GetSlackAppManifestOptions,
	): Promise<SlackAgentAppManifestResponse> {
		const agent = await this.getAgent(options.agentId, options.projectId);
		return {
			manifest: this.buildManifest(agent.name, options.projectId, options.agentId),
		};
	}

	async completeInstall(options: CompleteSlackAppInstallOptions): Promise<void> {
		const session = await this.consumeSession(options.state);
		if (session.projectId !== options.projectId || session.agentId !== options.agentId) {
			throw new BadRequestError('Slack app setup state does not match this agent');
		}

		const agent = await this.getAgent(session.agentId, session.projectId, true);
		const user = await this.userRepository.findOne({
			where: { id: session.userId },
			relations: ['role'],
		});
		if (!user) {
			throw new NotFoundError(`User "${session.userId}" not found`);
		}

		const tokenResponse = await this.callSlackApi(
			'oauth.v2.access',
			{
				code: options.code,
				redirect_uri: session.redirectUrl,
			},
			{
				Authorization: `Basic ${Buffer.from(`${session.clientId}:${session.clientSecret}`).toString(
					'base64',
				)}`,
			},
		);
		if (tokenResponse.ok !== true) {
			throw this.slackError('finish Slack app installation', tokenResponse);
		}

		const accessToken = stringProperty(tokenResponse, 'access_token');
		if (!accessToken?.startsWith('xoxb-')) {
			throw new BadRequestError('Slack did not return a Bot User OAuth Token');
		}

		const credential = await this.credentialsService.createUnmanagedCredential(
			{
				name: this.credentialName(agent.name),
				type: SLACK_CREDENTIAL_TYPE,
				data: {
					accessToken,
					signatureSecret: session.signingSecret,
				},
				projectId: session.projectId,
			},
			user,
		);

		const integration = {
			type: 'slack',
			credentialId: credential.id,
		} satisfies AgentCredentialIntegrationConfig;

		await this.chatIntegrationService.connect(
			session.agentId,
			integration,
			session.userId,
			session.projectId,
		);
		await this.agentsService.saveCredentialIntegration(agent, integration);
	}

	private async getAgent(
		agentId: string,
		projectId: string,
		requirePublished = false,
	): Promise<Agent> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		if (requirePublished && !agent.publishedVersion) {
			throw new ConflictError(
				`Agent "${agentId}" must be published before connecting an integration`,
			);
		}
		return agent;
	}

	private buildManifest(
		agentName: string,
		projectId: string,
		agentId: string,
		options: { redirectUrl?: string } = {},
	): SlackAgentAppManifest {
		const slackAppName = this.sanitiseSlackAppName(agentName);
		const webhookUrl = this.webhookUrl(projectId, agentId);
		return {
			display_information: {
				name: slackAppName,
			},
			features: {
				app_home: {
					home_tab_enabled: true,
					messages_tab_enabled: false,
					messages_tab_read_only_enabled: false,
				},
				bot_user: {
					display_name: slackAppName,
					always_online: true,
				},
			},
			oauth_config: {
				...(options.redirectUrl ? { redirect_urls: [options.redirectUrl] } : {}),
				scopes: {
					bot: [...REQUIRED_BOT_SCOPES],
				},
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

	private webhookUrl(projectId: string, agentId: string): string {
		return `${this.urlService.getWebhookBaseUrl()}rest/projects/${projectId}/agents/v2/${agentId}/webhooks/slack`;
	}

	private callbackUrl(projectId: string, agentId: string): string {
		return `${this.urlService.getWebhookBaseUrl()}rest/projects/${projectId}/agents/v2/${agentId}/integrations/slack/oauth/callback`;
	}

	private installUrl(oauthAuthorizeUrl: string, state: string, redirectUrl: string): string {
		try {
			const url = new URL(oauthAuthorizeUrl);
			url.searchParams.set('state', state);
			url.searchParams.set('redirect_uri', redirectUrl);
			return url.toString();
		} catch {
			throw new BadRequestError('Slack returned an invalid installation URL');
		}
	}

	private async consumeSession(state: string): Promise<SlackAppSetupSession> {
		const key = this.cacheKey(state);
		const cached = await this.cacheService.get<unknown>(key);
		await this.cacheService.delete(key);
		if (!hasSessionShape(cached)) {
			throw new BadRequestError('Slack app setup state has expired or is invalid');
		}
		return cached;
	}

	private cacheKey(state: string): string {
		return `${SLACK_APP_SETUP_CACHE_PREFIX}${state}`;
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

	private async callSlackApi(
		method: string,
		params: Record<string, string>,
		headers: Record<string, string> = {},
	): Promise<Record<string, unknown>> {
		try {
			const response = await fetch(`https://slack.com/api/${method}`, {
				method: 'POST',
				headers: {
					...headers,
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams(params).toString(),
			});
			const data: unknown = await response.json();
			if (!isRecord(data)) {
				return { ok: false, error: 'invalid_response' };
			}
			return data;
		} catch {
			return { ok: false, error: 'slack_request_failed' };
		}
	}

	private slackError(action: string, response: Record<string, unknown>): BadRequestError {
		const error = stringProperty(response, 'error') ?? 'unknown_error';
		return new BadRequestError(`Slack could not ${action}: ${error}`);
	}
}
