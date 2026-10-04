import { testDb, createActiveWorkflow, createWorkflow } from '@n8n/backend-test-utils';
import { type IWorkflowDb, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import nock from 'nock';
import type {
	INode,
	IRun,
	IWorkflowExecuteAdditionalData,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { createRunExecutionData, NodeConnectionTypes } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { ActiveExecutions } from '@/active-executions';
import { callSubWorkflowDrafts } from '@/modules/instance-ai/eval/execution.service';
import { WorkflowRunner } from '@/workflow-runner';

import { createOwner } from './shared/db/users';
import * as utils from './shared/utils';
import { loadNodesFromDist } from './shared/utils/node-types-data';

const NOT_PUBLISHED = 'Workflow is not active and cannot be executed.';

describe('sub-workflow version in eval runs', () => {
	let owner: Awaited<ReturnType<typeof createOwner>>;

	beforeAll(async () => {
		await testDb.init();
		owner = await createOwner();
		await utils.initNodeTypes(
			loadNodesFromDist([
				'n8n-nodes-base.manualTrigger',
				'n8n-nodes-base.executeWorkflow',
				'n8n-nodes-base.executeWorkflowTrigger',
				'n8n-nodes-base.set',
				'n8n-nodes-base.httpRequest',
			]),
		);
		await utils.initBinaryDataService();
		nock.disableNetConnect();
	});

	afterEach(async () => {
		nock.cleanAll();
		await testDb.truncate(['ExecutionEntity', 'WorkflowEntity']);
	});

	afterAll(async () => {
		nock.enableNetConnect();
		await testDb.terminate();
	});

	const trigger: INode = {
		id: uuid(),
		name: 'Trigger',
		type: 'n8n-nodes-base.executeWorkflowTrigger',
		typeVersion: 1.1,
		position: [0, 0],
		parameters: { inputSource: 'passthrough' },
	};

	const subWorkflow = (step: INode) => ({
		nodes: [trigger, step],
		connections: {
			Trigger: { main: [[{ node: step.name, type: NodeConnectionTypes.Main, index: 0 }]] },
		},
	});

	const setVersion = (version: string): INode => ({
		id: uuid(),
		name: 'Set Version',
		type: 'n8n-nodes-base.set',
		typeVersion: 3.4,
		position: [200, 0],
		parameters: {
			assignments: {
				assignments: [{ id: uuid(), name: 'version', value: version, type: 'string' }],
			},
			options: {},
		},
	});

	const fetchOrder: INode = {
		id: uuid(),
		name: 'Fetch Order',
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 4.2,
		position: [200, 0],
		parameters: { url: 'https://erp.example.invalid/orders/1', options: {} },
	};

	const parentCalling = (childId: string) => ({
		nodes: [
			{
				id: uuid(),
				name: 'Start',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: uuid(),
				name: 'Call Sub',
				type: 'n8n-nodes-base.executeWorkflow',
				typeVersion: 1.2,
				position: [200, 0],
				parameters: {
					workflowId: { __rl: true, value: childId, mode: 'id' },
					options: { waitForSubWorkflow: true },
				},
			},
		] satisfies INode[],
		connections: {
			Start: { main: [[{ node: 'Call Sub', type: NodeConnectionTypes.Main, index: 0 }]] },
		},
	});

	const createUnpublished = async (step: INode) =>
		await createWorkflow(subWorkflow(step) as unknown as IWorkflowDb, owner);

	/** Published with `published`, then the draft is edited to `draft`. */
	const createPublishedWithNewerDraft = async () => {
		const child = await createActiveWorkflow(
			subWorkflow(setVersion('published')) as unknown as IWorkflowDb,
			owner,
		);
		await Container.get(WorkflowRepository).update(child.id, {
			nodes: subWorkflow(setVersion('draft')).nodes,
		});
		return child;
	};

	const runParent = async (
		childId: string,
		executionMode: WorkflowExecuteMode,
		configureAdditionalData?: (additionalData: IWorkflowExecuteAdditionalData) => void,
	): Promise<IRun> => {
		const parent = await createWorkflow(parentCalling(childId) as unknown as IWorkflowDb, owner);
		const executionId = await Container.get(WorkflowRunner).run({
			executionMode,
			workflowData: parent,
			userId: owner.id,
			executionData: createRunExecutionData({
				executionData: {
					nodeExecutionStack: [
						{ node: parent.nodes[0], data: { main: [[{ json: {} }]] }, source: null },
					],
				},
			}),
			configureAdditionalData,
		});
		const run = await Container.get(ActiveExecutions).getPostExecutePromise(executionId);
		if (!run) throw new Error('Execution finished with no run data');
		return run;
	};

	const asEval = (additionalData: IWorkflowExecuteAdditionalData) => {
		additionalData.executeWorkflow = callSubWorkflowDrafts(additionalData.executeWorkflow);
	};

	const subOutput = (run: IRun) =>
		run.data.resultData.runData['Call Sub']?.[0]?.data?.main[0]?.[0]?.json;
	const subError = (run: IRun) =>
		run.data.resultData.runData['Call Sub']?.[0]?.error?.message ??
		run.data.resultData.error?.message;

	it('calls the draft of an unpublished sub-workflow in an eval run', async () => {
		const child = await createUnpublished(setVersion('draft'));

		const run = await runParent(child.id, 'evaluation', asEval);

		expect(subError(run)).toBeUndefined();
		expect(subOutput(run)).toEqual({ version: 'draft' });
	});

	it('calls the draft, not the published version, in an eval run', async () => {
		const child = await createPublishedWithNewerDraft();

		const run = await runParent(child.id, 'evaluation', asEval);

		expect(subOutput(run)).toEqual({ version: 'draft' });
	});

	it('refuses an unpublished sub-workflow in an evaluation-mode run without the eval harness', async () => {
		const child = await createUnpublished(setVersion('draft'));

		const run = await runParent(child.id, 'evaluation');

		expect(subError(run)).toContain(NOT_PUBLISHED);
	});

	it('refuses an unpublished sub-workflow in a production run', async () => {
		const child = await createUnpublished(setVersion('draft'));

		const run = await runParent(child.id, 'trigger');

		expect(subError(run)).toContain(NOT_PUBLISHED);
	});

	it('calls the published version in a production run', async () => {
		const child = await createPublishedWithNewerDraft();

		const run = await runParent(child.id, 'trigger');

		expect(subOutput(run)).toEqual({ version: 'published' });
	});

	it('serves an HTTP request in the sub-workflow of an eval run from the eval mock', async () => {
		const child = await createUnpublished(fetchOrder);
		const evalLlmMockHandler = vi.fn(async () => ({
			statusCode: 200,
			headers: { 'content-type': 'application/json' },
			body: { orderId: 1, source: 'mock' },
		}));

		const run = await runParent(child.id, 'evaluation', (additionalData) => {
			asEval(additionalData);
			additionalData.evalLlmMockHandler = evalLlmMockHandler;
		});

		expect(subError(run)).toBeUndefined();
		expect(subOutput(run)).toEqual({ orderId: 1, source: 'mock' });
		expect(evalLlmMockHandler).toHaveBeenCalledWith(
			expect.objectContaining({ url: 'https://erp.example.invalid/orders/1' }),
			expect.objectContaining({ name: 'Fetch Order' }),
		);
	});
});
