import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { AgentConfigService } from '@/modules/agents/agent-config.service';

import { createAgentCredentialProvider } from '@/modules/agents/utils/agent-credential-provider';
import {
	checkExpectedTools,
	INCONCLUSIVE_REASONING,
	judgeAgentAnswer,
	withToolCallRecord,
} from '../agent-eval-judge';

// The SDK is heavy and its judges call a real model: stub both, and let each
// test drive the verdict through the run mocks.
const { criteriaRunMock, correctnessRunMock } = vi.hoisted(() => ({
	criteriaRunMock: vi.fn(),
	correctnessRunMock: vi.fn(),
}));
vi.mock('@n8n/agents', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/agents')>()),
	evals: {
		criteria: () => ({ model: () => ({ run: (...args: unknown[]) => criteriaRunMock(...args) }) }),
		correctness: () => ({
			model: () => ({ run: (...args: unknown[]) => correctnessRunMock(...args) }),
		}),
	},
}));

const { resolveModelMock } = vi.hoisted(() => ({ resolveModelMock: vi.fn() }));
vi.mock('@/modules/agents/json-config/model-config', () => ({
	resolveCredentialAwareModelConfig: (...args: unknown[]) => resolveModelMock(...args),
}));
vi.mock('@/modules/agents/utils/agent-credential-provider', () => ({
	createAgentCredentialProvider: vi.fn(() => ({})),
}));

