import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { mock } from 'jest-mock-extended';

import type { OrchestrationContext, SpawnBackgroundTaskOptions } from '../../../types';
import { generateSampleRows } from '../../evals/generate-sample-rows.service';
import { createEvalDataAgentTool } from '../eval-data-agent.tool';

jest.mock('../../evals/generate-sample-rows.service', () => ({
	generateSampleRows: jest.fn(),
}));

const mockGenerateSampleRows = generateSampleRows as jest.MockedFunction<typeof generateSampleRows>;

function workflowWithEvalDataTable(): WorkflowJSON {
	return {
		id: 'w1',
		name: 'Support Writer',
		nodes: [
			{
				id: 'eval-trigger',
				name: 'Eval Trigger',
				type: 'n8n-nodes-base.evaluationTrigger',
				typeVersion: 4.7,
				position: [0, 0],
				parameters: {
					source: 'dataTable',
					dataTableId: { __rl: true, mode: 'id', value: 'dt-1' },
				},
			},
			{
				id: 'bridge',
				name: 'Eval Shape Bridge',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [240, 0],
				parameters: {
					assignments: {
						assignments: [
							{
								id: 'a',
								name: 'chatInput',
								value: '={{ $json.user_message }}',
								type: 'string',
							},
						],
					},
				},
			},
			{
				id: 'agent',
				name: 'Writer Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				position: [480, 0],
				parameters: {},
			},
			{
				id: 'metrics',
				name: 'Eval Set Metrics',
				type: 'n8n-nodes-base.evaluation',
				typeVersion: 4.8,
				position: [720, 0],
				parameters: {
					operation: 'setMetrics',
					expectedAnswer: "={{ $('Eval Trigger').item.json.expected_response }}",
					actualAnswer: '={{ $json.output }}',
				},
			},
		],
		connections: {
			'Eval Trigger': {
				main: [[{ node: 'Eval Shape Bridge', type: 'main', index: 0 }]],
			},
			'Eval Shape Bridge': {
				main: [[{ node: 'Writer Agent', type: 'main', index: 0 }]],
			},
			'Writer Agent': {
				main: [[{ node: 'Eval Set Metrics', type: 'main', index: 0 }]],
			},
		},
	} as unknown as WorkflowJSON;
}

function makeContext(workflow: WorkflowJSON) {
	const domainContext = {
		workflowService: {
			getAsWorkflowJSON: jest.fn().mockResolvedValue(workflow),
		},
		dataTableService: {
			getSchema: jest.fn().mockResolvedValue([
				{ id: 'c1', name: 'user_message', type: 'string', index: 0 },
				{ id: 'c2', name: 'expected_response', type: 'string', index: 1 },
				{ id: 'c3', name: 'actual_response', type: 'string', index: 2 },
			]),
			insertRows: jest.fn().mockResolvedValue({
				insertedCount: 2,
				dataTableId: 'dt-1',
				tableName: 'Support Writer eval samples',
				projectId: 'p1',
			}),
		},
		logger: {
			info: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn(),
		},
	};
	const context = mock<OrchestrationContext>();
	context.threadId = 'thread-1';
	context.runId = 'run-1';
	context.userId = 'user-1';
	context.orchestratorAgentId = 'orchestrator-1';
	context.domainContext = domainContext as never;
	context.domainTools = {};
	context.tracing = undefined;
	context.eventBus.publish = jest.fn();
	context.spawnBackgroundTask = jest.fn(() => ({
		status: 'started' as const,
		taskId: 'evaldata-1',
		agentId: 'agent-evaldata-1',
	}));
	return { context, domainContext };
}

describe('createEvalDataAgentTool', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGenerateSampleRows.mockResolvedValue([
			{ user_message: 'hello', expected_response: 'Hi there' },
			{ user_message: 'help', expected_response: 'I can help' },
		]);
	});

	it('suspends with a generic true/false approval before generating rows', async () => {
		const { context } = makeContext(workflowWithEvalDataTable());
		const suspend = jest.fn().mockImplementation(async () => await new Promise(() => {}));
		const tool = createEvalDataAgentTool(context);

		void tool.execute!({ workflowId: 'w1', projectId: 'p1' }, { agent: { suspend } } as never);

		await new Promise(process.nextTick);
		expect(suspend).toHaveBeenCalledTimes(1);
		expect(suspend.mock.calls[0][0]).toMatchObject({
			severity: 'info',
			workflowId: 'w1',
			dataTableId: 'dt-1',
			columns: ['user_message', 'expected_response'],
		});
		expect(context.spawnBackgroundTask).not.toHaveBeenCalled();
	});

	it('returns deferred when the user declines synthetic data generation', async () => {
		const { context } = makeContext(workflowWithEvalDataTable());
		const tool = createEvalDataAgentTool(context);

		const result = (await tool.execute!({ workflowId: 'w1' }, {
			agent: { resumeData: { approved: false } },
		} as never)) as Record<string, unknown>;

		expect(result).toMatchObject({ success: true, deferred: true });
		expect(context.spawnBackgroundTask).not.toHaveBeenCalled();
	});

	it('starts an eval-data background agent and inserts generated rows in its run', async () => {
		const { context, domainContext } = makeContext(workflowWithEvalDataTable());
		const tool = createEvalDataAgentTool(context);

		const result = (await tool.execute!({ workflowId: 'w1', projectId: 'p1', rowCount: 2 }, {
			agent: { resumeData: { approved: true } },
		} as never)) as Record<string, unknown>;

		expect(result).toMatchObject({
			success: true,
			shouldWaitForEvalDataAgent: true,
			taskId: expect.stringMatching(/^evaldata-/) as unknown,
		});
		expect(context.spawnBackgroundTask).toHaveBeenCalledTimes(1);
		const spawnOptions = (context.spawnBackgroundTask as jest.Mock).mock
			.calls[0][0] as SpawnBackgroundTaskOptions;
		expect(spawnOptions.role).toBe('eval-data');
		expect(spawnOptions.dedupeKey).toMatchObject({
			role: 'eval-data',
			workflowId: 'w1',
		});

		const output = await spawnOptions.run(
			new AbortController().signal,
			() => [],
			async () => {},
		);

		expect(mockGenerateSampleRows).toHaveBeenCalledWith({
			workflow: expect.objectContaining({ name: 'Support Writer' }),
			columns: ['user_message', 'expected_response'],
			rowCount: 2,
			targetAgentNodeName: 'Writer Agent',
		});
		expect(domainContext.dataTableService.insertRows).toHaveBeenCalledWith(
			'dt-1',
			[
				{ user_message: 'hello', expected_response: 'Hi there' },
				{ user_message: 'help', expected_response: 'I can help' },
			],
			{ projectId: 'p1' },
		);
		expect(output).toMatchObject({
			text: expect.stringContaining('2 rows inserted'),
			outcome: {
				workflowId: 'w1',
				dataTableId: 'dt-1',
				insertedCount: 2,
			},
		});
	});
});
