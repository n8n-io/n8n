import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';

import { SkillAccessService } from '../../services/skill-access.service';
import type { SkillSourceAction } from '../../services/skill-source.policy';

import { createCustomRoleWithScopeSlugs } from '@test-integration/db/roles';
import { createAdmin, createMember, createOwner } from '@test-integration/db/users';

const ALL: SkillSourceAction[] = [
	'view',
	'viewCredential',
	'connect',
	'addSkills',
	'review',
	'checkNow',
	'stopSyncing',
	'replaceCredential',
	'disconnect',
	'deleteSkill',
];
const VIEW: SkillSourceAction[] = ['view'];
const UPDATE: SkillSourceAction[] = [
	'view',
	'viewCredential',
	'review',
	'checkNow',
	'stopSyncing',
	'replaceCredential',
];
const NONE: SkillSourceAction[] = [];

type Role =
	| 'owner'
	| 'admin'
	| 'outsider'
	| 'projectAdmin'
	| 'editor'
	| 'viewer'
	| 'customUpdater'
	| 'personalOwner';
type ScopeName = 'global' | 'team' | 'otherTeam' | 'personal';

beforeAll(async () => {
	await testModules.loadModules(['skills', 'agents']);
	await testDb.init();
});

afterAll(async () => {
	await testDb.terminate();
});

describe('skill source access', () => {
	const users = {} as Record<Role, User>;
	const projectIds = {} as Record<ScopeName, string | null>;
	let access: SkillAccessService;

	beforeAll(async () => {
		access = Container.get(SkillAccessService);
		users.owner = await createOwner();
		users.admin = await createAdmin();
		users.outsider = await createMember();
		users.projectAdmin = await createMember();
		users.editor = await createMember();
		users.viewer = await createMember();
		users.customUpdater = await createMember();
		users.personalOwner = await createMember();

		const team: Project = await createTeamProject('Team');
		const otherTeam: Project = await createTeamProject('Other team');
		await linkUserToProject(users.projectAdmin, team, 'project:admin');
		await linkUserToProject(users.editor, team, 'project:editor');
		await linkUserToProject(users.editor, otherTeam, 'project:editor');
		await linkUserToProject(users.viewer, team, 'project:viewer');
		// A custom role can grant update without create or delete.
		const updater = await createCustomRoleWithScopeSlugs(
			['projectSkill:list', 'projectSkill:read', 'projectSkill:update'],
			{ roleType: 'project' },
		);
		await linkUserToProject(users.customUpdater, team, updater.slug);
		await linkUserToProject(users.customUpdater, otherTeam, updater.slug);

		projectIds.global = null;
		projectIds.team = team.id;
		projectIds.otherTeam = otherTeam.id;
		projectIds.personal = (await getPersonalProject(users.personalOwner)).id;
	});

	async function allowedActions(role: Role, scope: ScopeName): Promise<SkillSourceAction[]> {
		const allowed: SkillSourceAction[] = [];
		for (const action of ALL) {
			if (await access.canOnSource(users[role], { projectId: projectIds[scope] }, action)) {
				allowed.push(action);
			}
		}
		return allowed;
	}

	it.each<[Role, ScopeName, SkillSourceAction[]]>([
		['owner', 'global', ALL],
		['owner', 'team', ALL],
		['owner', 'personal', ALL],
		['admin', 'global', ALL],
		['admin', 'team', ALL],
		['admin', 'personal', ALL],
		['outsider', 'global', VIEW],
		['outsider', 'team', NONE],
		['outsider', 'personal', NONE],
		['projectAdmin', 'global', VIEW],
		['projectAdmin', 'team', ALL],
		['projectAdmin', 'personal', NONE],
		['editor', 'global', VIEW],
		['editor', 'team', ALL],
		['editor', 'personal', NONE],
		['viewer', 'global', VIEW],
		['viewer', 'team', VIEW],
		['viewer', 'personal', NONE],
		['customUpdater', 'global', VIEW],
		['customUpdater', 'team', UPDATE],
		['customUpdater', 'personal', NONE],
		['personalOwner', 'global', VIEW],
		['personalOwner', 'team', NONE],
		['personalOwner', 'personal', ALL],
	])('%s on a %s source may: %j', async (role, scope, expected) => {
		expect(await allowedActions(role, scope)).toEqual(expected);
	});

	// Change scope needs delete where the source is, and create where it goes.
	it.each<[Role, ScopeName, ScopeName, boolean]>([
		['owner', 'global', 'team', true],
		['admin', 'team', 'global', true],
		['admin', 'personal', 'team', true],
		['editor', 'team', 'otherTeam', true],
		['editor', 'team', 'global', false],
		['editor', 'global', 'team', false],
		['projectAdmin', 'team', 'otherTeam', false],
		['customUpdater', 'team', 'otherTeam', false],
		['viewer', 'team', 'personal', false],
		['personalOwner', 'personal', 'team', false],
	])('%s may change the scope of a source from %s to %s: %s', async (role, from, to, expected) => {
		expect(
			await access.canChangeSourceScope(
				users[role],
				{ projectId: projectIds[from] },
				{ projectId: projectIds[to] },
			),
		).toBe(expected);
	});

	// Global is visible to every user, so the answer lists only projects.
	it.each<[Role, ScopeName[] | 'all']>([
		['owner', 'all'],
		['admin', 'all'],
		['editor', ['team', 'otherTeam']],
		['viewer', ['team']],
		['customUpdater', ['team', 'otherTeam']],
		['personalOwner', ['personal']],
	])('%s sees the sources of: %j', async (role, expected) => {
		const visible = await access.visibleSourceProjects(users[role]);

		if (expected === 'all') {
			expect(visible).toBe('all');
			return;
		}
		const own = (await getPersonalProject(users[role])).id;
		const named = expected.map((scope) => projectIds[scope]);
		expect(visible === 'all' ? visible : [...visible].sort()).toEqual(
			[...new Set([...named, own])].sort(),
		);
	});
});
