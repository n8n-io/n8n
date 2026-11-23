import {
	createWorkflowWithHistory,
	mockInstance,
	setActiveVersion,
	testDb,
} from '@n8n/backend-test-utils';
import { WorkflowsConfig } from '@n8n/config';
import {
	WorkflowPublicationOutboxRepository,
	WorkflowPublicationRetryStateRepository,
	WorkflowPublishedVersionRepository,
} from '@n8n/db';
import type { Project, WorkflowEntity, WorkflowPublicationRetryState } from '@n8n/db';
import { Container } from '@n8n/di';
import { UserError } from '@n8n/errors';
import { ActiveWorkflowTriggers, ExternalSecretsProxy, InstanceSettings } from 'n8n-core';
import { ScheduleTrigger } from 'n8n-nodes-base/nodes/Schedule/ScheduleTrigger.node';
import type {
	INode,
	INodeType,
	INodeTypeData,
	ITriggerFunctions,
	ITriggerResponse,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ActiveExecutions } from '@/active-executions';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { TRIGGER_ACTIVATION_MAX_ATTEMPTS } from '@/constants';
import { ExecutionService } from '@/executions/execution.service';
import { ExternalHooks } from '@/external-hooks';
import { Push } from '@/push';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { PolicyViolationError } from '@/policy/policy-violation.error';
import { OwnershipService } from '@/services/ownership.service';
import { WorkflowPublicationApplier } from '@/workflows/publication/workflow-publication-applier';
import { WorkflowPublicationOutboxConsumer } from '@/workflows/publication/workflow-publication-outbox-consumer';
import { WorkflowPublicationReconciler } from '@/workflows/publication/workflow-publication-reconciler.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { createOwner } from '../shared/db/users';
import * as utils from '../shared/utils/';

vi.mock('@/constants', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/constants')>()),
	WORKFLOW_REACTIVATE_INITIAL_TIMEOUT: 1,
}));

mockInstance(ActiveExecutions);
mockInstance(Push);
mockInstance(ExternalSecretsProxy);
mockInstance(ExecutionService);
mockInstance(WorkflowService);
mockInstance(OwnershipService);
mockInstance(ExternalHooks);

const FLAKY_TRIGGER_TYPE = 'n8n-nodes-base.flakyTrigger';

const UNREACHABLE = Object.assign(new Error('connect EHOSTUNREACH 10.0.0.1:993'), {
	code: 'EHOSTUNREACH',
});

const fixture: {
	failure: Error | undefined;
	/** Failures a node throws before it succeeds, independent of `failure`. */
	failuresLeft: Map<string, number>;
	calls: Map<string, number>;
} = { failure: undefined, failuresLeft: new Map(), calls: new Map() };

const flakyTrigger: INodeType = {
	description: {
		displayName: 'Flaky Trigger',
		name: 'flakyTrigger',
		group: ['trigger'],
		version: 1,
		description: 'Trigger that throws the fixture failure while one is set',
		defaults: { name: 'Flaky Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
	},
	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const { id } = this.getNode();
		fixture.calls.set(id, (fixture.calls.get(id) ?? 0) + 1);
		const failuresLeft = fixture.failuresLeft.get(id) ?? 0;
		if (failuresLeft > 0) {
			fixture.failuresLeft.set(id, failuresLeft - 1);
			throw UNREACHABLE;
		}
		if (fixture.failure) throw fixture.failure;
		return { closeFunction: async () => {} };
	},
};

const flakyNode = (suffix: string): INode => ({
	id: `node-${suffix}`,
	name: `Flaky ${suffix}`,
	type: FLAKY_TRIGGER_TYPE,
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
});

const scheduleNode = (suffix: string): INode => ({
	id: `schedule-${suffix}`,
	name: `Schedule ${suffix}`,
	type: 'n8n-nodes-base.scheduleTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
});

const RETRIED = { registered: true, retryNote: null };

const LEFT_ALONE = 0;

const ONE_ATTEMPT = 1;

const ONE_TRY = 1;

const LONG_AGO = new Date('2000-01-01T00:00:00.000Z');

const FIRST_RETRY_DELAY_SECONDS = 60;

const MAX_RETRY_DELAY_SECONDS = 14400;

const RETRY_PERIOD_MS = 3 * 24 * 60 * 60 * 1000;

const ONE_HOUR_MS = 60 * 60 * 1000;

