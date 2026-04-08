import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ref } from 'vue';
import type { INodeTypeDescription } from 'n8n-workflow';

import { applyDefaultAiGatewayCredentialsForNewNode } from './applyDefaultAiGatewayCredentials';

const mockGetGatewayConfig = vi.fn().mockResolvedValue({
	nodes: ['@n8n/n8n-nodes-langchain.lmChatOpenAi'],
	credentialTypes: ['openAiApi'],
	providerConfig: {},
});

vi.mock('@/features/ai/assistant/assistant.api', () => ({
	getGatewayCredits: vi.fn(),
	getGatewayConfig: (...args: unknown[]) => mockGetGatewayConfig(...args),
	getGatewayUsage: vi.fn(),
	topUpGatewayCredits: vi.fn(),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: { baseUrl: 'http://localhost:5678', sessionId: '' },
	})),
}));

const mockIsAiGatewayEnabled = ref(false);
const mockGetVariant = vi.fn().mockReturnValue(undefined);

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: vi.fn(() => ({ isAiGatewayEnabled: mockIsAiGatewayEnabled.value })),
}));

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({ getVariant: mockGetVariant })),
}));

describe('applyDefaultAiGatewayCredentialsForNewNode', () => {
	const nodeTypeDescription = {
		name: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
		displayName: 'OpenAI Chat Model',
		description: '',
		version: 1,
		defaults: { name: 'OpenAI Chat Model' },
		inputs: [],
		outputs: [],
		properties: [],
		credentials: [{ name: 'openAiApi', required: true }],
	} as unknown as INodeTypeDescription;

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		mockIsAiGatewayEnabled.value = false;
		mockGetVariant.mockReturnValue(undefined);
		mockGetGatewayConfig.mockResolvedValue({
			nodes: ['@n8n/n8n-nodes-langchain.lmChatOpenAi'],
			credentialTypes: ['openAiApi'],
			providerConfig: {},
		});
	});

	it('should return false when AI Gateway is disabled in settings', async () => {
		const node = {
			name: 'OpenAI Chat Model',
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			typeVersion: 1,
			position: [0, 0] as [number, number],
			parameters: {},
		};

		const applied = await applyDefaultAiGatewayCredentialsForNewNode(node, nodeTypeDescription);

		expect(applied).toBe(false);
		expect(node.credentials).toBeUndefined();
		expect(mockGetGatewayConfig).not.toHaveBeenCalled();
	});

	it('should return false when PostHog experiment variant does not match', async () => {
		mockIsAiGatewayEnabled.value = true;
		mockGetVariant.mockReturnValue('control');

		const node = {
			name: 'OpenAI Chat Model',
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			typeVersion: 1,
			position: [0, 0] as [number, number],
			parameters: {},
		};

		const applied = await applyDefaultAiGatewayCredentialsForNewNode(node, nodeTypeDescription);

		expect(applied).toBe(false);
		expect(node.credentials).toBeUndefined();
	});

	it('should set gateway-managed credential when gateway is enabled and node is supported', async () => {
		mockIsAiGatewayEnabled.value = true;
		mockGetVariant.mockReturnValue('variant');

		const node = {
			name: 'OpenAI Chat Model',
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			typeVersion: 1,
			position: [0, 0] as [number, number],
			parameters: {},
		};

		const applied = await applyDefaultAiGatewayCredentialsForNewNode(node, nodeTypeDescription);

		expect(applied).toBe(true);
		expect(node.credentials?.openAiApi).toEqual({
			id: null,
			name: '',
			__aiGatewayManaged: true,
		});
	});

	it('should not overwrite an existing credential id', async () => {
		mockIsAiGatewayEnabled.value = true;
		mockGetVariant.mockReturnValue('variant');

		const node = {
			name: 'OpenAI Chat Model',
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			typeVersion: 1,
			position: [0, 0] as [number, number],
			parameters: {},
			credentials: { openAiApi: { id: 'cred-1', name: 'My key' } },
		};

		const applied = await applyDefaultAiGatewayCredentialsForNewNode(node, nodeTypeDescription);

		expect(applied).toBe(false);
		expect(node.credentials?.openAiApi).toEqual({ id: 'cred-1', name: 'My key' });
	});

	it('should return false when node type is not in gateway config', async () => {
		mockIsAiGatewayEnabled.value = true;
		mockGetVariant.mockReturnValue('variant');

		const node = {
			name: 'Some Node',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0] as [number, number],
			parameters: {},
		};

		const applied = await applyDefaultAiGatewayCredentialsForNewNode(node, {
			...nodeTypeDescription,
			name: 'n8n-nodes-base.manualTrigger',
		});

		expect(applied).toBe(false);
	});
});
