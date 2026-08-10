import { randomBytes } from 'node:crypto';

import type { CreateSlackAgentAppResponse, SlackAgentAppManifestResponse } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { Cipher } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { CacheService } from '@/services/cache/cache.service';

import { SlackMethodsService } from './slack-methods.service';

const SLACK_APP_SETUP_CACHE_PREFIX = 'agents:slack-app-setup:';
const SLACK_APP_SETUP_TTL_MS = 60 * 60 * 1000;

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
	return isRecord(value) && keys.every((key) => typeof value[key] === 'string');
}

@Service()
export class SlackManualSetupService {
	constructor(
		private readonly methods: SlackMethodsService,
		private readonly userRepository: UserRepository,
		private readonly cacheService: CacheService,
		private readonly cipher: Cipher,
	) {}

	async createApp(options: CreateSlackAppOptions): Promise<CreateSlackAgentAppResponse> {
		const appConfigurationToken = options.appConfigurationToken.trim();
		if (!appConfigurationToken) {
			throw new BadRequestError('Slack app configuration token is required');
		}

		const agent = await this.methods.getAgent(options.agentId, options.projectId);
		const redirectUrl = this.methods.callbackUrl(options.projectId, options.agentId);
		const manifest = this.methods.buildManifest(agent.name, options.projectId, options.agentId, {
			redirectUrl,
		});
		const response = await this.methods.callSlackApi('apps.manifest.create', {
			token: appConfigurationToken,
			manifest: JSON.stringify(manifest),
		});
		if (response.ok !== true) {
			throw this.methods.slackError('create the Slack app', response);
		}

		const credentials = this.methods.childRecord(response, 'credentials');
		const appId = this.methods.stringProperty(response, 'app_id');
		const clientId = this.methods.stringProperty(credentials, 'client_id');
		const clientSecret = this.methods.stringProperty(credentials, 'client_secret');
		const signingSecret = this.methods.stringProperty(credentials, 'signing_secret');
		const oauthAuthorizeUrl = this.methods.stringProperty(response, 'oauth_authorize_url');
		if (!appId || !clientId || !clientSecret || !signingSecret || !oauthAuthorizeUrl) {
			throw new BadRequestError('Slack returned an incomplete app setup response');
		}

		const state = randomBytes(32).toString('hex');
		const setupSession = {
			projectId: options.projectId,
			agentId: options.agentId,
			userId: options.user.id,
			appId,
			clientId,
			clientSecret,
			signingSecret,
			redirectUrl,
		} satisfies SlackAppSetupSession;
		await this.cacheService.set(
			this.cacheKey(state),
			await this.cipher.encryptV2(JSON.stringify(setupSession)),
			SLACK_APP_SETUP_TTL_MS,
		);

		return {
			appId,
			installUrl: this.methods.installUrl(oauthAuthorizeUrl, state, redirectUrl),
		};
	}

	async getManifest(options: GetSlackAppManifestOptions): Promise<SlackAgentAppManifestResponse> {
		const agent = await this.methods.getAgent(options.agentId, options.projectId);
		return {
			manifest: this.methods.buildManifest(agent.name, options.projectId, options.agentId),
		};
	}

	async completeInstall(options: CompleteSlackAppInstallOptions): Promise<void> {
		const session = await this.consumeSession(options.state);
		if (session.projectId !== options.projectId || session.agentId !== options.agentId) {
			throw new BadRequestError('Slack app setup state does not match this agent');
		}

		const user = await this.userRepository.findOne({
			where: { id: session.userId },
			relations: ['role'],
		});
		if (!user) throw new NotFoundError(`User "${session.userId}" not found`);

		const agent = await this.methods.getAgent(session.agentId, session.projectId);
		const tokenResponse = await this.methods.callSlackApi(
			'oauth.v2.access',
			{
				code: options.code,
				redirect_uri: session.redirectUrl,
			},
			{
				authorization: `Basic ${Buffer.from(`${session.clientId}:${session.clientSecret}`).toString(
					'base64',
				)}`,
			},
		);
		if (tokenResponse.ok !== true) {
			throw this.methods.slackError('finish Slack app installation', tokenResponse);
		}

		const accessToken = this.methods.stringProperty(tokenResponse, 'access_token');
		if (!accessToken?.startsWith('xoxb-')) {
			throw new BadRequestError('Slack did not return a Bot User OAuth Token');
		}

		await this.methods.createAndConnectBotCredential({
			agent,
			user,
			accessToken,
			signingSecret: session.signingSecret,
		});
	}

	private async consumeSession(state: string): Promise<SlackAppSetupSession> {
		const cached = await this.cacheService.take<unknown>(this.cacheKey(state));
		if (typeof cached !== 'string') {
			throw new BadRequestError('Slack app setup state has expired or is invalid');
		}

		try {
			const decrypted = await this.cipher.decryptV2(cached);
			const session = jsonParse<unknown>(decrypted, { fallbackValue: null });
			if (hasSessionShape(session)) return session;
		} catch {
			// Invalid encrypted state falls through to the shared callback error.
		}

		throw new BadRequestError('Slack app setup state has expired or is invalid');
	}

	private cacheKey(state: string): string {
		return `${SLACK_APP_SETUP_CACHE_PREFIX}${state}`;
	}
}
