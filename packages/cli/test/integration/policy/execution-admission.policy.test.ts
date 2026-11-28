/**
 * Pins the `executionAdmission` host wiring on every way an engine v1 run can start.
 *
 * A refused run must leave no execution row and no ledger row, and must not reach the
 * `workflow.preExecute` hook. A run that already has a row must not be evaluated again.
 */
import {
	createActiveWorkflow,
	createTeamProject,
	createWorkflow,
	getWorkflowSharing,
	testDb,
} from '@n8n/backend-test-utils';
import { ExecutionsConfig } from '@n8n/config';
import {
	ExecutionRepository,
	PollerStateRepository,
	ProjectRepository,
	type IWorkflowDb,
	type User,
} from '@n8n/db';
import type {
	ExecutionAdmissionContext,
	PolicyCheckResult,
	RegisteredPolicyCheck,
} from '@n8n/decorators';
import { PolicyCheck, PolicyCheckMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import {
	createRunExecutionData,
	type INode,
	type IWorkflowBase,
	type WorkflowExecuteMode,
} from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { claimAllLedgerRows } from '@n8n/backend-module-execution-ledger/testing';
import { ActiveExecutions } from '@/active-executions';
import { ExternalHooks } from '@/external-hooks';
import { PolicyCheckFailedError } from '@/modules/policy-infrastructure/policy-check-failed.error';
import { PolicyViolationError } from '@/policy/policy-violation.error';
import { JobProcessor } from '@/scaling/job-processor';
import type { Job } from '@/scaling/scaling.types';
import { PollCursorService } from '@/workflows/triggers/poll-cursor.service';
import { getBase } from '@/workflow-execute-additional-data';
import { WorkflowRunner } from '@/workflow-runner';
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';

import { createdExecutionWithStatus, createWaitingExecution } from '../shared/db/executions';
import { createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';
import { loadNodesFromDist } from '../shared/utils/node-types-data';
import {
	createParentWorkflowFixture,
	createSimpleWorkflowFixture,
	createSubWorkflowFixture,
} from '../shared/workflow-fixtures';

const CHECK_ID = 'test-execution-admission-deny';
const VIOLATION_KIND = 'test-execution-admission-denied';

const deniedMessage = (workflowId: string) => `Admitting workflow ${workflowId} is blocked`;

// The decorator registers the check once per process, so each test names what it denies.
const deniedWorkflowIds = new Set<string>();
const seenContexts: ExecutionAdmissionContext[] = [];
let checkThrows = false;

@PolicyCheck()
class ExecutionAdmissionDenyCheck implements RegisteredPolicyCheck {
	readonly id = CHECK_ID;

	async onExecutionAdmission(context: ExecutionAdmissionContext): Promise<PolicyCheckResult> {
		seenContexts.push(context);

		if (checkThrows) throw new Error('check is broken');

		const { id } = context.artifact;

		if (!deniedWorkflowIds.has(id)) return { violations: [] };

		return {
			violations: [
				{
					kind: VIOLATION_KIND,
					checkId: this.id,
					message: deniedMessage(id),
					subject: id,
					subjectType: 'workflow',
					scope: 'project',
				},
			],
		};
	}
}

// `endpointGroups` makes `setupTestServer` initialize the modules. Without it nothing is enforced.
const testServer = utils.setupTestServer({
	endpointGroups: ['workflows', 'executions', 'publicApi'],
	modules: ['policy-infrastructure', 'execution-ledger'],
});

let owner: User;
let authOwnerAgent: SuperAgentTest;
let publicApiAgent: SuperAgentTest;
let executionRepository: ExecutionRepository;
let workflowRunner: WorkflowRunner;
let workflowExecutionService: WorkflowExecutionService;
// Stands in for a registered hook, so a refusal can prove it stopped the run before the hook.
const preExecuteHook = vi.fn<() => void>();

beforeAll(async () => {
	// The allowed cases would pass with an unregistered check, so prove that it is registered.
	expect(Container.get(PolicyCheckMetadata).getClasses()).toContain(ExecutionAdmissionDenyCheck);

	owner = await createOwnerWithApiKey();
	authOwnerAgent = testServer.authAgentFor(owner);
	publicApiAgent = testServer.publicApiAgentFor(owner);

	await utils.initNodeTypes(
		loadNodesFromDist([
			'n8n-nodes-base.manualTrigger',
			'n8n-nodes-base.executeWorkflow',
			'n8n-nodes-base.executeWorkflowTrigger',
			'n8n-nodes-base.errorTrigger',
			'n8n-nodes-base.stopAndError',
		]),
	);
	await utils.initBinaryDataService();

	executionRepository = Container.get(ExecutionRepository);
	workflowRunner = Container.get(WorkflowRunner);
	workflowExecutionService = Container.get(WorkflowExecutionService);
});

beforeEach(async () => {
	deniedWorkflowIds.clear();
	seenContexts.length = 0;
	checkThrows = false;
	Container.get(ExecutionsConfig).preExecuteErrorCreatesExecution = false;

	await testDb.truncate(['ExecutionEntity', 'WorkflowEntity', 'SharedWorkflow']);
	await claimAllLedgerRows();

	preExecuteHook.mockClear();
	const externalHooks = Container.get(ExternalHooks);
	vi.spyOn(externalHooks, 'hasHook').mockImplementation((name) => name === 'workflow.preExecute');
	vi.spyOn(externalHooks, 'run').mockImplementation(async (name) => {
		if (name === 'workflow.preExecute') preExecuteHook();
	});
});

afterEach(() => {
	vi.restoreAllMocks();
});

const createOwnedWorkflow = async (name: string, fixture: object = createSimpleWorkflowFixture()) =>
	await createWorkflow({ name, ...fixture } as unknown as IWorkflowDb, owner);

const createDeniedWorkflow = async (name: string, fixture?: object) => {
	const workflow = await createOwnedWorkflow(name, fixture);
	deniedWorkflowIds.add(workflow.id);
	return workflow;
};

/** Trigger -> Stop and Error, so a run ends as `error` and can be retried. */
const createFailingWorkflowFixture = () => ({
	nodes: [
		{
			parameters: {},
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			id: uuid(),
			name: 'Trigger',
		},
		{
			parameters: { errorMessage: 'Expected failure' },
			type: 'n8n-nodes-base.stopAndError',
			typeVersion: 1,
			position: [200, 0],
			id: uuid(),
			name: 'Stop and Error',
		},
	],
	connections: {
		Trigger: { main: [[{ node: 'Stop and Error', type: 'main', index: 0 }]] },
	},
});

const createErrorWorkflowFixture = () => ({
	nodes: [
		{
			parameters: {},
			type: 'n8n-nodes-base.errorTrigger',
			typeVersion: 1,
			position: [0, 0],
			id: uuid(),
			name: 'Error Trigger',
		},
	],
	connections: {},
});

const startRun = async (workflow: IWorkflowBase, executionMode: WorkflowExecuteMode) =>
	await workflowRunner.run(
		{ workflowData: workflow, executionMode, executionData: createRunExecutionData({}) },
		true,
	);

const triggerNode = (workflow: IWorkflowBase) => workflow.nodes[0] as INode;

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

const refusal = (workflowId: string) =>
	expect.objectContaining({
		message: deniedMessage(workflowId),
		violations: [expect.objectContaining({ kind: VIOLATION_KIND, subject: workflowId })],
	});

async function expectNoRun(workflowId: string) {
	expect(await executionRepository.countBy({ workflowId })).toBe(0);
	expect((await claimAllLedgerRows()).filter((row) => row.entityId === workflowId)).toEqual([]);
	expect(preExecuteHook).not.toHaveBeenCalled();
}

const contextFor = (workflowId: string) =>
	seenContexts.find((context) => context.artifact.id === workflowId);

describe('trigger', () => {
	test('refuses the run and stores nothing', async () => {
		const workflow = await createDeniedWorkflow('Trigger');

		await expect(
			workflowExecutionService.runWorkflow(
				workflow,
				triggerNode(workflow),
				[[{ json: {} }]],
				await getBase({ workflowId: workflow.id }),
				'trigger',
			),
		).rejects.toBeInstanceOf(PolicyViolationError);

		await expectNoRun(workflow.id);
	});

	test('gives the check the run facts and then runs the hook', async () => {
		const workflow = await createOwnedWorkflow('Trigger allowed');

		const executionId = await workflowExecutionService.runWorkflow(
			workflow,
			triggerNode(workflow),
			[[{ json: {} }]],
			await getBase({ workflowId: workflow.id }),
			'trigger',
		);

		const execution = await waitForStatus({ id: executionId }, ['success', 'error']);
		const [sharing] = await getWorkflowSharing(workflow);

		expect(execution.status).toBe('success');
		expect(preExecuteHook).toHaveBeenCalledTimes(1);
		expect(seenContexts).toEqual([
			{
				artifact: { kind: 'workflow', id: workflow.id, name: 'Trigger allowed' },
				projectId: sharing.projectId,
				mode: 'trigger',
				source: null,
				engine: 'v1',
			},
		]);
	});
});

describe('schedule', () => {
	test('refuses the run and stores nothing', async () => {
		const workflow = await createDeniedWorkflow('Schedule');

		await expect(
			workflowExecutionService.runWorkflow(
				workflow,
				triggerNode(workflow),
				[[{ json: {} }]],
				await getBase({ workflowId: workflow.id }),
				'trigger',
				undefined,
				`schedule:${workflow.id}:1`,
			),
		).rejects.toBeInstanceOf(PolicyViolationError);

		await expectNoRun(workflow.id);
	});
});

describe('poll', () => {
	test('refuses the run before the cursor and the row are committed', async () => {
		const workflow = await createDeniedWorkflow('Poll');
		const commit = vi.spyOn(Container.get(PollCursorService), 'commitWithExecution');

		await expect(
			workflowExecutionService.runPolledWorkflow(
				workflow,
				triggerNode(workflow),
				[[{ json: {} }]],
				await getBase({ workflowId: workflow.id }),
				'trigger',
				{ lastSeen: 1 },
			),
		).rejects.toBeInstanceOf(PolicyViolationError);

		expect(commit).not.toHaveBeenCalled();
		await expectNoRun(workflow.id);
	});

	test('evaluates an admitted poll one time', async () => {
		const workflow = await createOwnedWorkflow('Poll allowed');
		await Container.get(PollerStateRepository).getOrCreateCursor(
			workflow.id,
			triggerNode(workflow).id,
			{},
			{},
		);

		const executionId = await workflowExecutionService.runPolledWorkflow(
			workflow,
			triggerNode(workflow),
			[[{ json: {} }]],
			await getBase({ workflowId: workflow.id }),
			'trigger',
			{ lastSeen: 1 },
		);

		await waitForStatus({ id: executionId! }, ['success', 'error']);

		expect(seenContexts).toHaveLength(1);
	});
});

describe.each(['webhook', 'cli'] as const)('%s', (mode) => {
	test('refuses the run and stores nothing', async () => {
		const workflow = await createDeniedWorkflow(`Mode ${mode}`);

		await expect(startRun(workflow, mode)).rejects.toEqual(refusal(workflow.id));

		await expectNoRun(workflow.id);
		expect(contextFor(workflow.id)?.mode).toBe(mode);
	});
});

describe('manual run from the editor', () => {
	test('refuses the request and stores nothing', async () => {
		const workflow = await createDeniedWorkflow('Manual');

		const response = await authOwnerAgent
			.post(`/workflows/${workflow.id}/run`)
			.send({ triggerToStartFrom: { name: 'Trigger' } })
			.expect(403);

		expect(response.body.message).toBe(deniedMessage(workflow.id));
		await expectNoRun(workflow.id);
	});
});

describe('retry', () => {
	const createFailedRun = async () => {
		const workflow = await createOwnedWorkflow('Retry', createFailingWorkflowFixture());
		const response = await authOwnerAgent
			.post(`/workflows/${workflow.id}/run`)
			.send({ triggerToStartFrom: { name: 'Trigger' } })
			.expect(200);
		const executionId = response.body.data.executionId as string;
		await waitForStatus({ id: executionId }, ['error']);
		await claimAllLedgerRows();
		preExecuteHook.mockClear();
		seenContexts.length = 0;
		deniedWorkflowIds.add(workflow.id);

		return { workflow, executionId };
	};

	const expectNoRetry = async (workflowId: string) => {
		expect(await executionRepository.countBy({ workflowId })).toBe(1);
		expect(await claimAllLedgerRows()).toEqual([]);
		expect(preExecuteHook).not.toHaveBeenCalled();
		expect(contextFor(workflowId)?.mode).toBe('retry');
	};

	test('evaluates a retry from the executions list as a new run', async () => {
		const { workflow, executionId } = await createFailedRun();

		await authOwnerAgent.post(`/executions/${executionId}/retry`).expect(403);

		await expectNoRetry(workflow.id);
	});

	test('evaluates a retry from the public API as a new run', async () => {
		const { workflow, executionId } = await createFailedRun();

		await publicApiAgent.post(`/executions/${executionId}/retry`).expect(403);

		await expectNoRetry(workflow.id);
	});
});

describe('sub-workflow', () => {
	test('refuses the child, stores no child run and fails the parent', async () => {
		const child = await createDeniedWorkflow('Child', createSubWorkflowFixture());
		const parent = await createOwnedWorkflow('Parent', createParentWorkflowFixture(child.id));

		const response = await authOwnerAgent
			.post(`/workflows/${parent.id}/run`)
			.send({ triggerToStartFrom: { name: 'Trigger' } })
			.expect(200);

		const parentExecutionId = response.body.data.executionId as string;
		const parentExecution = await waitForStatus({ id: parentExecutionId }, ['error', 'success']);

		expect(parentExecution.status).toBe('error');
		expect(await executionRepository.countBy({ workflowId: child.id })).toBe(0);
		expect((await claimAllLedgerRows()).filter((row) => row.entityId === child.id)).toEqual([]);
		// The hook ran for the parent only.
		expect(preExecuteHook).toHaveBeenCalledTimes(1);
	});
});

describe('error workflow', () => {
	test('refuses the run and stores nothing', async () => {
		const failed = await createOwnedWorkflow('Failed workflow');
		const errorWorkflow = await createActiveWorkflow(
			{
				name: 'Error workflow',
				...createErrorWorkflowFixture(),
				settings: { callerPolicy: 'any' },
			} as unknown as IWorkflowDb,
			owner,
		);
		deniedWorkflowIds.add(errorWorkflow.id);
		const [sharing] = await getWorkflowSharing(failed);
		const project = await Container.get(ProjectRepository).findOneByOrFail({
			id: sharing.projectId,
		});

		await workflowExecutionService.executeErrorWorkflow(
			errorWorkflow.id,
			{ workflow: { id: failed.id, name: failed.name } },
			project,
		);

		expect(contextFor(errorWorkflow.id)?.mode).toBe('error');
		await expectNoRun(errorWorkflow.id);
	});
	test("evaluates the error workflow in its own project, not the failed workflow's", async () => {
		const failedProject = await createTeamProject('Failed project', owner);
		const failed = await createWorkflow(
			{ name: 'Failed elsewhere', ...createSimpleWorkflowFixture() } as unknown as IWorkflowDb,
			failedProject,
		);
		const errorWorkflow = await createActiveWorkflow(
			{
				name: 'Error workflow elsewhere',
				...createErrorWorkflowFixture(),
				settings: { callerPolicy: 'any' },
			} as unknown as IWorkflowDb,
			owner,
		);
		deniedWorkflowIds.add(errorWorkflow.id);
		const [errorSharing] = await getWorkflowSharing(errorWorkflow);

		await workflowExecutionService.executeErrorWorkflow(
			errorWorkflow.id,
			{ workflow: { id: failed.id, name: failed.name } },
			failedProject,
		);

		expect(contextFor(errorWorkflow.id)?.projectId).toBe(errorSharing.projectId);
		expect(errorSharing.projectId).not.toBe(failedProject.id);
	});
});

describe('a run that already has an execution row', () => {
	test('does not evaluate a Wait resume', async () => {
		const workflow = await createDeniedWorkflow('Wait resume');
		const waiting = await createWaitingExecution(workflow);

		await workflowRunner.run(
			{
				workflowData: workflow,
				executionMode: 'trigger',
				executionData: createRunExecutionData({}),
			},
			false,
			undefined,
			{ executionId: waiting.id, expectedStatus: 'waiting' },
		);

		await waitForStatus({ id: waiting.id }, ['success', 'error']);

		expect(seenContexts).toEqual([]);
	});

	test('does not evaluate the claim of a row at `new`', async () => {
		const workflow = await createDeniedWorkflow('Claim');
		const created = await createdExecutionWithStatus(workflow, 'new');

		await workflowRunner.run(
			{
				workflowData: workflow,
				executionMode: 'trigger',
				executionData: createRunExecutionData({}),
			},
			false,
			undefined,
			{ executionId: created.id, expectedStatus: 'new' },
		);

		await waitForStatus({ id: created.id }, ['success', 'error']);

		expect(seenContexts).toEqual([]);
	});

	test('does not evaluate a job on a worker', async () => {
		const workflow = await createOwnedWorkflow('Worker');
		const executionId = await Container.get(ActiveExecutions).add({
			workflowData: workflow,
			executionMode: 'trigger',
			executionData: createRunExecutionData({}),
		});
		deniedWorkflowIds.add(workflow.id);

		// A literal, because an auto-mock returns a function for every unset job property.
		await Container.get(JobProcessor).processJob({
			id: `job-${executionId}`,
			data: { executionId, workflowId: workflow.id, loadStaticData: false },
			progress: vi.fn(),
		} as unknown as Job);

		await waitForStatus({ id: executionId }, ['success', 'error']);

		expect(seenContexts).toEqual([]);
	});
});

describe('when a pre-execute hook error creates an execution', () => {
	test('still refuses the run before its row', async () => {
		Container.get(ExecutionsConfig).preExecuteErrorCreatesExecution = true;
		const workflow = await createDeniedWorkflow('Legacy hook order');

		await expect(startRun(workflow, 'trigger')).rejects.toEqual(refusal(workflow.id));

		await expectNoRun(workflow.id);
	});
});

describe('when the check fails', () => {
	test('blocks the run and stores nothing', async () => {
		checkThrows = true;
		const workflow = await createOwnedWorkflow('Broken check');

		await expect(startRun(workflow, 'trigger')).rejects.toBeInstanceOf(PolicyCheckFailedError);

		await expectNoRun(workflow.id);
	});
});
