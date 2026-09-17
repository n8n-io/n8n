/**
 * Integration test for the `credentialDecrypt` policy enforcement point on the
 * main process.
 *
 * Unlike the unit tests in `credentials-helper.test.ts`, which stub
 * `PolicyEnforcementService`, this drives the real `policy-infrastructure`
 * module wiring: a real `@PolicyCheck()` registered in `PolicyCheckMetadata`,
 * run by the real `PolicyDecisionService`, against a real DB-backed
 * credential. It pins that `CredentialsHelper.getDecrypted` enforces a
 * registered check before decrypting on this instance type (IAM-1133).
 */
import { ModuleRegistry } from '@n8n/backend-common';
import { testDb, testModules } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import {
	PolicyCheck,
	type CredentialDecryptContext,
	type PolicyCheckResult,
	type RegisteredPolicyCheck,
} from '@n8n/decorators';
import type { IExecuteData, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

import { CredentialsHelper } from '@/credentials-helper';

import { saveCredential } from '../shared/db/credentials';
import { createOwner } from '../shared/db/users';

const BLOCKED_CREDENTIAL_TYPE = 'iam1133TestCredential';
const BLOCKED_NODE_TYPE = 'n8n-nodes-base.iam1133BlockedConsumer';
const CHECK_ID = 'iam1133.deny-blocked-consumer';

const consumerOf = (nodeType: string): IExecuteData =>
	({ node: { type: nodeType } }) as IExecuteData;

// `raw: true` short-circuits before `getDecrypted` reads anything else off this
// object, so an empty additionalData is enough — no need for the real `getBase()`
// factory (which touches variables/ownership lookups unrelated to this test).
const additionalData = {} as IWorkflowExecuteAdditionalData;

/** Test-only fixture: denies decryption for one consumer/credential-type pair, allows everything else. */
@PolicyCheck()
export class DenyBlockedConsumerCheck implements RegisteredPolicyCheck {
	readonly id = CHECK_ID;

	async onCredentialDecrypt(ctx: CredentialDecryptContext): Promise<PolicyCheckResult> {
		const isBlocked =
			ctx.credentialType === BLOCKED_CREDENTIAL_TYPE &&
			ctx.consumer?.nodeType === BLOCKED_NODE_TYPE;

		if (!isBlocked) return { violations: [] };

		return {
			violations: [
				{
					kind: 'credential-locked',
					checkId: CHECK_ID,
					message: `${BLOCKED_NODE_TYPE} is not allowed to decrypt ${BLOCKED_CREDENTIAL_TYPE}`,
					subject: BLOCKED_CREDENTIAL_TYPE,
					subjectType: 'credential-type',
				},
			],
		};
	}
}

describe('credentialDecrypt policy enforcement — main process', () => {
	let owner: User;

	beforeAll(async () => {
		await testModules.loadModules(['policy-infrastructure']);
		await testDb.init();

		// Runs the real module wiring: `PolicyInfrastructureModule.init()` registers
		// `PolicyDecisionService` (which reads `DenyBlockedConsumerCheck` above) as the
		// `PolicyEnforcementService` implementation.
		await Container.get(ModuleRegistry).initModules('main');

		owner = await createOwner();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function saveTestCredential() {
		return await saveCredential(
			{
				name: 'IAM-1133 test credential',
				type: BLOCKED_CREDENTIAL_TYPE,
				data: { token: 'secret' },
			},
			{ user: owner, role: 'credential:owner' },
		);
	}

	it('fails decryption with a structured violation for the blocked consumer', async () => {
		const credential = await saveTestCredential();

		await expect(
			Container.get(CredentialsHelper).getDecrypted(
				additionalData,
				{ id: credential.id, name: credential.name },
				credential.type,
				'internal',
				consumerOf(BLOCKED_NODE_TYPE),
				true,
			),
		).rejects.toMatchObject({
			httpStatusCode: 403,
			violations: [
				expect.objectContaining({ checkId: CHECK_ID, subject: BLOCKED_CREDENTIAL_TYPE }),
			],
		});
	});

	it('still decrypts for a consumer the check does not block', async () => {
		const credential = await saveTestCredential();

		const decrypted = await Container.get(CredentialsHelper).getDecrypted(
			additionalData,
			{ id: credential.id, name: credential.name },
			credential.type,
			'internal',
			consumerOf('n8n-nodes-base.noOp'),
			true,
		);

		expect(decrypted).toEqual({ token: 'secret' });
	});
});
