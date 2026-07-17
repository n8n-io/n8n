/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';

const LOCAL_STORAGE_KEY = 'agent-model-credentials-user-1';

vi.mock('@/app/constants', () => ({
	LOCAL_STORAGE_AGENT_MODEL_CREDENTIALS: () => LOCAL_STORAGE_KEY,
}));

type StoreCredential = { id: string; name: string; type: string; createdAt: string };

const credentialsByType = vi.hoisted(() => ({ value: {} as Record<string, StoreCredential[]> }));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		allCredentials: [{ id: 'any' }],
		getCredentialsByType: (type: string) => credentialsByType.value[type] ?? [],
		getCredentialById: (id: string) =>
			Object.values(credentialsByType.value)
				.flat()
				.find((c) => c.id === id),
		fetchCredentialTypes: vi.fn().mockResolvedValue(undefined),
		fetchAllCredentialsForWorkflow: vi.fn().mockResolvedValue(undefined),
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
	});

	it('preserves the n8n Connect managed tag as the selected credential', () => {
		// No own Anthropic credential, but the managed tag is the stored selection.
		seedSelection({ anthropic: AI_GATEWAY_MANAGED_TAG });

		const { credentialsByProvider } = useAgentModelCredentials('user-1', 'project-1');

		expect(credentialsByProvider.value?.anthropic).toBe(AI_GATEWAY_MANAGED_TAG);
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
});
