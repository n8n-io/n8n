import { createTeamProject, createWorkflow, getPersonalProject } from '@n8n/backend-test-utils';
import type { ExecutionRepository } from '@n8n/db';
import { SpanStatusCode } from '@opentelemetry/api';
import { NodeConnectionTypes } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import type { WorkflowRunner } from '@/workflow-runner';
import { createUser } from '@test-integration/db/users';

import {
	initOtelTestEnvironment,
	terminateOtelTestEnvironment,
	executeWorkflow,
	waitForExecution,
	saveAndSetEnv,
	restoreEnv,
} from './support/otel-integration-utils';
import type { OtelTestProvider } from './support/otel-test-provider';
import {
	createMultiNodeWorkflowFixture,
	createFailingWorkflowFixture,
} from './support/otel-workflow-fixtures';

let otel: OtelTestProvider;
let workflowRunner: WorkflowRunner;
let executionRepository: ExecutionRepository;
let savedEnv: Record<string, string | undefined>;

beforeAll(async () => {
	savedEnv = saveAndSetEnv({
		N8N_OTEL_ENABLED: 'true',
		N8N_OTEL_TRACES_INCLUDE_NODE_SPANS: 'true',
		N8N_OTEL_TRACES_PUBLISHED_ONLY: 'false',
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
		const project = await createTeamProject();
		const workflow = await createWorkflow(createMultiNodeWorkflowFixture(), project);
		const executionId = await executeWorkflow(workflowRunner, workflow, project.id);
		await waitForExecution(executionRepository, executionId);

		const spans = otel.getFinishedSpans();
		const workflowSpan = spans.find((s) => s.name === 'workflow.execute');
		const nodeSpans = spans.filter((s) => s.name === 'node.execute');

		expect(workflowSpan).toBeDefined();
		expect(workflowSpan!.attributes['n8n.execution.id']).toBe(executionId);
		expect(nodeSpans).toHaveLength(workflow.nodes.length);
	});

	it('should emit n8n.project.id on workflow.execute for a team project', async () => {
		const project = await createTeamProject();
		const workflow = await createWorkflow(createMultiNodeWorkflowFixture(), project);
		const executionId = await executeWorkflow(workflowRunner, workflow, project.id);
		await waitForExecution(executionRepository, executionId);

		const workflowSpan = otel.getFinishedSpans().find((s) => s.name === 'workflow.execute')!;
		expect(workflowSpan).toBeDefined();
		expect(workflowSpan.attributes['n8n.project.id']).toBe(project.id);
	});

	it('should emit n8n.project.id on workflow.execute for a personal project', async () => {
		const owner = await createUser();
		const personalProject = await getPersonalProject(owner);
		const workflow = await createWorkflow(createMultiNodeWorkflowFixture(), personalProject);
		const executionId = await executeWorkflow(workflowRunner, workflow, personalProject.id);
		await waitForExecution(executionRepository, executionId);

		const workflowSpan = otel.getFinishedSpans().find((s) => s.name === 'workflow.execute')!;
		expect(workflowSpan).toBeDefined();
		expect(workflowSpan.attributes['n8n.project.id']).toBe(personalProject.id);
	});

	it('should persist tracingContext to the execution entity after root span creation', async () => {
		const project = await createTeamProject();
		const workflow = await createWorkflow(createMultiNodeWorkflowFixture(), project);
		const executionId = await executeWorkflow(workflowRunner, workflow, project.id);
		await waitForExecution(executionRepository, executionId);

		const execution = await executionRepository.findOneBy({ id: executionId });
		expect(execution?.tracingContext).toBeDefined();
		expect(execution?.tracingContext?.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
	});

	it('should set error status on failed executions', async () => {
		const project = await createTeamProject();
		const workflow = await createWorkflow(createFailingWorkflowFixture(), project);
		const executionId = await executeWorkflow(workflowRunner, workflow, project.id);
		await waitForExecution(executionRepository, executionId);

		const workflowSpan = otel.getFinishedSpans().find((s) => s.name === 'workflow.execute')!;
		expect(workflowSpan.status.code).toBe(SpanStatusCode.ERROR);
		expect(workflowSpan.attributes['n8n.execution.status']).toBe('error');
	});

	it('should inherit traceId from inbound HTTP traceparent', async () => {
		const inboundTraceId = '9bf2bd87b5053953e3fa08d8d889494b';
		const project = await createTeamProject();
		const workflow = await createWorkflow(createMultiNodeWorkflowFixture(), project);
		const executionId = await executeWorkflow(workflowRunner, workflow, project.id, {
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

describe('Custom Telemetry Tags', () => {
	const createWorkflowWithCustomTagsFixture = () => ({
		nodes: [
			{
				parameters: {},
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				id: uuid(),
				name: 'Trigger',
			},
			{
				parameters: { category: 'doNothing' },
				type: 'n8n-nodes-base.debugHelper',
				typeVersion: 1,
				position: [200, 0] as [number, number],
				id: uuid(),
				name: 'DebugHelper',
				customTelemetryTags: {
					tag: [
						{ key: 'environment', value: 'production' },
						{ key: 'team', value: 'backend' },
						{ key: 'env', value: '={{ $json.env }}' },
					],
				},
			},
		],
		connections: {
			Trigger: {
				main: [
					[
						{
							node: 'DebugHelper',
							type: NodeConnectionTypes.Main,
							index: 0,
						},
					],
				],
			},
		},
		pinData: {},
	});

	const createMultiNodeCustomTagsFixture = () => ({
		nodes: [
			{
				parameters: {},
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				id: uuid(),
				name: 'Trigger',
			},
			{
				parameters: { category: 'doNothing' },
				type: 'n8n-nodes-base.debugHelper',
				typeVersion: 1,
				position: [200, 0] as [number, number],
				id: uuid(),
				name: 'HelperA',
				customTelemetryTags: {
					tag: [{ key: 'service', value: 'auth' }],
				},
			},
			{
				parameters: { category: 'doNothing' },
				type: 'n8n-nodes-base.debugHelper',
				typeVersion: 1,
				position: [400, 0] as [number, number],
				id: uuid(),
				name: 'HelperB',
				customTelemetryTags: {
					tag: [{ key: 'tier', value: 'premium' }],
				},
			},
		],
		connections: {
			Trigger: {
				main: [
					[
						{
							node: 'HelperA',
							type: NodeConnectionTypes.Main,
							index: 0,
						},
						{
							node: 'HelperB',
							type: NodeConnectionTypes.Main,
							index: 0,
						},
					],
				],
			},
		},
		pinData: {},
	});

	it('should attach static custom telemetry tags as node span attributes', async () => {
		const project = await createTeamProject();
		const workflow = await createWorkflow(createWorkflowWithCustomTagsFixture(), project);
		const executionId = await executeWorkflow(workflowRunner, workflow, project.id);
		await waitForExecution(executionRepository, executionId);

		const nodeSpan = otel
			.getFinishedSpans()
			.find((s) => s.name === 'node.execute' && s.attributes['n8n.node.name'] === 'DebugHelper')!;

		expect(nodeSpan).toBeDefined();
		expect(nodeSpan.attributes['n8n.node.custom.environment']).toBe('production');
		expect(nodeSpan.attributes['n8n.node.custom.team']).toBe('backend');
	});

	it('should evaluate expression-based custom telemetry tags', async () => {
		const project = await createTeamProject();
		const workflow = await createWorkflow(createWorkflowWithCustomTagsFixture(), project);
		const executionId = await executeWorkflow(workflowRunner, workflow, project.id, {
			triggerData: { env: 'staging' },
		});
		await waitForExecution(executionRepository, executionId);

		const nodeSpan = otel
			.getFinishedSpans()
			.find((s) => s.name === 'node.execute' && s.attributes['n8n.node.name'] === 'DebugHelper')!;

		expect(nodeSpan).toBeDefined();
		expect(nodeSpan.attributes['n8n.node.custom.env']).toBe('staging');
		expect(nodeSpan.attributes['n8n.node.custom.environment']).toBe('production');
	});

	it('should attach custom tags to the correct node spans in a multi-node workflow', async () => {
		const project = await createTeamProject();
		const workflow = await createWorkflow(createMultiNodeCustomTagsFixture(), project);
		const executionId = await executeWorkflow(workflowRunner, workflow, project.id);
		await waitForExecution(executionRepository, executionId);

		const spans = otel.getFinishedSpans().filter((s) => s.name === 'node.execute');
		const helperA = spans.find((s) => s.attributes['n8n.node.name'] === 'HelperA')!;
		const helperB = spans.find((s) => s.attributes['n8n.node.name'] === 'HelperB')!;

		expect(helperA).toBeDefined();
		expect(helperB).toBeDefined();
		expect(helperA.attributes['n8n.node.custom.service']).toBe('auth');
		expect(helperA.attributes['n8n.node.custom.tier']).toBeUndefined();
		expect(helperB.attributes['n8n.node.custom.tier']).toBe('premium');
		expect(helperB.attributes['n8n.node.custom.service']).toBeUndefined();
	});
});
