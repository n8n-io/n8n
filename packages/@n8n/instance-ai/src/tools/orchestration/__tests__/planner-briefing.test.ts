import type { OrchestrationContext } from '../../../types';
import {
	buildPlannerBriefingContext,
	formatMessagesForBriefing,
	getPriorToolObservations,
	getRecentMessages,
} from '../planner-briefing';

describe('formatMessagesForBriefing', () => {
	// The planner system prompt (plan-agent-prompt.ts) treats <current-datetime>
	// and <user-timezone> as a paired contract — schedule/cron decisions read
	// both. Emitting only one drops half the contract.

	it('emits <current-datetime> alongside <user-timezone> when a zone is provided', () => {
		const briefing = formatMessagesForBriefing(
			[{ role: 'user', content: 'schedule me a daily digest' }],
			undefined,
			'America/New_York',
		);

		expect(briefing).toMatch(/<current-datetime>[^<]+<\/current-datetime>/);
		expect(briefing).toContain('<user-timezone>America/New_York</user-timezone>');
	});

	it('still emits <current-datetime> when no zone is provided', () => {
		const briefing = formatMessagesForBriefing([], undefined, undefined);

		expect(briefing).toMatch(/<current-datetime>[^<]+<\/current-datetime>/);
		expect(briefing).not.toContain('<user-timezone>');
	});

	it('renders already-collected answers and discovered resources as dedicated sections', () => {
		const briefing = formatMessagesForBriefing(
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
		const context = buildPlannerBriefingContext([
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

	it('ignores unanswered and skipped ask-user answers', () => {
		const context = buildPlannerBriefingContext([
			{
				toolName: 'ask-user',
				args: {
					questions: [{ id: 'purpose', question: 'What should this do?', type: 'text' }],
				},
				result: {
					answered: false,
					answers: [
						{
							questionId: 'purpose',
							customText: 'This should not be used',
						},
					],
				},
			},
			{
				toolName: 'ask-user',
				args: {
					questions: [
						{ id: 'schedule', question: 'How often should it run?', type: 'single' },
						{ id: 'model', question: 'Which model should it use?', type: 'single' },
					],
				},
				result: {
					answered: true,
					answers: [
						{
							questionId: 'schedule',
							selectedOptions: ['Every morning'],
							skipped: true,
						},
						{
							questionId: 'model',
							selectedOptions: ['Anthropic'],
						},
					],
				},
			},
		]);

		expect(context.collectedAnswers).toEqual(['Which model should it use?: Anthropic']);
		expect(context.discoveredResources).toEqual([]);
	});
});

describe('getPriorToolObservations', () => {
	it('reads tool results across the current message group when available', () => {
		const askUserCall = {
			questions: [{ id: 'purpose', question: 'What should this do?', type: 'text' }],
		};
		const askUserResult = {
			answered: true,
			answers: [
				{ questionId: 'purpose', question: 'What should this do?', customText: 'Email me' },
			],
		};
		const getEventsForRun = jest.fn().mockReturnValue([]);
		const getEventsForRuns = jest.fn().mockReturnValue([
			{
				type: 'tool-call',
				runId: 'run-prior',
				agentId: 'orchestrator',
				payload: {
					toolCallId: 'tool-1',
					toolName: 'ask-user',
					args: askUserCall,
				},
			},
			{
				type: 'tool-result',
				runId: 'run-prior',
				agentId: 'orchestrator',
				payload: {
					toolCallId: 'tool-1',
					result: askUserResult,
				},
			},
		]);
		const context = {
			threadId: 'thread-1',
			runId: 'run-current',
			messageGroupId: 'message-group-1',
			eventBus: {
				getEventsAfter: jest.fn().mockReturnValue([
					{
						id: 1,
						event: {
							type: 'run-start',
							runId: 'run-prior',
							agentId: 'orchestrator',
							payload: { messageId: 'message-1', messageGroupId: 'message-group-1' },
						},
					},
					{
						id: 2,
						event: {
							type: 'run-start',
							runId: 'run-other',
							agentId: 'orchestrator',
							payload: { messageId: 'message-2', messageGroupId: 'message-group-2' },
						},
					},
				]),
				getEventsForRuns,
				getEventsForRun,
			},
		} as unknown as OrchestrationContext;

		const observations = getPriorToolObservations(context);

		expect(getEventsForRuns).toHaveBeenCalledWith('thread-1', ['run-prior', 'run-current']);
		expect(getEventsForRun).not.toHaveBeenCalled();
		expect(observations).toEqual([
			{
				toolName: 'ask-user',
				args: askUserCall,
				result: askUserResult,
			},
		]);
	});

	it('pairs out-of-order tool results with their later tool calls', () => {
		const args = { action: 'list' };
		const result = { credentials: [{ id: 'cred-1', name: 'Slack', type: 'slackApi' }] };
		const context = {
			threadId: 'thread-1',
			runId: 'run-current',
			eventBus: {
				getEventsForRun: jest.fn().mockReturnValue([
					{
						type: 'tool-result',
						runId: 'run-current',
						agentId: 'orchestrator',
						payload: { toolCallId: 'tool-1', result },
					},
					{
						type: 'tool-call',
						runId: 'run-current',
						agentId: 'orchestrator',
						payload: { toolCallId: 'tool-1', toolName: 'credentials', args },
					},
				]),
			},
		} as unknown as OrchestrationContext;

		expect(getPriorToolObservations(context)).toEqual([{ toolName: 'credentials', args, result }]);
	});

	it('returns no observations when event lookup fails', () => {
		const context = {
			threadId: 'thread-1',
			runId: 'run-current',
			eventBus: {
				getEventsForRun: jest.fn(() => {
					throw new Error('storage unavailable');
				}),
			},
		} as unknown as OrchestrationContext;

		expect(getPriorToolObservations(context)).toEqual([]);
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

		const messages = await getRecentMessages(context, 5);

		expect(messages).toEqual([{ role: 'user', content: 'Build a Slack to-do agent' }]);
	});
});
