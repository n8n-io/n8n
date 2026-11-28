import { createActiveWorkflow, testDb } from '@n8n/backend-test-utils';
import type { AppCallContext } from '@n8n/backend-module-apps';
import { ExecutionRepository, ProjectRepository, type IWorkflowDb } from '@n8n/db';
import { Container } from '@n8n/di';
import { NodeConnectionTypes, type IWorkflowSettings } from 'n8n-workflow';

import { ExecutionPersistence } from '@/executions/execution-persistence';
import { AppWorkflowAdapter } from '@/modules/apps/bindings/app-workflow.adapter';

import { createOwner } from '../shared/db/users';
import * as utils from '../shared/utils';
import { loadNodesFromDist } from '../shared/utils/node-types-data';

const INPUT = { email: 'visitor@example.com' };

const appWorkflow = (settings: IWorkflowSettings): Partial<IWorkflowDb> => ({
	name: 'App workflow',
	nodes: [
		{
			id: 'trigger',
			name: 'Start',
			type: 'n8n-nodes-base.executeWorkflowTrigger',
			typeVersion: 1.1,
			position: [0, 0],
			parameters: { inputSource: 'passthrough' },
		},
		{
			id: 'noop',
			name: 'Done',
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
			position: [200, 0],
			parameters: {},
		},
	],
	connections: {
		Start: { main: [[{ node: 'Done', type: NodeConnectionTypes.Main, index: 0 }]] },
	},
	settings,
});

describe('App workflow runs and the workflow save settings', () => {
	let owner: Awaited<ReturnType<typeof createOwner>>;
	let ctx: AppCallContext;
	let executionRepository: ExecutionRepository;

	beforeAll(async () => {
		await testDb.init();
		await utils.initNodeTypes(
			loadNodesFromDist(['n8n-nodes-base.executeWorkflowTrigger', 'n8n-nodes-base.noOp']),
		);
		await utils.initBinaryDataService();
		executionRepository = Container.get(ExecutionRepository);
	});

	beforeEach(async () => {
		owner = await createOwner();
		const project = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			owner.id,
		);
		ctx = {
			appId: 'app-1',
			namespace: 'app-1',
			projectId: project.id,
			bindingKey: 'run',
			userId: 'visitor-1',
		};
	});

	afterEach(async () => {
		await testDb.truncate(['ExecutionEntity', 'WorkflowEntity', 'User']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('should return the result and not keep the execution when the workflow does not save it', async () => {
		const workflow = await createActiveWorkflow(
			appWorkflow({ saveDataSuccessExecution: 'none', saveDataErrorExecution: 'none' }),
			owner,
		);

		const result = await Container.get(AppWorkflowAdapter).run(ctx, workflow.id, INPUT);

		expect(result).toEqual({
			executionId: expect.any(String),
			status: 'success',
			output: [INPUT],
		});
		expect(
			await executionRepository.findOne({ where: { id: result.executionId }, withDeleted: true }),
		).toBeNull();
	});

	it('should keep the execution when the workflow saves it', async () => {
		const workflow = await createActiveWorkflow(
			appWorkflow({ saveDataSuccessExecution: 'all', saveDataErrorExecution: 'all' }),
			owner,
		);

		const result = await Container.get(AppWorkflowAdapter).run(ctx, workflow.id, INPUT);

		expect(result.status).toBe('success');
		const stored = await Container.get(ExecutionPersistence).findSingleExecution(
			result.executionId,
			{ includeData: true, unflattenData: true },
		);
		expect(JSON.stringify(stored?.data)).toContain(INPUT.email);
	});
});
