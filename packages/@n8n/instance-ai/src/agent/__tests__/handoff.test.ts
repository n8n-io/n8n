import type { IterationLog } from '../../storage/iteration-log';
import type { WorkSummary } from '../../stream/work-summary-accumulator';
import {
	observeOutcome,
	renderHandoff,
	toPlannedTaskArg,
	toSpecString,
	type HandoffRenderers,
	type PlannedHandoff,
	type SubAgentHandoff,
} from '../handoff';

afterEach(() => {
	jest.restoreAllMocks();
});

describe('renderHandoff', () => {
	function makeDelegateHandoff(
		overrides: Partial<Extract<SubAgentHandoff, { kind: 'delegate' }>['input']> = {},
	): Extract<SubAgentHandoff, { kind: 'delegate' }> {
		return {
			taskKey: 'task-1',
			kind: 'delegate',
			input: {
				role: 'schema-reader',
				instructions: 'Read the schema and return the important IDs.',
				goal: 'Inspect the Slack node schema',
				toolNames: ['nodes'],
				...overrides,
			},
		};
	}

	const renderers: HandoffRenderers<Extract<SubAgentHandoff, { kind: 'delegate' }>> = {
		buildTaskBlock: (handoff) => handoff.input.goal,
		buildArtifacts: (handoff) => handoff.input.artifacts,
		buildRequirements: () => '<requirements>\nReturn IDs only.\n</requirements>',
	};

	it('renders the task block, context, artifacts, requirements, thread state, and prior attempts', async () => {
		const getForTask = jest.fn().mockResolvedValue([
			{
				attempt: 1,
				action: 'Tried nodes search',
				error: 'Ambiguous node name',
				diagnosis: 'Need exact package type',
			},
		]);
		const iterationLog = { getForTask } as unknown as IterationLog;
		const handoff = makeDelegateHandoff({
			conversationContext: 'User is modifying an existing Slack workflow.',
			artifacts: { workflowId: 'wf-1', channel: 'C123' },
		});

		const briefing = await renderHandoff(
			handoff,
			{
				threadId: 'thread-1',
				iterationLog,
				getRunningTaskSummaries: () => [
					{ taskId: 'build-1', role: 'workflow-builder', goal: 'Build Slack workflow' },
				],
			},
			renderers,
		);

		expect(briefing).toContain('<task>\nInspect the Slack node schema\n</task>');
		expect(briefing).toContain(
			'<conversation-context>\nUser is modifying an existing Slack workflow.\n</conversation-context>',
		);
		expect(briefing).toContain('<artifacts>\n{"workflowId":"wf-1","channel":"C123"}\n</artifacts>');
		expect(briefing).toContain('<requirements>\nReturn IDs only.\n</requirements>');
		expect(briefing).toContain(
			'<running-task taskId="build-1" role="workflow-builder">Build Slack workflow</running-task>',
		);
		expect(briefing).toContain('<previous-attempts>');
		expect(briefing).toContain('Attempt 1: Tried nodes search');
		expect(getForTask).toHaveBeenCalledWith('thread-1', 'task-1');
	});

	it('omits optional blocks when their renderers return no content', async () => {
		const briefing = await renderHandoff(
			makeDelegateHandoff(),
			{ threadId: 'thread-1' },
			{
				buildTaskBlock: (handoff) => handoff.input.goal,
				buildArtifacts: () => ({}),
				buildRequirements: () => undefined,
			},
		);

		expect(briefing).toBe('<task>\nInspect the Slack node schema\n</task>');
	});

	it('continues when iteration-log lookup fails', async () => {
		const iterationLog = {
			getForTask: jest.fn().mockRejectedValue(new Error('storage unavailable')),
		} as unknown as IterationLog;

		const briefing = await renderHandoff(
			makeDelegateHandoff(),
			{ threadId: 'thread-1', iterationLog },
			renderers,
		);

		expect(briefing).toContain('<task>');
		expect(briefing).not.toContain('<previous-attempts>');
	});
});