const DOUBLING_CURVE = [60, 120, 240, 480, 960, 1920, 3840, 7680, 14400, 14400];

const POLICY_REFUSAL = new PolicyViolationError([
	{ kind: 'node-type-unavailable', checkId: 'check-1', message: 'Blocked by policy' },
]);

const USER_ERROR = new UserError('The polling interval is too short.');

let reconciler: WorkflowPublicationReconciler;
let consumer: WorkflowPublicationOutboxConsumer;
let activeWorkflowTriggers: ActiveWorkflowTriggers;
let outboxRepository: WorkflowPublicationOutboxRepository;
let retryStateRepository: WorkflowPublicationRetryStateRepository;
let originalUseWorkflowPublicationService: boolean;
let originalConcurrency: number;

const abortSignal = new AbortController().signal;

async function createPublishedWorkflow(...nodes: INode[]): Promise<WorkflowEntity> {
	const workflow = await createWorkflowWithHistory({ active: true, nodes }, await createOwner());
	await setActiveVersion(workflow.id, workflow.versionId);
	return workflow;
}

async function publish(workflow: WorkflowEntity): Promise<void> {
	await outboxRepository.enqueue(workflow.id, workflow.versionId, 'publish');
	const record = await outboxRepository.claimNextPendingRecord();
	await consumer.processRecord(record!, abortSignal);
}

async function retryDelay(workflowId: string): Promise<number | null | undefined> {
	return (await retryStateRepository.findOneBy({ workflowId }))?.retryDelaySeconds;
}

async function makeRetryDue(workflowId: string, failedAt = LONG_AGO): Promise<void> {
	await retryStateRepository
		.createQueryBuilder()
		.update()
		.set({ updatedAt: failedAt })
		.where({ workflowId })
		.execute();
}

async function setRetryNote(
	workflowId: string,
	failedAt: Date,
	retryDelaySeconds: number,
): Promise<void> {
	await retryStateRepository
		.createQueryBuilder()
		.update()
		.set({ updatedAt: failedAt, retryDelaySeconds })
		.where({ workflowId })
		.execute();
}

async function makeRetryDueAfterFailingSince(
	workflowId: string,
	failingSince: Date,
): Promise<void> {
	await retryStateRepository
		.createQueryBuilder()
		.update()
		.set({ updatedAt: LONG_AGO, createdAt: failingSince })
		.where({ workflowId })
		.execute();
}

function failingFor(ms: number): Date {
	return new Date(Date.now() - ms);
}

async function countRecords(workflowId: string): Promise<number> {
	return await outboxRepository.countBy({ workflowId });
}

async function newRecordsSince(workflowId: string, recordsBefore: number): Promise<number> {
	return (await countRecords(workflowId)) - recordsBefore;
}

async function outcome(
	workflowId: string,
	nodeId: string,
): Promise<{ registered: boolean; retryNote: WorkflowPublicationRetryState | null }> {
	return {
		registered: activeWorkflowTriggers.get(workflowId)?.has(nodeId) ?? false,
		retryNote: await retryStateRepository.findOneBy({ workflowId }),
	};
}

beforeAll(async () => {
	await testDb.init();

	const nodes: INodeTypeData = {
		[FLAKY_TRIGGER_TYPE]: { type: flakyTrigger, sourcePath: '' },
		'n8n-nodes-base.scheduleTrigger': { type: new ScheduleTrigger(), sourcePath: '' },
	};
	await utils.initNodeTypes(nodes);

	Container.get(InstanceSettings).markAsLeader();
	const workflowsConfig = Container.get(WorkflowsConfig);
	originalUseWorkflowPublicationService = workflowsConfig.useWorkflowPublicationService;
	originalConcurrency = workflowsConfig.workflowPublicationConcurrency;
	workflowsConfig.useWorkflowPublicationService = true;

	reconciler = Container.get(WorkflowPublicationReconciler);
	consumer = Container.get(WorkflowPublicationOutboxConsumer);
	activeWorkflowTriggers = Container.get(ActiveWorkflowTriggers);
	outboxRepository = Container.get(WorkflowPublicationOutboxRepository);
	retryStateRepository = Container.get(WorkflowPublicationRetryStateRepository);
});

