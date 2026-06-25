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
import { createMember } from '../shared/db/users';
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
		const findSpy = jest.spyOn(repository, 'find');

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

describe('Sharing and dynamic credentials are mutually exclusive', () => {
	test('PUT /credentials/:id/share — rejects sharing a dynamic credential', async () => {
		const resolvable = await saveResolvableCredential();
		const otherProject = await createTeamProject(undefined, memberA);

		await testServer
			.authAgentFor(memberA)
			.put(`/credentials/${resolvable.id}/share`)
			.send({ shareWithIds: [otherProject.id] })
			.expect(400);

		const sharings = await getCredentialSharings(resolvable);
		expect(sharings.some((s) => s.role === 'credential:user')).toBe(false);
	});

	test('PATCH /credentials/:id — rejects setting a shared credential as dynamic', async () => {
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
			.expect(400);

		const after = await testServer
			.authAgentFor(memberA)
			.get(`/credentials/${staticCred.id}`)
			.query({ includeData: true })
			.expect(200);
		expect(after.body.data.isResolvable).toBe(false);
	});

	test('PUT /credentials/:id/share — still allows unsharing an already-shared dynamic credential', async () => {
		const resolvable = await saveResolvableCredential();
		const otherProject = await createTeamProject(undefined, memberA);
		// Seed a pre-existing share directly: the API would no longer let this state be created,
		// but legacy data may exist and must still be removable.
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
