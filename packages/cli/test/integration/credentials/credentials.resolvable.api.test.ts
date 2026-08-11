import {
	createTeamProject,
	linkUserToProject,
	mockInstance,
	randomCredentialPayload,
	randomCredentialPayloadWithOauthTokenData,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';

import {
	SYSTEM_RESOLVER_ID,
	SYSTEM_RESOLVER_NAME,
	SYSTEM_RESOLVER_TYPE,
} from '@/modules/dynamic-credentials.ee/constants';
import { DynamicCredentialUserEntryStorage } from '@/modules/dynamic-credentials.ee/credential-resolvers/storage/dynamic-credential-user-entry-storage';
import { DynamicCredentialResolverRepository } from '@/modules/dynamic-credentials.ee/database/repositories/credential-resolver.repository';
import { DynamicCredentialUserEntryRepository } from '@/modules/dynamic-credentials.ee/database/repositories/dynamic-credential-user-entry.repository';
import { DynamicCredentialsConfig } from '@/modules/dynamic-credentials.ee/dynamic-credentials.config';
import { Telemetry } from '@/telemetry';

import {
	getCredentialSharings,
	saveCredential,
	shareCredentialWithProjects,
} from '../shared/db/credentials';
import { createAdmin, createMember } from '../shared/db/users';
import * as utils from '../shared/utils';
import { setupTestServer } from '../shared/utils';

mockInstance(Telemetry);

process.env.N8N_ENV_FEAT_DYNAMIC_CREDENTIALS = 'true';

mockInstance(DynamicCredentialsConfig, {
	endpointAuthToken: 'static-test-token',
	corsOrigin: 'https://app.example.com',
	corsAllowCredentials: false,
});

const testServer = setupTestServer({
	endpointGroups: ['credentials'],
	enabledFeatures: ['feat:sharing', 'feat:dynamicCredentials'],
	modules: ['dynamic-credentials'],
});

let memberA: User;
let memberB: User;
let teamProject: Project;
let storage: DynamicCredentialUserEntryStorage;

beforeAll(async () => {
	// Needed for the POST /credentials tests below, which exercise real credential-type validation.
	await utils.initCredentialsTypes();
});

beforeEach(async () => {
	await testDb.truncate([
		'DynamicCredentialUserEntry',
		'DynamicCredentialResolver',
		'SharedCredentials',
		'CredentialsEntity',
	]);

	memberA = await createMember();
	memberB = await createMember();

	teamProject = await createTeamProject(undefined, memberA);
	await linkUserToProject(memberB, teamProject, 'project:editor');

	storage = Container.get(DynamicCredentialUserEntryStorage);

	// Seed the system resolver — the connection-status lookup is scoped to it
	// (see CredentialConnectionStatusService).
	const resolverRepository = Container.get(DynamicCredentialResolverRepository);
	await resolverRepository.save(
		resolverRepository.create({
			id: SYSTEM_RESOLVER_ID,
			name: SYSTEM_RESOLVER_NAME,
			type: SYSTEM_RESOLVER_TYPE,
			config: '{}',
		}),
	);
});

const seedUserEntry = async (credentialId: string, userId: string) => {
	await storage.setCredentialData(
		credentialId,
		userId,
		SYSTEM_RESOLVER_ID,
		'encrypted-payload',
		{},
	);
};

const saveResolvableCredential = async () =>
	await saveCredential(randomCredentialPayload({ isResolvable: true }), {
		project: teamProject,
		role: 'credential:owner',
	});

const saveStaticCredential = async () =>
	await saveCredential(randomCredentialPayload(), {
		project: teamProject,
		role: 'credential:owner',
	});

const saveStaticCredentialWithOauthTokenData = async () =>
	await saveCredential(randomCredentialPayloadWithOauthTokenData(), {
		project: teamProject,
		role: 'credential:owner',
	});

type CredentialResponseFields = {
	id: string;
	isResolvable?: boolean;
	connectedByMe?: boolean;
	data?: { oauthTokenData?: unknown };
};

describe('GET /credentials — connectedByMe', () => {
	test('returns connectedByMe=true for resolvable credential when user has a per-user entry', async () => {
		const resolvable = await saveResolvableCredential();
		await seedUserEntry(resolvable.id, memberA.id);

		const response = await testServer.authAgentFor(memberA).get('/credentials').expect(200);

		const cred = (response.body.data as CredentialResponseFields[]).find(
			(c) => c.id === resolvable.id,
		);
		expect(cred).toBeDefined();
		expect(cred?.connectedByMe).toBe(true);
	});

	test('returns connectedByMe=false for resolvable credential when user has no entry', async () => {
		const resolvable = await saveResolvableCredential();
		await seedUserEntry(resolvable.id, memberA.id);

		const response = await testServer.authAgentFor(memberB).get('/credentials').expect(200);

		const cred = (response.body.data as CredentialResponseFields[]).find(
			(c) => c.id === resolvable.id,
		);
		expect(cred).toBeDefined();
		expect(cred?.connectedByMe).toBe(false);
	});

	test('omits connectedByMe for static credentials', async () => {
		const staticCred = await saveStaticCredential();

		const response = await testServer.authAgentFor(memberA).get('/credentials').expect(200);

		const cred = (response.body.data as CredentialResponseFields[]).find(
			(c) => c.id === staticCred.id,
		);
		expect(cred).toBeDefined();
		expect('connectedByMe' in (cred ?? {})).toBe(false);
	});

	test('uses a single bulk query for the connection lookup', async () => {
		const [r1, _r2, r3] = await Promise.all([
			saveResolvableCredential(),
			saveResolvableCredential(),
			saveResolvableCredential(),
		]);
		await seedUserEntry(r1.id, memberA.id);
		await seedUserEntry(r3.id, memberA.id);

		const repository = Container.get(DynamicCredentialUserEntryRepository);
		const findSpy = vi.spyOn(repository, 'find');

		try {
			await testServer.authAgentFor(memberA).get('/credentials').expect(200);

			expect(findSpy).toHaveBeenCalledTimes(1);
			const firstCall = findSpy.mock.calls[0]?.[0];
			expect(firstCall).toBeDefined();
			const where = (firstCall as { where: { userId: string; credentialId: unknown } }).where;
			expect(where.userId).toBe(memberA.id);
			expect(where.credentialId).toBeDefined();
		} finally {
			findSpy.mockRestore();
		}
	});
});

describe('GET /credentials/for-workflow — connectedByMe', () => {
	test('returns connectedByMe per user for the same resolvable credential', async () => {
		const resolvable = await saveResolvableCredential();
		await seedUserEntry(resolvable.id, memberA.id);

		const responseA = await testServer
			.authAgentFor(memberA)
			.get('/credentials/for-workflow')
			.query({ projectId: teamProject.id })
			.expect(200);
		const responseB = await testServer
			.authAgentFor(memberB)
			.get('/credentials/for-workflow')
			.query({ projectId: teamProject.id })
			.expect(200);

		const credA = (responseA.body.data as CredentialResponseFields[]).find(
			(c) => c.id === resolvable.id,
		);
		const credB = (responseB.body.data as CredentialResponseFields[]).find(
			(c) => c.id === resolvable.id,
		);

		expect(credA?.connectedByMe).toBe(true);
		expect(credB?.connectedByMe).toBe(false);
	});

	test('omits connectedByMe for static credentials in for-workflow response', async () => {
		const staticCred = await saveStaticCredential();

		const response = await testServer
			.authAgentFor(memberA)
			.get('/credentials/for-workflow')
			.query({ projectId: teamProject.id })
			.expect(200);

		const cred = (response.body.data as CredentialResponseFields[]).find(
			(c) => c.id === staticCred.id,
		);
		expect(cred).toBeDefined();
		expect('connectedByMe' in (cred ?? {})).toBe(false);
	});
});

describe('GET /credentials/:id — per-user oauthTokenData', () => {
	test('reflects per-user storage for resolvable credentials (A connected, B not)', async () => {
		const resolvable = await saveResolvableCredential();
		await seedUserEntry(resolvable.id, memberA.id);

		const responseA = await testServer
			.authAgentFor(memberA)
			.get(`/credentials/${resolvable.id}`)
			.query({ includeData: true })
			.expect(200);
		const responseB = await testServer
			.authAgentFor(memberB)
			.get(`/credentials/${resolvable.id}`)
			.query({ includeData: true })
			.expect(200);

		const bodyA = responseA.body.data as CredentialResponseFields;
		const bodyB = responseB.body.data as CredentialResponseFields;

		expect(bodyA.connectedByMe).toBe(true);
		expect(bodyA.data?.oauthTokenData).toBe(true);

		expect(bodyB.connectedByMe).toBe(false);
		expect(bodyB.data?.oauthTokenData).toBeUndefined();
	});

	test('preserves static oauthTokenData behavior (shared across all readers)', async () => {
		const staticCred = await saveStaticCredentialWithOauthTokenData();

		const responseA = await testServer
			.authAgentFor(memberA)
			.get(`/credentials/${staticCred.id}`)
			.query({ includeData: true })
			.expect(200);
		const responseB = await testServer
			.authAgentFor(memberB)
			.get(`/credentials/${staticCred.id}`)
			.query({ includeData: true })
			.expect(200);

		const bodyA = responseA.body.data as CredentialResponseFields;
		const bodyB = responseB.body.data as CredentialResponseFields;

		expect(bodyA.data?.oauthTokenData).toBe(true);
		expect(bodyB.data?.oauthTokenData).toBe(true);
		expect('connectedByMe' in bodyA).toBe(false);
		expect('connectedByMe' in bodyB).toBe(false);
	});

	test('returns connectedUserCount for resolvable credential', async () => {
		const resolvable = await saveResolvableCredential();
		await seedUserEntry(resolvable.id, memberA.id);
		await seedUserEntry(resolvable.id, memberB.id);

		const response = await testServer
			.authAgentFor(memberA)
			.get(`/credentials/${resolvable.id}`)
			.query({ includeData: true })
			.expect(200);

		const body = response.body.data as CredentialResponseFields & { connectedUserCount?: number };
		expect(body.connectedUserCount).toBe(2);
	});

	test('omits connectedUserCount for static credentials', async () => {
		const staticCred = await saveStaticCredential();

		const response = await testServer
			.authAgentFor(memberA)
			.get(`/credentials/${staticCred.id}`)
			.query({ includeData: true })
			.expect(200);

		const body = response.body.data as CredentialResponseFields & { connectedUserCount?: number };
		expect('connectedUserCount' in body).toBe(false);
	});
});

describe('PATCH /credentials/:id — isResolvable toggle cleanup', () => {
	const patchResolvable = async (
		credentialId: string,
		isResolvable: boolean,
		asUser: typeof memberA,
	) => {
		// Load the credential first to build a valid full PATCH payload
		const existing = await testServer
			.authAgentFor(asUser)
			.get(`/credentials/${credentialId}`)
			.query({ includeData: true })
			.expect(200);
		const { name, type, data } = existing.body.data;
		return await testServer
			.authAgentFor(asUser)
			.patch(`/credentials/${credentialId}`)
			.send({ name, type, data: data ?? {}, isResolvable })
			.expect(200);
	};

	test('Static→Private: removes oauthTokenData from the credential blob', async () => {
		const staticCred = await saveStaticCredentialWithOauthTokenData();

		// Confirm oauthTokenData is present before toggle
		const before = await testServer
			.authAgentFor(memberA)
			.get(`/credentials/${staticCred.id}`)
			.query({ includeData: true })
			.expect(200);
		expect(before.body.data.data?.oauthTokenData).toBe(true);

		await patchResolvable(staticCred.id, true, memberA);

		const after = await testServer
			.authAgentFor(memberA)
			.get(`/credentials/${staticCred.id}`)
			.query({ includeData: true })
			.expect(200);

		expect(after.body.data.data?.oauthTokenData).toBeUndefined();
		expect(after.body.data.isResolvable).toBe(true);
	});

	test('Static→Private: leaves credential unchanged when no oauthTokenData was present', async () => {
		const staticCred = await saveStaticCredential();

		await patchResolvable(staticCred.id, true, memberA);

		const after = await testServer
			.authAgentFor(memberA)
			.get(`/credentials/${staticCred.id}`)
			.query({ includeData: true })
			.expect(200);

		expect(after.body.data.data?.oauthTokenData).toBeUndefined();
		expect(after.body.data.isResolvable).toBe(true);
	});

	test('Private→Static: deletes all per-user entries atomically', async () => {
		const resolvable = await saveResolvableCredential();
		await seedUserEntry(resolvable.id, memberA.id);
		await seedUserEntry(resolvable.id, memberB.id);

		const entryRepository = Container.get(DynamicCredentialUserEntryRepository);
		const beforeCount = await entryRepository.countBy({ credentialId: resolvable.id });
		expect(beforeCount).toBe(2);

		await patchResolvable(resolvable.id, false, memberA);

		const afterCount = await entryRepository.countBy({ credentialId: resolvable.id });
		expect(afterCount).toBe(0);

		const after = await testServer
			.authAgentFor(memberA)
			.get(`/credentials/${resolvable.id}`)
			.query({ includeData: true })
			.expect(200);
		expect(after.body.data.isResolvable).toBe(false);
	});

	test('Private→Static: no-op when there are no per-user entries', async () => {
		const resolvable = await saveResolvableCredential();

		await patchResolvable(resolvable.id, false, memberA);

		const entryRepository = Container.get(DynamicCredentialUserEntryRepository);
		const count = await entryRepository.countBy({ credentialId: resolvable.id });
		expect(count).toBe(0);
	});
});

describe('PUT /credentials/:id/transfer — resolvable connection reconciliation', () => {
	const entryRepository = () => Container.get(DynamicCredentialUserEntryRepository);

	test('removes the connection of a member who loses access in the destination project', async () => {
		const resolvable = await saveResolvableCredential();
		// memberB is an editor of the source project and connected their account.
		await seedUserEntry(resolvable.id, memberB.id);

		// Destination project that memberB is NOT part of.
		const destinationProject = await createTeamProject(undefined, memberA);

		await testServer
			.authAgentFor(memberA)
			.put(`/credentials/${resolvable.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id })
			.expect(200);

		const remaining = await entryRepository().countBy({
			credentialId: resolvable.id,
			userId: memberB.id,
		});
		expect(remaining).toBe(0);
	});

	test('keeps the connection of a member who retains access via the destination project', async () => {
		const resolvable = await saveResolvableCredential();
		await seedUserEntry(resolvable.id, memberB.id);

		// memberB is also a member of the destination project, so they keep
		// credential:connect after the move.
		const destinationProject = await createTeamProject(undefined, memberA);
		await linkUserToProject(memberB, destinationProject, 'project:editor');

		await testServer
			.authAgentFor(memberA)
			.put(`/credentials/${resolvable.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id })
			.expect(200);

		const remaining = await entryRepository().countBy({
			credentialId: resolvable.id,
			userId: memberB.id,
		});
		expect(remaining).toBe(1);
	});

	test('keeps the connection of a user who retains access via a global role', async () => {
		const admin = await createAdmin();
		// Admin is a source-project member (so they are re-evaluated), but has no
		// access in the destination project — global scope is what retains them.
		await linkUserToProject(admin, teamProject, 'project:viewer');

		const resolvable = await saveResolvableCredential();
		await seedUserEntry(resolvable.id, admin.id);

		const destinationProject = await createTeamProject(undefined, memberA);

		await testServer
			.authAgentFor(memberA)
			.put(`/credentials/${resolvable.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id })
			.expect(200);

		const remaining = await entryRepository().countBy({
			credentialId: resolvable.id,
			userId: admin.id,
		});
		expect(remaining).toBe(1);
	});
});

describe('Sharing dynamic credentials', () => {
	test('PUT /credentials/:id/share — allows sharing a dynamic credential', async () => {
		const resolvable = await saveResolvableCredential();
		const otherProject = await createTeamProject(undefined, memberA);

		await testServer
			.authAgentFor(memberA)
			.put(`/credentials/${resolvable.id}/share`)
			.send({ shareWithIds: [otherProject.id] })
			.expect(200);

		const sharings = await getCredentialSharings(resolvable);
		expect(sharings.some((s) => s.role === 'credential:user')).toBe(true);
	});

	test('a sharee of a dynamic credential receives the credential:connect scope', async () => {
		const resolvable = await saveResolvableCredential();
		// memberA owns the sharee project so it can share into it; memberC only belongs
		// to that project (not the credential's home project), so the scopes it gets on
		// the credential come from its project role masked by the sharing role.
		const shareeProject = await createTeamProject(undefined, memberA);
		const memberC = await createMember();
		await linkUserToProject(memberC, shareeProject, 'project:editor');

		await testServer
			.authAgentFor(memberA)
			.put(`/credentials/${resolvable.id}/share`)
			.send({ shareWithIds: [shareeProject.id] })
			.expect(200);

		const response = await testServer
			.authAgentFor(memberC)
			.get(`/credentials/${resolvable.id}`)
			.expect(200);

		expect(response.body.data.scopes).toContain('credential:connect');
		expect(response.body.data.scopes).toContain('credential:read');
		expect(response.body.data.scopes).not.toContain('credential:update');
	});

	test('PATCH /credentials/:id — allows setting a shared credential as dynamic', async () => {
		const staticCred = await saveStaticCredential();
		const otherProject = await createTeamProject(undefined, memberA);

		await testServer
			.authAgentFor(memberA)
			.put(`/credentials/${staticCred.id}/share`)
			.send({ shareWithIds: [otherProject.id] })
			.expect(200);

		const existing = await testServer
			.authAgentFor(memberA)
			.get(`/credentials/${staticCred.id}`)
			.query({ includeData: true })
			.expect(200);
		const { name, type, data } = existing.body.data;

		await testServer
			.authAgentFor(memberA)
			.patch(`/credentials/${staticCred.id}`)
			.send({ name, type, data: data ?? {}, isResolvable: true })
			.expect(200);

		const after = await testServer
			.authAgentFor(memberA)
			.get(`/credentials/${staticCred.id}`)
			.query({ includeData: true })
			.expect(200);
		expect(after.body.data.isResolvable).toBe(true);
	});

	test('PUT /credentials/:id/share — allows unsharing a shared dynamic credential', async () => {
		const resolvable = await saveResolvableCredential();
		const otherProject = await createTeamProject(undefined, memberA);
		await shareCredentialWithProjects(resolvable, [otherProject]);

		await testServer
			.authAgentFor(memberA)
			.put(`/credentials/${resolvable.id}/share`)
			.send({ shareWithIds: [] })
			.expect(200);

		const sharings = await getCredentialSharings(resolvable);
		expect(sharings.some((s) => s.role === 'credential:user')).toBe(false);
	});
});

describe('POST /credentials — end-user credential creation is role-restricted', () => {
	test('project editor cannot create an end-user credential in a team project', async () => {
		await testServer
			.authAgentFor(memberB)
			.post('/credentials')
			.send({ ...randomCredentialPayload(), isResolvable: true, projectId: teamProject.id })
			.expect(403);
	});

	test('project editor can still create a fixed credential in a team project', async () => {
		await testServer
			.authAgentFor(memberB)
			.post('/credentials')
			.send({ ...randomCredentialPayload(), isResolvable: false, projectId: teamProject.id })
			.expect(200);
	});

	test('project admin can create an end-user credential in a team project', async () => {
		await testServer
			.authAgentFor(memberA)
			.post('/credentials')
			.send({ ...randomCredentialPayload(), isResolvable: true, projectId: teamProject.id })
			.expect(200);
	});

	test('instance admin can create an end-user credential in a team project without membership', async () => {
		const admin = await createAdmin();
		await testServer
			.authAgentFor(admin)
			.post('/credentials')
			.send({ ...randomCredentialPayload(), isResolvable: true, projectId: teamProject.id })
			.expect(200);
	});

	test('member can create an end-user credential in their personal project', async () => {
		await testServer
			.authAgentFor(memberB)
			.post('/credentials')
			.send({ ...randomCredentialPayload(), isResolvable: true })
			.expect(200);
	});
});

describe('PATCH /credentials/:id — switching to end-user is role-restricted', () => {
	test('project editor cannot switch a team credential to end-user', async () => {
		const staticCred = await saveStaticCredential();
		await testServer
			.authAgentFor(memberB)
			.patch(`/credentials/${staticCred.id}`)
			.send({ name: staticCred.name, type: staticCred.type, data: {}, isResolvable: true })
			.expect(403);
	});

	test('project editor cannot switch an end-user credential back to fixed', async () => {
		const resolvableCred = await saveResolvableCredential();
		await testServer
			.authAgentFor(memberB)
			.patch(`/credentials/${resolvableCred.id}`)
			.send({
				name: resolvableCred.name,
				type: resolvableCred.type,
				data: {},
				isResolvable: false,
			})
			.expect(403);
	});

	test('project admin can switch an end-user credential back to fixed', async () => {
		const resolvableCred = await saveResolvableCredential();
		await testServer
			.authAgentFor(memberA)
			.patch(`/credentials/${resolvableCred.id}`)
			.send({
				name: resolvableCred.name,
				type: resolvableCred.type,
				data: {},
				isResolvable: false,
			})
			.expect(200);
	});

	test('project admin can switch a team credential to end-user', async () => {
		const staticCred = await saveStaticCredential();
		await testServer
			.authAgentFor(memberA)
			.patch(`/credentials/${staticCred.id}`)
			.send({ name: staticCred.name, type: staticCred.type, data: {}, isResolvable: true })
			.expect(200);
	});

	test('editor updates that do not change isResolvable remain allowed', async () => {
		const resolvableCred = await saveResolvableCredential();
		await testServer
			.authAgentFor(memberB)
			.patch(`/credentials/${resolvableCred.id}`)
			.send({
				name: 'renamed by editor',
				type: resolvableCred.type,
				data: {},
				isResolvable: true,
			})
			.expect(200);
	});
});

describe('PUT /credentials/:id/transfer — end-user credentials are role-restricted', () => {
	test('editor cannot transfer their personal end-user credential into a team project', async () => {
		const resolvable = await saveCredential(randomCredentialPayload({ isResolvable: true }), {
			user: memberB,
			role: 'credential:owner',
		});

		await testServer
			.authAgentFor(memberB)
			.put(`/credentials/${resolvable.id}/transfer`)
			.send({ destinationProjectId: teamProject.id })
			.expect(403);
	});

	test('project admin can transfer an end-user credential into their team project', async () => {
		const resolvable = await saveCredential(randomCredentialPayload({ isResolvable: true }), {
			user: memberA,
			role: 'credential:owner',
		});

		await testServer
			.authAgentFor(memberA)
			.put(`/credentials/${resolvable.id}/transfer`)
			.send({ destinationProjectId: teamProject.id })
			.expect(200);
	});

	test('editor can still transfer a fixed credential into the team project', async () => {
		const staticCred = await saveCredential(randomCredentialPayload(), {
			user: memberB,
			role: 'credential:owner',
		});

		await testServer
			.authAgentFor(memberB)
			.put(`/credentials/${staticCred.id}/transfer`)
			.send({ destinationProjectId: teamProject.id })
			.expect(200);
	});
});

describe('DELETE /credentials/:id — end-user credentials are role-restricted', () => {
	test('project editor cannot delete an end-user credential', async () => {
		const resolvableCred = await saveResolvableCredential();
		await testServer.authAgentFor(memberB).delete(`/credentials/${resolvableCred.id}`).expect(403);
	});

	test('project editor can still delete a fixed credential', async () => {
		const staticCred = await saveStaticCredential();
		await testServer.authAgentFor(memberB).delete(`/credentials/${staticCred.id}`).expect(200);
	});

	test('project admin can delete an end-user credential', async () => {
		const resolvableCred = await saveResolvableCredential();
		await testServer.authAgentFor(memberA).delete(`/credentials/${resolvableCred.id}`).expect(200);
	});
});
