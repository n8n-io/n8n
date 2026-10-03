/**
 * `$execution.mode` is documented as 'test' whenever the run was started by hand and
 * 'production' otherwise. A sub-workflow of a manual run executes as 'integrated', so
 * these tests pin down what expressions inside it actually observe.
 */

import { testDb, createWorkflow, createActiveWorkflow } from '@n8n/backend-test-utils';
import { ExecutionRepository, type IWorkflowDb } from '@n8n/db';
import { Container } from '@n8n/di';
import { NodeConnectionTypes } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';

import { createOwner } from './shared/db/users';
import * as utils from './shared/utils';
import { loadNodesFromDist } from './shared/utils/node-types-data';
import {
	createParentWorkflowFixture,
	createMiddleWorkflowFixture,
} from './shared/workflow-fixtures';

/** Set node that records the resolved `$execution.mode` so it can be asserted on. */
function modeReporterNode(name: string, position: [number, number]) {
	return {
		parameters: {
			assignments: {
				assignments: [
					{
						id: uuid(),
						name: 'executionMode',
						value: '={{ $execution.mode }}',
						type: 'string',
					},
				],
			},
			options: {},
		},
		type: 'n8n-nodes-base.set',
		typeVersion: 3.4,
		position,
		id: uuid(),
		name,
	};
}

/** Filter node that keeps an item only when `$execution.mode` resolves to 'test'. */
function testModeFilterNode(name: string, position: [number, number]) {
	return {
		parameters: {
			conditions: {
				options: {
					caseSensitive: true,
					leftValue: '',
					typeValidation: 'strict',
				},
				conditions: [
					{
						id: uuid(),
						leftValue: '={{ $execution.mode }}',
						rightValue: 'test',
						operator: {
							type: 'string',
							operation: 'equals',
						},
					},
				],
				combinator: 'and',
			},
			options: {},
		},
		type: 'n8n-nodes-base.filter',
		typeVersion: 2.2,
		position,
		id: uuid(),
		name,
	};
}

function chain(first: string, second: string, third: string) {
	const link = (node: string) => ({
		main: [[{ node, type: NodeConnectionTypes.Main, index: 0 }]],
	});
	return { [first]: link(second), [second]: link(third) };
}

/** Sub-workflow that reports and filters on `$execution.mode`. */
function createModeProbeSubWorkflowFixture() {
	return {
		nodes: [
			{
				parameters: { workflowInputs: { values: [{ name: 'test' }] } },
				type: 'n8n-nodes-base.executeWorkflowTrigger',
				typeVersion: 1.1,
				position: [0, 0] as [number, number],
				id: uuid(),
				name: 'Trigger',
			},
			modeReporterNode('Report Mode', [208, 0]),
			testModeFilterNode('Only Test', [416, 0]),
		],
		connections: chain('Trigger', 'Report Mode', 'Only Test'),
		pinData: {},
	};
}

/** Same probe, but at the top level of a manually executed workflow. */
function createModeProbeWorkflowFixture() {
	return {
		nodes: [
			{
				parameters: {},
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				id: uuid(),
				name: 'Trigger',
			},
			modeReporterNode('Report Mode', [208, 0]),
			testModeFilterNode('Only Test', [416, 0]),
		],
		connections: chain('Trigger', 'Report Mode', 'Only Test'),
		pinData: {},
	};
}

