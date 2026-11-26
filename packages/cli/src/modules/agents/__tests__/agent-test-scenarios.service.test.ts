import { mockLogger } from '@n8n/backend-test-utils';
import {
	AI_GATEWAY_MANAGED_TAG,
	MANAGED_CREDENTIAL_TOKEN,
	type AgentJsonConfig,
} from '@n8n/api-types';
import type { OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { ForbiddenError, OperationalError, UserError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { AgentConfigService } from '../agent-config.service';
import type { AgentsSettingsService } from '../agents-settings.service';
import { AgentTestScenariosService } from '../agent-test-scenarios.service';

const {
	generateMock,
	agentModelMock,
	agentModelFetchMock,
	agentInstructionsMock,
	userHasScopesMock,
	resolveModelMock,
	createAiProxyFetchMock,
	createAgentCredentialProviderMock,
	createAiGatewayTokenRefreshFetchMock,
} = vi.hoisted(() => ({
	generateMock: vi.fn(),
	agentModelMock: vi.fn(),
	agentModelFetchMock: vi.fn(),
	agentInstructionsMock: vi.fn(),
	userHasScopesMock: vi.fn(),
	resolveModelMock: vi.fn(),
	createAiProxyFetchMock: vi.fn(),
	createAgentCredentialProviderMock: vi.fn(),
	createAiGatewayTokenRefreshFetchMock: vi.fn(),
}));

vi.mock('@n8n/agents', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/agents')>();

	class FakeAgent {
		model(modelConfig: unknown) {
			agentModelMock(modelConfig);
			return this;
		}

		modelFetch(fetchFn: unknown) {
			agentModelFetchMock(fetchFn);
			return this;
		}

		instructions(prompt: string) {
			agentInstructionsMock(prompt);
			return this;
		}

		structuredOutput() {
			return this;
		}

		async generate(prompt: string, options?: unknown) {
			return await generateMock(prompt, options);
		}
	}

	return {
		...actual,
		Agent: FakeAgent,
	};
});

vi.mock('@/permissions.ee/check-access', () => ({
	userHasScopes: (...args: unknown[]) => userHasScopesMock(...args),
}));

vi.mock('@/utils/ai-proxy-fetch', () => ({
	createAiProxyFetch: (...args: unknown[]) => createAiProxyFetchMock(...args),
}));

vi.mock('../json-config/model-config', () => ({
	resolveCredentialAwareModelConfig: (...args: unknown[]) => resolveModelMock(...args),
}));

vi.mock('../utils/agent-credential-provider', () => ({
	createAgentCredentialProvider: (...args: unknown[]) => createAgentCredentialProviderMock(...args),
}));

function makeConfig(overrides: Partial<AgentJsonConfig> = {}): AgentJsonConfig {
	return {
		name: 'Support Triage',
		model: 'openai/gpt-4.1',
		credential: 'cred-1',
		instructions: 'Summarize incoming support tickets and post daily updates to Slack.',
		tools: [
			{
				type: 'node',
				name: 'Slack',
				description: 'Post messages to channels',
				node: {
					nodeType: 'n8n-nodes-base.slack',
					nodeTypeVersion: 1,
					nodeParameters: {},
				},
			},
		],
		...overrides,
	};
}

function makeService() {
	const agentConfigService = mock<AgentConfigService>();
	const credentialsService = mock<CredentialsService>();
	const agentsSettingsService = mock<AgentsSettingsService>();
	const outboundHttp = mock<OutboundHttp>();
	agentsSettingsService.assertEnabledFor.mockResolvedValue(undefined);
	const service = new AgentTestScenariosService(
		mockLogger(),
		agentConfigService,
		credentialsService,
		agentsSettingsService,
		outboundHttp,
	);

	return { service, agentConfigService, credentialsService, agentsSettingsService, outboundHttp };
}

const user = mock<User>({ id: 'user-1' });
const guardedFetch = vi.fn();
const wrappedFetch = vi.fn();

describe('AgentTestScenariosService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		userHasScopesMock.mockResolvedValue(true);
		resolveModelMock.mockResolvedValue({ id: 'openai/gpt-4.1', apiKey: 'test-key' });
		createAiProxyFetchMock.mockReturnValue(guardedFetch);
		createAiGatewayTokenRefreshFetchMock.mockReturnValue(wrappedFetch);
		createAgentCredentialProviderMock.mockReturnValue({
			createAiGatewayTokenRefreshFetch: createAiGatewayTokenRefreshFetchMock,
		});
	});

	it('generates four trimmed scenarios from the agent instructions and tools', async () => {
		const { service, agentConfigService, credentialsService, agentsSettingsService, outboundHttp } =
			makeService();
		agentConfigService.getConfig.mockResolvedValue(makeConfig());
		generateMock.mockResolvedValue({
			structuredOutput: {
				scenarios: [
					'  Summarise the tickets that came in this morning  ',
					'What are people complaining about most this week?',
					'Post today’s ticket summary to #customer-support',
					'Which tickets has nobody replied to yet?',
					'Extra fifth scenario that should be capped',
				],
			},
		});

		const result = await service.generateTestScenarios(user, 'project-1', 'agent-1');

		expect(result).toEqual({
			scenarios: [
				'Summarise the tickets that came in this morning',
				'What are people complaining about most this week?',
				'Post today’s ticket summary to #customer-support',
				'Which tickets has nobody replied to yet?',
			],
		});
		expect(agentsSettingsService.assertEnabledFor).toHaveBeenCalledWith('agent-1');
		expect(agentConfigService.getConfig).toHaveBeenCalledWith('agent-1', 'project-1');
		expect(userHasScopesMock).toHaveBeenCalledWith(user, ['agent:read'], false, {
			projectId: 'project-1',
		});
		expect(createAgentCredentialProviderMock).toHaveBeenCalledWith(
			credentialsService,
			'project-1',
			user,
			'agent-1',
		);
		expect(createAiProxyFetchMock).toHaveBeenCalledWith(outboundHttp);
		expect(createAiGatewayTokenRefreshFetchMock).toHaveBeenCalledWith(guardedFetch);
		expect(agentModelMock).toHaveBeenCalledWith({ id: 'openai/gpt-4.1', apiKey: 'test-key' });
		expect(agentModelFetchMock).toHaveBeenCalledWith(wrappedFetch);
		expect(agentInstructionsMock).toHaveBeenCalledWith(
			expect.stringContaining('Generate up to 4 short, natural user messages'),
		);
		expect(generateMock).toHaveBeenCalledTimes(1);
		expect(generateMock.mock.calls[0][0]).toContain('Support Triage');
		expect(generateMock.mock.calls[0][0]).toContain('Summarize incoming support tickets');
		expect(generateMock.mock.calls[0][0]).toContain('Slack: Post messages to channels');
	});

	it('excludes disabled tools and falls back to the workflow display name for unnamed workflow tools', async () => {
		const { service, agentConfigService } = makeService();
		agentConfigService.getConfig.mockResolvedValue(
			makeConfig({
				tools: [
					{
						type: 'node',
						name: 'Disabled Slack',
						description: 'Should not appear',
						node: {
							nodeType: 'n8n-nodes-base.slack',
							nodeTypeVersion: 1,
							nodeParameters: {},
						},
						enabled: false,
					},
					{
						type: 'workflow',
						workflow: 'Escalate VIP Ticket',
						description: 'Escalate urgent tickets',
					},
				],
			}),
		);
		generateMock.mockResolvedValue({
			structuredOutput: {
				scenarios: ['One', 'Two', 'Three', 'Four'],
			},
		});

		await service.generateTestScenarios(user, 'project-1', 'agent-1');

		const prompt = generateMock.mock.calls[0][0] as string;
		expect(prompt).not.toContain('Disabled Slack');
		expect(prompt).toContain('- Escalate VIP Ticket: Escalate urgent tickets');
	});

	it('supports Gateway credits credentials when resolving the model', async () => {
		const { service, agentConfigService } = makeService();
		agentConfigService.getConfig.mockResolvedValue(
			makeConfig({ credential: AI_GATEWAY_MANAGED_TAG }),
		);
		generateMock.mockResolvedValue({
			structuredOutput: {
				scenarios: ['One', 'Two', 'Three', 'Four'],
			},
		});

		const result = await service.generateTestScenarios(user, 'project-1', 'agent-1');

		expect(result.scenarios).toEqual(['One', 'Two', 'Three', 'Four']);
		expect(resolveModelMock).toHaveBeenCalledWith(
			'openai/gpt-4.1',
			AI_GATEWAY_MANAGED_TAG,
			expect.anything(),
		);
	});

	it('passes previousScenarios to the prompt and deduplicates repeats', async () => {
		const { service, agentConfigService } = makeService();
		agentConfigService.getConfig.mockResolvedValue(makeConfig());
		generateMock.mockResolvedValue({
			structuredOutput: {
				scenarios: [
					'Old scenario',
					'New scenario 1',
					'new scenario 1',
					'New scenario 2',
					'New scenario 3',
					'New scenario 4',
				],
			},
		});

		const result = await service.generateTestScenarios(user, 'project-1', 'agent-1', {
			previousScenarios: ['Old scenario'],
		});

		expect(result.scenarios).toEqual([
			'New scenario 1',
			'New scenario 2',
			'New scenario 3',
			'New scenario 4',
		]);
		expect(generateMock.mock.calls[0][0]).toContain('<previous_scenarios>');
		expect(generateMock.mock.calls[0][0]).toContain('- Old scenario');
	});

	it('allows fewer than four scenarios for simple agents without retrying', async () => {
		const { service, agentConfigService } = makeService();
		agentConfigService.getConfig.mockResolvedValue(
			makeConfig({ instructions: 'Echo back any message in uppercase.', tools: [] }),
		);
		generateMock.mockResolvedValueOnce({
			structuredOutput: {
				scenarios: ['Hello world', 'Convert this sentence to uppercase'],
			},
		});

		const result = await service.generateTestScenarios(user, 'project-1', 'agent-1');

		expect(generateMock).toHaveBeenCalledTimes(1);
		expect(result.scenarios).toEqual(['Hello world', 'Convert this sentence to uppercase']);
	});

	it('retries once when the first generation returns no valid scenarios', async () => {
		const { service, agentConfigService } = makeService();
		agentConfigService.getConfig.mockResolvedValue(makeConfig());
		generateMock
			.mockResolvedValueOnce({ structuredOutput: { scenarios: ['   '] } })
			.mockResolvedValueOnce({
				structuredOutput: {
					scenarios: ['Retry 1', 'Retry 2'],
				},
			});

		const result = await service.generateTestScenarios(user, 'project-1', 'agent-1');

		expect(generateMock).toHaveBeenCalledTimes(2);
		expect(result.scenarios).toEqual(['Retry 1', 'Retry 2']);
	});

	it('fails fast with a sanitized UserError without retrying when agent.generate returns an error result', async () => {
		const { service, agentConfigService } = makeService();
		agentConfigService.getConfig.mockResolvedValue(makeConfig());
		const providerError = new Error(
			'Incorrect API key provided: sk-proj-secret1234567890abcdef at https://api.example.com/v1?api_key=leak',
		);
		generateMock.mockResolvedValueOnce({
			finishReason: 'error',
			error: providerError,
		});

		let caught: unknown;
		try {
			await service.generateTestScenarios(user, 'project-1', 'agent-1');
		} catch (error) {
			caught = error;
		}

		expect(caught).toBeInstanceOf(UserError);
		expect((caught as UserError).message).toContain(
			'Failed to generate test scenarios: Incorrect API key provided:',
		);
		expect((caught as UserError).message).not.toContain('sk-proj-secret1234567890abcdef');
		expect((caught as UserError).message).not.toContain('api_key=leak');
		expect((caught as UserError).cause).toBe(providerError);
		expect(generateMock).toHaveBeenCalledTimes(1);
	});

	it('fails fast with a fallback UserError when finishReason is error without an error object', async () => {
		const { service, agentConfigService } = makeService();
		agentConfigService.getConfig.mockResolvedValue(makeConfig());
		generateMock.mockResolvedValueOnce({
			finishReason: 'error',
		});

		await expect(service.generateTestScenarios(user, 'project-1', 'agent-1')).rejects.toThrow(
			UserError,
		);
		expect(generateMock).toHaveBeenCalledTimes(1);
	});

	it('throws OperationalError when retry still returns no valid scenarios', async () => {
		const { service, agentConfigService } = makeService();
		agentConfigService.getConfig.mockResolvedValue(makeConfig());
		generateMock
			.mockResolvedValueOnce({ structuredOutput: { scenarios: [] } })
			.mockResolvedValueOnce({ structuredOutput: { scenarios: ['   '] } });

		await expect(service.generateTestScenarios(user, 'project-1', 'agent-1')).rejects.toThrow(
			OperationalError,
		);
		expect(generateMock).toHaveBeenCalledTimes(2);
	});

	it('rejects requests when Agents are disabled by admin settings', async () => {
		const { service, agentConfigService, agentsSettingsService } = makeService();
		agentsSettingsService.assertEnabledFor.mockRejectedValueOnce(
			new ForbiddenError('Agents are disabled on this instance.'),
		);

		await expect(service.generateTestScenarios(user, 'project-1', 'agent-1')).rejects.toThrow(
			ForbiddenError,
		);
		expect(userHasScopesMock).not.toHaveBeenCalled();
		expect(agentConfigService.getConfig).not.toHaveBeenCalled();
		expect(generateMock).not.toHaveBeenCalled();
	});

	it('rejects users without agent:read access to the project', async () => {
		const { service, agentConfigService } = makeService();
		userHasScopesMock.mockResolvedValue(false);

		await expect(service.generateTestScenarios(user, 'project-1', 'agent-1')).rejects.toThrow(
			ForbiddenError,
		);
		expect(agentConfigService.getConfig).not.toHaveBeenCalled();
	});

	it('rejects agents without instructions', async () => {
		const { service, agentConfigService } = makeService();
		agentConfigService.getConfig.mockResolvedValue(makeConfig({ instructions: '   ' }));

		await expect(service.generateTestScenarios(user, 'project-1', 'agent-1')).rejects.toThrow(
			UserError,
		);
	});

	it.each([
		{ model: '', credential: 'cred-1' },
		{ model: 'openai/gpt-4.1', credential: '' },
		{ model: 'openai/gpt-4.1', credential: MANAGED_CREDENTIAL_TOKEN },
		{ model: 'unknown-provider/foo', credential: 'cred-1' },
	])('rejects unconfigured or unsupported model config %j', async (overrides) => {
		const { service, agentConfigService } = makeService();
		agentConfigService.getConfig.mockResolvedValue(makeConfig(overrides));

		await expect(service.generateTestScenarios(user, 'project-1', 'agent-1')).rejects.toThrow(
			UserError,
		);
	});
});
