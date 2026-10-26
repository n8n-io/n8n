import { LicenseState } from '@n8n/backend-common';
import {
	createTeamProject,
	createWorkflowWithHistory,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { stringify } from 'flatted';
import type { INode, IWorkflowBase } from 'n8n-workflow';
import { createRunExecutionData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { License } from '@/license';
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
 * A custom project role can grant `workflow:read` without `execution:read`.
 * The Assistant must apply the same execution scopes as the executions API.
 */
describe('Instance AI execution read scope (integration)', () => {
	mockInstance(ActiveWorkflowManager);
	mockInstance(Telemetry);
	mockInstance(Push, new Push(mock(), mock(), mock(), mock(), mock()));

	const MARKER = 'RUNTIME-MARKER-42';

	let adapterService: InstanceAiAdapterService;
	/** Has `workflow:read` and `workflow:execute`, but no execution scopes. */
	let workflowOnlyMember: User;
	/** Has the same scopes plus `execution:read` and `execution:list`. */
	let executionReader: User;
	let workflow: IWorkflowBase;
	let executionId: string;

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
			id: 'canary',
			name: 'Canary',
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
			position: [200, 0],
			parameters: { value: '={{ $json.secret }}' },
		},
	];

	const executionsFor = (user: User) =>
		adapterService.createContext(user, { threadId: 'thread-1' }).executionService;
	const workflowsFor = (user: User) =>
		adapterService.createContext(user, { threadId: 'thread-1' }).workflowService;

	beforeAll(async () => {
		await testDb.init();
		await initNodeTypes({
			...mockNodeTypesData(['scheduleTrigger'], { addTrigger: true }),
			...mockNodeTypesData(['set']),
		});
		licenseMocker.mock(Container.get(License));
		licenseMocker.mockLicenseState(Container.get(LicenseState));
		adapterService = Container.get(InstanceAiAdapterService);

		const workflowScopes = [
			'workflow:read',
			'workflow:list',
			'workflow:execute',
			'project:read',
			'project:list',
		];
		const [workflowOnlyRole, executionReaderRole] = await Promise.all([
			createCustomRoleWithScopeSlugs(workflowScopes),
			createCustomRoleWithScopeSlugs([...workflowScopes, 'execution:read', 'execution:list']),
		]);

		const owner = await createOwner();
		[workflowOnlyMember, executionReader] = await Promise.all([createMember(), createMember()]);

		const teamProject = await createTeamProject('Team', owner);
		await linkUserToProject(workflowOnlyMember, teamProject, workflowOnlyRole.slug);
		await linkUserToProject(executionReader, teamProject, executionReaderRole.slug);
		workflow = await createWorkflowWithHistory({ nodes }, teamProject);
	});

	// A fresh execution for each test, so a run one test starts is not the latest in the next.
	beforeEach(async () => {
		const data = createRunExecutionData({
			resultData: {
				lastNodeExecuted: 'Canary',
				runData: {
					Trigger: [
						{
							startTime: 1,
							executionTime: 1,
							executionIndex: 0,
							source: [],
							data: { main: [[{ json: {} }]] },
						},
					],
					Canary: [
						{
							startTime: 2,
							executionTime: 1,
							executionIndex: 1,
							source: [{ previousNode: 'Trigger' }],
							data: { main: [[{ json: { secret: MARKER } }]] },
						},
					],
				},
			},
		});
		const execution = await createExecution(
			{ data: stringify(data), status: 'success', mode: 'manual' },
			workflow,
		);
		executionId = execution.id;
	});

	afterEach(async () => {
		await testDb.truncate(['ExecutionEntity']);
	});

	afterAll(async () => {
		licenseMocker.reset();
		await testDb.terminate();
	});

	describe('a role without execution:read', () => {
		it.each([
			['getStatus', async (user: User) => await executionsFor(user).getStatus(executionId)],
			['getResult', async (user: User) => await executionsFor(user).getResult(executionId)],
			['getDebugInfo', async (user: User) => await executionsFor(user).getDebugInfo(executionId)],
			[
				'getNodeOutput',
				async (user: User) => await executionsFor(user).getNodeOutput(executionId, 'Canary'),
			],
			[
				'getResolvedNodeParameters',
				async (user: User) =>
					await executionsFor(user).getResolvedNodeParameters(executionId, 'Canary'),
			],
		])('cannot read the execution through %s', async (_name, read) => {
			await expect(read(workflowOnlyMember)).rejects.toThrow(`Execution ${executionId} not found`);
		});

		it('does not see the execution in the list', async () => {
			const executions = await executionsFor(workflowOnlyMember).list({ workflowId: workflow.id });

			expect(executions).toEqual([]);
		});

		it('gets no latest run data for validation', async () => {
			const runData = await workflowsFor(workflowOnlyMember).getLatestRunData!(workflow.id);

			expect(runData).toBeNull();
		});

		it('cannot replay the execution in a step run', async () => {
			await expect(
				executionsFor(workflowOnlyMember).runStep!(workflow.id, 'Canary', {
					reuseExecutionId: executionId,
				}),
			).rejects.toThrow(`Execution ${executionId} not found`);
		});
	});

	describe('a role with execution:read', () => {
		it('reads the execution', async () => {
			const output = await executionsFor(executionReader).getNodeOutput(executionId, 'Canary');

			expect(JSON.stringify(output)).toContain(MARKER);
		});

		it('sees the execution in the list', async () => {
			const executions = await executionsFor(executionReader).list({ workflowId: workflow.id });

			expect(executions.map((e) => e.id)).toEqual([executionId]);
		});

		it('gets the latest run data for validation', async () => {
			const runData = await workflowsFor(executionReader).getLatestRunData!(workflow.id);

			expect(JSON.stringify(runData)).toContain(MARKER);
		});
	});
});
