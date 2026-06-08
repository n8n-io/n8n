import { buildTranscriptFromEvents } from '../outcome/transcript-from-events';
import type { CapturedEvent } from '../types';

function evt(type: string, data: Record<string, unknown> = {}): CapturedEvent {
	return { timestamp: 0, type, data };
}

const RUN_START = evt('run-start');

describe('buildTranscriptFromEvents', () => {
	it('returns empty when there are no events', () => {
		expect(buildTranscriptFromEvents({ events: [] })).toEqual([]);
	});

	it('assembles agent text and the opening user message per turn', () => {
		const turns = buildTranscriptFromEvents({
			events: [RUN_START, evt('text-delta', { text: 'Hello there' })],
			openingMessage: 'Build me a workflow',
		});
		expect(turns).toHaveLength(1);
		expect(turns[0]).toMatchObject({
			userMessage: 'Build me a workflow',
			agentText: 'Hello there',
		});
	});

	describe('ask-user routing', () => {
		const questions = [{ id: 'q1', question: 'Which channels?' }];

		it('renders ask-user from confirmation-request and skips the tool-call twin', () => {
			const turns = buildTranscriptFromEvents({
				events: [
					RUN_START,
					evt('tool-call', { payload: { toolName: 'ask-user', args: { questions } } }),
					evt('confirmation-request', {
						payload: { requestId: 'r1', questions, inputType: 'questions' },
					}),
				],
				proxyResponses: new Map([
					[
						'r1',
						{
							kind: 'questions' as const,
							answers: [{ questionId: 'q1', selectedOptions: ['#general'] }],
						},
					],
				]),
			});
			const interactions = turns[0].toolInteractions;
			expect(interactions).toHaveLength(1);
			expect(interactions[0]).toMatchObject({
				kind: 'ask-user',
				questions: [{ id: 'q1', question: 'Which channels?' }],
				answers: [{ questionId: 'q1', selectedOptions: ['#general'] }],
			});
		});

		it('renders only the questions on the confirmation-request, not the tool-call', () => {
			const turns = buildTranscriptFromEvents({
				events: [
					RUN_START,
					evt('tool-call', { payload: { toolName: 'ask-user', args: { questions } } }),
					evt('confirmation-request', {
						payload: { requestId: 'r1', questions, inputType: 'questions' },
					}),
				],
			});
			const askUserInteractions = turns[0].toolInteractions.filter((i) => i.kind === 'ask-user');
			expect(askUserInteractions).toHaveLength(1);
		});
	});

	describe('plan routing', () => {
		it('renders plan from tool-call args', () => {
			const turns = buildTranscriptFromEvents({
				events: [
					RUN_START,
					evt('tool-call', {
						payload: {
							toolName: 'create-tasks',
							args: { tasks: [{ title: 'Fetch posts', description: 'GET /posts' }] },
						},
					}),
				],
			});
			expect(turns[0].toolInteractions[0]).toMatchObject({
				kind: 'plan',
				tasks: [{ title: 'Fetch posts', description: 'GET /posts' }],
			});
		});
	});

	describe('setup wizard routing', () => {
		it('renders the outcome from tool-result and skips the confirmation-request twin', () => {
			const turns = buildTranscriptFromEvents({
				events: [
					RUN_START,
					evt('confirmation-request', {
						payload: { requestId: 'r1', setupRequests: [{ nodeName: 'Slack' }] },
					}),
					evt('tool-result', {
						payload: {
							toolName: 'workflows',
							result: {
								completedNodes: [{ nodeName: 'Schedule', parametersSet: ['cron'] }],
								skippedNodes: [{ nodeName: 'Slack', credentialType: 'slackApi' }],
							},
						},
					}),
				],
			});
			const interactions = turns[0].toolInteractions;
			expect(interactions).toHaveLength(1);
			expect(interactions[0]).toMatchObject({
				kind: 'setup-wizard',
				completedNodes: [{ nodeName: 'Schedule', parametersSet: ['cron'] }],
				skippedNodes: [{ nodeName: 'Slack', credentialType: 'slackApi' }],
			});
		});
	});

	describe('generic confirmation', () => {
		it('records the resume reason and the proxy approval flag', () => {
			const turns = buildTranscriptFromEvents({
				events: [
					RUN_START,
					evt('confirmation-request', {
						payload: { requestId: 'r1', toolName: 'create-tasks' },
					}),
				],
				proxyResponses: new Map([['r1', { kind: 'approval' as const, approved: false }]]),
			});
			expect(turns[0].toolInteractions[0]).toMatchObject({
				kind: 'confirmation',
				toolName: 'create-tasks',
				resumeReason: 'approval',
				approved: false,
			});
		});
	});

	describe('plain tool-call dedupe', () => {
		it('collapses repeat invocations of the same tool name within a turn', () => {
			const turns = buildTranscriptFromEvents({
				events: [
					RUN_START,
					evt('tool-call', { payload: { toolName: 'credentials', args: {} } }),
					evt('tool-call', { payload: { toolName: 'credentials', args: {} } }),
					evt('tool-call', { payload: { toolName: 'credentials', args: {} } }),
				],
			});
			const calls = turns[0].toolInteractions.filter((i) => i.kind === 'tool-call');
			expect(calls).toHaveLength(1);
		});
	});

	it('drops a turn that produced nothing visible (e.g. stray run-start)', () => {
		const turns = buildTranscriptFromEvents({
			events: [RUN_START, evt('text-delta', { text: 'hi' }), RUN_START],
			openingMessage: 'go',
		});
		expect(turns).toHaveLength(1);
		expect(turns[0]).toMatchObject({ userMessage: 'go', agentText: 'hi' });
	});
});
