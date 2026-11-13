import { API_KEY_RESOURCES, RESOURCES } from '@/constants.ee';
import {
	GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS,
	GLOBAL_CUSTOM_ROLE_SCOPES,
} from '@/roles/custom-role-scopes.ee';
import {
	GLOBAL_ADMIN_SCOPES,
	GLOBAL_CHAT_USER_SCOPES,
	GLOBAL_MEMBER_SCOPES,
	GLOBAL_OWNER_SCOPES,
} from '@/roles/scopes/global-scopes.ee';

/**
 * `workflowSettings:manage` guards the global workflow settings, such as the default
 * execution engine for new workflows. CAP-51.
 */
describe('workflowSettings scope', () => {
	it('offers the manage operation', () => {
		expect(RESOURCES.workflowSettings).toEqual(['manage']);
	});

	it('is granted to the owner and admins', () => {
		expect(GLOBAL_OWNER_SCOPES).toContain('workflowSettings:manage');
		expect(GLOBAL_ADMIN_SCOPES).toContain('workflowSettings:manage');
	});

	it('is withheld from members and chat users', () => {
		expect(GLOBAL_MEMBER_SCOPES).not.toContain('workflowSettings:manage');
		expect(GLOBAL_CHAT_USER_SCOPES).not.toContain('workflowSettings:manage');
	});

	it('can be given to a custom role through the "Manage" bundle', () => {
		expect(GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.settings.Manage).toContain('workflowSettings:manage');
		expect(GLOBAL_CUSTOM_ROLE_SCOPES.has('workflowSettings:manage')).toBe(true);
	});

	it('is not available to API keys', () => {
		expect(API_KEY_RESOURCES).not.toHaveProperty('workflowSettings');
	});
});
