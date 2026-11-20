import type { CredentialPayload } from '@n8n/backend-test-utils';
import {
	createTeamProject,
	linkUserToProject,
	randomCredentialPayload,
	testDb,
} from '@n8n/backend-test-utils';
import type { CredentialsEntity, Project, User } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { CredentialsService } from '@/credentials/credentials.service';

import { saveCredential, shareCredentialWithProjects } from '../shared/db/credentials';
import { createAdmin, createMember, createOwner } from '../shared/db/users';
import { initCredentialsTypes } from '../shared/utils';

/**
 * `findCredentialAnAgentCanUse` checks one credential. Agents used to load
 * three full credential lists and search them for the ID. This test compares
 * both ways for every user, project and credential, so the single lookup
 * cannot give access that the lists did not give.
 */

let service: CredentialsService;

/** The old lookup: intersect the user's list with the project and global lists. */
async function findWithLists(credentialId: string, projectId: string, user?: User) {
	if (user) {
		const usable = await service.getCredentialsAUserCanUseInAWorkflow(user, {
			projectId,
			excludePersonalRoute: true,
			excludeResolvable: true,
		});
		if (!usable.some((c) => c.id === credentialId)) return null;
	}
	const projectCredentials = await service.findAllCredentialIdsForProject(projectId);
	const globalCredentials = await service.findAllGlobalCredentialIds();
	// The lists without a user kept credentials that wait for OAuth. The single
	// lookup drops them for every caller, because they have no token yet.
	return (
		[...projectCredentials, ...globalCredentials].find(
			(c) => c.id === credentialId && !c.isResolvable && !c.pendingAuthorizationExpiresAt,
		) ?? null
	);
}

beforeAll(async () => {
	await testDb.init();
	await initCredentialsTypes();
	service = Container.get(CredentialsService);
});

afterAll(async () => {
	await testDb.terminate();
});

it('finds the same credentials as the full lists', async () => {
	const owner = await createOwner();
	const admin = await createAdmin();
	const memberA = await createMember();
	const memberB = await createMember();

	const projects = Container.get(ProjectRepository);
	const personal = async (user: User) => await projects.getPersonalProjectForUserOrFail(user.id);
	const ownerPersonal = await personal(owner);
	const memberAPersonal = await personal(memberA);
	const memberBPersonal = await personal(memberB);

	const teamP1 = await createTeamProject('P1');
	const teamP2 = await createTeamProject('P2');
	await linkUserToProject(memberA, teamP1, 'project:editor');
	await linkUserToProject(memberB, teamP2, 'project:viewer');

	const credentials: CredentialsEntity[] = [];
	// `saveCredential` copies every field, so a pending OAuth date gets stored too.
	const credential = async (
		project: Project,
		payload: Pick<
			Partial<CredentialsEntity>,
			'isGlobal' | 'isResolvable' | 'pendingAuthorizationExpiresAt'
		> = {},
	) => {
		const name = `${project.name} ${JSON.stringify(payload)} #${credentials.length}`;
		const saved = await saveCredential(
			{ ...randomCredentialPayload(), ...payload, name } as CredentialPayload,
			{ project, role: 'credential:owner' },
		);
		credentials.push(saved);
		return saved;
	};

	await credential(teamP1);
	await credential(teamP1, { isResolvable: true });
	await credential(teamP2);
	const sharedIntoP1 = await credential(teamP2);
	await shareCredentialWithProjects(sharedIntoP1, [teamP1]);
	const sharedIntoAPersonal = await credential(teamP2);
	await shareCredentialWithProjects(sharedIntoAPersonal, [memberAPersonal]);
	await credential(memberAPersonal);
	await credential(memberBPersonal);
	await credential(ownerPersonal);
	await credential(teamP2, { isGlobal: true });
	await credential(ownerPersonal, { isGlobal: true });
	await credential(ownerPersonal, { isGlobal: true, isResolvable: true });
	await credential(teamP1, { pendingAuthorizationExpiresAt: new Date(Date.now() + 60_000) });

	const users = { none: undefined, owner, admin, memberA, memberB };
	const projectList = { ownerPersonal, memberAPersonal, memberBPersonal, teamP1, teamP2 };

	let found = 0;
	const mismatches: object[] = [];
	for (const [userLabel, user] of Object.entries(users)) {
		for (const [projectLabel, { id: projectId }] of Object.entries(projectList)) {
			for (const { id, name } of [...credentials, { id: 'unknown', name: 'unknown' }]) {
				const expected = await findWithLists(id, projectId, user);
				const actual = await service.findCredentialAnAgentCanUse(id, projectId, user);
				const context = { user: userLabel, project: projectLabel, credential: name };
				if ((actual?.id ?? null) !== (expected?.id ?? null)) {
					mismatches.push({ ...context, expected: Boolean(expected), actual: Boolean(actual) });
				}
				if (actual) found++;
			}
		}
	}
	expect(mismatches).toEqual([]);
	// Guards against a setup in which no lookup finds anything.
	expect(found).toBeGreaterThan(20);
});
