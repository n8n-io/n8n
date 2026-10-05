import type { AgentJsonConfig } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';

import type { AgentConfigService } from '../../agents/agent-config.service';
import { AgentEvalJudgeService, buildJudgePrompt } from '../agent-eval-judge.service';

// The SDK's fluent builder is a no-op; `generate` drives the judge's output.
const { generateMock, resolveByokMock, createEvalAgentMock, FakeAgent } = vi.hoisted(() => {
	const generate = vi.fn();
	class Fake {
		model() {
			return this;
		}
		instructions() {
			return this;
		}
		structuredOutput() {
			return this;
		}
		async generate(...args: unknown[]) {
			return await generate(...args);
		}
	}
	return {
		generateMock: generate,
		resolveByokMock: vi.fn(),
		createEvalAgentMock: vi.fn(),
		FakeAgent: Fake,
	};
});

vi.mock('@n8n/agents', () => ({ Agent: FakeAgent }));
vi.mock('../agent-eval-model', () => ({
	resolveAgentByokModel: (...args: unknown[]) => resolveByokMock(...args),
}));
vi.mock('@n8n/instance-ai', () => ({
	createEvalAgent: (...args: unknown[]) => createEvalAgentMock(...args),
}));

const user = mock<User>({ id: 'user-1' });
const judgeInput = {
	input: 'Which ticket is blocking the release?',
	criteria: 'Ask which ticket when none is named',
	reply: 'Ticket #48219 is blocking it.',
	toolCalls: [
		{ tool: 'search_tickets', kind: 'node' as const, mocked: true, interceptedRequests: [] },
	],
};

describe('AgentEvalJudgeService', () => {
	const agentConfigService = mock<AgentConfigService>();
	const credentialsService = mock<CredentialsService>();
	let service: AgentEvalJudgeService;

	beforeEach(() => {
		vi.clearAllMocks();
		agentConfigService.getConfig.mockResolvedValue(mock<AgentJsonConfig>());
		createEvalAgentMock.mockImplementation(() => new FakeAgent());
		service = new AgentEvalJudgeService(mock(), agentConfigService, credentialsService);
	});

	it("judges with the agent's own model when it has an API-key credential", async () => {
		resolveByokMock.mockResolvedValue({ id: 'anthropic/claude' });
		generateMock.mockResolvedValue({
			structuredOutput: {
				result: 'needs_work',
				reason: '  It answered without asking.  ',
				suggestedFix: '',
			},
		});

		const judge = await service.resolveJudge('agent-1', 'project-1', user);
		const verdict = await judge?.judge(judgeInput);

		expect(judge?.judgedBy).toBe('agent_model');
		expect(createEvalAgentMock).not.toHaveBeenCalled();
		expect(verdict).toEqual({
			result: 'needs_work',
			reason: 'It answered without asking.',
			judgedBy: 'agent_model',
		});
	});

	it('falls back to the instance eval model when the agent has no usable key', async () => {
		resolveByokMock.mockRejectedValue(new UserError('managed credential'));
		generateMock.mockResolvedValue({
			structuredOutput: { result: 'pass', reason: 'Asked.', suggestedFix: '' },
		});

		const judge = await service.resolveJudge('agent-1', 'project-1', user);

		expect(judge?.judgedBy).toBe('eval_model');
		expect(createEvalAgentMock).toHaveBeenCalledWith(
			'agent-eval-judge',
			expect.objectContaining({ instructions: expect.any(String) }),
		);
		await expect(judge?.judge(judgeInput)).resolves.toMatchObject({ result: 'pass' });
	});

	it('returns no judge when neither model is available', async () => {
		resolveByokMock.mockRejectedValue(new UserError('managed credential'));
		createEvalAgentMock.mockImplementation(() => {
			throw new Error('No eval model configured');
		});

		await expect(service.resolveJudge('agent-1', 'project-1', user)).resolves.toBeUndefined();
	});

	it('keeps the suggested fix only when the result needs work', async () => {
		resolveByokMock.mockResolvedValue({ id: 'anthropic/claude' });
		generateMock
			.mockResolvedValueOnce({
				structuredOutput: {
					result: 'needs_work',
					reason: 'It answered without asking.',
					suggestedFix: '  Ask which ticket before summarizing.  ',
				},
			})
			.mockResolvedValueOnce({
				structuredOutput: { result: 'pass', reason: 'Asked.', suggestedFix: 'Keep asking.' },
			});

		const judge = await service.resolveJudge('agent-1', 'project-1', user);

		await expect(judge?.judge(judgeInput)).resolves.toEqual({
			result: 'needs_work',
			reason: 'It answered without asking.',
			suggestedFix: 'Ask which ticket before summarizing.',
			judgedBy: 'agent_model',
		});
		await expect(judge?.judge(judgeInput)).resolves.toEqual({
			result: 'pass',
			reason: 'Asked.',
			judgedBy: 'agent_model',
		});
	});

	it('rejects a verdict it cannot read', async () => {
		resolveByokMock.mockResolvedValue({ id: 'anthropic/claude' });
		generateMock.mockResolvedValue({ structuredOutput: { verdict: 'maybe' } });

		const judge = await service.resolveJudge('agent-1', 'project-1', user);

		await expect(judge?.judge(judgeInput)).rejects.toThrow('unreadable verdict');
	});

	it('puts the rule, the message, the tool calls and the reply in the prompt', () => {
		const prompt = buildJudgePrompt(judgeInput);

		expect(prompt).toContain('Rule: Ask which ticket when none is named');
		expect(prompt).toContain('Which ticket is blocking the release?');
		expect(prompt).toContain('search_tickets');
		expect(prompt).toContain('Ticket #48219 is blocking it.');
	});
});
