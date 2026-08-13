/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import type { UserRepository } from '@n8n/db';
import type { Cipher } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { CacheService } from '@/services/cache/cache.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { SlackManualSetupService } from '../platforms/slack/slack-manual-setup.service';
import type { SlackMethodsService } from '../platforms/slack/slack-methods.service';

describe('SlackManualSetupService', () => {
	function makeService() {
		const methods = mock<SlackMethodsService>();
		const userRepository = mock<UserRepository>();
		const cacheService = mock<CacheService>();
		const cipher = mock<Cipher>();
		return {
			service: new SlackManualSetupService(methods, userRepository, cacheService, cipher),
			methods,
			userRepository,
			cacheService,
			cipher,
		};
	}

	it('creates a manual app and stores encrypted callback state', async () => {
		const { service, methods, cacheService, cipher } = makeService();
		const user = { id: 'user-1' };
		const redirectUrl = 'https://n8n.example/callback';
		methods.getAgent.mockResolvedValue({ id: 'agent-1', name: 'Support Agent' } as never);
		methods.callbackUrl.mockReturnValue(redirectUrl);
		methods.buildManifest.mockReturnValue({
			display_information: { name: 'Support Agent' },
		} as never);
		methods.callSlackApi.mockResolvedValue({
			ok: true,
			app_id: 'app-1',
			oauth_authorize_url: 'https://slack.com/oauth/v2/authorize',
			credentials: {
				client_id: 'client-1',
				client_secret: 'secret-1',
				signing_secret: 'signing-1',
			},
		});
		methods.childRecord.mockImplementation((record, key) => record[key] as never);
		methods.stringProperty.mockImplementation((record, key) => {
			const value = record?.[key];
			return typeof value === 'string' ? value : undefined;
		});
		methods.installUrl.mockImplementation((oauthUrl, state, callbackUrl) => {
			const installUrl = new URL(oauthUrl);
			installUrl.searchParams.set('state', state);
			installUrl.searchParams.set('redirect_uri', callbackUrl);
			return installUrl.toString();
		});
		cipher.encryptV2.mockResolvedValue('encrypted-session-without-secrets');

		const result = await service.createApp({
			projectId: 'project-1',
			agentId: 'agent-1',
			appConfigurationToken: 'configuration-token',
			user: user as never,
		});

		const installUrl = new URL(result.installUrl);
		const state = installUrl.searchParams.get('state');
		expect(state).toBeTruthy();
		expect(installUrl.searchParams.get('redirect_uri')).toBe(redirectUrl);
		expect(methods.buildManifest).toHaveBeenCalledWith('Support Agent', 'project-1', 'agent-1', {
			redirectUrl,
		});
		expect(cacheService.set).toHaveBeenCalledWith(
			`agents:slack-app-setup:${state}`,
			'encrypted-session-without-secrets',
			60 * 60 * 1000,
		);
		const session = JSON.parse(cipher.encryptV2.mock.calls[0]?.[0] as string) as {
			projectId: string;
			agentId: string;
			userId: string;
			appId: string;
			clientId: string;
			clientSecret: string;
			signingSecret: string;
			redirectUrl: string;
		};
		expect(session).toEqual({
			projectId: 'project-1',
			agentId: 'agent-1',
			userId: 'user-1',
			appId: 'app-1',
			clientId: 'client-1',
			clientSecret: 'secret-1',
			signingSecret: 'signing-1',
			redirectUrl,
		});
		expect(result.appId).toBe('app-1');
	});

	it('completes OAuth by atomically consuming state and creating the bot credential', async () => {
		const { service, methods, userRepository, cacheService, cipher } = makeService();
		const user = { id: 'user-1' };
		const agent = {
			id: 'agent-1',
			projectId: 'project-1',
			name: 'Support Agent',
		};
		const session = {
			projectId: 'project-1',
			agentId: 'agent-1',
			userId: 'user-1',
			appId: 'app-1',
			clientId: 'client-1',
			clientSecret: 'secret-1',
			signingSecret: 'signing-1',
			redirectUrl: 'https://n8n.example/callback',
		};
		cacheService.take.mockResolvedValue('encrypted-session');
		cipher.decryptV2.mockResolvedValue(JSON.stringify(session));
		userRepository.findOne.mockResolvedValue(user as never);
		methods.getAgent.mockResolvedValue(agent as never);
		methods.callSlackApi.mockResolvedValue({ ok: true, access_token: 'xoxb-token' });
		methods.stringProperty.mockReturnValue('xoxb-token');

		await service.completeInstall({
			projectId: 'project-1',
			agentId: 'agent-1',
			code: 'oauth-code',
			state: 'state-1',
		});

		expect(cacheService.take).toHaveBeenCalledWith('agents:slack-app-setup:state-1');
		expect(cacheService.delete).not.toHaveBeenCalled();
		expect(methods.createAndConnectBotCredential).toHaveBeenCalledWith({
			agent,
			user,
			accessToken: 'xoxb-token',
			signingSecret: 'signing-1',
		});
	});

	it('rejects callback state for a different project or agent', async () => {
		const { service, methods, cacheService, cipher } = makeService();
		cacheService.take.mockResolvedValue('encrypted-session');
		cipher.decryptV2.mockResolvedValue(
			JSON.stringify({
				projectId: 'project-1',
				agentId: 'agent-1',
				userId: 'user-1',
				appId: 'app-1',
				clientId: 'client-1',
				clientSecret: 'secret-1',
				signingSecret: 'signing-1',
				redirectUrl: 'https://n8n.example/callback',
			}),
		);

		await expect(
			service.completeInstall({
				projectId: 'project-2',
				agentId: 'agent-1',
				code: 'oauth-code',
				state: 'state-1',
			}),
		).rejects.toThrow(BadRequestError);

		expect(methods.callSlackApi).not.toHaveBeenCalled();
		expect(methods.createAndConnectBotCredential).not.toHaveBeenCalled();
	});
});
