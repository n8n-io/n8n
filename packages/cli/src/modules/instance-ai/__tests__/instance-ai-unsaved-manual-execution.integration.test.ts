import { LicenseState } from '@n8n/backend-common';
import { CacheService, ExecutionRedactionServiceProxy } from '@n8n/backend-services';
import {
	createTeamProject,
	createWorkflowWithHistory,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { Project, User } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { stringify } from 'flatted';
import { DateTime } from 'luxon';
import type { INode, IWorkflowBase } from 'n8n-workflow';
import { createRunExecutionData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { UnsavedManualExecutionService } from '@/execution-lifecycle/unsaved-manual-execution.service';
import { License } from '@/license';
import { ExecutionRedactionService } from '@/modules/redaction/executions/execution-redaction.service';
import { Push } from '@/push';
import { Telemetry } from '@/telemetry';
import { createExecution } from '@test-integration/db/executions';
import { createCustomRoleWithScopeSlugs } from '@test-integration/db/roles';
import { createMember, createOwner } from '@test-integration/db/users';
import { LicenseMocker } from '@test-integration/license';
import { initNodeTypes } from '@test-integration/utils';
import { mockNodeTypesData } from '@test-integration/utils/node-types-data';

import { InstanceAiAdapterService } from '../instance-ai.adapter.service';

/**
 * A manual execution that n8n does not save is soft-deleted when it finishes. The
 * Assistant can read it for the user who started it, until pruning hard-deletes it.
 */
describe('Instance AI unsaved manual executions (integration)', () => {
	mockInstance(ActiveWorkflowManager);
	mockInstance(Telemetry);
	mockInstance(Push, new Push(mock(), mock(), mock(), mock(), mock()));

	const OUTPUT = { channelId: 'C07SW3BQX8R', ts: '1789047591.742709' };
	const ERROR_MESSAGE = 'Slack error response: "invalid_ts_latest"';

	let adapterService: InstanceAiAdapterService;
	/** Started the run. */
	let alice: User;
	/** A member of the same team project, who can read the workflow's executions. */
	let bob: User;
	let teamProject: Project;
	let workflow: IWorkflowBase;

	const licenseMocker = new LicenseMocker();

	const nodes: INode[] = [
		{
			id: 'trigger',
			name: 'Trigger',
			type: 'n8n-nodes-base.scheduleTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
		{
			id: 'get-message',
			name: 'Get Message',
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
			position: [200, 0],
			parameters: {},
		},
	];

	const executionsFor = (user: User) =>
		adapterService.createContext(user, { threadId: 'thread-1' }).executionService;

	/** A failed manual run of the workflow that n8n did not save, started by `startedBy`. */
	const createUnsavedManualExecution = async (
		startedBy: User,
		workflowData: IWorkflowBase = workflow,
	) => {
		const data = createRunExecutionData({
			resultData: {
				lastNodeExecuted: 'Get Message',
				runData: {
					Trigger: [
						{
							startTime: 1,
							executionTime: 1,
							executionIndex: 0,
							source: [],
							data: { main: [[{ json: OUTPUT }]] },
						},
					],
					'Get Message': [
						{
							startTime: 2,
							executionTime: 1,
							executionIndex: 1,
							source: [{ previousNode: 'Trigger' }],
							executionStatus: 'error',
							error: { name: 'NodeOperationError', message: ERROR_MESSAGE } as never,
						},
					],
				},
			},
		});
		const execution = await createExecution(
			{ data: stringify(data), status: 'error', mode: 'manual' },
			workflowData,
		);
		// What n8n records when a manual run that it will not save starts in the editor.
		await Container.get(UnsavedManualExecutionService).recordStarter(execution.id, {
			executionMode: 'manual',
			workflowData: {
				...workflowData,
				settings: { ...workflowData.settings, saveManualExecutions: false },
			},
			userId: startedBy.id,
			pushRef: 'push-ref',
		});
		await Container.get(ExecutionRepository).softDelete(execution.id);
		return execution.id;
	};

	beforeAll(async () => {
		await testDb.init();
		await Container.get(CacheService).init();
		await initNodeTypes({
			...mockNodeTypesData(['scheduleTrigger'], { addTrigger: true }),
			...mockNodeTypesData(['set']),
		});
		licenseMocker.mock(Container.get(License));
		licenseMocker.mockLicenseState(Container.get(LicenseState));
		// What the redaction module wires up at startup.
		Container.get(ExecutionRedactionServiceProxy).setExecutionRedaction(
			Container.get(ExecutionRedactionService),
		);
		adapterService = Container.get(InstanceAiAdapterService);

		await createOwner();
		[alice, bob] = await Promise.all([createMember(), createMember()]);
	});

	beforeEach(async () => {
		teamProject = await createTeamProject('Team', alice);
		await linkUserToProject(bob, teamProject, 'project:editor');
		workflow = await createWorkflowWithHistory({ nodes }, teamProject);
	});

	afterEach(async () => {
		licenseMocker.reset();
		await Container.get(CacheService).reset();
		await testDb.truncate([
			'ExecutionEntity',
			'WorkflowEntity',
			'SharedWorkflow',
			'WorkflowHistory',
		]);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('the user who started the run', () => {
		it('gets its debug info', async () => {
			const executionId = await createUnsavedManualExecution(alice);

			const debug = await executionsFor(alice).getDebugInfo(executionId);

			expect(debug.status).toBe('error');
			expect(debug.failedNode).toMatchObject({ name: 'Get Message' });
			expect(debug.failedNode?.error).toContain('invalid_ts_latest');
		});

		it('gets its node output', async () => {
			const executionId = await createUnsavedManualExecution(alice);

			const output = await executionsFor(alice).getNodeOutput(executionId, 'Trigger');

			expect(JSON.stringify(output)).toContain('C07SW3BQX8R');
		});

		it('gets nothing after the hard-delete buffer', async () => {
			const executionId = await createUnsavedManualExecution(alice);
			await Container.get(ExecutionRepository).update(
				{ id: executionId },
				{ deletedAt: DateTime.utc().minus({ hours: 2 }).toJSDate() },
			);

			await expect(executionsFor(alice).getDebugInfo(executionId)).rejects.toThrow(
				`Execution ${executionId} not found`,
			);
		});

		it('gets nothing while pruning is off', async () => {
			const executionId = await createUnsavedManualExecution(alice);
			const executionsConfig = Container.get(GlobalConfig).executions;
			executionsConfig.pruneData = false;

			try {
				await expect(executionsFor(alice).getDebugInfo(executionId)).rejects.toThrow(
					`Execution ${executionId} not found`,
				);
			} finally {
				executionsConfig.pruneData = true;
			}
		});

		it('gets redacted data when the redaction policy covers the run', async () => {
			licenseMocker.enable('feat:dataRedaction');
			const executionId = await createUnsavedManualExecution(alice, {
				...workflow,
				settings: { redactionPolicy: 'all' },
			});

			const output = await executionsFor(alice).getNodeOutput(executionId, 'Trigger');

			expect(output.redaction).toEqual({ reason: 'workflow_redaction_policy', canReveal: true });
			expect(JSON.stringify(output)).not.toContain('C07SW3BQX8R');
		});
	});

	describe('a starter without execution:read on the workflow', () => {
		it('gets nothing, although they started the run', async () => {
			const workflowOnlyRole = await createCustomRoleWithScopeSlugs([
				'workflow:read',
				'workflow:list',
				'workflow:execute',
				'project:read',
				'project:list',
			]);
			const carol = await createMember();
			await linkUserToProject(carol, teamProject, workflowOnlyRole.slug);
			const executionId = await createUnsavedManualExecution(carol);

			await expect(executionsFor(carol).getDebugInfo(executionId)).rejects.toThrow(
				`Execution ${executionId} not found`,
			);
			await expect(executionsFor(carol).getNodeOutput(executionId, 'Trigger')).rejects.toThrow(
				`Execution ${executionId} not found`,
			);
		});
	});

	describe('another member of the project', () => {
		it('gets nothing, although the member can read saved executions of the workflow', async () => {
			const savedExecution = await createExecution(
				{ data: stringify(createRunExecutionData()), status: 'success', mode: 'manual' },
				workflow,
			);
			const executionId = await createUnsavedManualExecution(alice);

			await expect(executionsFor(bob).getDebugInfo(savedExecution.id)).resolves.toMatchObject({
				status: 'success',
			});
			await expect(executionsFor(bob).getDebugInfo(executionId)).rejects.toThrow(
				`Execution ${executionId} not found`,
			);
			await expect(executionsFor(bob).getNodeOutput(executionId, 'Trigger')).rejects.toThrow(
				`Execution ${executionId} not found`,
			);
		});
	});
});
