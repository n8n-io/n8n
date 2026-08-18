import type { CreateSlackAgentAppResponse, SlackAgentAppManifestResponse } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { Cipher } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import { randomBytes } from 'node:crypto';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { CacheService } from '@/services/cache/cache.service';
import { ProjectService } from '@/services/project.service.ee';

import { SlackMethodsService } from './slack-methods.service';
import { childRecord, type SlackAppSetupSession, slackSetupCacheKey } from './slack-setup.types';
import { stringProperty } from '../../integration-helpers';

export interface CreateSlackAppOptions {
	projectId: string;
	agentId: string;
	appConfigurationToken: string;
	user: User;
}

export interface GetSlackAppManifestOptions {
	projectId: string;
	agentId: string;
}

export interface CompleteSlackAppInstallOptions {
	projectId: string;
	agentId: string;
	code: string;
	state: string;
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
		private readonly projectService: ProjectService,
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
		if (!response.ok) {
			throw this.methods.slackError('create the Slack app', response);
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
		await this.methods.storeSession(state, setupSession);

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
		const project = await this.projectService.getProjectWithScope(user, session.projectId, [
			'agent:update',
			'credential:create',
		]);
		if (!project) {
			throw new ForbiddenError('You do not have permission to complete Slack app setup');
		}

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
		if (!tokenResponse.ok) {
			throw this.methods.slackError('finish Slack app installation', tokenResponse);
		}

		const accessToken = stringProperty(tokenResponse, 'access_token');
		if (!accessToken?.startsWith('xoxb-')) {
			throw new BadRequestError('Slack did not return a Bot User OAuth Token');
		}

		const team = childRecord(tokenResponse, 'team');
		const teamName = stringProperty(team, 'name');
		await this.methods.connectBotCredential(agent, user, accessToken, {
			...session,
			...(teamName ? { teamName } : {}),
		});
	}

	private async consumeSession(state: string): Promise<SlackAppSetupSession> {
		const cached = await this.cacheService.take<unknown>(slackSetupCacheKey(state));
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
}
