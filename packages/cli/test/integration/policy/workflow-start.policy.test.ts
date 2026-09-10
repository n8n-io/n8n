/**
 * Pins the `workflowStart` host wiring across every way an execution can start.
 *
 * One `@OnLifecycleEvent('workflowExecuteBefore')` registration is supposed to cover all of
 * them via `ModulesHooksRegistry`. That holds only as long as each hook-assembly function
 * keeps calling `addHooks`, so each path gets its own test: a regression in one must not
 * hide behind the others passing.
 */
import { createWorkflow, getWorkflowSharing, testDb } from '@n8n/backend-test-utils';
import { ExecutionRepository, type IWorkflowDb, type User } from '@n8n/db';
import type {
	PolicyCheckResult,
	RegisteredPolicyCheck,
	WorkflowStartContext,
} from '@n8n/decorators';
import { PolicyCheck, PolicyCheckMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { createRunExecutionData } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { getLifecycleHooksForScalingMain } from '@/execution-lifecycle/execution-lifecycle-hooks';
import { JobProcessor } from '@/scaling/job-processor';
import type { Job } from '@/scaling/scaling.types';
import { WorkflowRunner } from '@/workflow-runner';

import { createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';
import { loadNodesFromDist } from '../shared/utils/node-types-data';
import {
	createParentWorkflowFixture,
	createSimpleWorkflowFixture,
	createSubWorkflowFixture,
} from '../shared/workflow-fixtures';

const CHECK_ID = 'test-workflow-start-deny';
const VIOLATION_KIND = 'test-workflow-start-denied';

const deniedMessage = (workflowId: string) => `Starting workflow ${workflowId} is blocked`;

/**
 * The decorator registers the check once per process, so it can't be swapped per test.
 * Each test names the workflow it wants denied instead — which is also what lets the
 * sub-execution test deny the child while the parent runs.
 */
const deniedWorkflowIds = new Set<string>();

/** What the handler passed the check, so a test can assert the scope it resolved. */
const seenContexts: WorkflowStartContext[] = [];

@PolicyCheck()
class WorkflowStartDenyCheck implements RegisteredPolicyCheck {
	readonly id = CHECK_ID;

	async onWorkflowStart(context: WorkflowStartContext): Promise<PolicyCheckResult> {
		seenContexts.push(context);

		const { workflow } = context;

		if (workflow.id === null || !deniedWorkflowIds.has(workflow.id)) return { violations: [] };

		return {
			violations: [
				{
					kind: VIOLATION_KIND,
					checkId: this.id,
					message: deniedMessage(workflow.id),
					subject: workflow.id,
					subjectType: 'workflow',
					scope: 'project',
				},
			],
		};
	}
}

// `endpointGroups` is load-bearing beyond the manual-run test below: `setupTestServer` only
// reaches `ModuleRegistry.initModules` when it is set, and that init is what registers the
// enforcement implementation and imports the lifecycle handler. Without it every test here
// would pass with nothing ever enforced.
const testServer = utils.setupTestServer({
	endpointGroups: ['workflows'],
	modules: ['policy-infrastructure'],
});

let owner: User;
let authOwnerAgent: SuperAgentTest;
let executionRepository: ExecutionRepository;

beforeAll(async () => {
	// Without this the "allowed" cases below would still pass with the check never registered,
	// which is exactly the silent allow-all this suite exists to catch.
	expect(Container.get(PolicyCheckMetadata).getClasses()).toContain(WorkflowStartDenyCheck);

	owner = await createOwner();
	authOwnerAgent = testServer.authAgentFor(owner);

	// Real nodes, not the default mock set — these workflows actually run.
	await utils.initNodeTypes(
		loadNodesFromDist([
			'n8n-nodes-base.manualTrigger',
			'n8n-nodes-base.executeWorkflow',
			'n8n-nodes-base.executeWorkflowTrigger',
		]),
	);
	await utils.initBinaryDataService();

	executionRepository = Container.get(ExecutionRepository);
});

beforeEach(async () => {
	deniedWorkflowIds.clear();
	seenContexts.length = 0;

	await testDb.truncate(['ExecutionEntity', 'WorkflowEntity', 'SharedWorkflow']);
});

/**
 * Every workflow here needs an owner. Once any check registers `onWorkflowStart`,
 * `hasChecksFor` is true for the whole file, so the handler's deliberately unguarded
 * ownership lookup runs on every execution — and an ownerless workflow would fail the run
 * with a lookup error that looks just like a policy block.
 */
const createOwnedWorkflow = async (name: string, fixture: object) =>
	await createWorkflow({ name, ...fixture } as unknown as IWorkflowDb, owner);

async function waitForStatus(
	where: { id: string } | { workflowId: string },
	statuses: string[],
	timeout = 20000,
) {
	const start = Date.now();

	while (Date.now() - start < timeout) {
		const execution = await executionRepository.findOne({ where, order: { createdAt: 'DESC' } });
		if (execution && statuses.includes(execution.status)) return execution;
		await new Promise((resolve) => setTimeout(resolve, 50));
	}

	throw new Error(
		`No execution matching ${JSON.stringify(where)} reached [${statuses.join(', ')}] within ${timeout}ms`,
	);
}

/**
 * A blocked run is a failed execution, not a rejected call, so the assertion is always on the
 * stored record. `violations` survives onto it because `PolicyViolationError` extends
 * `UserError`, which has no bounded `toJSON`, and the engine converts the throw with an
 * object spread that copies own enumerable properties.
 */
async function expectBlocked(executionId: string, workflowId: string) {
	const execution = await waitForStatus({ id: executionId }, ['error', 'success', 'crashed']);

	expect(execution.status).toBe('error');

	const stored = await executionRepository.findSingleExecution(executionId, {
		includeData: true,
		unflattenData: true,
	});

	const error = stored?.data.resultData.error as unknown as {
		message: string;
		violations?: unknown[];
	};

	expect(error?.message).toBe(deniedMessage(workflowId));
	expect(error?.violations).toEqual([
		{
			kind: VIOLATION_KIND,
			checkId: CHECK_ID,
			message: deniedMessage(workflowId),
			subject: workflowId,
			subjectType: 'workflow',
			scope: 'project',
		},
	]);

	return execution;
}

describe('regular main', () => {
	test('fails the execution with the structured violations', async () => {
		const workflow = await createOwnedWorkflow('Regular main', createSimpleWorkflowFixture());
		deniedWorkflowIds.add(workflow.id);

		const executionId = await Container.get(WorkflowRunner).run(
			{
				workflowData: workflow,
				executionMode: 'trigger',
				executionData: createRunExecutionData({}),
			},
			true,
		);

		await expectBlocked(executionId, workflow.id);
	});

	test('runs as usual when no check objects', async () => {
		const workflow = await createOwnedWorkflow(
			'Regular main allowed',
			createSimpleWorkflowFixture(),
		);

		const executionId = await Container.get(WorkflowRunner).run(
			{
				workflowData: workflow,
				executionMode: 'trigger',
				executionData: createRunExecutionData({}),
			},
			true,
		);

		const execution = await waitForStatus({ id: executionId }, ['success', 'error']);

		expect(execution.status).toBe('success');
	});
});

describe('queue-mode worker', () => {
	/** What `WorkflowRunner.run` does before enqueueing, minus the queue. */
	const enqueue = async (workflow: IWorkflowDb) =>
		await Container.get(ActiveExecutions).add({
			workflowData: workflow,
			executionMode: 'trigger',
			executionData: createRunExecutionData({}),
		});

	/**
	 * Deliberately a literal and not `mock<Job>`: the auto-mock returns a function for every
	 * unset property, and `job.data.encryptedRunnerIdentity` is read straight into
	 * `additionalData`, where the engine tries to decrypt it and the run dies before the
	 * policy hook is ever reached.
	 */
	const jobFor = (executionId: string, workflowId: string) =>
		({
			id: `job-${executionId}`,
			data: { executionId, workflowId, loadStaticData: false },
			progress: vi.fn(),
		}) as unknown as Job;

	test('fails the execution with the structured violations', async () => {
		const workflow = await createOwnedWorkflow('Worker', createSimpleWorkflowFixture());
		deniedWorkflowIds.add(workflow.id);

		const executionId = await enqueue(workflow);

		// The worker's own hooks persist the failure, so this resolves rather than rejecting.
		await Container.get(JobProcessor).processJob(jobFor(executionId, workflow.id));

		await expectBlocked(executionId, workflow.id);
	});

	test('resolves the owning project even though the job carries no projectId', async () => {
		const workflow = await createOwnedWorkflow('Worker scope', createSimpleWorkflowFixture());

		const executionId = await enqueue(workflow);

		await Container.get(JobProcessor).processJob(jobFor(executionId, workflow.id));

		// `job-processor.ts` builds its hook data without `projectId`; the handler recovers it
		// via `OwnershipService`. A `null` here would hand every project rule an empty scope.
		const [sharing] = await getWorkflowSharing(workflow);
		const seen = seenContexts.find((c) => c.workflow.id === workflow.id);

		expect(seen?.projectId).toBe(sharing.projectId);
	});
});

describe('sub-execution', () => {
	test('fails the child execution with the structured violations', async () => {
		const child = await createOwnedWorkflow('Child', createSubWorkflowFixture());
		const parent = await createOwnedWorkflow('Parent', createParentWorkflowFixture(child.id));

		// Only the child. Denying the parent too would let the parent's regular-main assembly
		// satisfy this test and prove nothing about `getLifecycleHooksForSubExecutions`.
		deniedWorkflowIds.add(child.id);

		const response = await authOwnerAgent
			.post(`/workflows/${parent.id}/run`)
			.send({ triggerToStartFrom: { name: 'Trigger' } })
			.expect(200);

		const parentExecutionId = response.body.data.executionId as string;

		const childExecution = await waitForStatus({ workflowId: child.id }, ['error', 'success']);

		await expectBlocked(childExecution.id, child.id);

		const parentExecution = await waitForStatus({ id: parentExecutionId }, ['error', 'success']);

		expect(parentExecution.status).toBe('error');

		const storedParent = await executionRepository.findSingleExecution(parentExecutionId, {
			includeData: true,
			unflattenData: true,
		});

		expect(storedParent?.data.resultData.runData['Execute Workflow']?.at(-1)?.executionStatus).toBe(
			'error',
		);
	});
});

describe('manual run from the editor', () => {
	test('fails the execution with the structured violations', async () => {
		const workflow = await createOwnedWorkflow('Manual', createSimpleWorkflowFixture());
		deniedWorkflowIds.add(workflow.id);

		// A policy block is not a 4xx on this surface: the route hands back an execution id and
		// the violation lands on the stored execution.
		const response = await authOwnerAgent
			.post(`/workflows/${workflow.id}/run`)
			.send({ triggerToStartFrom: { name: 'Trigger' } })
			.expect(200);

		await expectBlocked(response.body.data.executionId as string, workflow.id);
	});

	test('runs as usual when no check objects', async () => {
		const workflow = await createOwnedWorkflow('Manual allowed', createSimpleWorkflowFixture());

		const response = await authOwnerAgent
			.post(`/workflows/${workflow.id}/run`)
			.send({ triggerToStartFrom: { name: 'Trigger' } })
			.expect(200);

		const execution = await waitForStatus({ id: response.body.data.executionId as string }, [
			'success',
			'error',
		]);

		expect(execution.status).toBe('success');
	});
});

describe('queue-mode main', () => {
	test('does not enforce when nothing is about to run', async () => {
		const workflow = await createOwnedWorkflow('Scaling main', createSimpleWorkflowFixture());
		deniedWorkflowIds.add(workflow.id);

		// Queue mode fires this on main right after the job is enqueued, with no `Workflow`
		// instance. The worker's own hook gates the queued run, so enforcing here would check
		// twice — and the same call shape is used by the pre-flight failure recorder, where a
		// throw would break failure recording outright.
		const hooks = getLifecycleHooksForScalingMain(
			{ workflowData: workflow, executionMode: 'trigger' },
			'some-execution-id',
		);

		await expect(
			hooks.runHook('workflowExecuteBefore', [undefined, createRunExecutionData({})]),
		).resolves.toBeUndefined();
	});
});
