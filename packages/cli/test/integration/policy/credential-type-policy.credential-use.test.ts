/**
 * Pins the credential policy on the routes that decrypt a stored credential to call its provider
 * without going through a workflow run: the test, probe and public API test routes.
 */
import { createTeamProject, testDb } from '@n8n/backend-test-utils';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { CredentialsEntity, Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { CredentialsTester } from '@/services/credentials-tester.service';

import { saveCredential } from '../shared/db/credentials';
import { createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';
import { denyRule, putCredentialTypePolicy } from './shared/credential-type-policy';
import { clearPolicyCache } from './shared/policy-cache';

const GITHUB_API = 'githubApi';

const testServer = utils.setupTestServer({
	endpointGroups: ['credentials', 'publicApi', 'type-availability-policies'],
	modules: ['policy-infrastructure', 'type-availability-policies'],
	enabledFeatures: [LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES],
});

const credentialsTester = mock<CredentialsTester>();
Container.set(CredentialsTester, credentialsTester);

let owner: User;
let ownerAgent: SuperAgentTest;
let publicApiAgent: SuperAgentTest;

const PROBEABLE_DATA = {
	accessToken: 'secret',
	testUrl: 'https://api.example.com/me',
	serviceOrigin: 'https://api.example.com',
};

async function saveGithubCredential(owner: { user: User } | { project: Project }) {
	return await saveCredential(
		{ name: 'GitHub account', type: GITHUB_API, data: PROBEABLE_DATA },
		{ ...owner, role: 'credential:owner' },
	);
}

const denyGithub = async (projectId: string | null) =>
	await putCredentialTypePolicy(ownerAgent, projectId, {
		rules: [denyRule('deny-github', GITHUB_API)],
	});

const testRoute = async (credential: CredentialsEntity) =>
	await ownerAgent.post('/credentials/test').send({
		credentials: { id: credential.id, name: credential.name, type: credential.type, data: {} },
	});

beforeAll(async () => {
	owner = await createOwnerWithApiKey();
	ownerAgent = testServer.authAgentFor(owner);
	publicApiAgent = testServer.publicApiAgentFor(owner);

	await utils.initCredentialsTypes();
});

beforeEach(() => {
	credentialsTester.testCredentials.mockResolvedValue({ status: 'OK', message: 'Tested' });
	credentialsTester.probeCredentialAuth.mockResolvedValue({
		status: 'OK',
		message: 'Tested',
		outcome: 'accepted',
	});
});

afterEach(async () => {
	vi.clearAllMocks();
	await testDb.truncate([
		'TypeAvailabilityPolicyAttachment',
		'TypeAvailabilityPolicyScope',
		'TypeAvailabilityPolicy',
		'SharedCredentials',
		'CredentialsEntity',
	]);
	await clearPolicyCache();
});

describe('a credential of a type an instance policy blocks', () => {
	test('POST /credentials/test is refused before the tester runs', async () => {
		const credential = await saveGithubCredential({ user: owner });
		await denyGithub(null);

		const response = await testRoute(credential);

		expect(response.statusCode).toBe(403);
		expect(response.body.message).toBe(
			`Credential type "${GITHUB_API}" is blocked by an instance policy`,
		);
		expect(credentialsTester.testCredentials).not.toHaveBeenCalled();
	});

	test('POST /credentials/:id/probe is refused before the probe runs', async () => {
		const credential = await saveGithubCredential({ user: owner });
		await denyGithub(null);

		const response = await ownerAgent.post(`/credentials/${credential.id}/probe`);

		expect(response.statusCode).toBe(403);
		expect(credentialsTester.probeCredentialAuth).not.toHaveBeenCalled();
	});

	test('public API POST /credentials/:id/test is refused before the tester runs', async () => {
		const credential = await saveGithubCredential({ user: owner });
		await denyGithub(null);

		const response = await publicApiAgent.post(`/credentials/${credential.id}/test`);

		expect(response.statusCode).toBe(403);
		expect(credentialsTester.testCredentials).not.toHaveBeenCalled();
	});

	test('POST /credentials/test is refused when the posted type is the blocked one', async () => {
		const credential = await saveGithubCredential({ user: owner });
		await putCredentialTypePolicy(ownerAgent, null, {
			rules: [denyRule('deny-header-auth', 'httpHeaderAuth')],
		});

		const response = await ownerAgent.post('/credentials/test').send({
			credentials: { id: credential.id, name: credential.name, type: 'httpHeaderAuth', data: {} },
		});

		expect(response.statusCode).toBe(403);
		expect(credentialsTester.testCredentials).not.toHaveBeenCalled();
	});

	test('an unsaved instance credential test is refused', async () => {
		await denyGithub(null);

		const response = await ownerAgent.post('/credentials/test').send({
			credentials: { id: '', name: 'GitHub account', type: GITHUB_API, data: {} },
		});

		expect(response.statusCode).toBe(403);
		expect(credentialsTester.testCredentials).not.toHaveBeenCalled();
	});
});

describe('a credential of a type a project policy blocks', () => {
	test('is refused when the blocking project owns it', async () => {
		const project = await createTeamProject('Blocking project', owner);
		const credential = await saveGithubCredential({ project });
		await denyGithub(project.id);

		const response = await testRoute(credential);

		expect(response.statusCode).toBe(403);
		expect(credentialsTester.testCredentials).not.toHaveBeenCalled();
	});

	test('still tests when another project owns it', async () => {
		const blockingProject = await createTeamProject('Blocking project', owner);
		await denyGithub(blockingProject.id);
		const credential = await saveGithubCredential({ user: owner });

		const response = await testRoute(credential);

		expect(response.statusCode).toBe(200);
		expect(credentialsTester.testCredentials).toHaveBeenCalledOnce();
	});
});

describe('a credential of a type no rule denies', () => {
	test('tests and probes as before', async () => {
		const credential = await saveGithubCredential({ user: owner });
		await putCredentialTypePolicy(ownerAgent, null, {
			rules: [denyRule('deny-slack', 'slackApi')],
		});

		expect((await testRoute(credential)).statusCode).toBe(200);
		expect((await ownerAgent.post(`/credentials/${credential.id}/probe`)).statusCode).toBe(200);
		expect(credentialsTester.testCredentials).toHaveBeenCalledOnce();
		expect(credentialsTester.probeCredentialAuth).toHaveBeenCalledOnce();
	});
});
