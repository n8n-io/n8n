import { RESOURCES } from '@/constants.ee';
import {
	GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS,
	PROJECT_CUSTOM_ROLE_OPERATIONS,
} from '@/roles/custom-role-scopes.ee';
import {
	GLOBAL_ADMIN_SCOPES,
	GLOBAL_CHAT_USER_SCOPES,
	GLOBAL_MEMBER_SCOPES,
	GLOBAL_OWNER_SCOPES,
} from '@/roles/scopes/global-scopes.ee';
import {
	PERSONAL_PROJECT_OWNER_SCOPES,
	PROJECT_EDITOR_SCOPES,
	PROJECT_VIEWER_SCOPES,
	REGULAR_PROJECT_ADMIN_SCOPES,
} from '@/roles/scopes/project-scopes.ee';
import { scopeInformation } from '@/scope-information';

/**
 * Skill scopes follow the AI preference split. `skill` covers instance skills and other
 * users' "Just you" skills. `projectSkill` covers the skills of one project. A user's own
 * skills need no scope, and every user may read instance skills.
 */
describe('skill scopes', () => {
	const write = ['create', 'update', 'delete'];

	it('offer the default operations on both resources', () => {
		for (const resource of ['skill', 'projectSkill'] as const) {
			expect(RESOURCES[resource]).toEqual(
				expect.arrayContaining(['create', 'read', 'update', 'delete', 'list']),
			);
		}
	});

	it('are granted in full to owners and admins, who manage instance skills', () => {
		for (const scopes of [GLOBAL_OWNER_SCOPES, GLOBAL_ADMIN_SCOPES]) {
			expect(scopes).toEqual(
				expect.arrayContaining([
					...['create', 'read', 'update', 'delete', 'list'].map((op) => `skill:${op}`),
					...['create', 'read', 'update', 'delete', 'list'].map((op) => `projectSkill:${op}`),
				]),
			);
		}
	});

	it('are withheld from members and chat users, whose own skills need no scope', () => {
		for (const scopes of [GLOBAL_MEMBER_SCOPES, GLOBAL_CHAT_USER_SCOPES]) {
			expect(scopes.filter((scope) => scope.startsWith('skill:'))).toEqual([]);
		}
	});

	it('let project admins, personal owners and editors manage project skills', () => {
		for (const scopes of [
			REGULAR_PROJECT_ADMIN_SCOPES,
			PERSONAL_PROJECT_OWNER_SCOPES,
			PROJECT_EDITOR_SCOPES,
		]) {
			expect(scopes).toEqual(
				expect.arrayContaining(
					['create', 'read', 'update', 'delete', 'list'].map((op) => `projectSkill:${op}`),
				),
			);
		}
	});

	it('let project viewers only read and list project skills', () => {
		expect(PROJECT_VIEWER_SCOPES).toEqual(
			expect.arrayContaining(['projectSkill:read', 'projectSkill:list']),
		);
		expect(
			PROJECT_VIEWER_SCOPES.filter((scope) => write.some((op) => scope === `projectSkill:${op}`)),
		).toEqual([]);
	});

	it('can be given to custom roles, so a role without them cannot manage skills', () => {
		expect(GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.settings.Manage).toEqual(
			expect.arrayContaining(['skill:create', 'skill:read', 'skill:update', 'skill:delete']),
		);
		expect(PROJECT_CUSTOM_ROLE_OPERATIONS.projectSkill).toEqual(
			expect.arrayContaining(['read', 'update', 'create', 'delete']),
		);
	});

	it('are described, so the custom-role picker can label them', () => {
		for (const scope of [
			'skill:read',
			'skill:update',
			'projectSkill:read',
			'projectSkill:update',
		] as const) {
			expect(scopeInformation[scope]).toEqual({
				displayName: expect.any(String),
				description: expect.any(String),
			});
		}
	});
});
