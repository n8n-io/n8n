import { ProjectScopeService, RoleCacheService } from '@n8n/backend-services';
import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import {
	PROJECT_ADMIN_ROLE_SLUG,
	PROJECT_CHAT_USER_ROLE_SLUG,
	PROJECT_EDITOR_ROLE_SLUG,
	PROJECT_VIEWER_ROLE_SLUG,
	type Scope,
} from '@n8n/permissions';

import { userHasScopes } from '@/permissions.ee/check-access';

import { cleanupRolesAndScopes, createCustomRoleWithScopeSlugs } from '../shared/db/roles';
import { createMember, createOwner } from '../shared/db/users';

const SCOPE_SETS: Scope[][] = [
	['workflow:read'],
	['workflow:update'],
	['workflow:delete'],
	['workflow:read', 'workflow:update'],
	['credential:create'],
	['project:read'],
	['project:update'],
	['agent:read'],
	['agent:execute'],
	['agent:read', 'agent:execute'],
	['dataTable:readRow'],
	['projectSkill:create'],
	['externalSecret:list'],
];

describe('ProjectScopeService.hasScopes', () => {
	let projectScopeService: ProjectScopeService;
	let owner: User;
	let teamProject: Project;
	let otherProject: Project;
	const members = new Map<string, User>();

	beforeAll(async () => {
		await testDb.init();
		projectScopeService = Container.get(ProjectScopeService);

		owner = await createOwner();
		teamProject = await createTeamProject('Team', owner);
		otherProject = await createTeamProject('Other', owner);

		const customRole = await createCustomRoleWithScopeSlugs(['workflow:read', 'agent:read'], {
			roleType: 'project',
			slug: 'project:workflow-agent-reader',
		});

		const projectRoles = [
			PROJECT_ADMIN_ROLE_SLUG,
			PROJECT_EDITOR_ROLE_SLUG,
			PROJECT_VIEWER_ROLE_SLUG,
			PROJECT_CHAT_USER_ROLE_SLUG,
			customRole.slug,
		];
		for (const role of projectRoles) {
			const member = await createMember();
			await linkUserToProject(member, teamProject, role);
			members.set(role, member);
		}
		members.set('none', await createMember());

		// The role cache may hold the role set from before the custom role existed.
		await Container.get(RoleCacheService).invalidateCache();
	});

	afterAll(async () => {
		await cleanupRolesAndScopes();
		await testDb.terminate();
	});

	it('gives the same result as userHasScopes for each role and scope set', async () => {
		const outsider = members.get('none')!;
		const cases = [
			...[...members.entries()].flatMap(([role, user]) => [
				{ name: `${role} in the team project`, user, projectId: teamProject.id },
				{ name: `${role} in another project`, user, projectId: otherProject.id },
			]),
			{ name: 'owner in the team project', user: owner, projectId: teamProject.id },
			{
				name: 'personal owner',
				user: outsider,
				projectId: (await getPersonalProject(outsider)).id,
			},
			{ name: 'project that does not exist', user: outsider, projectId: 'missing' },
		];

		const mismatches: string[] = [];
		const outcomes = new Set<boolean>();
		for (const { name, user, projectId } of cases) {
			for (const scopes of SCOPE_SETS) {
				const expected = await userHasScopes(user, scopes, false, { projectId });
				const actual = await projectScopeService.hasScopes(user, projectId, scopes);
				outcomes.add(actual);
				if (actual !== expected) {
					mismatches.push(`${name} [${scopes.join(', ')}]: ${actual} !== ${expected}`);
				}
			}
		}

		expect(mismatches).toEqual([]);
		expect(outcomes).toEqual(new Set([true, false]));
	});

	it('grants a project role only the scopes of that role', async () => {
		const reader = members.get('project:workflow-agent-reader')!;

		await expect(
			projectScopeService.hasScopes(reader, teamProject.id, ['workflow:read', 'agent:read']),
		).resolves.toBe(true);
		await expect(
			projectScopeService.hasScopes(reader, teamProject.id, ['workflow:read', 'workflow:update']),
		).resolves.toBe(false);
		await expect(
			projectScopeService.hasScopes(reader, otherProject.id, ['workflow:read']),
		).resolves.toBe(false);
	});

	it('grants a global scope in every project', async () => {
		await expect(projectScopeService.hasScopes(owner, 'missing', ['project:update'])).resolves.toBe(
			true,
		);
	});
});
