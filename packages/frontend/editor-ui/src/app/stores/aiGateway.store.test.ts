import { createPinia, setActivePinia } from 'pinia';
import { describe, it, vi, beforeEach, expect } from 'vitest';
import { useAiGatewayStore } from './aiGateway.store';

const mockGetGatewayConfig = vi.fn();
const mockGetGatewayWallet = vi.fn();
const mockGetGatewayUsage = vi.fn();

vi.mock('@/features/ai/assistant/assistant.api', () => ({
	getGatewayConfig: (...args: unknown[]) => mockGetGatewayConfig(...args),
	getGatewayWallet: (...args: unknown[]) => mockGetGatewayWallet(...args),
	getGatewayUsage: (...args: unknown[]) => mockGetGatewayUsage(...args),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: { baseUrl: 'http://localhost:5678', sessionId: '' },
	})),
}));

const MOCK_CONFIG = {
	nodes: ['@n8n/n8n-nodes-langchain.lmChatGoogleGemini'],
	credentialTypes: ['googlePalmApi'],
	providerConfig: {
		googlePalmApi: { gatewayPath: '/v1/gateway/google', urlField: 'host', apiKeyField: 'apiKey' },
	},
};

const MOCK_USAGE_PAGE_1 = [
	{ provider: 'google', model: 'gemini-pro', timestamp: 1700000001, cost: 1 },
	{ provider: 'google', model: 'gemini-pro', timestamp: 1700000002, cost: 2 },
];

const MOCK_USAGE_PAGE_2 = [
	{ provider: 'anthropic', model: 'claude-3', timestamp: 1700000003, cost: 3 },
];

