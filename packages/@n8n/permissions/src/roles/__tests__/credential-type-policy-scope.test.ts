import { API_KEY_RESOURCES } from '@/constants.ee';
import { GLOBAL_ADMIN_SCOPES, GLOBAL_OWNER_SCOPES } from '@/roles/scopes/global-scopes.ee';
import {
	PERSONAL_PROJECT_OWNER_SCOPES,
	PROJECT_EDITOR_SCOPES,
	PROJECT_VIEWER_SCOPES,
	REGULAR_PROJECT_ADMIN_SCOPES,
} from '@/roles/scopes/project-scopes.ee';
import type { AuthPrincipal } from '@/types.ee';
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
	it('is not declared in API_KEY_RESOURCES yet, since no Public API endpoint consumes it', () => {
		expect(API_KEY_RESOURCES).not.toHaveProperty('credentialTypePolicy');
	});
});
