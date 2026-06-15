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
		expect(turns[0].userMessage).toBe('Build me a workflow');
		expect(turns[0].steps).toEqual([{ kind: 'agent-text', text: 'Hello there' }]);
	});

	it('interleaves agent narration with actions in event order', () => {
		const turns = buildTranscriptFromEvents({
			events: [
				RUN_START,
				evt('text-delta', { text: 'Let me search. ' }),
				evt('tool-call', { payload: { toolName: 'search-nodes', args: {} } }),
				evt('text-delta', { text: 'Found them.' }),
				evt('tool-call', { payload: { toolName: 'add-nodes', args: {} } }),
			],
			openingMessage: 'build it',
		});
		expect(turns[0].steps).toEqual([
			{ kind: 'agent-text', text: 'Let me search. ' },
			{ kind: 'tool-call', toolName: 'search-nodes' },
			{ kind: 'agent-text', text: 'Found them.' },
			{ kind: 'tool-call', toolName: 'add-nodes' },
		]);
	});

	describe('secret redaction', () => {
		it('redacts secret-shaped keys in tool-call args', () => {
			const turns = buildTranscriptFromEvents({
				events: [
					RUN_START,
					evt('tool-call', {
						payload: {
							toolName: 'httpRequest',
							toolCallId: 'tc1',
							args: {
								url: 'https://api.example.com',
								apiKey: 'sk-secret',
								headers: { authorization: 'Bearer xyz' },
							},
						},
					}),
				],
			});
			expect(turns[0].steps[0]).toMatchObject({
				kind: 'tool-call',
				args: {
					url: 'https://api.example.com',
					apiKey: '[REDACTED]',
					headers: { authorization: '[REDACTED]' },
				},
			});
		});

		it('redacts secret-shaped keys in a paired tool-result', () => {
			const turns = buildTranscriptFromEvents({
				events: [
					RUN_START,
					evt('tool-call', {
						payload: { toolName: 'credentials', toolCallId: 'tc2', args: { name: 'slack' } },
					}),
					evt('tool-result', {
						payload: {
							toolName: 'credentials',
							toolCallId: 'tc2',
							result: { id: 'c1', token: 'secret-token' },
						},
					}),
				],
			});
			expect(turns[0].steps[0]).toMatchObject({
				kind: 'tool-call',
				result: { id: 'c1', token: '[REDACTED]' },
			});
		});

		it('scrubs a secret embedded in a paired tool-error string', () => {
			const turns = buildTranscriptFromEvents({
				events: [
					RUN_START,
					evt('tool-call', {
						payload: { toolName: 'httpRequest', toolCallId: 'tc3', args: {} },
					}),
					evt('tool-error', {
						payload: {
							toolCallId: 'tc3',
							error: 'Request failed: Authorization: Bearer sk-leaked.token (401)',
						},
					}),
				],
			});
			const step = turns[0].steps[0];
			expect(step.kind).toBe('tool-call');
			const error = step.kind === 'tool-call' ? (step.error ?? '') : '';
			expect(error).not.toContain('sk-leaked.token');
			expect(error).toContain('[REDACTED]');
			expect(error).toContain('(401)');
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
			const interactions = turns[0].steps;
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
			const askUserInteractions = turns[0].steps.filter((i) => i.kind === 'ask-user');
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
			expect(turns[0].steps[0]).toMatchObject({
				kind: 'plan',
				tasks: [{ title: 'Fetch posts', description: 'GET /posts' }],
			});
		});
	});

	describe('setup wizard routing', () => {
		it('renders the setup-card ask and the setup-wizard outcome', () => {
			const turns = buildTranscriptFromEvents({
				events: [
					RUN_START,
					evt('confirmation-request', {
						payload: {
							requestId: 'r1',
							setupRequests: [
								{
									node: { name: 'Slack' },
									credentialType: 'slackApi',
									editableParameters: [
										{ name: 'channel', displayName: 'Channel', type: 'resourceLocator' },
									],
									parameterIssues: { text: ['Text is required'] },
								},
							],
						},
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
			const interactions = turns[0].steps;
			expect(interactions).toHaveLength(2);
			// The confirmation-request renders as the setup-card (what the agent asked for)...
			expect(interactions[0]).toMatchObject({
				kind: 'setup-card',
				requests: [{ nodeName: 'Slack', credentialType: 'slackApi', params: ['channel', 'text'] }],
			});
			// ...and the tool-result renders as the setup-wizard outcome (what was configured/skipped).
			expect(interactions[1]).toMatchObject({
				kind: 'setup-wizard',
				completedNodes: [{ nodeName: 'Schedule', parametersSet: ['cron'] }],
				skippedNodes: [{ nodeName: 'Slack', credentialType: 'slackApi' }],
			});
		});

		it('redacts secret values the proxy filled into a setup card', () => {
			const turns = buildTranscriptFromEvents({
				events: [
					RUN_START,
					evt('confirmation-request', {
						payload: {
							requestId: 'r1',
							setupRequests: [{ node: { name: 'HTTP' }, editableParameters: [] }],
						},
					}),
				],
				proxyResponses: new Map([
					[
						'r1',
						{
							kind: 'setupWorkflowApply' as const,
							nodeCredentials: {},
							nodeParameters: {
								HTTP: {
									apiKey: 'sk-live-supersecret',
									authorization: 'Bearer abc123token',
									channel: '#general',
								},
							},
						},
					],
				]),
			});
			const card = turns[0].steps.find((s) => s.kind === 'setup-card');
			expect(card).toMatchObject({ kind: 'setup-card', outcome: 'filled' });
			const filled = card?.kind === 'setup-card' ? (card.filled ?? []) : [];
			// Secret-shaped key → value masked; benign param survives.
			expect(filled).toContain('apiKey=[REDACTED]');
			expect(filled).toContain('authorization=[REDACTED]');
			expect(filled).toContain('channel=#general');
			expect(filled.join(' ')).not.toContain('sk-live-supersecret');
			expect(filled.join(' ')).not.toContain('abc123token');
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
			expect(turns[0].steps[0]).toMatchObject({
				kind: 'confirmation',
				toolName: 'create-tasks',
				resumeReason: 'approval',
				approved: false,
			});
		});

		it('captures the feedback sent with a plan rejection', () => {
			const turns = buildTranscriptFromEvents({
				events: [
					RUN_START,
					evt('confirmation-request', {
						payload: { requestId: 'r1', toolName: 'submit-plan' },
					}),
				],
				proxyResponses: new Map([
					[
						'r1',
						{
							kind: 'approval' as const,
							approved: false,
							userInput: 'Use #engineering, not #news',
						},
					],
				]),
			});
			expect(turns[0].steps[0]).toMatchObject({
				kind: 'confirmation',
				approved: false,
				feedback: 'Use #engineering, not #news',
			});
		});
	});

	describe('plain tool-calls', () => {
		it('renders every invocation of a repeated tool (no de-duping)', () => {
			const turns = buildTranscriptFromEvents({
				events: [
					RUN_START,
					evt('tool-call', { payload: { toolName: 'credentials', args: {} } }),
					evt('tool-call', { payload: { toolName: 'credentials', args: {} } }),
					evt('tool-call', { payload: { toolName: 'credentials', args: {} } }),
				],
			});
			const calls = turns[0].steps.filter((i) => i.kind === 'tool-call');
			expect(calls).toHaveLength(3);
		});

		it('renders an empty plan as a visible tool-call instead of dropping it', () => {
			const turns = buildTranscriptFromEvents({
				events: [
					RUN_START,
					evt('tool-call', { payload: { toolName: 'plan', args: { tasks: [] } } }),
				],
			});
			const calls = turns[0].steps.filter((i) => i.kind === 'tool-call');
			expect(calls).toHaveLength(1);
			expect(calls[0]).toMatchObject({ kind: 'tool-call', toolName: 'plan' });
		});

		it('keeps narration on either side of a tool call as separate blocks', () => {
			const turns = buildTranscriptFromEvents({
				events: [
					RUN_START,
					evt('text-delta', { text: 'here is my plan' }),
					evt('tool-call', { payload: { toolName: 'plan', args: { tasks: [] } } }),
					evt('text-delta', { text: 'planner returned nothing, building directly' }),
				],
			});
			const texts = turns[0].steps
				.filter((s) => s.kind === 'agent-text')
				.map((s) => (s.kind === 'agent-text' ? s.text : ''));
			expect(texts).toEqual(['here is my plan', 'planner returned nothing, building directly']);
		});
	});

	it('drops a turn that produced nothing visible (e.g. stray run-start)', () => {
		const turns = buildTranscriptFromEvents({
			events: [RUN_START, evt('text-delta', { text: 'hi' }), RUN_START],
			openingMessage: 'go',
		});
		expect(turns).toHaveLength(1);
		expect(turns[0].userMessage).toBe('go');
		expect(turns[0].steps).toEqual([{ kind: 'agent-text', text: 'hi' }]);
	});
});
