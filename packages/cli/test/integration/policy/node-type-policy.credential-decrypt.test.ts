/**
 * Pins the credential lock on the real path: the real store behind the real `@PolicyCheck()`,
 * with `CredentialsHelper.getDecrypted` as the host. The pair of cases is the point — a lock
 * keyed on the credential's type would pass the refusal and fail the hand-over.
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
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';
import { clearPolicyCache } from './shared/policy-cache';

const CHECK_ID = 'node-type-availability';

const SLACK = 'n8n-nodes-base.slack';
const HTTP_REQUEST = 'n8n-nodes-base.httpRequest';

const testServer = utils.setupTestServer({
	endpointGroups: ['type-availability-policies'],
	modules: ['policy-infrastructure', 'type-availability-policies'],
	enabledFeatures: [LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES],
});

let owner: User;
let ownerAgent: SuperAgentTest;
let additionalData: IWorkflowExecuteAdditionalData;

/** Only `node` is read: the helper passes it on as the check's consumer. */
const askingAs = (nodeType: string) => ({ node: { type: nodeType } }) as IExecuteData;

/**
 * `raw` returns the stored data before overwrites and defaults, which keeps the credential type
 * out of the node registry — the check reads the asking node's type, never the credential's.
 */
async function decryptAskingAs(nodeType?: string) {
	const credential = await saveCredential(
		{ name: 'Slack account', type: 'slackApi', data: { accessToken: 'secret' } },
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

async function denySlackAtInstanceScope() {
	const response = await ownerAgent.put('/node-type-policies/instance').send({
		rules: [{ id: 'deny-slack', action: 'deny', selector: { kind: 'name', value: SLACK } }],
		defaultAction: 'allow',
		version: 0,
	});

	expect(response.statusCode).toBe(200);
}

beforeAll(async () => {
	// Asserted by id, not by importing the class: the import would register the check itself,
	// and the refusal below would pass with the module no longer registering it.
	const registeredIds = Container.get(PolicyCheckMetadata)
		.getClasses()
		.map((checkClass) => Container.get(checkClass).id);
	expect(registeredIds).toContain(CHECK_ID);

	owner = await createOwner();
	ownerAgent = testServer.authAgentFor(owner);

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

describe('credential lock', () => {
	test('refuses to decrypt for a node type the policy blocks', async () => {
		await denySlackAtInstanceScope();

		await expect(decryptAskingAs(SLACK)).rejects.toMatchObject({
			httpStatusCode: 403,
			violations: [
				{
					kind: 'node-type-unavailable',
					checkId: CHECK_ID,
					message: `Node type "${SLACK}" is blocked by an instance policy`,
					subject: SLACK,
					subjectType: 'nodeType',
					scope: 'instance',
					matchedRuleId: 'deny-slack',
				},
			],
		});
	});

	test('hands the same credential to a node type the policy allows', async () => {
		await denySlackAtInstanceScope();

		await expect(decryptAskingAs(HTTP_REQUEST)).resolves.toEqual({ accessToken: 'secret' });
	});

	test('decrypts when no node is asking, because the lock has no consumer to read', async () => {
		await denySlackAtInstanceScope();

		await expect(decryptAskingAs()).resolves.toEqual({ accessToken: 'secret' });
	});

	test('decrypts for any node type while no rule denies one', async () => {
		await expect(decryptAskingAs(SLACK)).resolves.toEqual({ accessToken: 'secret' });
	});
});