describe('$execution.mode inside a manually started run', () => {
	let owner: Awaited<ReturnType<typeof createOwner>>;
	let workflowExecutionService: WorkflowExecutionService;
	let executionRepository: ExecutionRepository;

	beforeAll(async () => {
		await testDb.init();

		owner = await createOwner();

		const nodeTypes = loadNodesFromDist([
			'n8n-nodes-base.manualTrigger',
			'n8n-nodes-base.executeWorkflow',
			'n8n-nodes-base.executeWorkflowTrigger',
			'n8n-nodes-base.set',
			'n8n-nodes-base.filter',
		]);

		await utils.initNodeTypes(nodeTypes);
		await utils.initBinaryDataService();

		workflowExecutionService = Container.get(WorkflowExecutionService);
		executionRepository = Container.get(ExecutionRepository);
	});

	afterEach(async () => {
		await testDb.truncate(['ExecutionEntity', 'WorkflowEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function waitForExecution(executionId: string, timeout = 10000) {
		const start = Date.now();
		while (Date.now() - start < timeout) {
			const execution = await executionRepository.findOneBy({ id: executionId });
			if (execution?.finished) return;
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
		throw new Error(`Execution ${executionId} did not complete within ${timeout}ms`);
	}

	async function getExecutionWithData(executionId: string) {
		const execution = await executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});
		if (!execution) throw new Error(`Execution ${executionId} not found`);
		return execution;
	}

	/** Items a node emitted on its first (and here only) run, on the given output branch. */
	function outputItems(
		execution: Awaited<ReturnType<typeof getExecutionWithData>>,
		nodeName: string,
		branch = 0,
	) {
		const runData = execution.data.resultData.runData[nodeName];
		expect(runData).toBeDefined();
		return runData[0].data?.main[branch] ?? [];
	}

	async function runManually(workflow: IWorkflowDb) {
		const result = await workflowExecutionService.executeManually(
			workflow,
			{ triggerToStartFrom: { name: 'Trigger' } },
			owner,
		);

		if (!('executionId' in result) || !result.executionId) {
			throw new Error(`Expected an executionId, instead got ${JSON.stringify(result)}`);
		}

		await waitForExecution(result.executionId);
		return await getExecutionWithData(result.executionId);
	}

	it('resolves to test at the top level of a manual execution', async () => {
		const workflow = await createWorkflow(
			{ name: 'Mode Probe', ...createModeProbeWorkflowFixture() } as unknown as IWorkflowDb,
			owner,
		);

		const execution = await runManually(workflow);

		expect(execution.status).toBe('success');
		expect(outputItems(execution, 'Report Mode')[0].json.executionMode).toBe('test');
		expect(outputItems(execution, 'Only Test')).toHaveLength(1);
	});

	it('resolves to test and keeps filtered items inside a sub-workflow of a manual execution', async () => {
		const childWorkflow = await createActiveWorkflow(
			{
				name: 'Mode Probe Sub-workflow',
				...createModeProbeSubWorkflowFixture(),
			} as unknown as IWorkflowDb,
			owner,
		);

		const parentWorkflow = await createWorkflow(
			{
				name: 'Parent Workflow',
				...createParentWorkflowFixture(childWorkflow.id),
			} as unknown as IWorkflowDb,
			owner,
		);

		await runManually(parentWorkflow);

		const [childExecutionSummary] = await executionRepository.find({
			where: { workflowId: childWorkflow.id },
			order: { createdAt: 'DESC' },
		});
		expect(childExecutionSummary).toBeDefined();

		const childExecution = await getExecutionWithData(childExecutionSummary.id);

		expect(childExecution.status).toBe('success');
		expect(outputItems(childExecution, 'Report Mode')[0].json.executionMode).toBe('test');
		expect(outputItems(childExecution, 'Only Test')).toHaveLength(1);
	});

	it('resolves to test two sub-workflow levels below a manual execution', async () => {
		const grandchildWorkflow = await createActiveWorkflow(
			{
				name: 'Mode Probe Sub-workflow',
				...createModeProbeSubWorkflowFixture(),
			} as unknown as IWorkflowDb,
			owner,
		);

		const childWorkflow = await createActiveWorkflow(
			{
				name: 'Middle Workflow',
				...createMiddleWorkflowFixture(grandchildWorkflow.id),
			} as unknown as IWorkflowDb,
			owner,
		);

		const parentWorkflow = await createWorkflow(
			{
				name: 'Parent Workflow',
				...createParentWorkflowFixture(childWorkflow.id),
			} as unknown as IWorkflowDb,
			owner,
		);

		await runManually(parentWorkflow);

		const [grandchildExecutionSummary] = await executionRepository.find({
			where: { workflowId: grandchildWorkflow.id },
			order: { createdAt: 'DESC' },
		});
		expect(grandchildExecutionSummary).toBeDefined();

		const grandchildExecution = await getExecutionWithData(grandchildExecutionSummary.id);

		expect(grandchildExecution.status).toBe('success');
		expect(outputItems(grandchildExecution, 'Report Mode')[0].json.executionMode).toBe('test');
		expect(outputItems(grandchildExecution, 'Only Test')).toHaveLength(1);
	});
});
