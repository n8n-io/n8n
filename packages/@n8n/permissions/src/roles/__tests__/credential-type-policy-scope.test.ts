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
import { hasGlobalScope } from '@/utilities/has-global-scope.ee';

const principal = (slug: string, scopes: string[]): AuthPrincipal =>
	({
		role: { slug, scopes: scopes.map((scope) => ({ slug: scope })) },
	}) as unknown as AuthPrincipal;

describe('credentialTypePolicy:manage and nodeTypePolicy:manage are independent scopes', () => {
	it('a user granted only nodeTypePolicy:manage does not also gain credentialTypePolicy:manage', () => {
		expect(
			hasGlobalScope(
				principal('custom:node-policy-manager-only', ['nodeTypePolicy:manage']),
				'credentialTypePolicy:manage',
			),
		).toBe(false);
	});

	it('a user granted only credentialTypePolicy:manage does not also gain nodeTypePolicy:manage', () => {
		expect(
			hasGlobalScope(
				principal('custom:credential-policy-manager-only', ['credentialTypePolicy:manage']),
				'nodeTypePolicy:manage',
			),
		).toBe(false);
	});
});

describe('credentialTypePolicy:manage default grants', () => {
	it('is granted to instance owners and admins', () => {
		expect(GLOBAL_OWNER_SCOPES).toContain('credentialTypePolicy:manage');
		expect(GLOBAL_ADMIN_SCOPES).toContain('credentialTypePolicy:manage');
	});

	it('is granted to project admins, same as nodeTypePolicy:manage', () => {
		expect(REGULAR_PROJECT_ADMIN_SCOPES).toContain('credentialTypePolicy:manage');
	});

	it('is not granted to personal project owners, editors, or viewers', () => {
		expect(PERSONAL_PROJECT_OWNER_SCOPES).not.toContain('credentialTypePolicy:manage');
		expect(PROJECT_EDITOR_SCOPES).not.toContain('credentialTypePolicy:manage');
		expect(PROJECT_VIEWER_SCOPES).not.toContain('credentialTypePolicy:manage');
	});
});

describe('credentialTypePolicy:manage as an API key scope', () => {
	it('is declared in API_KEY_RESOURCES, consumed by the credential-type-policies public API', () => {
		expect(API_KEY_RESOURCES.credentialTypePolicy).toEqual(['manage']);
		expect(isApiKeyScope('credentialTypePolicy:manage')).toBe(true);
	});

	it('is granted to an owner key by default', () => {
		expect(OWNER_API_KEY_SCOPES).toContain('credentialTypePolicy:manage');
		expect(getApiKeyScopesForRole(principal('global:owner', [...GLOBAL_OWNER_SCOPES]))).toContain(
			'credentialTypePolicy:manage',
		);
	});

	it('is mintable by a member so a project admin can reach the project routes', () => {
		expect(MEMBER_API_KEY_SCOPES).toContain('credentialTypePolicy:manage');
		expect(getApiKeyScopesForRole(principal('global:member', []))).toContain(
			'credentialTypePolicy:manage',
		);
	});

	it('is therefore not stripped from keys on demotion to member', () => {
		expect(getOwnerOnlyApiKeyScopes()).not.toContain('credentialTypePolicy:manage');
	});
});
