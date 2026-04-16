import type { WorkflowExecuteBeforeContext } from '@n8n/decorators';
import { trace } from '@opentelemetry/api';
import { mock } from 'jest-mock-extended';
import type { IWorkflowBase, Workflow } from 'n8n-workflow';

import { ATTR } from '../otel.constants';
import { SpanRegistry } from '../span-registry';
import { WorkflowStartHandler } from '../handlers/workflow-start.handler';
import { OtelTestProvider } from './support/otel-test-provider';

const TRACER_NAME = 'n8n-workflow';

let otel: OtelTestProvider;
let handler: WorkflowStartHandler;
let spans: SpanRegistry;

beforeAll(() => {
	otel = OtelTestProvider.create();
});

beforeEach(() => {
	otel.reset();
	handler = new WorkflowStartHandler();
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
	versionId: 'v-1',
	connections: {},
	nodes: [
		{
			id: 'node-abc',
			name: 'Trigger',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
	],
};

function makeCtx(
	overrides: Partial<WorkflowExecuteBeforeContext> = {},
): WorkflowExecuteBeforeContext {
	return {
		type: 'workflowExecuteBefore',
		workflow,
		workflowInstance: mock<Workflow>(),
		executionId: 'exec-1',
		...overrides,
	};
}

describe('WorkflowStartHandler', () => {
	it('should create a workflow.execute span with correct attributes', () => {
		const tracer = trace.getTracer(TRACER_NAME);

		handler.handle(makeCtx(), spans, tracer);

		const workflowSpan = spans.getWorkflow('exec-1');
		expect(workflowSpan).toBeDefined();
		workflowSpan!.end();

		const finished = otel.getFinishedSpans();
		expect(finished).toHaveLength(1);
		expect(finished[0].name).toBe('workflow.execute');
		expect(finished[0].attributes).toMatchObject({
			[ATTR.WORKFLOW_ID]: 'wf-1',
			[ATTR.WORKFLOW_NAME]: 'Test Workflow',
			[ATTR.WORKFLOW_NODE_COUNT]: 1,
			[ATTR.WORKFLOW_VERSION_ID]: 'v-1',
			[ATTR.EXECUTION_ID]: 'exec-1',
		});
	});

	it('should create a root span when no parentExecution is provided', () => {
		const tracer = trace.getTracer(TRACER_NAME);

		handler.handle(makeCtx(), spans, tracer);

		const span = spans.getWorkflow('exec-1');
		span!.end();

		const finished = otel.getFinishedSpans();
		expect(finished).toHaveLength(1);
		expect(finished[0].parentSpanContext?.spanId).toBeUndefined();
	});

	it('should link a sub-workflow span to the parent workflow span when parentExecution is provided', () => {
		const tracer = trace.getTracer(TRACER_NAME);

		// Simulate the parent workflow execution already being in progress
		handler.handle(makeCtx({ executionId: 'parent-exec' }), spans, tracer);
		const parentSpan = spans.getWorkflow('parent-exec')!;

		// Now the child sub-workflow starts, referencing the parent execution
		handler.handle(
			makeCtx({
				executionId: 'child-exec',
				parentExecution: { executionId: 'parent-exec', workflowId: 'wf-parent' },
			}),
			spans,
			tracer,
		);
		const childSpan = spans.getWorkflow('child-exec')!;

		childSpan.end();
		parentSpan.end();

		const finished = otel.getFinishedSpans();
		const childFinished = finished.find((s) => s.attributes[ATTR.EXECUTION_ID] === 'child-exec')!;
		const parentFinished = finished.find((s) => s.attributes[ATTR.EXECUTION_ID] === 'parent-exec')!;

		expect(childFinished.spanContext().traceId).toBe(parentFinished.spanContext().traceId);
		expect(childFinished.parentSpanContext?.spanId).toBe(parentFinished.spanContext().spanId);
	});

	it('should fall back to a root span if parentExecution is present but the parent span is unknown', () => {
		const tracer = trace.getTracer(TRACER_NAME);

		handler.handle(
			makeCtx({
				executionId: 'child-exec',
				parentExecution: { executionId: 'missing-parent', workflowId: 'wf-parent' },
			}),
			spans,
			tracer,
		);

		const childSpan = spans.getWorkflow('child-exec')!;
		childSpan.end();

		const finished = otel.getFinishedSpans();
		expect(finished).toHaveLength(1);
		expect(finished[0].parentSpanContext?.spanId).toBeUndefined();
	});
});
