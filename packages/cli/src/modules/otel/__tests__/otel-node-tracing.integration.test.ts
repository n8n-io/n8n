import { createTeamProject, createWorkflow, testDb } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import type { ExecutionRepository } from '@n8n/db';
import { SpanStatusCode } from '@opentelemetry/api';

import { ATTR } from '@/modules/otel/otel.constants';
import type { WorkflowRunner } from '@/workflow-runner';

import type { OtelTestProvider } from './support/otel-test-provider';
import {
	createMultiNodeWorkflowFixture,
	createFailingWorkflowFixture,
	createTracingMetadataWorkflowFixture,
} from './support/otel-workflow-fixtures';
import {
	initOtelTestEnvironment,
	terminateOtelTestEnvironment,
	saveAndSetEnv,
	restoreEnv,
	executeWorkflow,
	waitForExecution,
} from './support/otel-integration-utils';

let otel: OtelTestProvider;
let workflowRunner: WorkflowRunner;
let executionRepository: ExecutionRepository;
let project: Project;
let savedEnv: Record<string, string | undefined>;

beforeAll(async () => {
	savedEnv = saveAndSetEnv({
		N8N_OTEL_ENABLED: 'true',
		N8N_OTEL_TRACES_INCLUDE_NODE_SPANS: 'true',
	});
	({ otel, workflowRunner, executionRepository } = await initOtelTestEnvironment());
});

beforeEach(async () => {
	otel.reset();
	await testDb.truncate(['ExecutionEntity', 'WorkflowEntity', 'Project']);
	project = await createTeamProject('OTel Node Tracing Project');
});

afterAll(async () => {
	restoreEnv(savedEnv);
	await terminateOtelTestEnvironment(otel);
});

