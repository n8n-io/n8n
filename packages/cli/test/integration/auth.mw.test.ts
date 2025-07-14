import { mockInstance } from '@n8n/backend-test-utils';

import { ActiveWorkflowManager } from '@/active-workflow-manager';

import { createUser } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils/';

describe('Auth Middleware', () => {
	mockInstance(ActiveWorkflowManager);

	const testServer = utils.setupTestServer({
		endpointGroups: ['me', 'auth', 'owner', 'users', 'invitations'],
	});

	/** Routes requiring a valid `n8n-auth` cookie for a user, either owner or member. */
	const ROUTES_REQUIRING_AUTHENTICATION = [
		['patch', '/me'],
		['patch', '/me/password'],
		['post', '/me/survey'],
	] as const;

	/** Routes requiring a valid `n8n-auth` cookie for an owner. */
	const ROUTES_REQUIRING_AUTHORIZATION = [
		['post', '/invitations'],
		['delete', '/users/123'],
	] as const;

	describe('Routes requiring Authentication', () => {
		[...ROUTES_REQUIRING_AUTHENTICATION, ...ROUTES_REQUIRING_AUTHORIZATION].forEach(
			([method, endpoint]) => {
				test(`${method} ${endpoint} should return 401 Unauthorized if no cookie`, async () => {
					const { statusCode } = await testServer.authlessAgent[method](endpoint);
					expect(statusCode).toBe(401);
				});
			},
		);
	});

	describe('Routes requiring Authorization', () => {
		let authMemberAgent: SuperAgentTest;
		beforeAll(async () => {
			const member = await createUser({ role: 'global:member' });
			authMemberAgent = testServer.authAgentFor(member);
		});

		ROUTES_REQUIRING_AUTHORIZATION.forEach(async ([method, endpoint]) => {
			test(`${method} ${endpoint} should return 403 Forbidden for member`, async () => {
				const { statusCode } = await authMemberAgent[method](endpoint);
				expect(statusCode).toBe(403);
			});
		});
	});
});
