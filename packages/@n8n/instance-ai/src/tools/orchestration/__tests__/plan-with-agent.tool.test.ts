// Mock heavy Mastra dependencies to avoid ESM issues in Jest
jest.mock('@mastra/core/agent', () => ({
	Agent: jest.fn(),
}));
jest.mock('@mastra/core/mastra', () => ({
	Mastra: jest.fn(),
}));
jest.mock('@mastra/core/tools', () => ({
	createTool: jest.fn((config: Record<string, unknown>) => config),
}));

import type { OrchestrationContext, PlannedTaskGraph, PlannedTaskService } from '../../../types';

const {
	__testBuildPlannerBriefingContext,
	__testClearPlannedTaskGraph,
	__testFormatMessagesForBriefing,
	__testGetRecentMessages,
} =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../plan-with-agent.tool') as typeof import('../plan-with-agent.tool');

function makeContext(overrides: {
	graph: PlannedTaskGraph | null;
	runId?: string;
}): {
	context: OrchestrationContext;
	clear: jest.Mock;
	getGraph: jest.Mock;
} {
	const clear = jest.fn(async () => {
		await Promise.resolve();
	});
	const getGraph = jest.fn(async () => {
		await Promise.resolve();
		return overrides.graph;
	});
	const plannedTaskService: Partial<PlannedTaskService> = {
		getGraph,
		clear,
	};
	const context = {
		threadId: 't-1',
		runId: overrides.runId ?? 'run-current',
		plannedTaskService: plannedTaskService as PlannedTaskService,
	} as unknown as OrchestrationContext;
	return { context, clear, getGraph };
}

describe('clearPlannedTaskGraph', () => {
	it('clears the graph when it belongs to this run and is awaiting approval', async () => {
		const { context, clear } = makeContext({
			graph: {
				planRunId: 'run-current',
				status: 'awaiting_approval',
				tasks: [],
			},
		});

		await __testClearPlannedTaskGraph(context);

		expect(clear).toHaveBeenCalledWith('t-1');
	});

	it('does not clear an active graph from a prior approved plan', async () => {
		// A previous `/plan` call already succeeded; its graph is `active` with
		// pending checkpoints. A new planner error must not wipe it.
		const { context, clear } = makeContext({
			graph: {
				planRunId: 'run-previous',
				status: 'active',
				tasks: [],
			},
		});

		await __testClearPlannedTaskGraph(context);

		expect(clear).not.toHaveBeenCalled();
	});

	it('does not clear an awaiting-approval graph that was created by a different planner run', async () => {
		// Defensive: a concurrent plan for a different run should not have its
		// unapproved graph wiped by this run's error-path cleanup.
		const { context, clear } = makeContext({
			graph: {
				planRunId: 'run-other',
				status: 'awaiting_approval',
				tasks: [],
			},
		});

		await __testClearPlannedTaskGraph(context);

		expect(clear).not.toHaveBeenCalled();
	});

	it('is a no-op when no graph exists', async () => {
		const { context, clear, getGraph } = makeContext({ graph: null });

		await __testClearPlannedTaskGraph(context);

		expect(getGraph).toHaveBeenCalled();
		expect(clear).not.toHaveBeenCalled();
	});

	it('swallows getGraph errors so the caller can return its own error', async () => {
		const { context, getGraph } = makeContext({
			graph: { planRunId: 'run-current', status: 'awaiting_approval', tasks: [] },
		});
		getGraph.mockRejectedValueOnce(new Error('db down'));

		await expect(__testClearPlannedTaskGraph(context)).resolves.toBeUndefined();
	});
});

describe('formatMessagesForBriefing', () => {
	// The planner system prompt (plan-agent-prompt.ts) treats <current-datetime>
	// and <user-timezone> as a paired contract — schedule/cron decisions read
	// both. Emitting only one drops half the contract.

	it('emits <current-datetime> alongside <user-timezone> when a zone is provided', () => {
		const briefing = __testFormatMessagesForBriefing(
			[{ role: 'user', content: 'schedule me a daily digest' }],
			undefined,
			'America/New_York',
		);

		expect(briefing).toMatch(/<current-datetime>[^<]+<\/current-datetime>/);
		expect(briefing).toContain('<user-timezone>America/New_York</user-timezone>');
	});

	it('still emits <current-datetime> when no zone is provided', () => {
		const briefing = __testFormatMessagesForBriefing([], undefined, undefined);

		expect(briefing).toMatch(/<current-datetime>[^<]+<\/current-datetime>/);
		expect(briefing).not.toContain('<user-timezone>');
	});

	it('renders already-collected answers and discovered resources as dedicated sections', () => {
		const briefing = __testFormatMessagesForBriefing(
			[{ role: 'user', content: 'Build a Slack to-do agent' }],
			undefined,
			'America/New_York',
			{
				collectedAnswers: [
					'How often should the agent run?: Every morning',
					'Credential selected for slackApi: Slack account (slackApi)',
				],
				discoveredResources: ['Credentials available: Slack account (slackApi)'],
			},
		);

		expect(briefing).toContain('## Already-collected answers');
		expect(briefing).toContain('- How often should the agent run?: Every morning');
		expect(briefing).toContain('- Credential selected for slackApi: Slack account (slackApi)');
		expect(briefing).toContain('## Already-discovered resources');
		expect(briefing).toContain('- Credentials available: Slack account (slackApi)');
	});
});

describe('buildPlannerBriefingContext', () => {
	it('extracts ask-user answers and credential selections from prior tool results', () => {
		const context = __testBuildPlannerBriefingContext([
			{
				toolName: 'credentials',
				args: { action: 'list' },
				result: {
					credentials: [
						{ id: 'cred-slack', name: 'Slack account', type: 'slackApi' },
						{ id: 'cred-anthropic', name: 'Anthropic account', type: 'anthropicApi' },
					],
				},
			},
			{
				toolName: 'ask-user',
				args: {
					questions: [
						{
							id: 'schedule',
							question: 'How often should the agent run?',
							type: 'single',
						},
					],
				},
				result: {
					answered: true,
					answers: [
						{
							questionId: 'schedule',
							selectedOptions: ['Every morning'],
						},
					],
				},
			},
			{
				toolName: 'credentials',
				args: { action: 'setup' },
				result: {
					success: true,
					credentials: { slackApi: 'cred-slack' },
				},
			},
		]);

		expect(context.collectedAnswers).toEqual([
			'How often should the agent run?: Every morning',
			'Credential selected for slackApi: Slack account (slackApi)',
		]);
		expect(context.discoveredResources).toEqual([
			'Credentials available: Slack account (slackApi), Anthropic account (anthropicApi)',
		]);
	});
});

describe('getRecentMessages', () => {
	it('does not append the current user message when memory already returned it', async () => {
		const context = {
			threadId: 't-1',
			currentUserMessage: 'Build a Slack to-do agent',
			memory: {
				recall: jest.fn().mockResolvedValue({
					messages: [{ role: 'user', content: 'Build a Slack to-do agent' }],
				}),
			},
		} as unknown as OrchestrationContext;

		const messages = await __testGetRecentMessages(context, 5);

		expect(messages).toEqual([{ role: 'user', content: 'Build a Slack to-do agent' }]);
	});
});
