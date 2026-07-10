import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';

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

	function createManagedContext(
		credentials: Array<{ id: string; name: string; type: string }>,
		options: {
			isAiGatewayCredentialType?: (type: string) => Promise<boolean>;
			listModels?: InstanceAiAgentBuilderService['listModels'];
		} = {},
	): InstanceAiContext {
		return {
			userId: 'user-1',
			agentBuilderService: createService(
				options.listModels ? { listModels: options.listModels } : {},
			),
			agentBuilderTarget: { agentId: 'agent-1', projectId: 'project-1' },
			credentialService: {
				list: vi.fn().mockResolvedValue(credentials),
				isAiGatewayCredentialType:
					options.isAiGatewayCredentialType ?? vi.fn().mockResolvedValue(false),
			},
		} as unknown as InstanceAiContext;
	}

	it('defaults to n8n Connect when there is no own credential and the gateway serves the provider', async () => {
		const context = createManagedContext([], {
			isAiGatewayCredentialType: vi.fn().mockResolvedValue(true),
		});

		const result = await executeTool<{
			ok: boolean;
			provider?: string;
			model?: string;
			credentialId?: string;
		}>(createResolveLlmTool(context), { provider: 'anthropic' }, {});

		expect(result.ok).toBe(true);
		expect(result.provider).toBe('anthropic');
		expect(result.credentialId).toBe(AI_GATEWAY_MANAGED_TAG);
		expect(result.model).toBe('claude-sonnet-4-6');
	});

	it('reports missing_credential when no own credential and the gateway does not serve the provider', async () => {
		const context = createManagedContext([], {
			isAiGatewayCredentialType: vi.fn().mockResolvedValue(false),
		});

		const result = await executeTool<{ ok: boolean; reason?: string }>(
			createResolveLlmTool(context),
			{ provider: 'anthropic' },
			{},
		);

		expect(result.ok).toBe(false);
		expect(result.reason).toBe('missing_credential');
	});

	it('does not offer n8n Connect for a provider the user already has credentials for', async () => {
		const context = createManagedContext(
			[
				{ id: 'cred-1', name: 'Anthropic A', type: 'anthropicApi' },
				{ id: 'cred-2', name: 'Anthropic B', type: 'anthropicApi' },
			],
			{ isAiGatewayCredentialType: vi.fn().mockResolvedValue(true) },
		);

		const result = await executeTool<{
			ok: boolean;
			reason?: string;
			credentials?: Array<{ id: string; name: string }>;
		}>(createResolveLlmTool(context), { provider: 'anthropic' }, {});

		// The user has Anthropic keys, so n8n Connect is not offered for Anthropic —
		// only their own credentials are ambiguous.
		expect(result.ok).toBe(false);
		expect(result.reason).toBe('ambiguous_credential');
		expect(result.credentials).toEqual([
			{ id: 'cred-1', name: 'Anthropic A' },
			{ id: 'cred-2', name: 'Anthropic B' },
		]);
	});

	it('additively appends n8n Connect options for gateway providers the user has no key for', async () => {
		const gatewayProviders = new Set(['openAiApi', 'anthropicApi', 'googlePalmApi']);
		// User has Anthropic + xAI keys (2 creds → provider-selection list is shown).
		const context = createManagedContext(
			[
				{ id: 'cred-1', name: 'My Anthropic', type: 'anthropicApi' },
				{ id: 'cred-2', name: 'My xAI', type: 'xAiApi' },
			],
			{ isAiGatewayCredentialType: vi.fn(async (type: string) => gatewayProviders.has(type)) },
		);

		const result = await executeTool<{
			ok: boolean;
			credentials?: Array<{ id: string; name: string; type: string; provider: string }>;
		}>(createResolveLlmTool(context), {}, {});

		const creds = result.credentials ?? [];
		// Own credential preserved.
		expect(creds).toContainEqual({
			id: 'cred-1',
			name: 'My Anthropic',
			type: 'anthropicApi',
			provider: 'anthropic',
		});
		// n8n Connect options appended for supported providers without an own key (openai, google).
		expect(creds).toContainEqual({
			id: '__AI_GATEWAY_MANAGED__',
			name: 'n8n Connect',
			type: 'openAiApi',
			provider: 'openai',
		});
		expect(creds).toContainEqual({
			id: '__AI_GATEWAY_MANAGED__',
			name: 'n8n Connect',
			type: 'googlePalmApi',
			provider: 'google',
		});
		// No n8n Connect entry for Anthropic — the user already has a key for it.
		expect(
			creds.filter((c) => c.provider === 'anthropic' && c.id === '__AI_GATEWAY_MANAGED__'),
		).toHaveLength(0);
	});

	it('validates a requested managed model against the gateway allowlist', async () => {
		const listModels = vi.fn().mockResolvedValue([{ name: 'GPT-5 mini', value: 'gpt-5-mini' }]);
		const context = createManagedContext([], {
			isAiGatewayCredentialType: vi.fn().mockResolvedValue(true),
			listModels,
		});

		const result = await executeTool<{ ok: boolean; model?: string; credentialId?: string }>(
			createResolveLlmTool(context),
			{ provider: 'openai', model: 'gpt-5-mini' },
			{},
		);

		expect(result.ok).toBe(true);
		expect(result.credentialId).toBe(AI_GATEWAY_MANAGED_TAG);
		expect(result.model).toBe('gpt-5-mini');
		expect(listModels).toHaveBeenCalledWith(AI_GATEWAY_MANAGED_TAG, 'openAiApi', expect.anything());
	});
});
