import { API_KEY_RESOURCES } from '@/constants.ee';
import { scopeInformation } from '@/scope-information';
import {
	GLOBAL_ADMIN_SCOPES,
	GLOBAL_CHAT_USER_SCOPES,
	GLOBAL_MEMBER_SCOPES,
	GLOBAL_OWNER_SCOPES,
} from '@/roles/scopes/global-scopes.ee';
import {
	PERSONAL_PROJECT_OWNER_SCOPES,
	PROJECT_CHAT_USER_SCOPES,
	PROJECT_EDITOR_SCOPES,
	PROJECT_VIEWER_SCOPES,
	REGULAR_PROJECT_ADMIN_SCOPES,
} from '@/roles/scopes/project-scopes.ee';
import type { AuthPrincipal, Scope } from '@/types.ee';
import { hasGlobalScope } from '@/utilities/has-global-scope.ee';

const EXECUTION_LIMIT_SCOPES: Scope[] = [
	'executionLimit:read',
	'executionLimit:update',
	'projectExecutionLimit:read',
	'projectExecutionLimit:update',
];

const principal = (slug: string, scopes: string[]): AuthPrincipal =>
	({
		role: { slug, scopes: scopes.map((scope) => ({ slug: scope })) },
	}) as unknown as AuthPrincipal;

describe('execution limit default grants', () => {
	it('grants every execution limit scope to instance owners and admins', () => {
		expect(GLOBAL_OWNER_SCOPES).toEqual(expect.arrayContaining(EXECUTION_LIMIT_SCOPES));
		expect(GLOBAL_ADMIN_SCOPES).toEqual(expect.arrayContaining(EXECUTION_LIMIT_SCOPES));
	});

	it('grants no execution limit scope to instance members or chat users', () => {
		for (const scope of EXECUTION_LIMIT_SCOPES) {
			expect(GLOBAL_MEMBER_SCOPES).not.toContain(scope);
			expect(GLOBAL_CHAT_USER_SCOPES).not.toContain(scope);
		}
	});

	it('lets project admins read their project limit but not change it', () => {
		const granted = REGULAR_PROJECT_ADMIN_SCOPES.filter((scope) =>
			EXECUTION_LIMIT_SCOPES.includes(scope),
		);
		expect(granted).toEqual(['projectExecutionLimit:read']);
	});

	it('grants no execution limit scope to other project roles', () => {
		for (const scope of EXECUTION_LIMIT_SCOPES) {
			expect(PERSONAL_PROJECT_OWNER_SCOPES).not.toContain(scope);
			expect(PROJECT_EDITOR_SCOPES).not.toContain(scope);
			expect(PROJECT_VIEWER_SCOPES).not.toContain(scope);
			expect(PROJECT_CHAT_USER_SCOPES).not.toContain(scope);
		}
	});
});

describe('execution limit scope independence', () => {
	it('projectExecutionLimit:update does not give executionLimit:update', () => {
		expect(
			hasGlobalScope(
				principal('custom:project-limit-editor', ['projectExecutionLimit:update']),
				'executionLimit:update',
			),
		).toBe(false);
	});

	it('executionLimit:read does not give executionLimit:update', () => {
		expect(
			hasGlobalScope(
				principal('custom:limit-reader', ['executionLimit:read']),
				'executionLimit:update',
			),
		).toBe(false);
	});
});

describe('execution limit scope metadata', () => {
	it('is not an API key scope', () => {
		expect(API_KEY_RESOURCES).not.toHaveProperty('executionLimit');
		expect(API_KEY_RESOURCES).not.toHaveProperty('projectExecutionLimit');
	});

	it('has a display name and description for every scope', () => {
		for (const scope of EXECUTION_LIMIT_SCOPES) {
			expect(scopeInformation[scope]).toEqual({
				displayName: expect.any(String),
				description: expect.any(String),
			});
		}
	});
});