describe('judgeAgentAnswer', () => {
	const user = mock<User>({ id: 'user-1' });
	const ctx = { agentId: 'agent-1', projectId: 'project-1', user };
	let agentConfigService: Mocked<AgentConfigService>;
	let logger: Mocked<Logger>;
	let deps: Parameters<typeof judgeAgentAnswer>[0];

	beforeEach(() => {
		agentConfigService = mock<AgentConfigService>();
		agentConfigService.getConfig.mockResolvedValue({
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'cred-1',
		} as never);
		logger = mock<Logger>();
		deps = {
			agentConfigService,
			credentialsService: mock<CredentialsService>(),
			logger,
		};
		resolveModelMock.mockReset();
		resolveModelMock.mockResolvedValue({ id: 'anthropic/claude-sonnet-4-5' });
		criteriaRunMock.mockReset();
		criteriaRunMock.mockResolvedValue({ pass: true, reasoning: 'Satisfies the rule.' });
		correctnessRunMock.mockReset();
		correctnessRunMock.mockResolvedValue({ pass: true, reasoning: 'Matches.' });
	});

	it('judges a rule as a rule, and records the verdict', async () => {
		const verdict = await judgeAgentAnswer(
			deps,
			{ input: 'q', output: 'a', criteria: 'Refuses politely', expectedOutput: null },
			ctx,
		);

		expect(criteriaRunMock).toHaveBeenCalledWith({
			input: 'q',
			output: 'a',
			criteria: 'Refuses politely',
		});
		expect(correctnessRunMock).not.toHaveBeenCalled();
		expect(verdict).toEqual({
			status: 'completed',
			outcome: 'pass',
			reasoning: 'Satisfies the rule.',
		});
	});

	// Without the agent id, gateway-credential usage is not attributed to the agent
	// the way it is on a normal execution.
	it('creates the credential provider for this agent, not just this project and user', async () => {
		await judgeAgentAnswer(
			deps,
			{ input: 'q', output: 'a', criteria: 'rule', expectedOutput: null },
			ctx,
		);

		expect(createAgentCredentialProvider).toHaveBeenCalledWith(
			deps.credentialsService,
			'project-1',
			user,
			'agent-1',
		);
	});

	it('lets the rule win when a gold answer is set too', async () => {
		await judgeAgentAnswer(
			deps,
			{ input: 'q', output: 'a', criteria: 'A rule', expectedOutput: 'A gold answer' },
			ctx,
		);

		expect(criteriaRunMock).toHaveBeenCalled();
		expect(correctnessRunMock).not.toHaveBeenCalled();
	});

	it('matches a gold answer when there is no rule', async () => {
		await judgeAgentAnswer(
			deps,
			{ input: 'q', output: 'a', criteria: null, expectedOutput: '42' },
			ctx,
		);

		expect(correctnessRunMock).toHaveBeenCalledWith({ input: 'q', output: 'a', expected: '42' });
		expect(criteriaRunMock).not.toHaveBeenCalled();
	});

	it('records a fail with the judge’s reasoning', async () => {
		criteriaRunMock.mockResolvedValue({ pass: false, reasoning: 'Shared the number.' });

		await expect(
			judgeAgentAnswer(deps, { input: 'q', output: 'a', criteria: 'r', expectedOutput: null }, ctx),
		).resolves.toEqual({ status: 'completed', outcome: 'fail', reasoning: 'Shared the number.' });
	});

	it.each([
		['a rule', { criteria: 'r', expectedOutput: null }],
		['a gold answer', { criteria: null, expectedOutput: 'gold' }],
	])(
		'returns an error verdict, not a fail, when the judge gives no readable verdict on %s',
		async (_, subject) => {
			const inconclusive = {
				pass: false,
				reasoning: "I'm sorry, but I can't help with evaluating this content.",
				inconclusive: true,
			};
			criteriaRunMock.mockResolvedValue(inconclusive);
			correctnessRunMock.mockResolvedValue(inconclusive);

			const verdict = await judgeAgentAnswer(deps, { input: 'q', output: 'a', ...subject }, ctx);

			expect(verdict).toEqual({
				status: 'error',
				outcome: null,
				reasoning: INCONCLUSIVE_REASONING,
			});
			expect(logger.warn).toHaveBeenCalledWith(expect.any(String), { agentId: 'agent-1' });
		},
	);

	it('skips, without resolving a model, when there is nothing to grade against', async () => {
		const verdict = await judgeAgentAnswer(
			deps,
			{ input: 'q', output: 'a', criteria: null, expectedOutput: null },
			ctx,
		);

		expect(verdict).toEqual({ status: 'skipped', outcome: null, reasoning: null });
		expect(agentConfigService.getConfig).not.toHaveBeenCalled();
		expect(criteriaRunMock).not.toHaveBeenCalled();
	});

	it('returns an error verdict, and logs it, when the judge throws', async () => {
		criteriaRunMock.mockRejectedValue(new Error('judge model timed out'));

		await expect(
			judgeAgentAnswer(deps, { input: 'q', output: 'a', criteria: 'r', expectedOutput: null }, ctx),
		).resolves.toEqual({ status: 'error', outcome: null, reasoning: 'judge model timed out' });
		expect(logger.error).toHaveBeenCalled();
	});

	it('returns an error verdict when the agent has no model or credential to judge with', async () => {
		agentConfigService.getConfig.mockResolvedValue({ model: '', credential: '' } as never);

		const verdict = await judgeAgentAnswer(
			deps,
			{ input: 'q', output: 'a', criteria: 'r', expectedOutput: null },
			ctx,
		);

		expect(verdict.status).toBe('error');
		expect(criteriaRunMock).not.toHaveBeenCalled();
	});

	describe('tool expectation', () => {
		const subject = {
			input: 'Where is my order?',
			output: 'It ships tomorrow.',
			criteria: 'Gives a shipping date.',
			expectedOutput: null,
		};

		it('fails without a model call when an expected tool was not called', async () => {
			const verdict = await judgeAgentAnswer(
				deps,
				{ ...subject, expectedTools: ['lookup_order'], toolCalls: [{ tool: 'lookup_customer' }] },
				ctx,
			);

			expect(verdict).toEqual({
				status: 'completed',
				outcome: 'fail',
				reasoning: 'The agent did not call these expected tools: lookup_order.',
				toolCheck: { pass: false, missing: ['lookup_order'], forbidden: [] },
			});
			expect(criteriaRunMock).not.toHaveBeenCalled();
			expect(resolveModelMock).not.toHaveBeenCalled();
		});

		it('fails without a model call when a forbidden tool was called', async () => {
			const verdict = await judgeAgentAnswer(
				deps,
				{
					...subject,
					expectedTools: ['!lookup_customer'],
					toolCalls: [{ tool: 'lookup_customer' }],
				},
				ctx,
			);

			expect(verdict.outcome).toBe('fail');
			expect(verdict.toolCheck).toEqual({
				pass: false,
				missing: [],
				forbidden: ['lookup_customer'],
			});
			expect(criteriaRunMock).not.toHaveBeenCalled();
		});

		it('judges the rule and attaches the tool check when the tool check passes', async () => {
			const verdict = await judgeAgentAnswer(
				deps,
				{ ...subject, expectedTools: ['lookup_order'], toolCalls: [{ tool: 'lookup_order' }] },
				ctx,
			);

			expect(criteriaRunMock).toHaveBeenCalledTimes(1);
			expect(verdict).toEqual({
				status: 'completed',
				outcome: 'pass',
				reasoning: 'Satisfies the rule.',
				toolCheck: { pass: true, missing: [], forbidden: [] },
			});
		});

		it('passes without a model call when the tool check passes and there is no rule and no gold answer', async () => {
			const verdict = await judgeAgentAnswer(
				deps,
				{
					...subject,
					criteria: null,
					expectedTools: ['lookup_order'],
					toolCalls: [{ tool: 'lookup_order' }],
				},
				ctx,
			);

			expect(verdict).toEqual({
				status: 'completed',
				outcome: 'pass',
				reasoning: 'The agent called the expected tools.',
				toolCheck: { pass: true, missing: [], forbidden: [] },
			});
			expect(resolveModelMock).not.toHaveBeenCalled();
		});

		it('adds no tool check when the case expects no tools', async () => {
			const verdict = await judgeAgentAnswer(
				deps,
				{ ...subject, expectedTools: [], toolCalls: [{ tool: 'lookup_order' }] },
				ctx,
			);

			expect(verdict).toEqual({
				status: 'completed',
				outcome: 'pass',
				reasoning: 'Satisfies the rule.',
			});
		});
	});

	describe('tool call record for the judge', () => {
		const lookup = {
			tool: 'crm-lookup',
			input: { reference: 'CUST-204' },
			output: { plan: 'Standard' },
		};

		it('gives the judge of a rule the tool calls of the run', async () => {
			await judgeAgentAnswer(
				deps,
				{
					input: 'Which plan is customer CUST-204 on?',
					output: 'The plan is Standard.',
					criteria: 'The agent looks up the customer account.',
					expectedOutput: null,
					toolCalls: [lookup],
				},
				ctx,
			);

			const judged = criteriaRunMock.mock.calls[0][0] as { output: string };
			expect(
				judged.output.startsWith('The plan is Standard.\n\n[Record from the test system'),
			).toBe(true);
			expect(judged.output).toContain(
				'1. {"tool":"crm-lookup","input":{"reference":"CUST-204"},"output":{"plan":"Standard"}}',
			);
		});

		it('tells the judge of a rule that the agent called no tools', async () => {
			await judgeAgentAnswer(
				deps,
				{ input: 'q', output: 'a', criteria: 'rule', expectedOutput: null, toolCalls: [] },
				ctx,
			);

			const judged = criteriaRunMock.mock.calls[0][0] as { output: string };
			expect(judged.output).toContain('The agent called no tools.');
		});

		it('gives the judge of a gold answer only the answer', async () => {
			await judgeAgentAnswer(
				deps,
				{ input: 'q', output: 'a', criteria: null, expectedOutput: 'gold', toolCalls: [lookup] },
				ctx,
			);

			expect(correctnessRunMock).toHaveBeenCalledWith({
				input: 'q',
				output: 'a',
				expected: 'gold',
			});
		});
	});
});

