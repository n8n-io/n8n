import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiAgentBuilderService, InstanceAiContext } from '../../../types';
import { createResolveEpisodicMemoryCredentialTool } from '../resolve-episodic-memory-credential.tool';

function createContext(
	managedAvailable: boolean,
	credentials: Array<{ id: string; name: string; type: string }> = [],
): InstanceAiContext {
	return {
		userId: 'user-1',
		projectId: 'project-1',
		agentBuilderTarget: { agentId: 'agent-1', projectId: 'project-1' },
		agentBuilderService: {
			isEpisodicMemoryManagedCredentialAvailable: vi.fn().mockResolvedValue(managedAvailable),
		} as unknown as InstanceAiAgentBuilderService,
		credentialService: { list: vi.fn().mockResolvedValue(credentials) },
	} as unknown as InstanceAiContext;
}

describe('resolve_episodic_memory_credential tool', () => {
	it('uses the n8n-managed credential when the assistant proxy is available', async () => {
		const context = createContext(true);

		const result = await executeTool(createResolveEpisodicMemoryCredentialTool(context), {}, {});

		expect(result).toEqual({
			ok: true,
			credentialId: 'managed',
			credentialName: 'Managed by n8n',
			managed: true,
			episodicMemory: { enabled: true, credential: 'managed' },
		});
		expect(context.credentialService.list).not.toHaveBeenCalled();
	});

	it('uses the only project-scoped OpenAI credential when managed embeddings are unavailable', async () => {
		const context = createContext(false, [
			{ id: 'openai-1', name: 'OpenAI account', type: 'openAiApi' },
		]);

		const result = await executeTool(createResolveEpisodicMemoryCredentialTool(context), {}, {});

		expect(context.credentialService.list).toHaveBeenCalledWith({
			type: 'openAiApi',
			projectId: 'project-1',
		});
		expect(result).toEqual({
			ok: true,
			credentialId: 'openai-1',
			credentialName: 'OpenAI account',
			managed: false,
			episodicMemory: { enabled: true, credential: 'openai-1' },
		});
	});

	it('returns choices instead of guessing when several OpenAI credentials are available', async () => {
		const credentials = [
			{ id: 'openai-1', name: 'Personal OpenAI', type: 'openAiApi' },
			{ id: 'openai-2', name: 'Team OpenAI', type: 'openAiApi' },
		];
		const context = createContext(false, credentials);

		const result = await executeTool(createResolveEpisodicMemoryCredentialTool(context), {}, {});

		expect(result).toEqual({
			ok: false,
			reason: 'ambiguous_credential',
			credentialType: 'openAiApi',
			credentials: credentials.map(({ id, name }) => ({ id, name })),
		});
	});

	it('reports the credential type needed when no OpenAI credential is available', async () => {
		const result = await executeTool(
			createResolveEpisodicMemoryCredentialTool(createContext(false)),
			{},
			{},
		);

		expect(result).toEqual({
			ok: false,
			reason: 'missing_credential',
			credentialType: 'openAiApi',
			credentials: [],
		});
	});
});
