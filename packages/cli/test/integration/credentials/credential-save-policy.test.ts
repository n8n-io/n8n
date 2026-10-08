import { createTeamProject, randomCredentialPayload, testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { CredentialsRepository, SharedCredentialsRepository } from '@n8n/db';
import type {
	CredentialSaveContext,
	PolicyCheckResult,
	PolicyViolation,
	RegisteredPolicyCheck,
} from '@n8n/decorators';
import { PolicyCheck, PolicyCheckMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { saveCredential } from '../shared/db/credentials';
import { createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { initCredentialsTypes, setupTestServer } from '../shared/utils';

/**
 * Pins the `credentialSave` host wiring on the real request path: a registered check that denies
 * every save has to block both the editor and the public API, with its violations in the body.
 * Unit tests construct the services directly, so only this proves the call sites are still there.
 */

const CHECK_ID = 'integration-test-credential-save';

const DENIAL: PolicyViolation = {
	kind: 'test-denial',
	checkId: CHECK_ID,
	message: 'Denied by the test policy check',
	subject: 'githubApi',
	subjectType: 'credentialType',
};

/**
 * `allow` by default: the check registers process-wide when this file is loaded and
 * `PolicyCheckMetadata` has no unregister, so a leak into another suite has to be a no-op.
 */
let mode: 'allow' | 'deny' | 'break' = 'allow';
let lastContext: CredentialSaveContext | null = null;

@PolicyCheck()
class TestCredentialSaveCheck implements RegisteredPolicyCheck {
	readonly id = CHECK_ID;

	async onCredentialSave(ctx: CredentialSaveContext): Promise<PolicyCheckResult> {
		lastContext = ctx;
		if (mode === 'break') throw new Error('Test check failed on purpose');

		return await Promise.resolve({ violations: mode === 'deny' ? [DENIAL] : [] });
	}
}

const testServer = setupTestServer({
	endpointGroups: ['credentials', 'publicApi'],
	modules: ['policy-infrastructure'],
});

let owner: User;
let editorAgent: SuperAgentTest;
let publicApiAgent: SuperAgentTest;
let credentialsRepository: CredentialsRepository;

const truncate = async () =>
	await testDb.truncate(['SharedCredentials', 'CredentialsEntity', 'Project', 'User']);

beforeAll(async () => {
	await initCredentialsTypes();
	credentialsRepository = Container.get(CredentialsRepository);
});

beforeEach(async () => {
	mode = 'allow';
	lastContext = null;
	await truncate();

	owner = await createOwnerWithApiKey();
	editorAgent = testServer.authAgentFor(owner);
	publicApiAgent = testServer.publicApiAgentFor(owner);
});

test('registers the test check, so a denial below can only come from it', () => {
	expect(Container.get(PolicyCheckMetadata).getClasses()).toContain(TestCredentialSaveCheck);
});

describe('with a check that denies every save', () => {
	beforeEach(() => {
		mode = 'deny';
	});

	test('editor create fails with 403 and the violations', async () => {
		const response = await editorAgent.post('/credentials').send(randomCredentialPayload());

		expect(response.statusCode).toBe(403);
		expect(response.body).toMatchObject({
			code: 403,
			message: DENIAL.message,
			meta: { violations: [DENIAL] },
		});
		await expect(credentialsRepository.count()).resolves.toBe(0);
	});

	test('editor create into a team project fails with 403', async () => {
		const project = await createTeamProject('Policed project', owner);

		const response = await editorAgent
			.post('/credentials')
			.send({ ...randomCredentialPayload(), projectId: project.id });

		expect(response.statusCode).toBe(403);
		expect(response.body).toMatchObject({ meta: { violations: [DENIAL] } });
		expect(lastContext).toMatchObject({ storedCredential: null, projectId: project.id });
		await expect(credentialsRepository.count()).resolves.toBe(0);
	});

	test('editor create of a provider connection fails with 403', async () => {
		const response = await editorAgent
			.post('/credentials')
			.send({ ...randomCredentialPayload(), usageScope: 'instance' });

		expect(response.statusCode).toBe(403);
		expect(response.body).toMatchObject({ meta: { violations: [DENIAL] } });
		expect(lastContext).toMatchObject({ storedCredential: null, projectId: null });
		await expect(credentialsRepository.count()).resolves.toBe(0);
	});

	test('editor update fails with 403 and the violations', async () => {
		const credential = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});

		// The editor route needs the whole payload, unlike the public API's partial update.
		const response = await editorAgent
			.patch(`/credentials/${credential.id}`)
			.send({ ...randomCredentialPayload(), name: 'Renamed' });

		expect(response.statusCode).toBe(403);
		expect(response.body).toMatchObject({
			code: 403,
			message: DENIAL.message,
			meta: { violations: [DENIAL] },
		});
		const stored = await credentialsRepository.findOneByOrFail({ id: credential.id });
		expect(stored.name).toBe(credential.name);
	});

	test('public API create fails with 403 and the violations', async () => {
		const { name, type, data } = randomCredentialPayload();

		const response = await publicApiAgent.post('/credentials').send({ name, type, data });

		expect(response.statusCode).toBe(403);
		expect(response.body).toEqual({ message: DENIAL.message, violations: [DENIAL] });
		await expect(credentialsRepository.count()).resolves.toBe(0);
	});

	test('public API update fails with 403 and the violations', async () => {
		const credential = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});

		const response = await publicApiAgent
			.patch(`/credentials/${credential.id}`)
			.send({ name: 'Renamed' });

		expect(response.statusCode).toBe(403);
		expect(response.body).toEqual({ message: DENIAL.message, violations: [DENIAL] });
		const stored = await credentialsRepository.findOneByOrFail({ id: credential.id });
		expect(stored.name).toBe(credential.name);
	});
});

