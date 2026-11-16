import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { OperationContext } from '@n8n/db';
import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { UserDeactivationHooks } from '@/services/user-deactivation-hooks.service';

import { OAuthGrantRepository } from '../database/repositories/oauth-grant.repository';
import { OAuth2FlowService } from '../oauth-flow.service';
import { OAuthServerLocalAuthorizationServer } from '../oauth-local-authorization-server';
import { OAuthServerModule } from '../oauth-server.module';
import { OAuthSigningJwksProvider } from '../oauth-signing-jwks.provider';
import { OAuthSigningKeyService } from '../oauth-signing-key.service';
import { OAuthTokenService } from '../oauth-token.service';
import { JwksRegistry, OAuth2FlowProxy, OAuthTokenVerifierProxy } from '@n8n/backend-services';

vi.mock('../oauth.controller', () => ({}));
vi.mock('../oauth-consent.controller', () => ({}));
vi.mock('../oauth-clients.controller', () => ({}));
vi.mock('../protected-resource-resolvers', () => ({ registerProtectedResourceResolvers: vi.fn() }));

const grants = mockInstance(OAuthGrantRepository);
const logger = mockInstance(Logger);
const verifier = mockInstance(OAuthTokenVerifierProxy);
mockInstance(OAuthSigningKeyService);
mockInstance(OAuthSigningJwksProvider);
mockInstance(JwksRegistry);
mockInstance(OAuthServerLocalAuthorizationServer);
mockInstance(OAuthTokenService);
mockInstance(OAuth2FlowProxy);
mockInstance(OAuth2FlowService);

describe('OAuthServerModule', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		grants.deleteGrantsForDisabledUsers.mockResolvedValue();
		Container.set(UserDeactivationHooks, new UserDeactivationHooks());
	});

	it.each(['main', 'webhook', 'worker'] as const)(
		'runs startup cleanup only on main instances (%s)',
		async (instanceType) => {
			mockInstance(InstanceSettings, { instanceType });
			await new OAuthServerModule().init();
			expect(grants.deleteGrantsForDisabledUsers).toHaveBeenCalledTimes(
				instanceType === 'main' ? 1 : 0,
			);
			const ctx: OperationContext = {};
			await Container.get(UserDeactivationHooks).run('user-id', ctx);
			expect(grants.deleteUserGrants).toHaveBeenCalledWith('user-id', ctx);
		},
	);

	it('logs cleanup failure and continues initializing the module', async () => {
		mockInstance(InstanceSettings, { instanceType: 'main' });
		const error = new Error('Cleanup failed');
		grants.deleteGrantsForDisabledUsers.mockRejectedValueOnce(error);
		await expect(new OAuthServerModule().init()).resolves.toBeUndefined();
		expect(logger.error).toHaveBeenCalledWith(
			'Failed to clean up OAuth grants for disabled users',
			{ error },
		);
		expect(verifier.registerProvider).toHaveBeenCalledOnce();
	});

	it('initializes on main, webhook and worker instances so the token verifier is available wherever credentials resolve (incl. queue-mode workers)', () => {
		const entry = Container.get(ModuleMetadata).get('oauth-server');

		expect(entry?.instanceTypes).toEqual(['main', 'webhook', 'worker']);
	});
});
