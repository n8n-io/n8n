/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import { effectScope, nextTick, ref, type Ref } from 'vue';

const LOCAL_STORAGE_KEY = 'agent-model-credentials-user-1';

vi.mock('@/app/constants', () => ({
	LOCAL_STORAGE_AGENT_MODEL_CREDENTIALS: () => LOCAL_STORAGE_KEY,
}));

type StoreCredential = { id: string; name: string; type: string; createdAt: string };

const credentialsByType = vi.hoisted(() => ({ value: {} as Record<string, StoreCredential[]> }));

const agentScope = vi.hoisted(() => ({
	isFetched: true,
	requested: [] as unknown[],
	/** Set by a test that needs the store to react, as the real store does. */
	reactiveIsFetched: null as { value: boolean } | null,
}));

const fetchUsableCredentialsMock = vi.hoisted(() => vi.fn());

const aiGatewayState = vi.hoisted(() => ({
	isEnabled: { value: false },
	supportedTypes: new Set<string>(),
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		getUsableCredentialsForScope: (scope: unknown) => {
			agentScope.requested.push(scope);
			const isFetched = agentScope.reactiveIsFetched?.value ?? agentScope.isFetched;
			return isFetched ? Object.values(credentialsByType.value).flat() : undefined;
		},
		getCredentialById: (id: string) =>
			Object.values(credentialsByType.value)
				.flat()
				.find((c) => c.id === id),
		fetchCredentialTypes: vi.fn().mockResolvedValue(undefined),
		fetchUsableCredentials: fetchUsableCredentialsMock,
	}),
}));

vi.mock('@/app/stores/aiGateway.store', () => ({
	useAiGatewayStore: () => ({
		canServeCredentialType: (type: string) => aiGatewayState.supportedTypes.has(type),
	}),
}));

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => ({
		get isAiGatewayEnabled() {
			return aiGatewayState.isEnabled.value;
		},
	}),
}));

import { useAgentModelCredentials } from '../composables/useAgentModelCredentials';

function seedSelection(selection: Record<string, string | null>) {
	localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(selection));
}

describe('useAgentModelCredentials — credentialsByProvider', () => {
	beforeEach(() => {
		localStorage.clear();
		credentialsByType.value = {};
		agentScope.isFetched = true;
		agentScope.requested = [];
		agentScope.reactiveIsFetched = null;
		fetchUsableCredentialsMock.mockReset().mockResolvedValue(undefined);
		aiGatewayState.isEnabled.value = false;
		aiGatewayState.supportedTypes = new Set<string>();
	});

	it('preserves the n8n Connect managed tag while it still serves the provider', () => {
		// No own Anthropic credential, but the managed tag is the stored selection.
		aiGatewayState.isEnabled.value = true;
		aiGatewayState.supportedTypes = new Set(['anthropicApi']);
		seedSelection({ anthropic: AI_GATEWAY_MANAGED_TAG });

		const { credentialsByProvider } = useAgentModelCredentials('user-1', 'project-1');

		expect(credentialsByProvider.value?.anthropic).toBe(AI_GATEWAY_MANAGED_TAG);
	});

	it('drops a stale managed tag when n8n Connect no longer serves the provider, falling back to a credential', () => {
		// License off / provider removed → managed no longer supported, but a real credential exists.
		aiGatewayState.isEnabled.value = false;
		aiGatewayState.supportedTypes = new Set<string>();
		credentialsByType.value = {
			anthropicApi: [
				{ id: 'cred-1', name: 'My Anthropic', type: 'anthropicApi', createdAt: '2026-01-01' },
			],
		};
		seedSelection({ anthropic: AI_GATEWAY_MANAGED_TAG });

		const { credentialsByProvider } = useAgentModelCredentials('user-1', 'project-1');

		expect(credentialsByProvider.value?.anthropic).toBe('cred-1');
	});

	it('drops a stale managed tag to null when unsupported and no credential is available', () => {
		aiGatewayState.isEnabled.value = false;
		aiGatewayState.supportedTypes = new Set<string>();
		seedSelection({ anthropic: AI_GATEWAY_MANAGED_TAG });

		const { credentialsByProvider } = useAgentModelCredentials('user-1', 'project-1');

		expect(credentialsByProvider.value?.anthropic).toBeNull();
	});

	it('keeps a real selected credential id (unchanged)', () => {
		credentialsByType.value = {
			anthropicApi: [
				{ id: 'cred-1', name: 'My Anthropic', type: 'anthropicApi', createdAt: '2026-01-01' },
			],
		};
		seedSelection({ anthropic: 'cred-1' });

		const { credentialsByProvider } = useAgentModelCredentials('user-1', 'project-1');

		expect(credentialsByProvider.value?.anthropic).toBe('cred-1');
	});

	it('falls back to the first store credential when the stored id is stale (unchanged)', () => {
		credentialsByType.value = {
			anthropicApi: [
				{ id: 'cred-2', name: 'My Anthropic', type: 'anthropicApi', createdAt: '2026-01-01' },
			],
		};
		seedSelection({ anthropic: 'deleted-cred' });

		const { credentialsByProvider } = useAgentModelCredentials('user-1', 'project-1');

		expect(credentialsByProvider.value?.anthropic).toBe('cred-2');
	});

	it('defaults to the managed tag when nothing is selected and n8n Connect supports the provider', () => {
		aiGatewayState.isEnabled.value = true;
		aiGatewayState.supportedTypes = new Set(['anthropicApi']);

		const { credentialsByProvider } = useAgentModelCredentials('user-1', 'project-1');

		expect(credentialsByProvider.value?.anthropic).toBe(AI_GATEWAY_MANAGED_TAG);
	});

	it('prefers the managed tag over an existing credential when nothing is selected', () => {
		aiGatewayState.isEnabled.value = true;
		aiGatewayState.supportedTypes = new Set(['anthropicApi']);
		credentialsByType.value = {
			anthropicApi: [
				{ id: 'cred-1', name: 'My Anthropic', type: 'anthropicApi', createdAt: '2026-01-01' },
			],
		};

		const { credentialsByProvider } = useAgentModelCredentials('user-1', 'project-1');

		expect(credentialsByProvider.value?.anthropic).toBe(AI_GATEWAY_MANAGED_TAG);
	});

	it('does not default to the managed tag for an unsupported provider', () => {
		aiGatewayState.isEnabled.value = true;
		aiGatewayState.supportedTypes = new Set<string>();
		credentialsByType.value = {
			anthropicApi: [
				{ id: 'cred-1', name: 'My Anthropic', type: 'anthropicApi', createdAt: '2026-01-01' },
			],
		};

		const { credentialsByProvider } = useAgentModelCredentials('user-1', 'project-1');

		expect(credentialsByProvider.value?.anthropic).toBe('cred-1');
	});
});

