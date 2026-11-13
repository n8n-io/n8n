import {
	ADMIN_API_KEY_SCOPES,
	API_KEY_SCOPES_FOR_IMPLICIT_PERSONAL_PROJECT,
	MEMBER_API_KEY_SCOPES,
	OWNER_API_KEY_SCOPES,
} from '@/public-api-permissions.ee';
import { GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS } from '@/roles/custom-role-scopes.ee';
import {
	GLOBAL_ADMIN_SCOPES,
	GLOBAL_MEMBER_SCOPES,
	GLOBAL_OWNER_SCOPES,
} from '@/roles/scopes/global-scopes.ee';
import { scopeInformation } from '@/scope-information';

describe('user:changeLocale scope', () => {
	it('is granted to owners and admins', () => {
		expect(GLOBAL_OWNER_SCOPES).toContain('user:changeLocale');
		expect(GLOBAL_ADMIN_SCOPES).toContain('user:changeLocale');
	});

	it('is withheld from members', () => {
		expect(GLOBAL_MEMBER_SCOPES).not.toContain('user:changeLocale');
	});

	it('can be given to API keys of owners and admins only', () => {
		expect(OWNER_API_KEY_SCOPES).toContain('user:changeLocale');
		expect(ADMIN_API_KEY_SCOPES).toContain('user:changeLocale');
		expect(MEMBER_API_KEY_SCOPES).not.toContain('user:changeLocale');
		expect(API_KEY_SCOPES_FOR_IMPLICIT_PERSONAL_PROJECT).not.toContain('user:changeLocale');
	});

	it('is part of the "Manage users" bundle for custom roles, not "View"', () => {
		expect(GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.user.Manage).toContain('user:changeLocale');
		expect(GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.user.View).not.toContain('user:changeLocale');
	});

	it('is described, so the scope pickers can label it', () => {
		expect(scopeInformation['user:changeLocale']).toEqual({
			displayName: expect.any(String),
			description: expect.any(String),
		});
	});
});
