import { createWorkflow, testDb, mockInstance } from '@n8n/backend-test-utils';
import { ExecutionsConfig } from '@n8n/config';
import type { IWorkflowDb, User } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { ExternalSecretsProxy, InstanceSettings } from 'n8n-core';
import { ScheduleTrigger } from 'n8n-nodes-base/nodes/Schedule/ScheduleTrigger.node';
import type {
	IDeferredPromise,
	INode,
	INodeTypeData,
	IRun,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { createDeferredPromise, Workflow } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { DuplicateExecutionError } from '@/errors/duplicate-execution.error';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { ExecutionService } from '@/executions/execution.service';
import { ExternalHooks } from '@/external-hooks';
import { NodeTypes } from '@/node-types';
import { Push } from '@/push';
import { OwnershipService } from '@/services/ownership.service';
import { WebhookService } from '@/webhooks/webhook.service';
import { WorkflowRunner } from '@/workflow-runner';
import { WorkflowService } from '@/workflows/workflow.service';

import { createOwner } from './shared/db/users';
import * as utils from './shared/utils/';

/*
 * End-to-end integration test for scheduled-execution deduplication (CAT-2677).
 *
 * Exercises the production emit closure in `ActiveWorkflowManager.getExecuteTriggerFunctions`
 * against a real SQLite database, with the real `ActiveExecutions` and `ExecutionPersistence`
 * on the hot path. Only `WorkflowRunner.run` is mocked (to the minimum slice that keeps
 * `ActiveExecutions.add` exercised but skips the actual engine run).
 */

// Services we don't need exercised but may be touched during activation/trigger-context construction.
mockInstance(Push);
mockInstance(ExternalSecretsProxy);
mockInstance(ExecutionService);
mockInstance(WorkflowService);
mockInstance(OwnershipService);
mockInstance(WebhookService);
mockInstance(ExternalHooks);
// NOTE: ActiveExecutions, ExecutionPersistence, ExecutionRepository are intentionally NOT mocked:
// they must be real so the dedup path exercises the DB-level unique constraint.

let activeWorkflowManager: ActiveWorkflowManager;
let executionRepository: ExecutionRepository;
let executionsConfig: ExecutionsConfig;
let owner: User;
let workflow: IWorkflowDb;
let workflowObject: Workflow;
let triggerNode: INode;
let additionalData: IWorkflowExecuteAdditionalData;

const nodes: INodeTypeData = {
	'n8n-nodes-base.scheduleTrigger': {
		type: new ScheduleTrigger(),
		sourcePath: '',
	},
};

beforeAll(async () => {
	await testDb.init();

	owner = await createOwner();
	executionRepository = Container.get(ExecutionRepository);
	executionsConfig = Container.get(ExecutionsConfig);
	activeWorkflowManager = Container.get(ActiveWorkflowManager);

	Container.get(InstanceSettings).markAsLeader();
});

beforeEach(async () => {
	await testDb.truncate(['ExecutionEntity', 'WorkflowEntity']);

	// Re-register the mocked DirectoryLoader each test because `jest.restoreAllMocks()`
	// in `afterEach` resets the `jest-mock-extended` stub for `loader.getNode`.
	await utils.initNodeTypes(nodes);

	// Default: feature flag off. Individual tests enable it as needed.
	executionsConfig.scheduledExecutionDeduplicationEnabled = false;

	workflow = await createWorkflow(
		{
			active: true,
			nodes: [
				{
					id: 'schedule-node-uuid',
					name: 'Schedule Trigger',
					parameters: {},
					position: [0, 0],
					type: 'n8n-nodes-base.scheduleTrigger',
					typeVersion: 1,
				},
			],
			connections: {},
		},
		owner,
	);

	triggerNode = workflow.nodes[0];

	workflowObject = new Workflow({
		id: workflow.id,
		name: workflow.name,
		nodes: workflow.nodes,
		connections: workflow.connections,
		active: true,
		nodeTypes: Container.get(NodeTypes),
		staticData: workflow.staticData,
		settings: workflow.settings,
	});

	// Minimal additionalData — only `userId` is actually read by the runner path we exercise;
	// every other field is passed through to the mocked WorkflowRunner.run and discarded.
	additionalData = mock<IWorkflowExecuteAdditionalData>({ userId: owner.id });
});

afterEach(() => {
	jest.restoreAllMocks();
});

afterAll(async () => {
	await testDb.terminate();
});

/**
 * Surgical mock for `WorkflowRunner.run` that preserves the
 * `ActiveExecutions.add → ExecutionPersistence.create` call — so the DB-level
 * unique constraint is exercised — but skips the actual engine run.
 * Returns an array of promises (one per invocation) that settle when the
 * underlying `add` call does, so tests can await completion deterministically.
 */
function installWorkflowRunnerPassthroughMock() {
	const runSettled: Array<Promise<unknown>> = [];
	jest.spyOn(WorkflowRunner.prototype, 'run').mockImplementation(async function mockedRun(data) {
		const addPromise = Container.get(ActiveExecutions).add(data);
		runSettled.push(addPromise.catch(() => undefined));
		return await addPromise;
	});
	return runSettled;
}

/**
 * Returns a deferred promise usable as `donePromise` for an `emit` call.
 *
 * Note: the public `ITriggerFunctions.emit` signature types `donePromise` as
 * `IDeferredPromise<IRun>`, but the production closure may resolve it with
 * `undefined` on the dedup-skipped path. We keep the public type for the
 * type-check and treat the resolved value as optional at the call site.
 */
function createEmitDonePromise(): IDeferredPromise<IRun> {
	return createDeferredPromise<IRun>();
}

describe('scheduled execution deduplication', () => {
	describe('emit-wrapper level (feature flag enabled)', () => {
		beforeEach(() => {
			executionsConfig.scheduledExecutionDeduplicationEnabled = true;
		});

		it('persists only one row when two emits collide on the same deduplicationKey, and warns on the skipped one', async () => {
			const runSettled = installWorkflowRunnerPassthroughMock();
			// Spy on the scoped logger attached to ActiveWorkflowManager during construction.
			const managerWithLogger = activeWorkflowManager as unknown as {
				logger: { warn: (...args: unknown[]) => void };
			};
			const loggerWarnSpy = jest.spyOn(managerWithLogger.logger, 'warn');

			const triggerFactory = activeWorkflowManager.getExecuteTriggerFunctions(
				workflow,
				additionalData,
				'trigger',
				'init',
			);
			const triggerContext = triggerFactory(
				workflowObject,
				triggerNode,
				additionalData,
				'trigger',
				'init',
			);

			const deduplicationKey = `${workflow.id}:${triggerNode.id}:2026-04-17T00:00:00.000Z`;

			const done1 = createEmitDonePromise();
			const done2 = createEmitDonePromise();

			triggerContext.emit([[{ json: {} }]], undefined, done1, deduplicationKey);
			triggerContext.emit([[{ json: {} }]], undefined, done2, deduplicationKey);

			// Wait for both underlying runs to settle (one succeeds, one rejects).
			await Promise.all(runSettled);
			// The `.catch` on `runWorkflow` inside the emit closure is one microtask further;
			// await the duplicate emit's `donePromise` — it resolves immediately once the
			// emit closure observes `executionId === undefined`.
			await done2.promise;

			const rowsForKey = await executionRepository.findBy({ deduplicationKey });
			expect(rowsForKey).toHaveLength(1);

			expect(loggerWarnSpy).toHaveBeenCalledWith(
				expect.stringContaining('duplicate deduplication key'),
				expect.objectContaining({
					workflowId: workflow.id,
					nodeId: triggerNode.id,
					deduplicationKey,
				}),
			);
		});

		it('allows multiple NULL deduplicationKey rows to coexist (NULLs-are-distinct semantics)', async () => {
			const runSettled = installWorkflowRunnerPassthroughMock();

			const triggerFactory = activeWorkflowManager.getExecuteTriggerFunctions(
				workflow,
				additionalData,
				'trigger',
				'init',
			);
			const triggerContext = triggerFactory(
				workflowObject,
				triggerNode,
				additionalData,
				'trigger',
				'init',
			);

			const done1 = createEmitDonePromise();
			const done2 = createEmitDonePromise();

			// No deduplicationKey passed — closure forwards `undefined`.
			triggerContext.emit([[{ json: {} }]], undefined, done1);
			triggerContext.emit([[{ json: {} }]], undefined, done2);

			const results = await Promise.allSettled(runSettled);
			// Both underlying add() calls must succeed.
			for (const result of results) {
				expect(result.status).toBe('fulfilled');
			}

			const rowsForWorkflow = await executionRepository.findBy({ workflowId: workflow.id });
			expect(rowsForWorkflow).toHaveLength(2);
			for (const row of rowsForWorkflow) {
				expect(row.deduplicationKey).toBeNull();
			}
		});
	});

	// Direct persistence-layer coverage — guards the DB behavior we rely on even if the
	// emit-level wiring shifts in future refactors.
	describe('ExecutionPersistence + unique index (end-to-end against SQLite)', () => {
		it('throws DuplicateExecutionError on the second insert with the same deduplicationKey', async () => {
			const executionPersistence = Container.get(ExecutionPersistence);
			const deduplicationKey = `${workflow.id}:${triggerNode.id}:2026-04-17T12:00:00.000Z`;

			const firstId = await executionPersistence.create({
				workflowId: workflow.id,
				workflowData: workflow,
				// @ts-expect-error Partial data is sufficient for this test
				data: { resultData: {} },
				mode: 'trigger',
				finished: false,
				status: 'new',
				deduplicationKey,
			});
			expect(firstId).toBeDefined();

			await expect(
				executionPersistence.create({
					workflowId: workflow.id,
					workflowData: workflow,
					// @ts-expect-error Partial data is sufficient for this test
					data: { resultData: {} },
					mode: 'trigger',
					finished: false,
					status: 'new',
					deduplicationKey,
				}),
			).rejects.toBeInstanceOf(DuplicateExecutionError);

			const rowsForKey = await executionRepository.findBy({ deduplicationKey });
			expect(rowsForKey).toHaveLength(1);
			expect(rowsForKey[0].id).toBe(firstId);
		});
	});
});
