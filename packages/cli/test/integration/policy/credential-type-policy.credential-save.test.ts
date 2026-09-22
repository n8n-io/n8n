/**
 * Pins the build-experience half of the policy: a blocked credential type cannot be created,
 * while a credential that predates the rule stays editable. The lock belongs at decryption,
 * so the refusal here is about not letting someone set up what can never work.
 */
import { createTeamProject, randomCredentialPayload, testDb } from '@n8n/backend-test-utils';
import { LICENSE_FEATURES } from '@n8n/constants';
import { CredentialsRepository, type User } from '@n8n/db';
import { PolicyCheckMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { saveCredential } from '../shared/db/credentials';
import { createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';
import { denyRule, putCredentialTypePolicy } from './shared/credential-type-policy';
import { clearPolicyCache } from './shared/policy-cache';

const CHECK_ID = 'credential-type-availability';

const BLOCKED = 'githubApi';
const ALLOWED = 'httpBasicAuth';

const testServer = utils.setupTestServer({
	endpointGroups: ['credentials', 'type-availability-policies'],
	modules: ['policy-infrastructure', 'type-availability-policies'],
	enabledFeatures: [
		LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES,
		LICENSE_FEATURES.SHARING,
		LICENSE_FEATURES.ADVANCED_PERMISSIONS,
	],
});

let owner: User;
let ownerAgent: SuperAgentTest;
let credentialsRepository: CredentialsRepository;

const denyGithubAtInstanceScope = async () =>
	await putCredentialTypePolicy(ownerAgent, null, { rules: [denyRule('deny-github', BLOCKED)] });

const violationFor = (credentialType: string, scope: 'instance' | 'project', ruleId: string) => ({
	kind: 'credential-type-unavailable',
	checkId: CHECK_ID,
	message: `Credential type "${credentialType}" is blocked by ${scope === 'instance' ? 'an instance policy' : "this project's policy"}`,
	subject: credentialType,
	subjectType: 'credentialType',
	scope,
	matchedRuleId: ruleId,
});

beforeAll(async () => {
	// Asserted by id, not by importing the class: the import would register the check itself,
	// and the refusals below would pass with the module no longer registering it.
	const registeredIds = Container.get(PolicyCheckMetadata)
		.getClasses()
		.map((checkClass) => Container.get(checkClass).id);
	expect(registeredIds).toContain(CHECK_ID);

	await utils.initCredentialsTypes();
	credentialsRepository = Container.get(CredentialsRepository);

	owner = await createOwner();
	ownerAgent = testServer.authAgentFor(owner);
});

afterEach(async () => {
	await testDb.truncate([
		'TypeAvailabilityPolicyAttachment',
		'TypeAvailabilityPolicyScope',
		'TypeAvailabilityPolicy',
		'SharedCredentials',
		'CredentialsEntity',
	]);
	await clearPolicyCache();
});

describe('POST /credentials', () => {
	test('refuses a credential of a blocked type and writes nothing', async () => {
		await denyGithubAtInstanceScope();

		const response = await ownerAgent
			.post('/credentials')
			.send(randomCredentialPayload({ type: BLOCKED }))
			.expect(403);

		expect(response.body).toMatchObject({
			code: 403,
			meta: { violations: [violationFor(BLOCKED, 'instance', 'deny-github')] },
		});
		await expect(credentialsRepository.count()).resolves.toBe(0);
	});

	test('creates a credential of a type no rule denies', async () => {
		await denyGithubAtInstanceScope();

		await ownerAgent
			.post('/credentials')
			.send(randomCredentialPayload({ type: ALLOWED }))
			.expect(200);
	});

	test('judges a credential created in a project against that project', async () => {
		const project = await createTeamProject('Policy project', owner);
		await putCredentialTypePolicy(ownerAgent, project.id, {
			rules: [denyRule('deny-github', BLOCKED)],
		});

		const response = await ownerAgent
			.post('/credentials')
			.send({ ...randomCredentialPayload({ type: BLOCKED }), projectId: project.id })
			.expect(403);

		expect(response.body.meta.violations).toEqual([
			violationFor(BLOCKED, 'project', 'deny-github'),
		]);
		await expect(credentialsRepository.count()).resolves.toBe(0);
	});
});

describe('PATCH /credentials/:credentialId', () => {
	test('keeps a credential that predates the rule editable', async () => {
		const credential = await saveCredential(randomCredentialPayload({ type: BLOCKED }), {
			user: owner,
			role: 'credential:owner',
		});
		await denyGithubAtInstanceScope();

		// The editor route needs the whole payload, unlike the public API's partial update.
		await ownerAgent
			.patch(`/credentials/${credential.id}`)
			.send({ ...randomCredentialPayload({ type: BLOCKED }), name: 'Renamed' })
			.expect(200);

		const stored = await credentialsRepository.findOneBy({ id: credential.id });
		expect(stored?.name).toBe('Renamed');
	});

	test('refuses switching an existing credential onto a blocked type', async () => {
		const credential = await saveCredential(randomCredentialPayload({ type: ALLOWED }), {
			user: owner,
			role: 'credential:owner',
		});
		await denyGithubAtInstanceScope();

		const response = await ownerAgent
			.patch(`/credentials/${credential.id}`)
			.send({ ...randomCredentialPayload({ type: BLOCKED }), name: credential.name })
			.expect(403);

		expect(response.body.meta.violations).toEqual([
			violationFor(BLOCKED, 'instance', 'deny-github'),
		]);

		const stored = await credentialsRepository.findOneBy({ id: credential.id });
		expect(stored?.type).toBe(ALLOWED);
	});
});
