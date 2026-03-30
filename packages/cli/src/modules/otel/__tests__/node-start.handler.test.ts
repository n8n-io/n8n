import type { NodeExecuteBeforeContext } from '@n8n/decorators';
import type { IWorkflowBase } from 'n8n-workflow';
import { trace } from '@opentelemetry/api';

import { ATTR } from '../otel.constants';
import { SpanRegistry } from '../span-registry';
import { NodeStartHandler } from '../handlers/node-start.handler';
import { OtelTestProvider } from './support/otel-test-provider';

const TRACER_NAME = 'n8n-workflow';

let otel: OtelTestProvider;
let handler: NodeStartHandler;
let spans: SpanRegistry;

beforeAll(() => {
	otel = OtelTestProvider.create();
});

beforeEach(() => {
	otel.reset();
	handler = new NodeStartHandler();
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
			id: 'node-abc',
			name: 'HTTP Request',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 2,
			position: [0, 0],
			parameters: {},
		},
		{
			id: 'node-def',
			name: 'Set',
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
			position: [200, 0],
			parameters: {},
		},
	],
};

describe('NodeStartHandler', () => {
	it('should create a node.execute span with correct attributes', () => {
		const tracer = trace.getTracer(TRACER_NAME);
		const ctx: NodeExecuteBeforeContext = {
			type: 'nodeExecuteBefore',
			workflow,
			nodeName: 'HTTP Request',
			executionId: 'exec-1',
			taskData: { startTime: Date.now(), executionIndex: 0, source: [] },
		};

		handler.handle(ctx, spans, tracer);

		const nodeSpan = spans.getNode('exec-1', 'node-abc');
		expect(nodeSpan).toBeDefined();

		// End the span so it shows up in finished spans
		nodeSpan!.end();

		const finished = otel.getFinishedSpans();
		expect(finished).toHaveLength(1);
		expect(finished[0].name).toBe('node.execute');
		expect(finished[0].attributes).toMatchObject({
			[ATTR.NODE_ID]: 'node-abc',
			[ATTR.NODE_NAME]: 'HTTP Request',
			[ATTR.NODE_TYPE]: 'n8n-nodes-base.httpRequest',
			[ATTR.NODE_TYPE_VERSION]: 2,
		});
	});

	it('should create node span as child of workflow span', () => {
		const tracer = trace.getTracer(TRACER_NAME);

		// Create a workflow span first
		const workflowSpan = tracer.startSpan('workflow.execute');
		spans.addWorkflow('exec-1', workflowSpan);

		const ctx: NodeExecuteBeforeContext = {
			type: 'nodeExecuteBefore',
			workflow,
			nodeName: 'HTTP Request',
			executionId: 'exec-1',
			taskData: { startTime: Date.now(), executionIndex: 0, source: [] },
		};

		handler.handle(ctx, spans, tracer);

		const nodeSpan = spans.getNode('exec-1', 'node-abc');
		nodeSpan!.end();
		workflowSpan.end();

		const finished = otel.getFinishedSpans();
		const nodeFinished = finished.find((s) => s.name === 'node.execute')!;
		const workflowFinished = finished.find((s) => s.name === 'workflow.execute')!;

		// Node span should share the same trace ID as the workflow span
		expect(nodeFinished.spanContext().traceId).toBe(workflowFinished.spanContext().traceId);
		// Node span's parent should be the workflow span
		expect(nodeFinished.parentSpanContext?.spanId).toBe(workflowFinished.spanContext().spanId);
	});

	it('should not create a span if node is not found in workflow', () => {
		const tracer = trace.getTracer(TRACER_NAME);
		const ctx: NodeExecuteBeforeContext = {
			type: 'nodeExecuteBefore',
			workflow,
			nodeName: 'NonExistent Node',
			executionId: 'exec-1',
			taskData: { startTime: Date.now(), executionIndex: 0, source: [] },
		};

		handler.handle(ctx, spans, tracer);

		expect(spans.getNode('exec-1', 'node-abc')).toBeUndefined();
		expect(otel.getFinishedSpans()).toHaveLength(0);
	});
});
