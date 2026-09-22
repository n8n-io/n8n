/**
 * Pins the lock this check exists for, on the real path: a blocked credential type is refused
 * whichever node asks, and with no node asking at all. The trio of cases is the point — a lock
 * keyed on the asking node would pass the first refusal and fail the other two.
 */
import { testDb } from '@n8n/backend-test-utils';
import { LICENSE_FEATURES } from '@n8n/constants';
import { ProjectRepository, type User } from '@n8n/db';
import { PolicyCheckMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { IExecuteData, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

import { CredentialsHelper } from '@/credentials-helper';

import { saveCredential } from '../shared/db/credentials';
import { createOwner } from '../shared/db/users';
import * as utils from '../shared/utils/';
import { denyRule, putCredentialTypePolicy } from './shared/credential-type-policy';
import { clearPolicyCache } from './shared/policy-cache';

const CHECK_ID = 'credential-type-availability';

const SLACK_NODE = 'n8n-nodes-base.slack';
const HTTP_REQUEST = 'n8n-nodes-base.httpRequest';

const SLACK_API = 'slackApi';

utils.setupTestServer({
	endpointGroups: ['type-availability-policies'],
	modules: ['policy-infrastructure', 'type-availability-policies'],
	enabledFeatures: [LICENSE_FEATURES.NODE_TYPE_POLICIES],
});

let owner: User;
let additionalData: IWorkflowExecuteAdditionalData;

/** Only `node` is read: the helper passes it on as the check's consumer. */
const askingAs = (nodeType: string) => ({ node: { type: nodeType } }) as IExecuteData;

/** `raw` returns the stored data before overwrites and defaults, which needs no node registry. */
async function decryptAskingAs(nodeType?: string, credentialType = SLACK_API) {
	const credential = await saveCredential(
		{ name: `${credentialType} account`, type: credentialType, data: { accessToken: 'secret' } },
		{ user: owner, role: 'credential:owner' },
	);

	return await Container.get(CredentialsHelper).getDecrypted(
		additionalData,
		{ id: credential.id, name: credential.name },
		credential.type,
		'internal',
		nodeType === undefined ? undefined : askingAs(nodeType),
		true,
	);
}

const denySlackAtInstanceScope = async () =>
	await putCredentialTypePolicy(null, { rules: [denyRule('deny-slack', SLACK_API)] });

const expectedViolation = {
	kind: 'credential-type-unavailable',
	checkId: CHECK_ID,
	message: `Credential type "${SLACK_API}" is blocked by an instance policy`,
	subject: SLACK_API,
	subjectType: 'credentialType',
	scope: 'instance',
	matchedRuleId: 'deny-slack',
};

beforeAll(async () => {
	// Asserted by id, not by importing the class: the import would register the check itself,
	// and the refusals below would pass with the module no longer registering it.
	const registeredIds = Container.get(PolicyCheckMetadata)
		.getClasses()
		.map((checkClass) => Container.get(checkClass).id);
	expect(registeredIds).toContain(CHECK_ID);

	owner = await createOwner();

	const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
		owner.id,
	);
	additionalData = { projectId: personalProject.id } as IWorkflowExecuteAdditionalData;
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

describe('credential type lock', () => {
	test('refuses to decrypt for the node the credential belongs to', async () => {
		await denySlackAtInstanceScope();

		await expect(decryptAskingAs(SLACK_NODE)).rejects.toMatchObject({
			httpStatusCode: 403,
			violations: [expectedViolation],
		});
	});

	test('refuses to decrypt for any other node, which a node policy alone would allow', async () => {
		await denySlackAtInstanceScope();

		await expect(decryptAskingAs(HTTP_REQUEST)).rejects.toMatchObject({
			httpStatusCode: 403,
			violations: [expectedViolation],
		});
	});

	test('refuses to decrypt when no node is asking, e.g. a credential test', async () => {
		await denySlackAtInstanceScope();

		await expect(decryptAskingAs()).rejects.toMatchObject({
			httpStatusCode: 403,
			violations: [expectedViolation],
		});
	});

	test('decrypts a credential of a type no rule denies', async () => {
		await denySlackAtInstanceScope();

		await expect(decryptAskingAs(SLACK_NODE, 'httpBasicAuth')).resolves.toEqual({
			accessToken: 'secret',
		});
	});

	test('decrypts while no rule denies anything', async () => {
		await expect(decryptAskingAs(SLACK_NODE)).resolves.toEqual({ accessToken: 'secret' });
	});
});
