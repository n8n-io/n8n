import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiAgentBuilderService, InstanceAiContext } from '../../../types';
import { createResolveLlmTool } from '../resolve-llm.tool';

function createService(
	overrides: Partial<InstanceAiAgentBuilderService> = {},
): InstanceAiAgentBuilderService {
	return {
		createAgent: vi.fn(),
		getConfigSnapshot: vi.fn(),
		updateConfig: vi.fn(),
		createSkill: vi.fn(),
		createTask: vi.fn(),
		describeCustomTool: vi.fn(),
		buildCustomTool: vi.fn(),
		listChatIntegrations: vi.fn(),
		listProjectAgents: vi.fn(),
		listAllProjectAgents: vi.fn(),
		listModels: vi.fn(),
		searchMcpServers: vi.fn(),
		verifyMcpServer: vi.fn(),
		searchNodes: vi.fn(),
		resolveResourceLocatorOptions: vi.fn(),
		listAttachableWorkflows: vi.fn(),
		...overrides,
	};
}

function createContext(
	credentials: Array<{ id: string; name: string; type: string }>,
): InstanceAiContext {
	return {
		userId: 'user-1',
		agentBuilderService: createService(),
		agentBuilderTarget: { agentId: 'agent-1', projectId: 'project-1' },
		credentialService: { list: vi.fn().mockResolvedValue(credentials) },
	} as unknown as InstanceAiContext;
}

describe('resolve_llm tool', () => {
	const anthropicCredential = { id: 'cred-1', name: 'My Anthropic', type: 'anthropicApi' };

	it.each(['anthropic', 'Anthropic', 'ANTHROPIC', '  AnThRoPiC  '])(
		'resolves the provider regardless of casing/whitespace: %s',
		async (provider) => {
			const context = createContext([anthropicCredential]);

			const result = await executeTool<{ ok: boolean; provider?: string; credentialId?: string }>(
				createResolveLlmTool(context),
				{ provider },
				{},
			);

			expect(result.ok).toBe(true);
			// Always returns the canonical (lowercase) provider id.
			expect(result.provider).toBe('anthropic');
			expect(result.credentialId).toBe('cred-1');
		},
	);

	it('reports unsupported_provider for a genuinely unknown provider', async () => {
		const context = createContext([anthropicCredential]);

		const result = await executeTool<{ ok: boolean; reason?: string }>(
			createResolveLlmTool(context),
			{ provider: 'not-a-real-provider' },
			{},
		);

		expect(result.ok).toBe(false);
		expect(result.reason).toBe('unsupported_provider');
	});
});
