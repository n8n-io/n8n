import { computed, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AgentChannelRuntimeContext } from '../types';
import { useOpenAiCompatibleChannelRuntime } from './useOpenAiCompatibleChannelRuntime';

const mocks = vi.hoisted(() => ({
	generateOpenAiCompatibleKey: vi.fn(),
	regenerateOpenAiCompatibleKey: vi.fn(),
	restUrl: '/rest',
	restApiContext: { baseUrl: '/rest', pushRef: '' },
}));

vi.mock('./api', () => ({
	generateOpenAiCompatibleKey: mocks.generateOpenAiCompatibleKey,
	regenerateOpenAiCompatibleKey: mocks.regenerateOpenAiCompatibleKey,
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		get restUrl() {
			return mocks.restUrl;
		},
		restApiContext: mocks.restApiContext,
	}),
}));

function createContext(
	overrides: Partial<AgentChannelRuntimeContext> = {},
): AgentChannelRuntimeContext {
	return {
		projectId: computed(() => 'project-1'),
		agentId: computed(() => 'agent-1'),
		selectedCredentialId: ref(''),
		credentialModalOpen: ref(false),
		fetchStatus: vi.fn().mockResolvedValue(undefined),
		isConnected: () => false,
		isConfigured: () => false,
		ensureAgentPersisted: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
}

describe('useOpenAiCompatibleChannelRuntime', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.restUrl = '/rest';
	});

	it('builds an absolute base URL from a relative REST endpoint', () => {
		const runtime = useOpenAiCompatibleChannelRuntime(createContext(), 'openwebui');

		expect(runtime.baseUrl.value).toBe(
			`${window.location.origin}/rest/projects/project-1/agents/v2/agent-1/openai/v1`,
		);
	});

	it('keeps an absolute REST endpoint as the base URL origin', () => {
		mocks.restUrl = 'https://api.example.test/rest';
		const runtime = useOpenAiCompatibleChannelRuntime(createContext(), 'librechat');

		expect(runtime.baseUrl.value).toBe(
			'https://api.example.test/rest/projects/project-1/agents/v2/agent-1/openai/v1',
		);
	});

	it('generates a key, stores it, and refreshes the status', async () => {
		mocks.generateOpenAiCompatibleKey.mockResolvedValue({
			apiKey: 'sk-new',
			connectionId: 'conn-1',
		});
		const context = createContext();
		const runtime = useOpenAiCompatibleChannelRuntime(context, 'openwebui');

		await runtime.connect();

		expect(context.ensureAgentPersisted).toHaveBeenCalledOnce();
		expect(mocks.generateOpenAiCompatibleKey).toHaveBeenCalledWith(
			mocks.restApiContext,
			'project-1',
			'agent-1',
			'openwebui',
		);
		expect(runtime.apiKey.value).toBe('sk-new');
		expect(runtime.connectionId.value).toBe('conn-1');
		expect(context.fetchStatus).toHaveBeenCalledWith(['openwebui']);
		expect(runtime.loading.value).toBe(false);
	});

	it('regenerates the key and refreshes the status so the new id is shared', async () => {
		mocks.regenerateOpenAiCompatibleKey.mockResolvedValue({
			apiKey: 'sk-rotated',
			connectionId: 'conn-2',
		});
		const context = createContext();
		const runtime = useOpenAiCompatibleChannelRuntime(context, 'librechat');

		await runtime.regenerate();

		expect(mocks.regenerateOpenAiCompatibleKey).toHaveBeenCalledWith(
			mocks.restApiContext,
			'project-1',
			'agent-1',
			'librechat',
		);
		expect(runtime.apiKey.value).toBe('sk-rotated');
		expect(runtime.connectionId.value).toBe('conn-2');
		// Without this refresh the modal keeps the dead pre-rotation connection id.
		expect(context.fetchStatus).toHaveBeenCalledWith(['librechat']);
		expect(runtime.loading.value).toBe(false);
	});

	it('clears loading when generation fails', async () => {
		mocks.generateOpenAiCompatibleKey.mockRejectedValue(new Error('boom'));
		const context = createContext();
		const runtime = useOpenAiCompatibleChannelRuntime(context, 'openwebui');

		await expect(runtime.connect()).rejects.toThrow('boom');

		expect(runtime.loading.value).toBe(false);
		expect(context.fetchStatus).not.toHaveBeenCalled();
	});
});