describe('useAgentModelCredentials — agent scope', () => {
	beforeEach(() => {
		localStorage.clear();
		credentialsByType.value = {
			anthropicApi: [
				{ id: 'cred-1', name: 'Preloaded', type: 'anthropicApi', createdAt: '2026-01-01' },
			],
		};
		agentScope.isFetched = false;
		agentScope.requested = [];
		agentScope.reactiveIsFetched = null;
		fetchUsableCredentialsMock.mockReset().mockResolvedValue(undefined);
		aiGatewayState.isEnabled.value = false;
		aiGatewayState.supportedTypes = new Set<string>();
	});

	it('hides credentials another surface preloaded until the agent scope is fetched', () => {
		const { credentialsByProvider, getCredentialsForProvider } = useAgentModelCredentials(
			'user-1',
			'project-1',
		);

		expect(credentialsByProvider.value).toBeNull();
		expect(getCredentialsForProvider('anthropic')).toEqual([]);
		expect(agentScope.requested).toContainEqual({ projectId: 'project-1', forAgent: true });
	});

	it('offers the credentials once the agent scope is fetched', () => {
		agentScope.isFetched = true;

		const { getCredentialsForProvider } = useAgentModelCredentials('user-1', 'project-1');

		expect(getCredentialsForProvider('anthropic').map((credential) => credential.id)).toEqual([
			'cred-1',
		]);
	});

	it('refetches once when the store drops the agent scope, however many panels use it', async () => {
		const isFetched: Ref<boolean> = ref(true);
		agentScope.reactiveIsFetched = isFetched;
		const scope = effectScope();
		scope.run(() => {
			useAgentModelCredentials('user-1', 'project-1');
			useAgentModelCredentials('user-1', 'project-1');
			useAgentModelCredentials('user-1', 'project-1');
		});
		await nextTick();
		// Each mount fetches once for the project.
		expect(fetchUsableCredentialsMock).toHaveBeenCalledTimes(3);
		fetchUsableCredentialsMock.mockClear();

		isFetched.value = false;
		await nextTick();

		expect(fetchUsableCredentialsMock).toHaveBeenCalledTimes(1);
		expect(fetchUsableCredentialsMock).toHaveBeenCalledWith({
			projectId: 'project-1',
			forAgent: true,
		});
		scope.stop();
	});

	it('does not refetch again while the agent scope stays missing', async () => {
		const isFetched: Ref<boolean> = ref(true);
		agentScope.reactiveIsFetched = isFetched;
		const scope = effectScope();
		scope.run(() => useAgentModelCredentials('user-1', 'project-1'));
		await nextTick();
		fetchUsableCredentialsMock.mockClear().mockRejectedValue(new Error('offline'));

		isFetched.value = false;
		await nextTick();
		await Promise.resolve();
		await nextTick();

		expect(fetchUsableCredentialsMock).toHaveBeenCalledTimes(1);
		scope.stop();
	});
});
