import { ModuleRegistry } from '@n8n/backend-common';
import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project, WorkflowEntity } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { SpanStatusCode } from '@opentelemetry/api';
import { InstanceSettings } from 'n8n-core';
import { DebugHelper } from 'n8n-nodes-base/nodes/DebugHelper/DebugHelper.node';
import { ManualTrigger } from 'n8n-nodes-base/nodes/ManualTrigger/ManualTrigger.node';
import { createRunExecutionData } from 'n8n-workflow';

import { ATTR } from '@/modules/otel/otel.constants';
import { WorkflowRunner } from '@/workflow-runner';
import * as utils from '@test-integration/utils';
import {
	createSimpleWorkflowFixture,
	createFailingWorkflowFixture,
} from '@test-integration/workflow-fixtures';

import { OtelTestProvider } from './otel-test-provider';

let otel: OtelTestProvider;
let workflowRunner: WorkflowRunner;
let executionRepository: ExecutionRepository;
let project: Project;
let previousOtelEnabled: string | undefined;

beforeAll(async () => {
	otel = OtelTestProvider.create();

	previousOtelEnabled = process.env.N8N_OTEL_ENABLED;
	process.env.N8N_OTEL_ENABLED = 'true';

	await testModules.loadModules(['otel']);
	await testDb.init();
	await Container.get(ModuleRegistry).initModules('main');
	await utils.initNodeTypes({
		'n8n-nodes-base.manualTrigger': { type: new ManualTrigger(), sourcePath: '' },
		'n8n-nodes-base.debugHelper': { type: new DebugHelper(), sourcePath: '' },
	});
	await utils.initBinaryDataService();

	Container.get(InstanceSettings).markAsLeader();

	workflowRunner = Container.get(WorkflowRunner);
	executionRepository = Container.get(ExecutionRepository);
});

beforeEach(async () => {
	otel.reset();
	await testDb.truncate(['ExecutionEntity', 'WorkflowEntity', 'Project']);
	project = await createTeamProject('OTel Test Project');
});

afterAll(async () => {
	if (previousOtelEnabled === undefined) {
		delete process.env.N8N_OTEL_ENABLED;
	} else {
		process.env.N8N_OTEL_ENABLED = previousOtelEnabled;
	}
	await otel.shutdown();
	await testDb.terminate();
});

async function executeWorkflow(
	workflow: WorkflowEntity,
	mode: 'webhook' | 'trigger' | 'manual' | 'retry' = 'webhook',
	retryOf?: string,
): Promise<string> {
	const executionData = createRunExecutionData({});
	return await workflowRunner.run(
		{
			workflowData: workflow,
			userId: project.id,
			executionMode: mode,
			executionData,
			retryOf,
		},
		true,
	);
}