describe('withToolCallRecord', () => {
	it('lists the calls in call order with the note of a call', () => {
		const text = withToolCallRecord('answer', [
			{ tool: 'first', input: 1, output: 2 },
			{ tool: 'second', error: 'canceled' },
		]);

		const lines = text.split('\n');
		expect(lines[0]).toBe('answer');
		expect(lines.slice(3)).toEqual([
			'1. {"tool":"first","input":1,"output":2}',
			'2. {"tool":"second","note":"canceled"}',
		]);
	});

	it('truncates a long call record', () => {
		const text = withToolCallRecord('answer', [{ tool: 'big', output: 'x'.repeat(5_000) }]);

		expect(text.length).toBeLessThan(2_000);
		expect(text.endsWith('... [truncated]')).toBe(true);
	});

	it('shows the first 20 calls and counts the other calls', () => {
		const calls = Array.from({ length: 23 }, (_, index) => ({ tool: `tool-${index}` }));

		const lines = withToolCallRecord('answer', calls).split('\n');

		expect(lines).toHaveLength(3 + 20 + 1);
		expect(lines.at(-1)).toBe('(3 more tool calls are not shown.)');
	});
});

describe('checkExpectedTools', () => {
	it('passes when each required tool was called and no forbidden tool was called', () => {
		expect(checkExpectedTools(['lookup_order', '!refund'], ['lookup_order', 'search'])).toEqual({
			pass: true,
			missing: [],
			forbidden: [],
		});
	});

	it('reports the required tools that were not called and the forbidden tools that were called', () => {
		expect(checkExpectedTools(['lookup_order', '!refund'], ['refund'])).toEqual({
			pass: false,
			missing: ['lookup_order'],
			forbidden: ['refund'],
		});
	});

	it('trims names and compares them in lower case', () => {
		expect(checkExpectedTools([' Lookup_Order ', '! Refund'], ['lookup_order', 'REFUND'])).toEqual({
			pass: false,
			missing: [],
			forbidden: ['Refund'],
		});
	});

	it('does not match a name that is only a part of a called tool name', () => {
		expect(checkExpectedTools(['lookup'], ['lookup_order']).missing).toEqual(['lookup']);
	});

	it('ignores empty entries', () => {
		expect(checkExpectedTools(['', ' ', '!'], [])).toEqual({
			pass: true,
			missing: [],
			forbidden: [],
		});
	});
});
