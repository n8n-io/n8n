import { createTeamProject, createWorkflow, getPersonalProject } from '@n8n/backend-test-utils';
import { WorkflowRepository, type ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { SpanStatusCode } from '@opentelemetry/api';
import { NodeConnectionTypes } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { WaitTracker } from '@/wait-tracker';
import type { WorkflowRunner } from '@/workflow-runner';
import { createUser } from '@test-integration/db/users';

import {
	initOtelTestEnvironment,
	terminateOtelTestEnvironment,
	executeWorkflow,
	executeWorkflowOnWorker,
	waitForExecution,
	waitForExecutionStatus,
	saveAndSetEnv,
	restoreEnv,
} from './support/otel-integration-utils';
import type { OtelTestProvider } from './support/otel-test-provider';
import {
	createMultiNodeWorkflowFixture,
	createFailingWorkflowFixture,
	createWaitWorkflowFixture,
} from './support/otel-workflow-fixtures';
import { OtelSettingsService } from '../otel-settings.service';
import { OtelConfig } from '../otel.config';

let otel: OtelTestProvider;
let workflowRunner: WorkflowRunner;
let executionRepository: ExecutionRepository;
let savedEnv: Record<string, string | undefined>;

beforeAll(async () => {
	savedEnv = saveAndSetEnv({
		N8N_OTEL_ENABLED: 'true',
		N8N_OTEL_TRACES_INCLUDE_NODE_SPANS: 'true',
		N8N_OTEL_TRACES_PRODUCTION_ONLY: 'false',
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

	it('should keep the resumed segment in the trace of the parked segment', async () => {
		const project = await createTeamProject();
		const workflow = await createWorkflow(createWaitWorkflowFixture(), project);
		const executionId = await executeWorkflow(workflowRunner, workflow, project.id);
		await waitForExecutionStatus(executionRepository, executionId, 'waiting');

		await Container.get(WaitTracker).startExecution(executionId);
		await waitForExecutionStatus(executionRepository, executionId, 'success');

		const workflowSpans = otel.getFinishedSpans().filter((s) => s.name === 'workflow.execute');
		expect(workflowSpans).toHaveLength(2);

		const parked = workflowSpans.find((s) => s.attributes['n8n.execution.status'] === 'waiting')!;
		const resumed = workflowSpans.find((s) => s.attributes['n8n.execution.status'] === 'success')!;
		expect(parked).toBeDefined();
		expect(resumed).toBeDefined();

		expect(resumed.spanContext().traceId).toBe(parked.spanContext().traceId);
		expect(resumed.parentSpanContext?.spanId).toBe(parked.spanContext().spanId);
		expect(resumed.links[0]?.attributes?.['n8n.continuation.reason']).toBe('resume');
	});

	it('should advance the persisted tracing context to the resumed segment', async () => {
		const project = await createTeamProject();
		const workflow = await createWorkflow(createWaitWorkflowFixture(), project);
		const executionId = await executeWorkflow(workflowRunner, workflow, project.id);
		await waitForExecutionStatus(executionRepository, executionId, 'waiting');

		const parkedContext = (await executionRepository.findOneBy({ id: executionId }))
			?.tracingContext;

		await Container.get(WaitTracker).startExecution(executionId);
		await waitForExecutionStatus(executionRepository, executionId, 'success');

		const resumedContext = (await executionRepository.findOneBy({ id: executionId }))
			?.tracingContext;

		const [, parkedTraceId, parkedSpanId] = parkedContext!.traceparent.split('-');
		const [, resumedTraceId, resumedSpanId] = resumedContext!.traceparent.split('-');
		expect(resumedTraceId).toBe(parkedTraceId);
		expect(resumedSpanId).not.toBe(parkedSpanId);
	});

	it('should give the resumed segment the name of a workflow renamed during the wait', async () => {
		const project = await createTeamProject();
		const workflow = await createWorkflow(createWaitWorkflowFixture(), project);
		const executionId = await executeWorkflow(workflowRunner, workflow, project.id);
		await waitForExecutionStatus(executionRepository, executionId, 'waiting');

		await Container.get(WorkflowRepository).update(workflow.id, { name: 'Renamed during wait' });
		await Container.get(WaitTracker).startExecution(executionId);
		await waitForExecutionStatus(executionRepository, executionId, 'success');

		const spans = otel.getFinishedSpans();
		const parked = spans.find((s) => s.attributes['n8n.execution.status'] === 'waiting')!;
		const resumed = spans.find((s) => s.attributes['n8n.execution.status'] === 'success')!;
		const resumedNodeSpans = spans.filter(
			(s) =>
				s.name === 'node.execute' && s.parentSpanContext?.spanId === resumed.spanContext().spanId,
		);

		expect(parked.attributes['n8n.workflow.name']).toBe(workflow.name);
		expect(resumed.attributes['n8n.workflow.name']).toBe('Renamed during wait');
		expect(resumedNodeSpans.length).toBeGreaterThan(0);
		for (const span of resumedNodeSpans) {
			expect(span.attributes['n8n.workflow.name']).toBe('Renamed during wait');
		}
	});

	it('should add the execution identity to worker node spans when the worker starts its own trace', async () => {
		const project = await createTeamProject('Finance');
		const workflow = await createWorkflow(createMultiNodeWorkflowFixture(), project);

		const executionId = await executeWorkflowOnWorker(workflow, project.id);

		const nodeSpans = otel.getFinishedSpans().filter((s) => s.name === 'node.execute');
		expect(nodeSpans).toHaveLength(workflow.nodes.length);
		for (const span of nodeSpans) {
			expect(span.attributes).toMatchObject({
				'n8n.execution.id': executionId,
				'n8n.workflow.id': workflow.id,
				'n8n.workflow.name': workflow.name,
				'n8n.project.id': project.id,
				'n8n.project.name': 'Finance',
			});
		}
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

describe('Start marker spans', () => {
	const setStartSpanFlags = async (enabled: boolean) => {
		const config = Container.get(OtelConfig);
		config.emitWorkflowStartSpan = enabled;
		config.emitNodeStartSpan = enabled;
		await Container.get(OtelSettingsService).loadSettings();
	};

	beforeAll(async () => await setStartSpanFlags(true));
	afterAll(async () => await setStartSpanFlags(false));

	it('should emit one workflow marker and one marker for each node span', async () => {
		const project = await createTeamProject();
		const workflow = await createWorkflow(createMultiNodeWorkflowFixture(), project);
		const executionId = await executeWorkflow(workflowRunner, workflow, project.id);
		await waitForExecution(executionRepository, executionId);

		const spans = otel.getFinishedSpans();
		const workflowSpan = spans.find((s) => s.name === 'workflow.execute')!;
		const nodeSpanIds = spans
			.filter((s) => s.name === 'node.execute')
			.map((s) => s.spanContext().spanId);
		const workflowMarkers = spans.filter((s) => s.name === 'workflow.execute.started');
		const nodeMarkers = spans.filter((s) => s.name === 'node.execute.started');

		expect(workflowMarkers).toHaveLength(1);
		expect(workflowMarkers[0].parentSpanContext?.spanId).toBe(workflowSpan.spanContext().spanId);
		expect(workflowMarkers[0].attributes['n8n.execution.id']).toBe(executionId);
		expect(nodeMarkers.map((m) => m.parentSpanContext?.spanId).sort()).toEqual(nodeSpanIds.sort());
		for (const marker of [...workflowMarkers, ...nodeMarkers]) {
			expect(marker.duration).toEqual([0, 0]);
		}
	});

	it('should emit a workflow marker for each segment of a resumed execution', async () => {
		const project = await createTeamProject();
		const workflow = await createWorkflow(createWaitWorkflowFixture(), project);
		const executionId = await executeWorkflow(workflowRunner, workflow, project.id);
		await waitForExecutionStatus(executionRepository, executionId, 'waiting');

		await Container.get(WorkflowRepository).update(workflow.id, { name: 'Renamed during wait' });
		await Container.get(WaitTracker).startExecution(executionId);
		await waitForExecutionStatus(executionRepository, executionId, 'success');

		const spans = otel.getFinishedSpans();
		const parked = spans.find((s) => s.attributes['n8n.execution.status'] === 'waiting')!;
		const resumed = spans.find((s) => s.attributes['n8n.execution.status'] === 'success')!;
		const markerOf = (segment: typeof parked) =>
			spans.filter(
				(s) =>
					s.name === 'workflow.execute.started' &&
					s.parentSpanContext?.spanId === segment.spanContext().spanId,
			);

		expect(spans.filter((s) => s.name === 'workflow.execute.started')).toHaveLength(2);
		expect(markerOf(parked)).toHaveLength(1);
		expect(markerOf(resumed)).toHaveLength(1);
		expect(markerOf(resumed)[0].attributes['n8n.workflow.name']).toBe('Renamed during wait');
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
				customTelemetryTags: { tag: [{ key: 'service', value: 'auth' }] },
			},
			{
				parameters: { category: 'doNothing' },
				type: 'n8n-nodes-base.debugHelper',
				typeVersion: 1,
				position: [400, 0] as [number, number],
				id: uuid(),
				name: 'HelperB',
				customTelemetryTags: { tag: [{ key: 'tier', value: 'premium' }] },
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

	it('should attach workflow custom telemetry tags only to the workflow span', async () => {
		const project = await createTeamProject();
		const workflow = await createWorkflow(
			{
				...createMultiNodeWorkflowFixture(),
				settings: {
					customTelemetryTags: [
						{ key: 'environment', value: 'production' },
						{ key: 'workflowName', value: 'Custom Tags Workflow' },
						{ key: 'retryCount', value: '3' },
						{ key: 'isCritical', value: 'true' },
					],
				},
			},
			project,
		);
		const executionId = await executeWorkflow(workflowRunner, workflow, project.id);
		await waitForExecution(executionRepository, executionId);

		const spans = otel.getFinishedSpans();
		const workflowSpan = spans.find((s) => s.name === 'workflow.execute')!;
		const nodeSpan = spans.find((s) => s.name === 'node.execute')!;

		expect(workflowSpan.attributes['n8n.workflow.custom.environment']).toBe('production');
		expect(workflowSpan.attributes['n8n.workflow.custom.workflowName']).toBe(
			'Custom Tags Workflow',
		);
		expect(workflowSpan.attributes['n8n.workflow.custom.retryCount']).toBe('3');
		expect(workflowSpan.attributes['n8n.workflow.custom.isCritical']).toBe('true');
		expect(nodeSpan.attributes['n8n.workflow.custom.environment']).toBeUndefined();
		expect(nodeSpan.attributes['n8n.workflow.custom.workflowName']).toBeUndefined();
	});
});
