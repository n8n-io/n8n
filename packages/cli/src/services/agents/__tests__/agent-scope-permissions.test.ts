/**
 * Verifies that agent scope permissions are correctly assigned to global roles.
 *
 * The agents controller uses `agent:*` scopes (not `chatHubAgent:*`) —
 * verified by code review and the decorator swap in agents.controller.ts.
 */

import { GLOBAL_OWNER_SCOPES, GLOBAL_MEMBER_SCOPES } from '@n8n/permissions';

describe('agent scope permissions', () => {
	describe('OWNER role', () => {
		it.each(['agent:create', 'agent:read', 'agent:update', 'agent:delete', 'agent:list'])(
			'should have %s scope',
			(scope) => {
				expect(GLOBAL_OWNER_SCOPES).toContain(scope);
			},
		);
	});

	describe('MEMBER role', () => {
		it.each(['agent:read', 'agent:list'])('should have %s scope', (scope) => {
			expect(GLOBAL_MEMBER_SCOPES).toContain(scope);
		});

		it.each(['agent:create', 'agent:update', 'agent:delete'])(
			'should NOT have %s scope',
			(scope) => {
				expect(GLOBAL_MEMBER_SCOPES).not.toContain(scope);
			},
		);
	});
});