afterEach(async () => {
	vi.restoreAllMocks();
	Container.get(WorkflowsConfig).workflowPublicationConcurrency = originalConcurrency;
	fixture.failure = undefined;
	fixture.failuresLeft.clear();
	fixture.calls.clear();
	consumer.stopPolling();
	await Container.get(ActiveWorkflowManager).removeAll();
	await testDb.truncate([
		'WorkflowPublishedVersion',
		'WorkflowPublicationRetryState',
		'WorkflowPublicationOutbox',
		'WorkflowPublicationTriggerStatus',
		'WorkflowPublishHistory',
		'WorkflowEntity',
		'WorkflowHistory',
	]);
});

afterAll(async () => {
	Container.get(WorkflowsConfig).useWorkflowPublicationService =
		originalUseWorkflowPublicationService;
	await testDb.terminate();
});

describe('Workflow publication retry (integration)', () => {
	test('a user publish clears a scheduled retry and registers the trigger', async () => {
		const trigger = flakyNode('republish');
		const workflow = await createPublishedWorkflow(trigger);
		fixture.failure = UNREACHABLE;
		await publish(workflow);

		fixture.failure = undefined;
		await publish(workflow);

		expect(await outcome(workflow.id, trigger.id)).toEqual(RETRIED);
	});

	const EARLIER_STEP_CASES: Array<[string, () => Promise<WorkflowEntity>]> = [
		[
			'a partial workflow the missing-trigger step enqueues',
			async () => {
				const workflow = await createPublishedWorkflow(
					flakyNode('partial'),
					scheduleNode('partial'),
				);
				fixture.failure = UNREACHABLE;
				await publish(workflow);
				await activeWorkflowTriggers.remove(workflow.id);
				return workflow;
			},
		],
		[
			'an unreported workflow the unreported step enqueues',
			async () => {
				const workflow = await createPublishedWorkflow(flakyNode('unreported'));
				await Container.get(WorkflowPublishedVersionRepository).setPublishedVersion(
					workflow.id,
					workflow.versionId,
				);
				fixture.failure = UNREACHABLE;
				return workflow;
			},
		],
	];

	test('a policy refusal ends a scheduled retry', async () => {
		const workflow = await createPublishedWorkflow(flakyNode('policy'));
		fixture.failure = UNREACHABLE;
		await publish(workflow);
		await makeRetryDue(workflow.id);

		const policyEnforcementService = Container.get(PolicyEnforcementService);
		vi.spyOn(policyEnforcementService, 'hasChecksFor').mockReturnValue(true);
		vi.spyOn(policyEnforcementService, 'enforceWorkflowPublish').mockRejectedValue(POLICY_REFUSAL);
		vi.mocked(Container.get(OwnershipService).getWorkflowProjectCached).mockResolvedValue(
			mock<Project>({ id: 'project-1' }),
		);

		await reconciler.reconcile('reconcile');
		expect(await retryDelay(workflow.id)).toBeNull();

		const recordsBefore = await countRecords(workflow.id);
		await reconciler.reconcile('startup');
		expect(await newRecordsSince(workflow.id, recordsBefore)).toBe(LEFT_ALONE);
	});

	test('a UserError wrapped by trigger activation is not retried', async () => {
		const workflow = await createPublishedWorkflow(flakyNode('wrapped'));
		fixture.failure = USER_ERROR;
		await publish(workflow);

		await reconciler.reconcile('startup');

		expect(await retryDelay(workflow.id)).toBeNull();
	});

	test('a partial workflow whose failed trigger has a UserError is not retried', async () => {
		const workflow = await createPublishedWorkflow(
			flakyNode('partial-user-error'),
			scheduleNode('partial-user-error'),
		);
		fixture.failure = USER_ERROR;
		await publish(workflow);

		expect(await retryDelay(workflow.id)).toBeNull();
	});

	test('two triggers that both fail with a UserError are not retried', async () => {
		const workflow = await createPublishedWorkflow(flakyNode('first'), flakyNode('second'));
		fixture.failure = USER_ERROR;
		await publish(workflow);

		await reconciler.reconcile('startup');

		expect(await retryDelay(workflow.id)).toBeNull();
	});

	test('a failure before the retry is due does not grow the delay', async () => {
		const trigger = flakyNode('not-due');
		const workflow = await createPublishedWorkflow(trigger);
		await publish(workflow);
		await activeWorkflowTriggers.remove(workflow.id);

		vi.spyOn(Container.get(WorkflowPublicationApplier), 'apply').mockRejectedValue(
			new Error('applier failed before reporting'),
		);
		for (let pass = 0; pass < 3; pass++) await reconciler.reconcile('reconcile');

		expect(await retryDelay(workflow.id)).toBe(FIRST_RETRY_DELAY_SECONDS);
	});

	async function failReconcileWhileUnreachable(trigger: INode): Promise<WorkflowEntity> {
		const workflow = await createPublishedWorkflow(trigger);
		await publish(workflow);
		await activeWorkflowTriggers.remove(workflow.id);
		fixture.failure = UNREACHABLE;
		await reconciler.reconcile('reconcile');
		fixture.failure = undefined;
		return workflow;
	}

	test('an interval pass leaves a failed trigger alone until its delay is up', async () => {
		const workflow = await failReconcileWhileUnreachable(flakyNode('waiting'));
		const recordsBefore = await countRecords(workflow.id);

		await reconciler.reconcile('reconcile');

		expect(await retryDelay(workflow.id)).toBe(FIRST_RETRY_DELAY_SECONDS);
		expect(await newRecordsSince(workflow.id, recordsBefore)).toBe(LEFT_ALONE);
	});

	test('retries a trigger that failed with a transient error once its delay is up', async () => {
		const trigger = flakyNode('due');
		const workflow = await failReconcileWhileUnreachable(trigger);
		await makeRetryDue(workflow.id);

		await reconciler.reconcile('reconcile');

		expect(await outcome(workflow.id, trigger.id)).toEqual(RETRIED);
	});

	test('a scheduled retry gives a failed trigger one try', async () => {
		const trigger = flakyNode('one-try');
		const workflow = await failReconcileWhileUnreachable(trigger);
		fixture.failure = UNREACHABLE;
		await makeRetryDue(workflow.id);
		fixture.calls.clear();

		await reconciler.reconcile('reconcile');

		expect(fixture.calls.get(trigger.id)).toBe(ONE_TRY);
	});

	test('a user publish gives a failed trigger its quick tries again', async () => {
		const trigger = flakyNode('quick-tries');
		const workflow = await failReconcileWhileUnreachable(trigger);
		fixture.failure = UNREACHABLE;
		fixture.calls.clear();

		await publish(workflow);

		expect(fixture.calls.get(trigger.id)).toBe(TRIGGER_ACTIVATION_MAX_ATTEMPTS);
	});

	test('a restart gives the healthy trigger of a retried workflow its quick tries', async () => {
		const failed = flakyNode('retried');
		const healthy = flakyNode('healthy');
		const workflow = await createPublishedWorkflow(failed, healthy);
		fixture.failuresLeft.set(failed.id, TRIGGER_ACTIVATION_MAX_ATTEMPTS);
		await publish(workflow);
		await activeWorkflowTriggers.remove(workflow.id);
		fixture.failuresLeft.set(healthy.id, 1);

		await reconciler.reconcile('startup');

		expect(activeWorkflowTriggers.get(workflow.id)?.has(healthy.id)).toBe(true);
	});

	test('retries the failed in-memory trigger of a partially published workflow once its delay is up', async () => {
		const trigger = flakyNode('partial-due');
		const workflow = await createPublishedWorkflow(trigger, scheduleNode('partial-due'));
		fixture.failure = UNREACHABLE;
		await publish(workflow);
		fixture.failure = undefined;
		await makeRetryDue(workflow.id);

		await reconciler.reconcile('reconcile');

		expect(await outcome(workflow.id, trigger.id)).toEqual(RETRIED);
	});

	test.each(['startup', 'leadership-takeover'] as const)(
		'restart passes retry a scheduled retry before its delay is up: %s',
		async (reason) => {
			const trigger = flakyNode(reason);
			const workflow = await failReconcileWhileUnreachable(trigger);

			await reconciler.reconcile(reason);

			expect(await outcome(workflow.id, trigger.id)).toEqual(RETRIED);
		},
	);

	test('an interval pass retries at most the publication concurrency, oldest due first', async () => {
		Container.get(WorkflowsConfig).workflowPublicationConcurrency = 2;
		const workflows = [
			await failReconcileWhileUnreachable(flakyNode('last-due')),
			await failReconcileWhileUnreachable(flakyNode('first-due')),
			await failReconcileWhileUnreachable(flakyNode('second-due')),
		];
		const [lastDue, firstDue, secondDue] = workflows;
		await setRetryNote(lastDue.id, new Date('2000-01-01T00:00:00.000Z'), MAX_RETRY_DELAY_SECONDS);
		await setRetryNote(
			firstDue.id,
			new Date('2000-01-01T01:00:00.000Z'),
			FIRST_RETRY_DELAY_SECONDS,
		);
		await setRetryNote(
			secondDue.id,
			new Date('2000-01-01T02:00:00.000Z'),
			FIRST_RETRY_DELAY_SECONDS,
		);
		const recordsBefore = await Promise.all(workflows.map(async (w) => await countRecords(w.id)));

		await reconciler.reconcile('reconcile');

		const recordsAfter = await Promise.all(workflows.map(async (w) => await countRecords(w.id)));
		const retried = workflows.filter((_, i) => recordsAfter[i] > recordsBefore[i]).map((w) => w.id);
		expect(retried).toEqual([firstDue.id, secondDue.id]);
	});

	test('doubles the retry delay after each failed retry, capped at four hours', async () => {
		const workflow = await createPublishedWorkflow(flakyNode('doubling'));
		fixture.failure = UNREACHABLE;
		await publish(workflow);
		const delays = [await retryDelay(workflow.id)];

		for (let retry = 1; retry < DOUBLING_CURVE.length; retry++) {
			await makeRetryDue(workflow.id);
			await reconciler.reconcile('reconcile');
			delays.push(await retryDelay(workflow.id));
		}

		expect(delays).toEqual(DOUBLING_CURVE);
	});

	test('keeps retrying a target that has failed for less than three days', async () => {
		const workflow = await failReconcileWhileUnreachable(flakyNode('within-period'));
		fixture.failure = UNREACHABLE;
		await setRetryNote(workflow.id, LONG_AGO, MAX_RETRY_DELAY_SECONDS);
		await makeRetryDueAfterFailingSince(workflow.id, failingFor(RETRY_PERIOD_MS - ONE_HOUR_MS));
		const recordsBefore = await countRecords(workflow.id);

		await reconciler.reconcile('reconcile');

		expect(await newRecordsSince(workflow.id, recordsBefore)).toBe(ONE_ATTEMPT);
		expect(await retryDelay(workflow.id)).toBe(MAX_RETRY_DELAY_SECONDS);
	});

	test('stops retrying a target that has failed for more than three days', async () => {
		const workflow = await failReconcileWhileUnreachable(flakyNode('past-period'));
		fixture.failure = UNREACHABLE;
		await setRetryNote(workflow.id, LONG_AGO, MAX_RETRY_DELAY_SECONDS);
		await makeRetryDueAfterFailingSince(workflow.id, failingFor(RETRY_PERIOD_MS + ONE_HOUR_MS));

		await reconciler.reconcile('reconcile');

		expect(await retryDelay(workflow.id)).toBeNull();
	});

	test('a new target version starts a new three-day period', async () => {
		const workflow = await failReconcileWhileUnreachable(flakyNode('new-target'));
		await makeRetryDueAfterFailingSince(workflow.id, LONG_AGO);

		await retryStateRepository.scheduleRetry(workflow.id, 'next-version');
		await makeRetryDue(workflow.id);
		await retryStateRepository.scheduleRetry(workflow.id, 'next-version');

		expect(await retryDelay(workflow.id)).toBe(2 * FIRST_RETRY_DELAY_SECONDS);
	});

	test('a restart pass does not start a new period for a partial workflow whose retries stopped', async () => {
		const workflow = await createPublishedWorkflow(
			flakyNode('stopped-partial'),
			scheduleNode('stopped-partial'),
		);
		fixture.failure = UNREACHABLE;
		await publish(workflow);
		await setRetryNote(workflow.id, LONG_AGO, MAX_RETRY_DELAY_SECONDS);
		await makeRetryDueAfterFailingSince(workflow.id, failingFor(RETRY_PERIOD_MS + ONE_HOUR_MS));
		await reconciler.reconcile('reconcile');
		await activeWorkflowTriggers.remove(workflow.id);

		await reconciler.reconcile('startup');

		expect(await retryDelay(workflow.id)).toBeNull();
	});

	test.each(EARLIER_STEP_CASES)(
		'a restart pass makes one attempt for a workflow that an earlier step enqueued: %s',
		async (_, arrange) => {
			const workflow = await arrange();
			const recordsBefore = await countRecords(workflow.id);

			await reconciler.reconcile('startup');

			expect(await newRecordsSince(workflow.id, recordsBefore)).toBe(ONE_ATTEMPT);
		},
	);
});