describe('planned-task handoff projections', () => {
	it.each([
		[
			'delegate',
			{
				taskKey: 'delegate-1',
				kind: 'delegate',
				input: {
					role: 'worker',
					instructions: 'Do it',
					goal: 'Inspect node config',
					toolNames: ['nodes'],
				},
			},
			'Inspect node config',
		],
		[
			'build-workflow',
			{
				taskKey: 'build-1',
				kind: 'build-workflow',
				input: {
					goal: 'Build a workflow',
					workflowId: 'wf-existing',
					workItemId: 'wi_build-1',
					sandboxMode: true,
				},
			},
			'Build a workflow',
		],
		[
			'manage-data-tables',
			{
				taskKey: 'table-1',
				kind: 'manage-data-tables',
				input: { goal: 'Create table schema' },
			},
			'Create table schema',
		],
		[
			'research',
			{
				taskKey: 'research-1',
				kind: 'research',
				input: { goal: 'Research Slack scopes', constraints: 'Focus on OAuth' },
			},
			'Focus on OAuth',
		],
	] satisfies Array<[string, PlannedHandoff, string]>)(
		'returns the user-facing spec for %s tasks',
		(_kind, handoff, expected) => {
			expect(toSpecString(handoff)).toBe(expected);
		},
	);

	it('projects a build-workflow task arg from the typed handoff, including workflowId', () => {
		const taskArg = toPlannedTaskArg({
			id: 'build-1',
			title: 'Patch workflow',
			deps: ['table-1'],
			tools: ['workflows'],
			handoff: {
				taskKey: 'build-1',
				kind: 'build-workflow',
				input: {
					goal: 'Patch the existing workflow',
					workflowId: 'wf-existing',
					workItemId: 'wi_build-1',
					sandboxMode: true,
				},
			},
		});

		expect(taskArg).toEqual({
			id: 'build-1',
			title: 'Patch workflow',
			kind: 'build-workflow',
			spec: 'Patch the existing workflow',
			deps: ['table-1'],
			tools: ['workflows'],
			workflowId: 'wf-existing',
		});
	});

	it('projects checkpoint task args without requiring a handoff', () => {
		expect(
			toPlannedTaskArg({
				id: 'verify-1',
				title: 'Verify workflow',
				kind: 'checkpoint',
				spec: 'Run the workflow and inspect output.',
				deps: ['build-1'],
			}),
		).toEqual({
			id: 'verify-1',
			title: 'Verify workflow',
			kind: 'checkpoint',
			spec: 'Run the workflow and inspect output.',
			deps: ['build-1'],
		});
	});
});

describe('observeOutcome', () => {
	const summary: WorkSummary = {
		totalToolCalls: 3,
		totalToolErrors: 2,
		toolCalls: [
			{ toolCallId: 'ok-1', toolName: 'nodes', succeeded: true },
			{
				toolCallId: 'fail-1',
				toolName: 'workflows',
				succeeded: false,
				errorSummary: 'Workflow not found',
			},
			{ toolCallId: 'fail-2', toolName: 'credentials', succeeded: false },
		],
	};

	it('derives status, duration, counts, stopping reason, and blocker summaries', () => {
		jest.spyOn(Date, 'now').mockReturnValue(1_700);

		const outcome = observeOutcome({
			taskKey: 'delegate-1',
			workSummary: summary,
			resultText: 'Could not finish',
			startTime: 1_000,
			error: 'Provider stopped',
		});

		expect(outcome).toEqual({
			taskKey: 'delegate-1',
			status: 'failed',
			resultText: 'Could not finish',
			toolCallCount: 3,
			toolErrorCount: 2,
			durationMs: 700,
			stoppingReason: 'Provider stopped',
			blockers: ['workflows: Workflow not found'],
		});
	});

	it('honors an explicit terminal status', () => {
		jest.spyOn(Date, 'now').mockReturnValue(2_000);

		const outcome = observeOutcome({
			taskKey: 'delegate-1',
			workSummary: { totalToolCalls: 0, totalToolErrors: 0, toolCalls: [] },
			resultText: 'Cancelled',
			startTime: 1_500,
			status: 'cancelled',
		});

		expect(outcome.status).toBe('cancelled');
		expect(outcome.durationMs).toBe(500);
		expect(outcome.blockers).toBeUndefined();
	});
});
