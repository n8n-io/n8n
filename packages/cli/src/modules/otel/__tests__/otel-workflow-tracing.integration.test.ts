import { createTeamProject, createWorkflow, testDb } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import type { ExecutionRepository } from '@n8n/db';
import { SpanStatusCode } from '@opentelemetry/api';

import { ATTR } from '@/modules/otel/otel.constants';
import type { WorkflowRunner } from '@/workflow-runner';

import type { OtelTestProvider } from './support/otel-test-provider';
import {
	createSimpleWorkflowFixture,
	createFailingWorkflowFixture,
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
		N8N_OTEL_TRACES_INCLUDE_NODE_SPANS: 'false',
	});
	({ otel, workflowRunner, executionRepository } = await initOtelTestEnvironment());
});

beforeEach(async () => {
	otel.reset();
	await testDb.truncate(['ExecutionEntity', 'WorkflowEntity', 'Project']);
	project = await createTeamProject('OTel Test Project');
});

afterAll(async () => {
	restoreEnv(savedEnv);
	await terminateOtelTestEnvironment(otel);
});

describe('Workflow tracing', () => {
	it('should produce a workflow.execute span for a successful execution', async () => {
		const workflow = await createWorkflow(
			{ name: 'Success Workflow', ...createSimpleWorkflowFixture() },
			project,
		);

		const executionId = await executeWorkflow(workflowRunner, workflow, project.id, 'webhook');
		await waitForExecution(executionRepository, executionId);

		const spans = otel.getFinishedSpans();
		const workflowSpan = spans.find((s) => s.name === 'workflow.execute')!;
		expect(workflowSpan).toBeDefined();
		expect(workflowSpan.status.code).not.toBe(SpanStatusCode.ERROR);
		expect(workflowSpan.attributes).toMatchObject({
			[ATTR.WORKFLOW_ID]: workflow.id,
			[ATTR.WORKFLOW_NAME]: 'Success Workflow',
			[ATTR.WORKFLOW_NODE_COUNT]: workflow.nodes.length,
			[ATTR.WORKFLOW_VERSION_ID]: workflow.versionId,
			[ATTR.EXECUTION_ID]: executionId,
			[ATTR.EXECUTION_MODE]: 'webhook',
			[ATTR.EXECUTION_STATUS]: 'success',
			[ATTR.EXECUTION_IS_RETRY]: false,
		});
	});

	it('should not produce node.execute spans when node tracing is disabled', async () => {
		const workflow = await createWorkflow(
			{ name: 'No Node Spans Workflow', ...createSimpleWorkflowFixture() },
			project,
		);

		const executionId = await executeWorkflow(workflowRunner, workflow, project.id);
		await waitForExecution(executionRepository, executionId);

		const spans = otel.getFinishedSpans();
		const workflowSpan = spans.find((s) => s.name === 'workflow.execute');
		expect(workflowSpan).toBeDefined();

		const nodeSpans = spans.filter((s) => s.name === 'node.execute');
		expect(nodeSpans).toHaveLength(0);
	});

	it('should set execution mode to manual', async () => {
		const workflow = await createWorkflow(
			{ name: 'Manual Workflow', ...createSimpleWorkflowFixture() },
			project,
		);

		const executionId = await executeWorkflow(workflowRunner, workflow, project.id, 'manual');
		await waitForExecution(executionRepository, executionId);

		const spans = otel.getFinishedSpans();
		const workflowSpan = spans.find((s) => s.name === 'workflow.execute')!;
		expect(workflowSpan.attributes[ATTR.EXECUTION_MODE]).toBe('manual');
	});

	it('should set execution mode to trigger', async () => {
		const workflow = await createWorkflow(
			{ name: 'Trigger Workflow', ...createSimpleWorkflowFixture() },
			project,
		);

		const executionId = await executeWorkflow(workflowRunner, workflow, project.id, 'trigger');
		await waitForExecution(executionRepository, executionId);

		const spans = otel.getFinishedSpans();
		const workflowSpan = spans.find((s) => s.name === 'workflow.execute')!;
		expect(workflowSpan.attributes[ATTR.EXECUTION_MODE]).toBe('trigger');
	});

	it('should set span status to ERROR when a node error occurs', async () => {
		const workflow = await createWorkflow(
			{ name: 'Failing Workflow', ...createFailingWorkflowFixture() },
			project,
		);

		const executionId = await executeWorkflow(workflowRunner, workflow, project.id);
		await waitForExecution(executionRepository, executionId);

		const spans = otel.getFinishedSpans();
		const workflowSpan = spans.find((s) => s.name === 'workflow.execute')!;
		expect(workflowSpan).toBeDefined();
		expect(workflowSpan.status.code).toBe(SpanStatusCode.ERROR);
		expect(workflowSpan.attributes).toMatchObject({
			[ATTR.WORKFLOW_ID]: workflow.id,
			[ATTR.WORKFLOW_NAME]: 'Failing Workflow',
			[ATTR.EXECUTION_ID]: executionId,
			[ATTR.EXECUTION_STATUS]: 'error',
			[ATTR.EXECUTION_IS_RETRY]: false,
		});
		expect(workflowSpan.attributes[ATTR.EXECUTION_ERROR_TYPE]).toBe('UnknownError');
	});

	it('should set retry span attributes for retried executions', async () => {
		const workflow = await createWorkflow(
			{ name: 'Retried Workflow', ...createSimpleWorkflowFixture() },
			project,
		);

		const originalExecutionId = await executeWorkflow(
			workflowRunner,
			workflow,
			project.id,
			'webhook',
		);
		await waitForExecution(executionRepository, originalExecutionId);

		const retriedExecutionId = await executeWorkflow(
			workflowRunner,
			workflow,
			project.id,
			'retry',
			originalExecutionId,
		);
		await waitForExecution(executionRepository, retriedExecutionId);

		const spans = otel.getFinishedSpans();
		const retrySpan = spans.find(
			(span) => span.attributes[ATTR.EXECUTION_ID] === retriedExecutionId,
		);

		expect(retrySpan).toBeDefined();
		expect(retrySpan!.attributes).toMatchObject({
			[ATTR.EXECUTION_MODE]: 'retry',
			[ATTR.EXECUTION_IS_RETRY]: true,
			[ATTR.EXECUTION_RETRY_OF]: originalExecutionId,
		});
	});

	it('should isolate spans across concurrent executions', async () => {
		const workflow1 = await createWorkflow(
			{ name: 'Workflow A', ...createSimpleWorkflowFixture() },
			project,
		);
		const workflow2 = await createWorkflow(
			{ name: 'Workflow B', ...createSimpleWorkflowFixture() },
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
		expect(workflowSpans).toHaveLength(2);

		const spanA = workflowSpans.find((s) => s.attributes[ATTR.WORKFLOW_ID] === workflow1.id);
		const spanB = workflowSpans.find((s) => s.attributes[ATTR.WORKFLOW_ID] === workflow2.id);

		expect(spanA).toBeDefined();
		expect(spanB).toBeDefined();
		expect(spanA!.attributes[ATTR.WORKFLOW_NAME]).toBe('Workflow A');
		expect(spanB!.attributes[ATTR.WORKFLOW_NAME]).toBe('Workflow B');
	});
});