describe('with the same check reporting nothing', () => {
	test('editor create succeeds and persists the owner row', async () => {
		const response = await editorAgent.post('/credentials').send(randomCredentialPayload());

		expect(response.statusCode).toBe(200);
		const { data } = response.body as { data: { id: string } };
		await expect(credentialsRepository.findOneByOrFail({ id: data.id })).resolves.toBeDefined();
		await expect(
			Container.get(SharedCredentialsRepository).countBy({
				credentialsId: data.id,
				role: 'credential:owner',
			}),
		).resolves.toBe(1);
	});

	// The host loads the stored type from the database so a check can grandfather an edit
	// that keeps it. Both types and the owning project have to reach the check.
	test('editor update hands the check the stored type and the owning project', async () => {
		const project = await createTeamProject('Policed project', owner);
		const credential = await saveCredential(randomCredentialPayload({ type: 'githubApi' }), {
			project,
			role: 'credential:owner',
		});

		const response = await editorAgent
			.patch(`/credentials/${credential.id}`)
			.send({ ...randomCredentialPayload({ type: 'githubApi' }), name: 'Renamed' });

		expect(response.statusCode).toBe(200);
		expect(lastContext).toEqual({
			credential: { id: credential.id, type: 'githubApi' },
			storedCredential: { id: credential.id, type: 'githubApi' },
			projectId: project.id,
		});
		const stored = await credentialsRepository.findOneByOrFail({ id: credential.id });
		expect(stored.name).toBe('Renamed');
	});

	test('public API create succeeds', async () => {
		const { name, type, data } = randomCredentialPayload();

		const response = await publicApiAgent.post('/credentials').send({ name, type, data });

		expect(response.statusCode).toBe(200);
		const { id } = response.body as { id: string };
		await expect(credentialsRepository.findOneByOrFail({ id })).resolves.toMatchObject({ name });
	});
});

// A check that didn't answer hasn't said yes: the save is blocked, but nothing about why —
// an infrastructure fault rendered as a policy rule is something a user would try to satisfy.
test('a check that breaks blocks the save without leaking violations', async () => {
	mode = 'break';

	const response = await editorAgent.post('/credentials').send(randomCredentialPayload());

	expect(response.statusCode).toBe(503);
	const { meta } = response.body as { meta: Record<string, unknown> };
	expect(meta.violations).toBeUndefined();
	await expect(credentialsRepository.count()).resolves.toBe(0);
});
