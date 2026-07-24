import { createPinia, setActivePinia } from 'pinia';
import { describe, it, vi, beforeEach, expect } from 'vitest';
import type { INode } from 'n8n-workflow';
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

const OPERATION_ONLY = '__operation_only__';

const MOCK_CONFIG = {
	nodes: ['@n8n/n8n-nodes-langchain.lmChatGoogleGemini'],
	credentialTypes: ['googlePalmApi'],
	providerConfig: {
		googlePalmApi: { gatewayPath: '/v1/gateway/google', urlField: 'host', apiKeyField: 'apiKey' },
	},
	supportedActions: {
		'@n8n/n8n-nodes-langchain.openAi': {
			text: ['message', 'response', 'classify'],
			image: ['analyze', 'generate', 'edit'],
			audio: ['generate', 'transcribe', 'translate'],
		},
		'@n8n/n8n-nodes-langchain.googleGemini': {
			text: ['message'],
			image: ['generate'],
		},
		'@n8n/n8n-nodes-langchain.anthropic': {
			text: ['message'],
			image: ['analyze'],
			document: ['analyze'],
		},
		'n8n-nodes-pdfco.PDFco Api': {
			[OPERATION_ONLY]: ['AI Invoice Parser', 'Merge PDF'],
		},
	},
	hiddenNodeProperties: {
		'n8n-nodes-browserbase.browserbase': ['modelSource'],
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

	describe('isActionSupported()', () => {
		it('should return true for a supported resource/operation', async () => {
			mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
			const store = useAiGatewayStore();
			await store.fetchConfig();

			expect(store.isActionSupported('@n8n/n8n-nodes-langchain.openAi', 'text', 'message')).toBe(
				true,
			);
		});

		it('should return false for an unsupported operation', async () => {
			mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
			const store = useAiGatewayStore();
			await store.fetchConfig();

			expect(store.isActionSupported('@n8n/n8n-nodes-langchain.openAi', 'text', 'unknownOp')).toBe(
				false,
			);
		});

		it('should return false for an unsupported resource', async () => {
			mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
			const store = useAiGatewayStore();
			await store.fetchConfig();

			expect(store.isActionSupported('@n8n/n8n-nodes-langchain.openAi', 'file', 'upload')).toBe(
				false,
			);
		});

		it('should return true when node has no supportedActions entry', async () => {
			mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
			const store = useAiGatewayStore();
			await store.fetchConfig();

			expect(
				store.isActionSupported('@n8n/n8n-nodes-langchain.lmChatGoogleGemini', 'text', 'message'),
			).toBe(true);
		});

		it('should return true when config has no supportedActions field', async () => {
			const configWithout = { ...MOCK_CONFIG, supportedActions: undefined };
			mockGetGatewayConfig.mockResolvedValue(configWithout);
			const store = useAiGatewayStore();
			await store.fetchConfig();

			expect(store.isActionSupported('@n8n/n8n-nodes-langchain.openAi', 'text', 'message')).toBe(
				true,
			);
		});

		it('should return true when config has not been loaded', () => {
			const store = useAiGatewayStore();

			expect(store.isActionSupported('@n8n/n8n-nodes-langchain.openAi', 'file', 'upload')).toBe(
				true,
			);
		});

		it('should fall back to the base node name for Tool-suffixed node types', async () => {
			mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
			const store = useAiGatewayStore();
			await store.fetchConfig();

			// "openAiTool" is not a config key, but its base "openAi" is.
			expect(
				store.isActionSupported('@n8n/n8n-nodes-langchain.openAiTool', 'text', 'message'),
			).toBe(true);
			expect(store.isActionSupported('@n8n/n8n-nodes-langchain.openAiTool', 'file', 'upload')).toBe(
				false,
			);
		});

		describe('operation-only nodes (no resource)', () => {
			it('should return true when operation is in the OPERATION_ONLY list', async () => {
				mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
				const store = useAiGatewayStore();
				await store.fetchConfig();

				expect(
					store.isActionSupported('n8n-nodes-pdfco.PDFco Api', undefined, 'AI Invoice Parser'),
				).toBe(true);
			});

			it('should return false when operation is not in the OPERATION_ONLY list', async () => {
				mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
				const store = useAiGatewayStore();
				await store.fetchConfig();

				expect(
					store.isActionSupported('n8n-nodes-pdfco.PDFco Api', undefined, 'Unknown Operation'),
				).toBe(false);
			});

			it('should return false when resource is undefined and node has only resource-based actions', async () => {
				mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
				const store = useAiGatewayStore();
				await store.fetchConfig();

				expect(
					store.isActionSupported('@n8n/n8n-nodes-langchain.openAi', undefined, 'message'),
				).toBe(false);
			});
		});
	});

	describe('isNodePropertyHidden()', () => {
		const managedNode = {
			type: 'n8n-nodes-browserbase.browserbase',
			credentials: { browserbaseApi: { id: null, name: '', __aiGatewayManaged: true } },
		} as unknown as INode;

		it('should return true when a managed credential is attached and the property is listed', async () => {
			mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
			const store = useAiGatewayStore();
			await store.fetchConfig();

			expect(store.isNodePropertyHidden(managedNode, 'modelSource')).toBe(true);
		});

		it('should return false when a managed credential is attached but the property is not listed', async () => {
			mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
			const store = useAiGatewayStore();
			await store.fetchConfig();

			expect(store.isNodePropertyHidden(managedNode, 'driverModel')).toBe(false);
		});

		it('should return false when the node type has no hiddenNodeProperties entry', async () => {
			mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
			const store = useAiGatewayStore();
			await store.fetchConfig();

			const node = {
				type: '@n8n/n8n-nodes-langchain.openAi',
				credentials: { openAiApi: { id: null, name: '', __aiGatewayManaged: true } },
			} as unknown as INode;

			expect(store.isNodePropertyHidden(node, 'modelSource')).toBe(false);
		});

		it('should return false when config has no hiddenNodeProperties field', async () => {
			const configWithout = { ...MOCK_CONFIG, hiddenNodeProperties: undefined };
			mockGetGatewayConfig.mockResolvedValue(configWithout);
			const store = useAiGatewayStore();
			await store.fetchConfig();

			expect(store.isNodePropertyHidden(managedNode, 'modelSource')).toBe(false);
		});

		it('should return false when config has not been loaded', () => {
			const store = useAiGatewayStore();

			expect(store.isNodePropertyHidden(managedNode, 'modelSource')).toBe(false);
		});

		it('should return false when no credential is gateway-managed', async () => {
			mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
			const store = useAiGatewayStore();
			await store.fetchConfig();

			const node = {
				type: 'n8n-nodes-browserbase.browserbase',
				credentials: { browserbaseApi: { id: 'cred-1', name: 'My Key' } },
			} as unknown as INode;

			expect(store.isNodePropertyHidden(node, 'modelSource')).toBe(false);
		});

		it('should return false when the node has no credentials', async () => {
			mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
			const store = useAiGatewayStore();
			await store.fetchConfig();

			const node = { type: 'n8n-nodes-browserbase.browserbase' } as unknown as INode;

			expect(store.isNodePropertyHidden(node, 'modelSource')).toBe(false);
		});

		it('should return false when the node is null', async () => {
			mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
			const store = useAiGatewayStore();
			await store.fetchConfig();

			expect(store.isNodePropertyHidden(null, 'modelSource')).toBe(false);
		});

		it('should fall back to the base node name for Tool-suffixed node types', async () => {
			mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
			const store = useAiGatewayStore();
			await store.fetchConfig();

			const toolNode = {
				type: 'n8n-nodes-browserbase.browserbaseTool',
				credentials: { browserbaseApi: { id: null, name: '', __aiGatewayManaged: true } },
			} as unknown as INode;

			expect(store.isNodePropertyHidden(toolNode, 'modelSource')).toBe(true);
		});
	});

	describe('isActionOptionVisible()', () => {
		const managedNode = (parameters: Record<string, unknown> = {}) =>
			({
				type: '@n8n/n8n-nodes-langchain.openAi',
				parameters,
				credentials: { openAiApi: { id: null, name: '', __aiGatewayManaged: true } },
			}) as unknown as INode;

		it('should return true for parameters other than resource/operation', async () => {
			mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
			const store = useAiGatewayStore();
			await store.fetchConfig();

			expect(store.isActionOptionVisible(managedNode(), 'model', 'anything')).toBe(true);
		});

		it('should return true when no credential is gateway-managed', async () => {
			mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
			const store = useAiGatewayStore();
			await store.fetchConfig();

			const node = {
				type: '@n8n/n8n-nodes-langchain.openAi',
				parameters: {},
				credentials: { openAiApi: { id: 'cred-1', name: 'My Key' } },
			} as unknown as INode;

			expect(store.isActionOptionVisible(node, 'resource', 'file')).toBe(true);
		});

		it('should return true when the node has no supportedActions entry', async () => {
			mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
			const store = useAiGatewayStore();
			await store.fetchConfig();

			const node = {
				type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
				parameters: {},
				credentials: { openAiApi: { id: null, name: '', __aiGatewayManaged: true } },
			} as unknown as INode;

			expect(store.isActionOptionVisible(node, 'resource', 'anything')).toBe(true);
		});

		describe('resource options', () => {
			it('should show a supported resource', async () => {
				mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
				const store = useAiGatewayStore();
				await store.fetchConfig();

				expect(store.isActionOptionVisible(managedNode(), 'resource', 'text')).toBe(true);
			});

			it('should hide an unsupported resource', async () => {
				mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
				const store = useAiGatewayStore();
				await store.fetchConfig();

				expect(store.isActionOptionVisible(managedNode(), 'resource', 'file')).toBe(false);
			});

			it('should keep all resources for operation-only nodes', async () => {
				mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
				const store = useAiGatewayStore();
				await store.fetchConfig();

				const node = {
					type: 'n8n-nodes-pdfco.PDFco Api',
					parameters: {},
					credentials: { pdfcoApi: { id: null, name: '', __aiGatewayManaged: true } },
				} as unknown as INode;

				expect(store.isActionOptionVisible(node, 'resource', 'anything')).toBe(true);
			});
		});

		describe('operation options', () => {
			it('should show a supported operation for the selected resource', async () => {
				mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
				const store = useAiGatewayStore();
				await store.fetchConfig();

				expect(
					store.isActionOptionVisible(managedNode({ resource: 'text' }), 'operation', 'message'),
				).toBe(true);
			});

			it('should hide an unsupported operation for the selected resource', async () => {
				mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
				const store = useAiGatewayStore();
				await store.fetchConfig();

				expect(
					store.isActionOptionVisible(managedNode({ resource: 'text' }), 'operation', 'unknownOp'),
				).toBe(false);
			});

			it('should hide operations when the selected resource is unsupported', async () => {
				mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
				const store = useAiGatewayStore();
				await store.fetchConfig();

				expect(
					store.isActionOptionVisible(managedNode({ resource: 'file' }), 'operation', 'upload'),
				).toBe(false);
			});

			it('should filter operations by the OPERATION_ONLY list for operation-only nodes', async () => {
				mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
				const store = useAiGatewayStore();
				await store.fetchConfig();

				const node = {
					type: 'n8n-nodes-pdfco.PDFco Api',
					parameters: {},
					credentials: { pdfcoApi: { id: null, name: '', __aiGatewayManaged: true } },
				} as unknown as INode;

				expect(store.isActionOptionVisible(node, 'operation', 'AI Invoice Parser')).toBe(true);
				expect(store.isActionOptionVisible(node, 'operation', 'Unknown Operation')).toBe(false);
			});
		});

		it('should fall back to the base node name for Tool-suffixed node types', async () => {
			mockGetGatewayConfig.mockResolvedValue(MOCK_CONFIG);
			const store = useAiGatewayStore();
			await store.fetchConfig();

			const toolNode = {
				type: '@n8n/n8n-nodes-langchain.openAiTool',
				parameters: { resource: 'text' },
				credentials: { openAiApi: { id: null, name: '', __aiGatewayManaged: true } },
			} as unknown as INode;

			expect(store.isActionOptionVisible(toolNode, 'resource', 'file')).toBe(false);
			expect(store.isActionOptionVisible(toolNode, 'operation', 'message')).toBe(true);
		});
	});

	describe('isNodeTypeVersionSupported()', () => {
		const CONFIG_WITH_VERSION_REQ = {
			...MOCK_CONFIG,
			nodes: [...MOCK_CONFIG.nodes, 'some-package.SomeNode'],
			credentialTypes: [...MOCK_CONFIG.credentialTypes, 'someApi'],
			minNodeTypeVersion: { 'some-package.SomeNode': 1.1 },
		};

		it('should return true when typeVersion meets the minimum', async () => {
			mockGetGatewayConfig.mockResolvedValue(CONFIG_WITH_VERSION_REQ);
			const store = useAiGatewayStore();
			await store.fetchConfig();

			expect(store.isNodeTypeVersionSupported('some-package.SomeNode', 1.1)).toBe(true);
		});

		it('should return true when typeVersion exceeds the minimum', async () => {
			mockGetGatewayConfig.mockResolvedValue(CONFIG_WITH_VERSION_REQ);
			const store = useAiGatewayStore();
			await store.fetchConfig();

			expect(store.isNodeTypeVersionSupported('some-package.SomeNode', 2)).toBe(true);
		});

		it('should return false when typeVersion is below the minimum', async () => {
			mockGetGatewayConfig.mockResolvedValue(CONFIG_WITH_VERSION_REQ);
			const store = useAiGatewayStore();
			await store.fetchConfig();

			expect(store.isNodeTypeVersionSupported('some-package.SomeNode', 1.0)).toBe(false);
		});

		it('should return true when no minNodeTypeVersion entry exists for the node (no version gate)', async () => {
			mockGetGatewayConfig.mockResolvedValue(CONFIG_WITH_VERSION_REQ);
			const store = useAiGatewayStore();
			await store.fetchConfig();

			expect(
				store.isNodeTypeVersionSupported('@n8n/n8n-nodes-langchain.lmChatGoogleGemini', 1),
			).toBe(true);
		});

		it('should return true for a node with no version requirement (even if unknown)', async () => {
			mockGetGatewayConfig.mockResolvedValue(CONFIG_WITH_VERSION_REQ);
			const store = useAiGatewayStore();
			await store.fetchConfig();

			// No minNodeTypeVersion entry = no version gate; node support is a separate concern
			expect(store.isNodeTypeVersionSupported('unknown-package.UnknownNode', 2)).toBe(true);
		});

		it('should return true when config has not been loaded (no version gate defined)', () => {
			const store = useAiGatewayStore();

			// config not loaded → no minNodeTypeVersion entry → no version gate → pass through
			// node support when config is unloaded is handled by isCredentialTypeSupported / isNodeSupported
			expect(store.isNodeTypeVersionSupported('some-package.SomeNode', 1.1)).toBe(true);
		});

		it('should fall back to the base node name for Tool-suffixed node types', async () => {
			mockGetGatewayConfig.mockResolvedValue(CONFIG_WITH_VERSION_REQ);
			const store = useAiGatewayStore();
			await store.fetchConfig();

			// "SomeNodeTool" has no entry, but the base "SomeNode" requires >= 1.1.
			expect(store.isNodeTypeVersionSupported('some-package.SomeNodeTool', 1.1)).toBe(true);
			expect(store.isNodeTypeVersionSupported('some-package.SomeNodeTool', 1.0)).toBe(false);
		});
	});
});