describe('Node tracing', () => {
	it('should produce node.execute spans as children of workflow.execute span', async () => {
		const workflow = await createWorkflow(
			{ name: 'Multi-Node Workflow', ...createMultiNodeWorkflowFixture() },
			project,
		);

		const executionId = await executeWorkflow(workflowRunner, workflow, project.id);
		await waitForExecution(executionRepository, executionId);

		const spans = otel.getFinishedSpans();
		const workflowSpan = spans.find((s) => s.name === 'workflow.execute');
		const nodeSpans = spans.filter((s) => s.name === 'node.execute');

		expect(workflowSpan).toBeDefined();
		expect(nodeSpans.length).toBeGreaterThanOrEqual(1);

		for (const nodeSpan of nodeSpans) {
			expect(nodeSpan.spanContext().traceId).toBe(workflowSpan!.spanContext().traceId);
			expect(nodeSpan.parentSpanContext?.spanId).toBe(workflowSpan!.spanContext().spanId);
		}
	});

	it('should set correct node attributes on node spans', async () => {
		const workflow = await createWorkflow(
			{ name: 'Node Attrs Workflow', ...createMultiNodeWorkflowFixture() },
			project,
		);

		const executionId = await executeWorkflow(workflowRunner, workflow, project.id);
		await waitForExecution(executionRepository, executionId);

		const spans = otel.getFinishedSpans();
		const debugHelperSpan = spans.find(
			(s) =>
				s.name === 'node.execute' && s.attributes[ATTR.NODE_TYPE] === 'n8n-nodes-base.debugHelper',
		);

		expect(debugHelperSpan).toBeDefined();
		expect(debugHelperSpan!.attributes[ATTR.NODE_NAME]).toBe('DebugHelper');
		expect(debugHelperSpan!.attributes[ATTR.NODE_TYPE]).toBe('n8n-nodes-base.debugHelper');
		expect(debugHelperSpan!.attributes[ATTR.NODE_TYPE_VERSION]).toBe(1);
		expect(debugHelperSpan!.attributes[ATTR.NODE_ID]).toBeDefined();
	});

	it('should set OK status on successful node span', async () => {
		const workflow = await createWorkflow(
			{ name: 'Success Node Workflow', ...createMultiNodeWorkflowFixture() },
			project,
		);

		const executionId = await executeWorkflow(workflowRunner, workflow, project.id);
		await waitForExecution(executionRepository, executionId);

		const spans = otel.getFinishedSpans();
		const debugHelperSpan = spans.find(
			(s) =>
				s.name === 'node.execute' && s.attributes[ATTR.NODE_TYPE] === 'n8n-nodes-base.debugHelper',
		);

		expect(debugHelperSpan).toBeDefined();
		expect(debugHelperSpan!.status.code).toBe(SpanStatusCode.OK);
	});

	it('should set ERROR status and record exception on failing node', async () => {
		const workflow = await createWorkflow(
			{ name: 'Failing Node Workflow', ...createFailingWorkflowFixture() },
			project,
		);

		const executionId = await executeWorkflow(workflowRunner, workflow, project.id);
		await waitForExecution(executionRepository, executionId);

		const spans = otel.getFinishedSpans();
		const failingSpan = spans.find(
			(s) =>
				s.name === 'node.execute' && s.attributes[ATTR.NODE_TYPE] === 'n8n-nodes-base.debugHelper',
		);

		expect(failingSpan).toBeDefined();
		expect(failingSpan!.status.code).toBe(SpanStatusCode.ERROR);
		expect(failingSpan!.events.length).toBeGreaterThanOrEqual(1);

		const exceptionEvent = failingSpan!.events.find((e) => e.name === 'exception');
		expect(exceptionEvent).toBeDefined();
		expect(exceptionEvent!.attributes!['exception.message']).toBeDefined();
	});

	it('should record item counts on node spans', async () => {
		const workflow = await createWorkflow(
			{ name: 'Item Count Workflow', ...createMultiNodeWorkflowFixture() },
			project,
		);

		const executionId = await executeWorkflow(workflowRunner, workflow, project.id);
		await waitForExecution(executionRepository, executionId);

		const spans = otel.getFinishedSpans();
		const nodeSpans = spans.filter((s) => s.name === 'node.execute');

		expect(nodeSpans.length).toBeGreaterThanOrEqual(1);
		for (const nodeSpan of nodeSpans) {
			expect(nodeSpan.attributes[ATTR.NODE_ITEMS_OUTPUT]).toBeDefined();
			expect(typeof nodeSpan.attributes[ATTR.NODE_ITEMS_OUTPUT]).toBe('number');
		}
	});

	it('should attach tracing metadata as custom span attributes', async () => {
		const workflow = await createWorkflow(
			{ name: 'Tracing Metadata Workflow', ...createTracingMetadataWorkflowFixture() },
			project,
		);

		const executionId = await executeWorkflow(workflowRunner, workflow, project.id);
		await waitForExecution(executionRepository, executionId);

		const spans = otel.getFinishedSpans();
		const tracingNodeSpan = spans.find(
			(s) =>
				s.name === 'node.execute' &&
				s.attributes[ATTR.NODE_TYPE] === 'n8n-nodes-base.tracingTestNode',
		);

		expect(tracingNodeSpan).toBeDefined();
		expect(tracingNodeSpan!.attributes['n8n.node.custom.llm.model']).toBe('gpt-4o');
		expect(tracingNodeSpan!.attributes['n8n.node.custom.llm.token.input']).toBe(1500);
		expect(tracingNodeSpan!.attributes['n8n.node.custom.llm.token.output']).toBe(340);
		expect(tracingNodeSpan!.attributes['n8n.node.custom.llm.stream']).toBe(true);
	});

	it('should isolate node spans across concurrent executions', async () => {
		const workflow1 = await createWorkflow(
			{ name: 'Concurrent A', ...createMultiNodeWorkflowFixture() },
			project,
		);
		const workflow2 = await createWorkflow(
			{ name: 'Concurrent B', ...createMultiNodeWorkflowFixture() },
			project,
		);

		const [execId1, execId2] = await Promise.all([
			executeWorkflow(workflowRunner, workflow1, project.id),
			executeWorkflow(workflowRunner, workflow2, project.id),
		]);

		await Promise.all([
			waitForExecution(executionRepository, execId1),
			waitForExecution(executionRepository, execId2),
		]);

		const spans = otel.getFinishedSpans();
		const workflowSpans = spans.filter((s) => s.name === 'workflow.execute');
		const nodeSpans = spans.filter((s) => s.name === 'node.execute');

		expect(workflowSpans).toHaveLength(2);
		expect(nodeSpans.length).toBeGreaterThanOrEqual(2);

		for (const nodeSpan of nodeSpans) {
			const parentWorkflow = workflowSpans.find(
				(ws) => ws.spanContext().traceId === nodeSpan.spanContext().traceId,
			);
			expect(parentWorkflow).toBeDefined();
		}
	});
});
