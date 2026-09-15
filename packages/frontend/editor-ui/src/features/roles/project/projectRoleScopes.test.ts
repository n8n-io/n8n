import { PROJECT_CUSTOM_ROLE_OPERATIONS } from '@n8n/permissions';

import {
	SCOPE_TYPES,
	SCOPES,
	TOTAL_PROJECT_PERMISSIONS,
	UI_VISIBLE_SCOPES,
} from './projectRoleScopes';

describe('projectRoleScopes', () => {
	/**
	 * `SCOPE_TYPES` is hand-kept and decides which groups the editor renders, while
	 * `SCOPES` and the permission total derive from the operations map. A resource
	 * added to the map but not here is counted in the denominator and reachable by no
	 * checkbox, so a role can never be fully granted.
	 */
	it('renders a group for every resource the permission total counts', () => {
		expect([...SCOPE_TYPES].sort()).toEqual(Object.keys(PROJECT_CUSTOM_ROLE_OPERATIONS).sort());
	});

	it('counts exactly the scopes the rendered groups offer, plus the coupled ones', () => {
		const offered = SCOPE_TYPES.flatMap((type) => SCOPES[type]);

		for (const scope of offered) {
			expect(UI_VISIBLE_SCOPES.has(scope)).toBe(true);
		}
		// `workflow:unpublish` is counted but deliberately has no checkbox.
		expect(TOTAL_PROJECT_PERMISSIONS).toBe(offered.length + 1);
	});

	it('offers the project AI preference permissions', () => {
		expect(SCOPES.projectAiPreference).toEqual([
			'projectAiPreference:read',
			'projectAiPreference:update',
			'projectAiPreference:create',
			'projectAiPreference:delete',
		]);
	});
});
