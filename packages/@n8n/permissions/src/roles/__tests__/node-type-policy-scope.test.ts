import { API_KEY_RESOURCES } from '@/constants.ee';
import {
	MEMBER_API_KEY_SCOPES,
	OWNER_API_KEY_SCOPES,
	getApiKeyScopesForRole,
	getOwnerOnlyApiKeyScopes,
} from '@/public-api-permissions.ee';
import { GLOBAL_ADMIN_SCOPES, GLOBAL_OWNER_SCOPES } from '@/roles/scopes/global-scopes.ee';
import {
	PERSONAL_PROJECT_OWNER_SCOPES,
	PROJECT_EDITOR_SCOPES,
	PROJECT_VIEWER_SCOPES,
	REGULAR_PROJECT_ADMIN_SCOPES,
} from '@/roles/scopes/project-scopes.ee';
import { isApiKeyScope, type AuthPrincipal } from '@/types.ee';

describe('nodeTypePolicy:manage default grants', () => {
	it('is granted to instance owners and admins', () => {
		expect(GLOBAL_OWNER_SCOPES).toContain('nodeTypePolicy:manage');
		expect(GLOBAL_ADMIN_SCOPES).toContain('nodeTypePolicy:manage');
	});

	it('is granted to project admins, per IAM-1142 (project admins self-govern their own row)', () => {
		expect(REGULAR_PROJECT_ADMIN_SCOPES).toContain('nodeTypePolicy:manage');
	});

	it('is not granted to personal project owners, editors, or viewers', () => {
		expect(PERSONAL_PROJECT_OWNER_SCOPES).not.toContain('nodeTypePolicy:manage');
		expect(PROJECT_EDITOR_SCOPES).not.toContain('nodeTypePolicy:manage');
		expect(PROJECT_VIEWER_SCOPES).not.toContain('nodeTypePolicy:manage');
	});
});

describe('nodeTypePolicy:manage as an API key scope', () => {
	const principal = (slug: string, scopes: string[]): AuthPrincipal =>
		({
			role: { slug, scopes: scopes.map((scope) => ({ slug: scope })) },
		}) as unknown as AuthPrincipal;

	it('is declared in API_KEY_RESOURCES', () => {
		expect(API_KEY_RESOURCES.nodeTypePolicy).toEqual(['manage']);
		expect(isApiKeyScope('nodeTypePolicy:manage')).toBe(true);
	});

	it('is granted to an owner key by default', () => {
		expect(OWNER_API_KEY_SCOPES).toContain('nodeTypePolicy:manage');
		expect(getApiKeyScopesForRole(principal('global:owner', [...GLOBAL_OWNER_SCOPES]))).toContain(
			'nodeTypePolicy:manage',
		);
	});

	it('is mintable by a member so a project admin can reach the project routes', () => {
		expect(MEMBER_API_KEY_SCOPES).toContain('nodeTypePolicy:manage');
		expect(getApiKeyScopesForRole(principal('global:member', []))).toContain(
			'nodeTypePolicy:manage',
		);
	});

	it('is therefore not stripped from keys on demotion to member', () => {
		expect(getOwnerOnlyApiKeyScopes()).not.toContain('nodeTypePolicy:manage');
	});
});
