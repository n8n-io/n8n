import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { OperationalError } from '@n8n/errors';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { AgentConfigService } from '@/modules/agents/agent-config.service';

import { rewriteAgentInstructions } from '../agent-eval-instructions-rewrite';

const { generateMock } = vi.hoisted(() => ({ generateMock: vi.fn() }));
vi.mock('@n8n/agents', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/agents')>()),
	Agent: class {
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
			return await generateMock(...args);
		}
	},
}));

const { resolveModelMock } = vi.hoisted(() => ({ resolveModelMock: vi.fn() }));
vi.mock('@/modules/agents/json-config/model-config', () => ({
	resolveCredentialAwareModelConfig: (...args: unknown[]) => resolveModelMock(...args),
}));
vi.mock('@/modules/agents/utils/agent-credential-provider', () => ({
	createAgentCredentialProvider: vi.fn(() => ({})),
}));

const CURRENT = 'You are a helpful invoice support agent. Always answer in English and be brief.';

describe('rewriteAgentInstructions', () => {
	const user = mock<User>({ id: 'user-1' });
	const ctx = { agentId: 'agent-1', projectId: 'project-1', user };
	const subject = {
		currentInstructions: CURRENT,
		suggestions: [
			{ suggestion: 'Politely decline requests outside invoice support.', rule: 'Declines.' },
			{ suggestion: 'Never reveal internal ticket ids.', rule: null },
		],
	};

	let agentConfigService: Mocked<AgentConfigService>;
	let logger: Mocked<Logger>;
	let deps: Parameters<typeof rewriteAgentInstructions>[0];

	const answer = (instructions: string) => ({ structuredOutput: { instructions } });

	beforeEach(() => {
		agentConfigService = mock<AgentConfigService>();
		agentConfigService.getConfig.mockResolvedValue({
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'cred-1',
			instructions: CURRENT,
		} as never);
		logger = mock<Logger>();
		deps = { agentConfigService, credentialsService: mock<CredentialsService>(), logger };
		resolveModelMock.mockReset();
		resolveModelMock.mockResolvedValue({ id: 'anthropic/claude-sonnet-4-5' });
		generateMock.mockReset();
	});

	it('returns the rewritten instructions from a single call', async () => {
		const rewritten = `${CURRENT} Politely decline requests outside invoice support.`;
		generateMock.mockResolvedValue(answer(rewritten));

		await expect(rewriteAgentInstructions(deps, subject, ctx)).resolves.toBe(rewritten);
		expect(generateMock).toHaveBeenCalledTimes(1);
	});

	it('sends the whole current instructions and every suggestion in one prompt', async () => {
		generateMock.mockResolvedValue(answer(`${CURRENT} More.`));

		await rewriteAgentInstructions(deps, subject, ctx);

		const prompt = generateMock.mock.calls[0][0] as string;
		expect(prompt).toContain(`<current_instructions>\n${CURRENT}\n</current_instructions>`);
		expect(prompt).toContain('Politely decline requests outside invoice support.');
		expect(prompt).toContain('Never reveal internal ticket ids.');
		expect(prompt).toContain('<rule_it_fixes index="1">\nDeclines.\n</rule_it_fixes>');
		expect(prompt).not.toContain('<rule_it_fixes index="2">');
	});

	it('retries once with a stricter prompt when the first answer is empty', async () => {
		const rewritten = `${CURRENT} Be polite.`;
		generateMock.mockResolvedValueOnce(answer('   ')).mockResolvedValueOnce(answer(rewritten));

		await expect(rewriteAgentInstructions(deps, subject, ctx)).resolves.toBe(rewritten);
		expect(generateMock).toHaveBeenCalledTimes(2);
		expect(generateMock.mock.calls[1][0]).toContain('Your last answer was not valid');
	});

	it('rejects an answer that dropped more than half of the old text, then throws after the retry', async () => {
		generateMock.mockResolvedValue(answer('Be brief.'));

		await expect(rewriteAgentInstructions(deps, subject, ctx)).rejects.toThrow(OperationalError);
		expect(generateMock).toHaveBeenCalledTimes(2);
	});

	it('rejects an answer that is far longer than the old text', async () => {
		generateMock.mockResolvedValue(answer('x'.repeat(20_000)));

		await expect(rewriteAgentInstructions(deps, subject, ctx)).rejects.toThrow(OperationalError);
	});

	it('rejects malformed structured output', async () => {
		generateMock.mockResolvedValue({ structuredOutput: { nope: true } });

		await expect(rewriteAgentInstructions(deps, subject, ctx)).rejects.toThrow(OperationalError);
	});

	it('propagates a model error so the caller saves nothing', async () => {
		generateMock.mockRejectedValue(new Error('model timed out'));

		await expect(rewriteAgentInstructions(deps, subject, ctx)).rejects.toThrow('model timed out');
	});

	it('throws when the agent has no model and credential', async () => {
		agentConfigService.getConfig.mockResolvedValue({ instructions: CURRENT } as never);

		await expect(rewriteAgentInstructions(deps, subject, ctx)).rejects.toThrow(OperationalError);
		expect(generateMock).not.toHaveBeenCalled();
	});
});
