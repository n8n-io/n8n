import type { BuiltTool, InterruptibleToolContext } from '@n8n/agents';
import type { TelemetryProxy } from '@n8n/backend-services';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { ManualExecutionCancelledError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { CallableWorkflowUnavailableError } from '@/workflows/callable/callable-workflow-unavailable.error';

import { AgentSkillWorkflowTelemetry } from '../agent-skill-workflow-telemetry.service';

describe('AgentSkillWorkflowTelemetry', () => {
	const telemetry = mock<TelemetryProxy>();
	const service = new AgentSkillWorkflowTelemetry(telemetry);
	const run = {
		agent_id: 'agent-1',
		user_id: 'user-1',
		workflow_id: 'wf-1',
		skill_ids: ['skill-1', 'skill-2'],
		run_type: 'production' as const,
	};

	function trackedTool(handler: BuiltTool['handler']) {
		return service.withRunTracking({ name: 'workflow_wf-1', description: 'Run', handler }, run);
	}

	function context(overrides: Partial<InterruptibleToolContext> = {}): InterruptibleToolContext {
		return { suspend: vi.fn(), resumeData: undefined, ...overrides };
	}

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it.each([
		['success', { status: 'success' }],
		['error', { status: 'failure', failure_reason: 'workflow_error' }],
		['canceled', { status: 'failure', failure_reason: 'canceled' }],
		['unknown', { status: 'failure', failure_reason: 'unexpected' }],
		['waiting', { status: 'pending' }],
		['running_in_background', { status: 'pending' }],
	])('reports an execution with status %s', async (executionStatus, outcome) => {
		const output = { executionId: 'exec-1', status: executionStatus };
		const tool = trackedTool(async () => output);

		await expect(tool.handler!({}, context())).resolves.toBe(output);

		expect(telemetry.track).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.AGENT_RAN_SKILL_WORKFLOW, {
			...run,
			...outcome,
		});
	});

	it('reports a suspended call as pending', async () => {
		const tool = trackedTool(async () => ({ payload: {} }));

		await tool.handler!({}, context());

		expect(telemetry.track).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.AGENT_RAN_SKILL_WORKFLOW, {
			...run,
			status: 'pending',
		});
	});

	it('reports nothing when a suspended call resumes', async () => {
		const tool = trackedTool(async () => ({ executionId: 'exec-1', status: 'success' }));

		await tool.handler!({}, context({ continuation: { executionId: 'exec-1' } }));

		expect(telemetry.track).not.toHaveBeenCalled();
	});

	it('reports the reason of a workflow that n8n cannot run, and rethrows', async () => {
		const error = new CallableWorkflowUnavailableError('not_published', 'Not published');
		const tool = trackedTool(async () => {
			throw error;
		});

		await expect(tool.handler!({}, context())).rejects.toBe(error);

		expect(telemetry.track).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.AGENT_RAN_SKILL_WORKFLOW, {
			...run,
			status: 'failure',
			failure_reason: 'not_published',
		});
	});

	it('reports a stopped agent run or execution as canceled and any other error as unexpected', async () => {
		const controller = new AbortController();
		controller.abort();
		const failWith = (error: Error) =>
			trackedTool(async () => {
				throw error;
			}).handler!;

		await expect(
			failWith(new Error('boom'))({}, context({ abortSignal: controller.signal })),
		).rejects.toThrow();
		await expect(
			failWith(new ManualExecutionCancelledError('exec-1'))({}, context()),
		).rejects.toThrow();
		await expect(failWith(new Error('boom'))({}, context())).rejects.toThrow();

		expect(telemetry.track.mock.calls.map(([, props]) => props)).toEqual([
			{ ...run, status: 'failure', failure_reason: 'canceled' },
			{ ...run, status: 'failure', failure_reason: 'canceled' },
			{ ...run, status: 'failure', failure_reason: 'unexpected' },
		]);
	});
});
