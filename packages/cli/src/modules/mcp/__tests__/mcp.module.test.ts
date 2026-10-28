import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import { InstanceSettings } from 'n8n-core';

import { UserDeactivationHooks } from '@/services/user-deactivation-hooks.service';

import { OAuthGrantRepository } from '../database/repositories/oauth-grant.repository';
import { McpEventRelay } from '../mcp.event-relay';
import { McpModule } from '../mcp.module';

jest.mock('../mcp.controller', () => ({}));
jest.mock('../mcp.settings.controller', () => ({}));
jest.mock('../mcp.oauth.controller', () => ({}));
jest.mock('../mcp.auth.consent.controller', () => ({}));
jest.mock('../mcp.oauth-clients.controller', () => ({}));

const grants = mockInstance(OAuthGrantRepository);
const logger = mockInstance(Logger);
const relay = mockInstance(McpEventRelay);

describe('McpModule', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		grants.deleteGrantsForDisabledUsers.mockResolvedValue();
		Container.set(UserDeactivationHooks, new UserDeactivationHooks());
	});

	it.each(['main', 'webhook', 'worker'] as const)(
		'runs startup cleanup only on main instances (%s)',
		async (instanceType) => {
			mockInstance(InstanceSettings, { instanceType });
			await new McpModule().init();
			expect(grants.deleteGrantsForDisabledUsers).toHaveBeenCalledTimes(
				instanceType === 'main' ? 1 : 0,
			);
			const manager = mock<EntityManager>();
			await Container.get(UserDeactivationHooks).run('user-id', manager);
			expect(grants.deleteUserGrants).toHaveBeenCalledWith('user-id', manager);
		},
	);

	it('logs cleanup failure and continues initializing the module', async () => {
		mockInstance(InstanceSettings, { instanceType: 'main' });
		const error = new Error('Cleanup failed');
		grants.deleteGrantsForDisabledUsers.mockRejectedValueOnce(error);
		await expect(new McpModule().init()).resolves.toBeUndefined();
		expect(logger.error).toHaveBeenCalledWith(
			'Failed to clean up OAuth grants for disabled users',
			{ error },
		);
		expect(relay.init).toHaveBeenCalledTimes(1);
	});
});
