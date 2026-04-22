import { SpanStatusCode } from '@opentelemetry/api';

import {
	initOtelTestEnvironment,
	terminateOtelTestEnvironment,
	executeWorkflow,
	waitForExecution,
	saveAndSetEnv,
	restoreEnv,
} from './support/otel-integration-utils';
import {
	createMultiNodeWorkflowFixture,
	createFailingWorkflowFixture,
} from './support/otel-workflow-fixtures';
import type { OtelTestProvider } from './support/otel-test-provider';
import type { WorkflowRunner } from '@/workflow-runner';
import type { ExecutionRepository } from '@n8n/db';
import { createWorkflow } from '@n8n/backend-test-utils';

let otel: OtelTestProvider;
let workflowRunner: WorkflowRunner;
let executionRepository: ExecutionRepository;
let savedEnv: Record<string, string | undefined>;

beforeAll(async () => {
	savedEnv = saveAndSetEnv({
		N8N_OTEL_ENABLED: 'true',
		N8N_OTEL_TRACES_INCLUDE_NODE_SPANS: 'true',
	});
	const env = await initOtelTestEnvironment();
	otel = env.otel;
	workflowRunner = env.workflowRunner;
	executionRepository = env.executionRepository;
});

afterAll(async () => {
	await terminateOtelTestEnvironment(otel);
	restoreEnv(savedEnv);
});

afterEach(() => {
	otel.reset();
});

describe('OTEL Workflow Tracing Integration', () => {
	it('should produce workflow and node spans for a successful execution', async () => {
		const workflow = await createWorkflow(createMultiNodeWorkflowFixture());
		const executionId = await executeWorkflow(workflowRunner, workflow, 'test-project');
		await waitForExecution(executionRepository, executionId);

		const workflowSpan = otel.getFinishedSpans().find((s) => s.name === 'workflow.execute');

		expect(workflowSpan).toBeDefined();
		expect(workflowSpan!.attributes['n8n.execution.id']).toBe(executionId);
	});

	it('should persist tracingContext to the execution entity after root span creation', async () => {
		const workflow = await createWorkflow(createMultiNodeWorkflowFixture());
		const executionId = await executeWorkflow(workflowRunner, workflow, 'test-project');
		await waitForExecution(executionRepository, executionId);

		const execution = await executionRepository.findOneBy({ id: executionId });
		expect(execution?.tracingContext).toBeDefined();
		expect(execution?.tracingContext?.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
	});

	it('should set error status on failed executions', async () => {
		const workflow = await createWorkflow(createFailingWorkflowFixture());
		const executionId = await executeWorkflow(workflowRunner, workflow, 'test-project');
		await waitForExecution(executionRepository, executionId);

		const workflowSpan = otel.getFinishedSpans().find((s) => s.name === 'workflow.execute')!;
		expect(workflowSpan.status.code).toBe(SpanStatusCode.ERROR);
		expect(workflowSpan.attributes['n8n.execution.status']).toBe('error');
	});

	it('should inherit traceId from inbound HTTP traceparent', async () => {
		const inboundTraceId = '9bf2bd87b5053953e3fa08d8d889494b';
		const workflow = await createWorkflow(createMultiNodeWorkflowFixture());
		const executionId = await executeWorkflow(workflowRunner, workflow, 'test-project', {
			mode: 'webhook',
			tracingContext: {
				traceparent: `00-${inboundTraceId}-b7ad6b7169203331-01`,
			},
		});
		await waitForExecution(executionRepository, executionId);

		const workflowSpan = otel.getFinishedSpans().find((s) => s.name === 'workflow.execute')!;
		expect(workflowSpan).toBeDefined();
		expect(workflowSpan.spanContext().traceId).toBe(inboundTraceId);
	});
});
