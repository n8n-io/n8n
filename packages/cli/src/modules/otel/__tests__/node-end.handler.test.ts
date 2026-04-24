import type { NodeExecuteAfterContext } from '@n8n/decorators';
import type { ExecutionError, IRunExecutionData, IWorkflowBase } from 'n8n-workflow';
import { SpanStatusCode, trace } from '@opentelemetry/api';

import { ATTR } from '../otel.constants';
import { SpanRegistry } from '../span-registry';
import { NodeStartHandler } from '../handlers/node-start.handler';
import { NodeEndHandler } from '../handlers/node-end.handler';
import { OtelTestProvider } from './support/otel-test-provider';

const TRACER_NAME = 'n8n-workflow';

let otel: OtelTestProvider;
let startHandler: NodeStartHandler;
let endHandler: NodeEndHandler;
let spans: SpanRegistry;

beforeAll(() => {
	otel = OtelTestProvider.create();
});

beforeEach(() => {
	otel.reset();
	startHandler = new NodeStartHandler();
	endHandler = new NodeEndHandler();
	spans = new SpanRegistry();
});

afterAll(async () => {
	await otel.shutdown();
});

const workflow: IWorkflowBase = {
	id: 'wf-1',
	name: 'Test Workflow',
	active: false,
	isArchived: false,
	createdAt: new Date(),
	updatedAt: new Date(),
	activeVersionId: null,
	connections: {},
	nodes: [
		{
			id: 'node-trigger',
			name: 'Manual Trigger',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
		{
			id: 'node-abc',
			name: 'HTTP Request',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 2,
			position: [200, 0],
			parameters: {},
		},
	],
};

function startNodeSpan(executionId: string, nodeName: string) {
	const tracer = trace.getTracer(TRACER_NAME);
	startHandler.handle(
		{
			type: 'nodeExecuteBefore',
			workflow,
			nodeName,
			executionId,
			taskData: { startTime: Date.now(), executionIndex: 0, source: [] },
		},
		spans,
		tracer,
	);
}

const emptyExecutionData = {
	resultData: {
		runData: {},
		pinData: {},
	},
	executionData: undefined,
} as unknown as IRunExecutionData;

describe('NodeEndHandler', () => {
	it('should set status OK and item counts on successful execution', () => {
		startNodeSpan('exec-1', 'HTTP Request');

		const executionData: IRunExecutionData = {
			...emptyExecutionData,
			resultData: {
				...emptyExecutionData.resultData,
				runData: {
					'Manual Trigger': [
						{
							startTime: 0,
							executionTime: 10,
							executionIndex: 0,
							source: [],
							data: {
								main: [[{ json: { a: 1 } }, { json: { a: 2 } }, { json: { a: 3 } }]],
							},
						},
					],
				},
			},
		};

		const ctx: NodeExecuteAfterContext = {
			type: 'nodeExecuteAfter',
			workflow,
			nodeName: 'HTTP Request',
			executionId: 'exec-1',
			taskData: {
				startTime: 0,
				executionTime: 100,
				executionIndex: 1,
				source: [{ previousNode: 'Manual Trigger', previousNodeRun: 0 }],
				data: {
					main: [[{ json: { result: 1 } }, { json: { result: 2 } }]],
				},
			},
			executionData,
		};

		endHandler.handle(ctx, spans);

		const finished = otel.getFinishedSpans();
		expect(finished).toHaveLength(1);
		expect(finished[0].name).toBe('node.execute');
		expect(finished[0].status.code).toBe(SpanStatusCode.OK);
		expect(finished[0].attributes[ATTR.NODE_ITEMS_OUTPUT]).toBe(2);
		expect(finished[0].attributes[ATTR.NODE_ITEMS_INPUT]).toBe(3);
	});

	it('should set status ERROR and record exception event on node error', () => {
		startNodeSpan('exec-1', 'HTTP Request');

		const error = new Error('Request failed') as ExecutionError;
		error.stack = 'Error: Request failed\n    at test.ts:1:1';

		const ctx: NodeExecuteAfterContext = {
			type: 'nodeExecuteAfter',
			workflow,
			nodeName: 'HTTP Request',
			executionId: 'exec-1',
			taskData: {
				startTime: 0,
				executionTime: 50,
				executionIndex: 1,
				source: [],
				error,
			},
			executionData: emptyExecutionData,
		};

		endHandler.handle(ctx, spans);

		const finished = otel.getFinishedSpans();
		expect(finished).toHaveLength(1);
		expect(finished[0].status.code).toBe(SpanStatusCode.ERROR);
		expect(finished[0].attributes[ATTR.NODE_ITEMS_OUTPUT]).toBe(0);

		const events = finished[0].events;
		expect(events).toHaveLength(1);
		expect(events[0].name).toBe('exception');
		expect(events[0].attributes).toMatchObject({
			'exception.message': 'Request failed',
			'exception.type': 'Error',
			'exception.stacktrace': error.stack,
		});
	});

	it('should not fail if node span was not started', () => {
		const ctx: NodeExecuteAfterContext = {
			type: 'nodeExecuteAfter',
			workflow,
			nodeName: 'HTTP Request',
			executionId: 'exec-1',
			taskData: {
				startTime: 0,
				executionTime: 50,
				executionIndex: 1,
				source: [],
				data: { main: [[{ json: {} }]] },
			},
			executionData: emptyExecutionData,
		};

		// Should not throw
		endHandler.handle(ctx, spans);
		expect(otel.getFinishedSpans()).toHaveLength(0);
	});

	it('should attach tracing metadata as custom span attributes', () => {
		startNodeSpan('exec-1', 'HTTP Request');

		const ctx: NodeExecuteAfterContext = {
			type: 'nodeExecuteAfter',
			workflow,
			nodeName: 'HTTP Request',
			executionId: 'exec-1',
			taskData: {
				startTime: 0,
				executionTime: 100,
				executionIndex: 1,
				source: [],
				data: { main: [[{ json: {} }]] },
				metadata: {
					tracing: {
						'llm.model': 'gpt-4o',
						'llm.token.input': 1500,
						'llm.token.output': 340,
						'llm.stream': true,
					},
				},
			},
			executionData: emptyExecutionData,
		};

		endHandler.handle(ctx, spans);

		const finished = otel.getFinishedSpans();
		expect(finished).toHaveLength(1);
		expect(finished[0].attributes['n8n.node.custom.llm.model']).toBe('gpt-4o');
		expect(finished[0].attributes['n8n.node.custom.llm.token.input']).toBe(1500);
		expect(finished[0].attributes['n8n.node.custom.llm.token.output']).toBe(340);
		expect(finished[0].attributes['n8n.node.custom.llm.stream']).toBe(true);
	});

	it('should count input items only from the referenced output branch', () => {
		const multiOutputWorkflow: IWorkflowBase = {
			...workflow,
			nodes: [
				...workflow.nodes,
				{
					id: 'node-if',
					name: 'IF',
					type: 'n8n-nodes-base.if',
					typeVersion: 1,
					position: [100, 0],
					parameters: {},
				},
			],
		};

		// Start span for the node under test using multi-output workflow
		const tracer = trace.getTracer(TRACER_NAME);
		startHandler.handle(
			{
				type: 'nodeExecuteBefore',
				workflow: multiOutputWorkflow,
				nodeName: 'HTTP Request',
				executionId: 'exec-multi',
				taskData: { startTime: Date.now(), executionIndex: 0, source: [] },
			},
			spans,
			tracer,
		);

		const executionData: IRunExecutionData = {
			...emptyExecutionData,
			resultData: {
				...emptyExecutionData.resultData,
				runData: {
					IF: [
						{
							startTime: 0,
							executionTime: 10,
							executionIndex: 0,
							source: [],
							data: {
								main: [
									// Branch 0 (true): 2 items
									[{ json: { matched: true } }, { json: { matched: true } }],
									// Branch 1 (false): 5 items
									[
										{ json: { matched: false } },
										{ json: { matched: false } },
										{ json: { matched: false } },
										{ json: { matched: false } },
										{ json: { matched: false } },
									],
								],
							},
						},
					],
				},
			},
		};

		const ctx: NodeExecuteAfterContext = {
			type: 'nodeExecuteAfter',
			workflow: multiOutputWorkflow,
			nodeName: 'HTTP Request',
			executionId: 'exec-multi',
			taskData: {
				startTime: 0,
				executionTime: 100,
				executionIndex: 1,
				// Connected to branch 1 (false) of the IF node
				source: [{ previousNode: 'IF', previousNodeRun: 0, previousNodeOutput: 1 }],
				data: { main: [[{ json: { result: 1 } }]] },
			},
			executionData,
		};

		endHandler.handle(ctx, spans);

		const finished = otel.getFinishedSpans();
		expect(finished).toHaveLength(1);
		// Should count only branch 1 (5 items), not branch 0+1 (7 items)
		expect(finished[0].attributes[ATTR.NODE_ITEMS_INPUT]).toBe(5);
	});

	it('should handle zero output items', () => {
		startNodeSpan('exec-1', 'HTTP Request');

		const ctx: NodeExecuteAfterContext = {
			type: 'nodeExecuteAfter',
			workflow,
			nodeName: 'HTTP Request',
			executionId: 'exec-1',
			taskData: {
				startTime: 0,
				executionTime: 50,
				executionIndex: 1,
				source: [],
			},
			executionData: emptyExecutionData,
		};

		endHandler.handle(ctx, spans);

		const finished = otel.getFinishedSpans();
		expect(finished[0].attributes[ATTR.NODE_ITEMS_OUTPUT]).toBe(0);
		expect(finished[0].attributes[ATTR.NODE_ITEMS_INPUT]).toBe(0);
	});
});