async function waitForExecution(executionId: string, timeout = 10_000): Promise<void> {
	const start = Date.now();
	while (Date.now() - start < timeout) {
		const execution = await executionRepository.findOneBy({ id: executionId });
		if (execution?.stoppedAt) return;
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	throw new Error(`Execution ${executionId} did not complete within ${timeout}ms`);
}

describe('Workflow tracing', () => {
	it('should produce a workflow.execute span for a successful execution', async () => {
		const workflow = await createWorkflow(
			{ name: 'Success Workflow', ...createSimpleWorkflowFixture() },
			project,
		);

		const executionId = await executeWorkflow(workflow, 'webhook');
		await waitForExecution(executionId);

		const spans = otel.getFinishedSpans();
		expect(spans).toHaveLength(1);
		expect(spans[0].name).toBe('workflow.execute');
		expect(spans[0].status.code).not.toBe(SpanStatusCode.ERROR);
		expect(spans[0].attributes).toMatchObject({
			[ATTR.WORKFLOW_ID]: workflow.id,
			[ATTR.WORKFLOW_NAME]: 'Success Workflow',
			[ATTR.WORKFLOW_NODE_COUNT]: workflow.nodes.length,
			[ATTR.EXECUTION_ID]: executionId,
			[ATTR.EXECUTION_MODE]: 'webhook',
			[ATTR.EXECUTION_STATUS]: 'success',
			[ATTR.EXECUTION_IS_RETRY]: false,
		});
	});

	it('should set execution mode to manual', async () => {
		const workflow = await createWorkflow(
			{ name: 'Manual Workflow', ...createSimpleWorkflowFixture() },
			project,
		);

		const executionId = await executeWorkflow(workflow, 'manual');
		await waitForExecution(executionId);

		const spans = otel.getFinishedSpans();
		expect(spans[0].attributes[ATTR.EXECUTION_MODE]).toBe('manual');
	});

	it('should set execution mode to trigger', async () => {
		const workflow = await createWorkflow(
			{ name: 'Trigger Workflow', ...createSimpleWorkflowFixture() },
			project,
		);

		const executionId = await executeWorkflow(workflow, 'trigger');
		await waitForExecution(executionId);

		const spans = otel.getFinishedSpans();
		expect(spans[0].attributes[ATTR.EXECUTION_MODE]).toBe('trigger');
	});

	it('should set span status to ERROR when a node error occurs', async () => {
		const fixture = createFailingWorkflowFixture();
		const workflow = await createWorkflow({ name: 'Failing Workflow', ...fixture }, project);

		const triggerNode = workflow.nodes.find((n) => n.type === 'n8n-nodes-base.manualTrigger')!;
		const executionData = createRunExecutionData({
			executionData: {
				nodeExecutionStack: [
					{
						node: triggerNode,
						data: { main: [[{ json: {}, pairedItem: { item: 0 } }]] },
						source: null,
					},
				],
			},
			startData: {
				startNodes: [{ name: triggerNode.name, sourceData: null }],
			},
		});

		const executionId = await workflowRunner.run(
			{
				workflowData: workflow,
				userId: project.id,
				executionMode: 'webhook',
				executionData,
			},
			true,
		);
		await waitForExecution(executionId);

		const spans = otel.getFinishedSpans();
		expect(spans).toHaveLength(1);
		expect(spans[0].name).toBe('workflow.execute');
		expect(spans[0].status.code).toBe(SpanStatusCode.ERROR);
		expect(spans[0].attributes).toMatchObject({
			[ATTR.WORKFLOW_ID]: workflow.id,
			[ATTR.WORKFLOW_NAME]: 'Failing Workflow',
			[ATTR.EXECUTION_ID]: executionId,
			[ATTR.EXECUTION_STATUS]: 'error',
			[ATTR.EXECUTION_IS_RETRY]: false,
		});
		expect(spans[0].attributes[ATTR.EXECUTION_ERROR_TYPE]).toBe('UnknownError');
	});

	it('should set retry span attributes for retried executions', async () => {
		const workflow = await createWorkflow(
			{ name: 'Retried Workflow', ...createSimpleWorkflowFixture() },
			project,
		);

		const originalExecutionId = await executeWorkflow(workflow, 'webhook');
		await waitForExecution(originalExecutionId);

		const retriedExecutionId = await executeWorkflow(workflow, 'retry', originalExecutionId);
		await waitForExecution(retriedExecutionId);

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
			executeWorkflow(workflow1),
			executeWorkflow(workflow2),
		]);

		await Promise.all([waitForExecution(execId1), waitForExecution(execId2)]);

		const spans = otel.getFinishedSpans();
		expect(spans).toHaveLength(2);

		const spanA = spans.find((s) => s.attributes[ATTR.WORKFLOW_ID] === workflow1.id);
		const spanB = spans.find((s) => s.attributes[ATTR.WORKFLOW_ID] === workflow2.id);

		expect(spanA).toBeDefined();
		expect(spanB).toBeDefined();
		expect(spanA!.attributes[ATTR.WORKFLOW_NAME]).toBe('Workflow A');
		expect(spanB!.attributes[ATTR.WORKFLOW_NAME]).toBe('Workflow B');
	});
});
