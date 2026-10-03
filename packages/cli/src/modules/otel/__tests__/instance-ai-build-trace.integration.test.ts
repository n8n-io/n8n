import { createTeamProject, createWorkflow } from '@n8n/backend-test-utils';
import type { ExecutionRepository } from '@n8n/db';
import {
	createInstanceAiTraceContext,
	currentBuildTracingContext,
	releaseTraceClient,
	setOtlpSpanProcessorFactory,
} from '@n8n/instance-ai';

import type { WorkflowRunner } from '@/workflow-runner';

import {
	executeWorkflow,
	initOtelTestEnvironment,
	restoreEnv,
	saveAndSetEnv,
	terminateOtelTestEnvironment,
	waitForExecution,
} from './support/otel-integration-utils';
import type { OtelTestProvider } from './support/otel-test-provider';
import { createMultiNodeWorkflowFixture } from './support/otel-workflow-fixtures';

let otel: OtelTestProvider;
let workflowRunner: WorkflowRunner;
let executionRepository: ExecutionRepository;
let savedEnv: Record<string, string | undefined>;

beforeAll(async () => {
	savedEnv = saveAndSetEnv({
		N8N_OTEL_ENABLED: 'true',
		N8N_OTEL_TRACES_INCLUDE_NODE_SPANS: 'true',
		N8N_OTEL_TRACES_PRODUCTION_ONLY: 'true',
		LANGSMITH_TRACING: 'false',
	});
	const env = await initOtelTestEnvironment();
	otel = env.otel;
	workflowRunner = env.workflowRunner;
	executionRepository = env.executionRepository;
	setOtlpSpanProcessorFactory(() => otel.spanProcessor());
});

afterAll(async () => {
	setOtlpSpanProcessorFactory(undefined);
	await terminateOtelTestEnvironment(otel);
	restoreEnv(savedEnv);
});

afterEach(() => {
	otel.reset();
});

describe('Instance AI build trace', () => {
	it('traces a manual run started from a build tool under the tool span', async () => {
		const project = await createTeamProject();
		const workflow = await createWorkflow(createMultiNodeWorkflowFixture(), project);
		const tracing = await createInstanceAiTraceContext({
			threadId: 'thread-1',
			messageId: 'message-1',
			runId: 'run-1',
			userId: 'user-1',
			input: {},
		});
		if (!tracing) throw new Error('expected a build trace');
		const toolRun = await tracing.startChildRun(tracing.rootRun, { name: 'tool: run-workflow' });

		const executionId = await tracing.withActiveSpan(
			toolRun,
			async () =>
				await executeWorkflow(workflowRunner, workflow, project.id, {
					mode: 'manual',
					tracingContext: currentBuildTracingContext(),
				}),
		);
		await waitForExecution(executionRepository, executionId);
		await tracing.finishRun(toolRun);
		await tracing.finishRun(tracing.rootRun);
		releaseTraceClient(tracing.rootRun.traceId);

		const spans = otel.getFinishedSpans();
		expect(spans.map((span) => span.name)).toEqual(
			expect.arrayContaining(['tool: run-workflow', 'workflow.execute']),
		);
		const toolSpan = spans.find((span) => span.name === 'tool: run-workflow')!;
		const workflowSpan = spans.find((span) => span.name === 'workflow.execute')!;
		expect(workflowSpan.spanContext().traceId).toBe(toolSpan.spanContext().traceId);
		expect(workflowSpan.parentSpanContext?.spanId).toBe(toolSpan.spanContext().spanId);
		expect(spans.filter((span) => span.name === 'node.execute')).toHaveLength(
			workflow.nodes.length,
		);
	});

	it('does not trace a manual run without a parent trace in production-only mode', async () => {
		const project = await createTeamProject();
		const workflow = await createWorkflow(createMultiNodeWorkflowFixture(), project);

		const executionId = await executeWorkflow(workflowRunner, workflow, project.id, {
			mode: 'manual',
		});
		await waitForExecution(executionRepository, executionId);

		expect(otel.getFinishedSpans()).toHaveLength(0);
	});
});
