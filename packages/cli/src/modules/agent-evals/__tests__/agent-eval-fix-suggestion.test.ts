import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { AgentConfigService } from '@/modules/agents/agent-config.service';

import { generateFixSuggestion } from '../agent-eval-fix-suggestion';

// The SDK is heavy and calls a real model: stub the agent and drive its output.
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

describe('generateFixSuggestion', () => {
	const user = mock<User>({ id: 'user-1' });
	const ctx = { agentId: 'agent-1', projectId: 'project-1', user };
	const subject = {
		input: 'What is the weather?',
		output: 'It is sunny.',
		rule: 'Declines requests outside invoice support.',
		reasoning: 'The answer talks about weather.',
	};

	let agentConfigService: Mocked<AgentConfigService>;
	let logger: Mocked<Logger>;
	let deps: Parameters<typeof generateFixSuggestion>[0];

	beforeEach(() => {
		agentConfigService = mock<AgentConfigService>();
		agentConfigService.getConfig.mockResolvedValue({
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'cred-1',
			instructions: 'Help with invoices.',
		} as never);
		logger = mock<Logger>();
		deps = { agentConfigService, credentialsService: mock<CredentialsService>(), logger };
		resolveModelMock.mockReset();
		resolveModelMock.mockResolvedValue({ id: 'anthropic/claude-sonnet-4-5' });
		generateMock.mockReset();
		generateMock.mockResolvedValue({
			structuredOutput: { suggestion: '  Politely decline requests outside invoice support.  ' },
		});
	});

	it('returns the trimmed suggestion', async () => {
		await expect(generateFixSuggestion(deps, subject, ctx)).resolves.toBe(
			'Politely decline requests outside invoice support.',
		);
	});

	it('puts the instructions, input, output, rule and reason in tagged blocks', async () => {
		await generateFixSuggestion(deps, subject, ctx);

		const prompt = generateMock.mock.calls[0][0] as string;
		expect(prompt).toContain('<agent_instructions>\nHelp with invoices.\n</agent_instructions>');
		expect(prompt).toContain('<user_message>\nWhat is the weather?\n</user_message>');
		expect(prompt).toContain('<agent_answer>\nIt is sunny.\n</agent_answer>');
		expect(prompt).toContain('<rule>\nDeclines requests outside invoice support.\n</rule>');
		expect(prompt).toContain(
			'<failure_reason>\nThe answer talks about weather.\n</failure_reason>',
		);
	});

	it('passes the Azure deployment name to the model resolver', async () => {
		agentConfigService.getConfig.mockResolvedValue({
			model: 'azure-openai/gpt-4o',
			credential: 'cred-1',
			modelDeploymentName: 'my-deployment',
			instructions: 'Be brief.',
		} as never);

		await generateFixSuggestion(deps, subject, ctx);

		expect(resolveModelMock).toHaveBeenCalledWith(
			'azure-openai/gpt-4o',
			'cred-1',
			expect.anything(),
			'my-deployment',
		);
	});

	it('truncates long instructions and long fields', async () => {
		agentConfigService.getConfig.mockResolvedValue({
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'cred-1',
			instructions: 'i'.repeat(9000),
		} as never);

		await generateFixSuggestion(deps, { ...subject, output: 'o'.repeat(9000) }, ctx);

		const prompt = generateMock.mock.calls[0][0] as string;
		expect(prompt).not.toContain('i'.repeat(4002));
		expect(prompt).toContain('i'.repeat(4000) + '…');
		expect(prompt).not.toContain('o'.repeat(2002));
		expect(prompt).toContain('o'.repeat(2000) + '…');
	});

	it('returns null when the model call throws, and logs it', async () => {
		generateMock.mockRejectedValue(new Error('model timed out'));

		await expect(generateFixSuggestion(deps, subject, ctx)).resolves.toBeNull();
		expect(logger.error).toHaveBeenCalledWith(expect.any(String), { error: 'model timed out' });
	});

	it('returns null when the suggestion is blank or the output is malformed', async () => {
		generateMock.mockResolvedValueOnce({ structuredOutput: { suggestion: '   ' } });
		await expect(generateFixSuggestion(deps, subject, ctx)).resolves.toBeNull();

		generateMock.mockResolvedValueOnce({ structuredOutput: { other: 1 } });
		await expect(generateFixSuggestion(deps, subject, ctx)).resolves.toBeNull();
	});

	it('returns null without calling the model when the agent has no model and credential', async () => {
		agentConfigService.getConfig.mockResolvedValue({ instructions: 'x' } as never);

		await expect(generateFixSuggestion(deps, subject, ctx)).resolves.toBeNull();
		expect(generateMock).not.toHaveBeenCalled();
	});
});