describe('aiGateway.store', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createPinia());
	});

	describe('fetchConfig()', () => {
		it('should fetch config and store it', async () => {
			mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
			const store = useAiGatewayStore();

			await store.fetchConfig();

			expect(store.config).toEqual(MOCK_CONFIG);
			expect(store.fetchError).toBeNull();
		});

		it('should not re-fetch if config is already loaded', async () => {
			mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
			const store = useAiGatewayStore();

			await store.fetchConfig();
			await store.fetchConfig();

			expect(mockGetGatewayConfig).toHaveBeenCalledOnce();
		});

		it('should set fetchError when API throws an Error', async () => {
			mockGetGatewayConfig.mockRejectedValue(new Error('Network failure'));
			const store = useAiGatewayStore();

			await store.fetchConfig();

			expect(store.fetchError).toBeInstanceOf(Error);
			expect(store.fetchError?.message).toBe('Network failure');
			expect(store.config).toBeNull();
		});

		it('should coerce non-Error throws into an Error', async () => {
			mockGetGatewayConfig.mockRejectedValue('string error');
			const store = useAiGatewayStore();

			await store.fetchConfig();

			expect(store.fetchError).toBeInstanceOf(Error);
			expect(store.fetchError?.message).toBe('string error');
		});

		it('should clear fetchError on successful fetch after a previous failure', async () => {
			mockGetGatewayConfig.mockRejectedValueOnce(new Error('fail'));
			const store = useAiGatewayStore();
			await store.fetchConfig();
			expect(store.fetchError).not.toBeNull();

			// Reset config so next fetchConfig() isn't skipped
			store.config = null;
			mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
			await store.fetchConfig();

			expect(store.fetchError).toBeNull();
		});
	});

	describe('fetchWallet()', () => {
		it('should update balance and budget', async () => {
			mockGetGatewayWallet.mockResolvedValue({ balance: 7, budget: 10 });
			const store = useAiGatewayStore();

			await store.fetchWallet();

			expect(store.balance).toBe(7);
			expect(store.budget).toBe(10);
			expect(store.fetchError).toBeNull();
		});

		it('should set fetchError when API throws', async () => {
			mockGetGatewayWallet.mockRejectedValue(new Error('Unauthorized'));
			const store = useAiGatewayStore();

			await store.fetchWallet();

			expect(store.fetchError).toBeInstanceOf(Error);
			expect(store.fetchError?.message).toBe('Unauthorized');
		});

		it('should clear fetchError on success after a previous failure', async () => {
			mockGetGatewayWallet.mockRejectedValueOnce(new Error('fail'));
			const store = useAiGatewayStore();
			await store.fetchWallet();
			expect(store.fetchError).not.toBeNull();

			mockGetGatewayWallet.mockResolvedValue({ balance: 3, budget: 10 });
			await store.fetchWallet();

			expect(store.fetchError).toBeNull();
			expect(store.balance).toBe(3);
		});
	});

	describe('fetchUsage()', () => {
		it('should replace usageEntries and set usageTotal', async () => {
			mockGetGatewayUsage.mockResolvedValue({ entries: MOCK_USAGE_PAGE_1, total: 5 });
			const store = useAiGatewayStore();

			await store.fetchUsage(0, 2);

			expect(store.usageEntries).toEqual(MOCK_USAGE_PAGE_1);
			expect(store.usageTotal).toBe(5);
		});

		it('should replace (not append) on subsequent calls', async () => {
			mockGetGatewayUsage
				.mockResolvedValueOnce({ entries: MOCK_USAGE_PAGE_1, total: 5 })
				.mockResolvedValueOnce({ entries: MOCK_USAGE_PAGE_2, total: 5 });
			const store = useAiGatewayStore();

			await store.fetchUsage(0, 2);
			await store.fetchUsage(2, 2);

			expect(store.usageEntries).toEqual(MOCK_USAGE_PAGE_2);
		});

		it('should pass offset and limit to the API', async () => {
			mockGetGatewayUsage.mockResolvedValue({ entries: [], total: 0 });
			const store = useAiGatewayStore();

			await store.fetchUsage(10, 25);

			expect(mockGetGatewayUsage).toHaveBeenCalledWith(expect.anything(), 10, 25);
		});

		it('should use defaults offset=0, limit=50 when called without args', async () => {
			mockGetGatewayUsage.mockResolvedValue({ entries: [], total: 0 });
			const store = useAiGatewayStore();

			await store.fetchUsage();

			expect(mockGetGatewayUsage).toHaveBeenCalledWith(expect.anything(), 0, 50);
		});

		it('should set fetchError when API throws', async () => {
			mockGetGatewayUsage.mockRejectedValue(new Error('Server error'));
			const store = useAiGatewayStore();

			await store.fetchUsage();

			expect(store.fetchError).toBeInstanceOf(Error);
		});
	});

	describe('fetchMoreUsage()', () => {
		it('should append entries to existing usageEntries', async () => {
			mockGetGatewayUsage
				.mockResolvedValueOnce({ entries: MOCK_USAGE_PAGE_1, total: 3 })
				.mockResolvedValueOnce({ entries: MOCK_USAGE_PAGE_2, total: 3 });
			const store = useAiGatewayStore();

			await store.fetchUsage(0, 2);
			await store.fetchMoreUsage(2, 2);

			expect(store.usageEntries).toEqual([...MOCK_USAGE_PAGE_1, ...MOCK_USAGE_PAGE_2]);
			expect(store.usageTotal).toBe(3);
		});

		it('should set fetchError when API throws', async () => {
			mockGetGatewayUsage.mockRejectedValue(new Error('Timeout'));
			const store = useAiGatewayStore();

			await store.fetchMoreUsage(50);

			expect(store.fetchError).toBeInstanceOf(Error);
			expect(store.fetchError?.message).toBe('Timeout');
		});
	});

	describe('isNodeSupported()', () => {
		it('should return true when the node is in the config', async () => {
			mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
			const store = useAiGatewayStore();
			await store.fetchConfig();

			expect(store.isNodeSupported('@n8n/n8n-nodes-langchain.lmChatGoogleGemini')).toBe(true);
		});

		it('should return false when the node is not in the config', async () => {
			mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
			const store = useAiGatewayStore();
			await store.fetchConfig();

			expect(store.isNodeSupported('unknownNode')).toBe(false);
		});

		it('should return false when config has not been loaded', () => {
			const store = useAiGatewayStore();

			expect(store.isNodeSupported('@n8n/n8n-nodes-langchain.lmChatGoogleGemini')).toBe(false);
		});
	});

	describe('isCredentialTypeSupported()', () => {
		it('should return true when the credential type is in the config', async () => {
			mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
			const store = useAiGatewayStore();
			await store.fetchConfig();

			expect(store.isCredentialTypeSupported('googlePalmApi')).toBe(true);
		});

		it('should return false when the credential type is not in the config', async () => {
			mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
			const store = useAiGatewayStore();
			await store.fetchConfig();

			expect(store.isCredentialTypeSupported('openAiApi')).toBe(false);
		});

		it('should return false when config has not been loaded', () => {
			const store = useAiGatewayStore();

			expect(store.isCredentialTypeSupported('googlePalmApi')).toBe(false);
		});
	});
});
