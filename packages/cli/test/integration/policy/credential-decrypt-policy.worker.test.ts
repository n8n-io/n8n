process.argv[2] = 'worker';

/**
 * Integration test for the `credentialDecrypt` policy enforcement point on a
 * queue-mode worker process.
 *
 * Mirrors `credential-decrypt-policy.main.test.ts` but boots the real `Worker`
 * command (same boot path a queue-mode process uses in production) instead of
 * calling `ModuleRegistry.initModules('main')` directly, so it proves the
 * `policy-infrastructure` module — and therefore `CredentialsHelper.getDecrypted`'s
 * enforcement — is wired the same way on a worker as it is on main (IAM-1133).
 */
import { mockInstance, testModules } from '@n8n/backend-test-utils';
import { ExecutionsConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import {
	PolicyCheck,
	type CredentialDecryptContext,
	type PolicyCheckResult,
	type RegisteredPolicyCheck,
} from '@n8n/decorators';
import { BinaryDataService, DataDeduplicationService } from 'n8n-core';
import type { IExecuteData, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

import { Worker } from '@/commands/worker';
import config from '@/config';
import { CredentialsHelper } from '@/credentials-helper';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { LogStreamingEventRelay } from '@/events/relays/log-streaming.event-relay';
import { ExternalHooks } from '@/external-hooks';
import { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { CommunityPackagesService } from '@/modules/community-packages/community-packages.service';
import { Push } from '@/push';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { Subscriber } from '@/scaling/pubsub/subscriber.service';
import { ScalingService } from '@/scaling/scaling.service';
import { TaskBrokerServer } from '@/task-runners/task-broker/task-broker-server';
import { JsTaskRunnerProcess } from '@/task-runners/task-runner-process-js';
import { PyTaskRunnerProcess } from '@/task-runners/task-runner-process-py';
import { Telemetry } from '@/telemetry';
import { setupTestCommand } from '@test-integration/utils/test-command';

import { saveCredential } from '../shared/db/credentials';
import { createOwner } from '../shared/db/users';

const BLOCKED_CREDENTIAL_TYPE = 'iam1133TestCredential';
const BLOCKED_NODE_TYPE = 'n8n-nodes-base.iam1133BlockedConsumer';
const CHECK_ID = 'iam1133.deny-blocked-consumer';

const consumerOf = (nodeType: string): IExecuteData =>
	({ node: { type: nodeType } }) as IExecuteData;

// `raw: true` short-circuits before `getDecrypted` reads anything else off this
// object, so an empty additionalData is enough — no need for the real `getBase()`
// factory, which (under `ExecutionsConfig.mode === 'queue'`) resolves variables
// through the distributed lock/cache path this test has no real Redis for.
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

Container.get(ExecutionsConfig).mode = 'queue';
config.set('binaryDataManager.availableModes', 'filesystem');
mockInstance(LoadNodesAndCredentials);
mockInstance(BinaryDataService);
mockInstance(CommunityPackagesService);
mockInstance(ExternalHooks);
mockInstance(License, { loadCertStr: async () => '' });
mockInstance(MessageEventBus);
mockInstance(LogStreamingEventRelay);
mockInstance(ScalingService);
mockInstance(TaskBrokerServer);
mockInstance(JsTaskRunnerProcess);
mockInstance(PyTaskRunnerProcess);
mockInstance(Publisher);
mockInstance(Subscriber);
mockInstance(Telemetry);
mockInstance(Push);

const command = setupTestCommand(Worker);

describe('credentialDecrypt policy enforcement — queue-mode worker process', () => {
	let owner: Awaited<ReturnType<typeof createOwner>>;

	beforeAll(async () => {
		// `setupTestCommand` already runs `testDb.init()` in its own root-level
		// `beforeAll`, which Vitest resolves before this nested one.
		await testModules.loadModules(['policy-infrastructure']);

		// `DataDeduplicationService.init()` asserts it has not run before; stub it
		// so booting the worker command below doesn't collide with any other
		// process-wide initialization in this file's lifetime.
		vi.spyOn(DataDeduplicationService, 'init').mockResolvedValue(undefined);

		// Boots the real `Worker` command end to end (same as production), which
		// runs `moduleRegistry.initModules('worker')` and — via
		// `PolicyInfrastructureModule.init()` — registers the real policy
		// enforcement implementation for this process.
		await command.run();

		owner = await createOwner();
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
