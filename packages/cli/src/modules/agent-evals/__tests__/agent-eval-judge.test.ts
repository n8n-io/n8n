import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { AgentConfigService } from '@/modules/agents/agent-config.service';

import { judgeAgentAnswer } from '../agent-eval-judge';

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
});
