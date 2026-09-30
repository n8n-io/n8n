import { computed, effectScope } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { McpRegistryDiscoveryResponse, McpRegistryServerResponse } from '@n8n/api-types';
import type { McpToolSettings } from '@/features/shared/toolsConnection/types';
import { useUIStore } from '@/app/stores/ui.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';

import {
	type AgentRegistryMcpModalData,
	useAgentRegistryMcpConfig,
} from './useAgentRegistryMcpConfig';
import { useAgentMcpDiscovery } from './useAgentMcpDiscovery';

const credentialChangeListeners = vi.hoisted(() => ({
	onDeleted: undefined as ((credentialId: string) => void) | undefined,
}));

vi.mock('@/features/credentials/credentials.store', async (importOriginal) => {
	const original =
		await importOriginal<typeof import('@/features/credentials/credentials.store')>();
	return {
		...original,
		listenForCredentialChanges: ({
			onCredentialDeleted,
		}: {
			onCredentialDeleted?: (credentialId: string) => void;
		}) => {
			credentialChangeListeners.onDeleted = onCredentialDeleted;
		},
	};
});
vi.mock('./useAgentMcpDiscovery');

const discoverRegistry = vi.fn();

const catalogServer: McpRegistryServerResponse = {
	slug: 'github',
	nodeTypeName: '@n8n/mcp-registry.github',
	name: 'io.github',
	title: 'GitHub',
	description: 'Manage GitHub repositories',
	tagline: 'GitHub tools',
	version: '1.0.0',
	updatedAt: '2026-09-25T00:00:00.000Z',
	icons: [],
	credentials: [
		{
			credentialType: 'githubMcpOAuth2Api',
			name: 'GitHub OAuth2',
			value: 'githubMcpOAuth2Api',
		},
	],
	tools: [{ name: 'list_repositories' }],
	isTemplated: false,
	isOfficial: true,
	status: 'active',
};

const discovery: McpRegistryDiscoveryResponse = {
	status: 'connected',
	connection: {
		url: 'https://mcp.example.com',
		transport: 'streamableHttp',
		authentication: 'githubMcpOAuth2Api',
		credentialId: 'credential-1',
		metadata: { nodeTypeName: '@n8n/mcp-registry.github' },
	},
	tools: [{ name: 'list_repositories', category: 'read' }],
};

describe('useAgentRegistryMcpConfig', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		credentialChangeListeners.onDeleted = undefined;
		createTestingPinia({ stubActions: false });
		vi.mocked(useAgentMcpDiscovery).mockReturnValue({
			createCredentialAdapter: vi.fn().mockReturnValue({}),
			discoverRegistry: discoverRegistry.mockResolvedValue(discovery),
			fetchCatalog: vi.fn().mockResolvedValue([catalogServer]),
			preloadCredentials: vi.fn().mockResolvedValue(undefined),
		});
	});

	it('persists the timeout when it saves a discovered server', async () => {
		const onConfirm = vi.fn();
		const modalData: AgentRegistryMcpModalData = {
			kind: 'registryMcpServer',
			projectId: 'project-1',
			mcpServer: {
				name: 'github',
				authentication: 'githubMcpOAuth2Api',
				credential: 'credential-1',
				metadata: { nodeTypeName: '@n8n/mcp-registry.github' },
				connectionTimeoutMs: 45_000,
			},
			onConfirm,
		};
		const scope = effectScope();
		const config = scope.run(() =>
			useAgentRegistryMcpConfig(
				computed(() => modalData),
				vi.fn(),
			),
		);
		if (!config) throw new Error('Failed to create registry MCP config');
		await flushPromises();
		const permissions: McpToolSettings = {
			categories: { read: 'always_allow', write: 'require_approval' },
		};

		expect(config.save({ ...permissions, connectionTimeoutMs: 90_000 })).toBe(true);
		expect(onConfirm).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'github',
				connectionTimeoutMs: 90_000,
				toolPermissions: permissions,
			}),
		);

		scope.stop();
	});

	it('removes approval requirements when the host cannot suspend tool calls', async () => {
		const onConfirm = vi.fn();
		const modalData: AgentRegistryMcpModalData = {
			kind: 'registryMcpServer',
			projectId: 'project-1',
			supportsToolApproval: false,
			mcpServer: {
				name: 'github',
				authentication: 'githubMcpOAuth2Api',
				credential: 'credential-1',
				metadata: { nodeTypeName: '@n8n/mcp-registry.github' },
			},
			onConfirm,
		};
		const scope = effectScope();
		const config = scope.run(() =>
			useAgentRegistryMcpConfig(
				computed(() => modalData),
				vi.fn(),
			),
		);
		if (!config) throw new Error('Failed to create registry MCP config');
		await flushPromises();

		expect(
			config.save({
				categories: { read: 'require_approval', write: 'blocked' },
				tools: {
					list_repositories: 'require_approval',
					delete_repository: 'blocked',
				},
				connectionTimeoutMs: 60_000,
			}),
		).toBe(true);
		expect(onConfirm).toHaveBeenCalledWith(
			expect.objectContaining({
				toolPermissions: {
					categories: { read: 'always_allow', write: 'blocked' },
					tools: {
						list_repositories: 'always_allow',
						delete_repository: 'blocked',
					},
				},
			}),
		);
		scope.stop();
	});

	it.each([undefined, 0, 999, 1.5, 120_001])(
		'rejects invalid connection timeout %s at the save boundary',
		async (connectionTimeoutMs) => {
			const onConfirm = vi.fn();
			const modalData: AgentRegistryMcpModalData = {
				kind: 'registryMcpServer',
				projectId: 'project-1',
				mcpServer: {
					name: 'github',
					authentication: 'githubMcpOAuth2Api',
					credential: 'credential-1',
					metadata: { nodeTypeName: '@n8n/mcp-registry.github' },
				},
				onConfirm,
			};
			const scope = effectScope();
			const config = scope.run(() =>
				useAgentRegistryMcpConfig(
					computed(() => modalData),
					vi.fn(),
				),
			);
			if (!config) throw new Error('Failed to create registry MCP config');
			await flushPromises();

			expect(
				config.save({
					categories: { read: 'always_allow', write: 'always_allow' },
					connectionTimeoutMs,
				}),
			).toBe(false);
			expect(onConfirm).not.toHaveBeenCalled();
			scope.stop();
		},
	);

	it('reports authentication failure without a selected credential', async () => {
		const modalData: AgentRegistryMcpModalData = {
			kind: 'registryMcpServer',
			projectId: 'project-1',
			mcpServer: {
				name: 'github',
				authentication: 'githubMcpOAuth2Api',
				metadata: { nodeTypeName: '@n8n/mcp-registry.github' },
			},
			onConfirm: vi.fn(),
		};
		const scope = effectScope();
		const config = scope.run(() =>
			useAgentRegistryMcpConfig(
				computed(() => modalData),
				vi.fn(),
			),
		);
		if (!config) throw new Error('Failed to create registry MCP config');
		await flushPromises();

		expect(config.item.value).toMatchObject({
			status: 'disconnected',
			connectionFailureReason: 'authentication',
		});
		expect(discoverRegistry).not.toHaveBeenCalled();
		scope.stop();
	});

	it('does not save a duplicate connection name', async () => {
		const onConfirm = vi.fn();
		const modalData: AgentRegistryMcpModalData = {
			kind: 'registryMcpServer',
			projectId: 'project-1',
			existingToolNames: ['github'],
			mcpServer: {
				name: 'github',
				authentication: 'githubMcpOAuth2Api',
				credential: 'credential-1',
				metadata: { nodeTypeName: '@n8n/mcp-registry.github' },
			},
			onConfirm,
		};
		const scope = effectScope();
		const config = scope.run(() =>
			useAgentRegistryMcpConfig(
				computed(() => modalData),
				vi.fn(),
			),
		);
		if (!config) throw new Error('Failed to create registry MCP config');
		await flushPromises();

		expect(
			config.save({
				categories: { read: 'always_allow', write: 'require_approval' },
				connectionTimeoutMs: 60_000,
			}),
		).toBe(false);
		expect(onConfirm).not.toHaveBeenCalled();
		scope.stop();
	});

	it('keeps the newest credential discovery when requests finish out of order', async () => {
		const first = Promise.withResolvers<McpRegistryDiscoveryResponse>();
		const second = Promise.withResolvers<McpRegistryDiscoveryResponse>();
		discoverRegistry
			.mockImplementationOnce(async () => await first.promise)
			.mockImplementationOnce(async () => await second.promise);
		const modalData: AgentRegistryMcpModalData = {
			kind: 'registryMcpServer',
			projectId: 'project-1',
			mcpServer: {
				name: 'github',
				authentication: 'githubMcpOAuth2Api',
				credential: 'credential-1',
				metadata: { nodeTypeName: '@n8n/mcp-registry.github' },
			},
			onConfirm: vi.fn(),
		};
		const scope = effectScope();
		const config = scope.run(() =>
			useAgentRegistryMcpConfig(
				computed(() => modalData),
				vi.fn(),
			),
		);
		if (!config) throw new Error('Failed to create registry MCP config');
		await flushPromises();

		const selecting = config.selectCredential('githubMcpOAuth2Api', 'credential-2');
		second.resolve({
			...discovery,
			connection: { ...discovery.connection, credentialId: 'credential-2' },
			tools: [{ name: 'new_tool', category: 'write' }],
		});
		await selecting;
		first.resolve(discovery);
		await flushPromises();

		expect(config.item.value?.availableTools).toEqual([
			{ id: 'new_tool', name: 'new_tool', category: 'write' },
		]);
		scope.stop();
	});

	it('maps a failed discovery request to an unknown disconnected state', async () => {
		discoverRegistry.mockRejectedValueOnce(new Error('Network failed'));
		const modalData: AgentRegistryMcpModalData = {
			kind: 'registryMcpServer',
			projectId: 'project-1',
			mcpServer: {
				name: 'github',
				authentication: 'githubMcpOAuth2Api',
				credential: 'credential-1',
				metadata: { nodeTypeName: '@n8n/mcp-registry.github' },
			},
			onConfirm: vi.fn(),
		};
		const scope = effectScope();
		const config = scope.run(() =>
			useAgentRegistryMcpConfig(
				computed(() => modalData),
				vi.fn(),
			),
		);
		if (!config) throw new Error('Failed to create registry MCP config');
		await flushPromises();

		expect(config.item.value).toMatchObject({
			status: 'disconnected',
			connectionFailureReason: 'unknown',
			availableTools: [],
		});
		expect(config.canSave.value).toBe(false);
		scope.stop();
	});

	it('rediscovers after the credential modal closes', async () => {
		const modalData: AgentRegistryMcpModalData = {
			kind: 'registryMcpServer',
			projectId: 'project-1',
			mcpServer: {
				name: 'github',
				authentication: 'githubMcpOAuth2Api',
				credential: 'credential-1',
				metadata: { nodeTypeName: '@n8n/mcp-registry.github' },
			},
			onConfirm: vi.fn(),
		};
		const scope = effectScope();
		const config = scope.run(() =>
			useAgentRegistryMcpConfig(
				computed(() => modalData),
				vi.fn(),
			),
		);
		if (!config) throw new Error('Failed to create registry MCP config');
		await flushPromises();
		discoverRegistry.mockClear();

		const uiStore = useUIStore();
		uiStore.openModal(CREDENTIAL_EDIT_MODAL_KEY);
		uiStore.closeModal(CREDENTIAL_EDIT_MODAL_KEY);
		await flushPromises();

		expect(discoverRegistry).toHaveBeenCalledOnce();
		expect(discoverRegistry).toHaveBeenCalledWith('github', 'credential-1');
		scope.stop();
	});

	it('reverts to the persisted credential when an unsaved draft credential is deleted', async () => {
		const onRemove = vi.fn();
		const onCredentialDeleted = vi.fn();
		const modalData: AgentRegistryMcpModalData = {
			kind: 'registryMcpServer',
			projectId: 'project-1',
			mcpServer: {
				name: 'github',
				authentication: 'githubMcpOAuth2Api',
				credential: 'credential-1',
				metadata: { nodeTypeName: '@n8n/mcp-registry.github' },
			},
			onConfirm: vi.fn(),
			onRemove,
		};
		const scope = effectScope();
		const config = scope.run(() =>
			useAgentRegistryMcpConfig(
				computed(() => modalData),
				onCredentialDeleted,
			),
		);
		if (!config) throw new Error('Failed to create registry MCP config');
		await flushPromises();

		await config.selectCredential('githubMcpOAuth2Api', 'credential-2');
		discoverRegistry.mockClear();
		credentialChangeListeners.onDeleted?.('credential-2');
		await flushPromises();

		expect(discoverRegistry).toHaveBeenCalledWith('github', 'credential-1');
		expect(onRemove).not.toHaveBeenCalled();
		expect(onCredentialDeleted).not.toHaveBeenCalled();
		scope.stop();
	});

	it('ignores deletion of the persisted credential when another draft credential is selected', async () => {
		const onRemove = vi.fn();
		const onCredentialDeleted = vi.fn();
		const modalData: AgentRegistryMcpModalData = {
			kind: 'registryMcpServer',
			projectId: 'project-1',
			mcpServer: {
				name: 'github',
				authentication: 'githubMcpOAuth2Api',
				credential: 'credential-1',
				metadata: { nodeTypeName: '@n8n/mcp-registry.github' },
			},
			onConfirm: vi.fn(),
			onRemove,
		};
		const scope = effectScope();
		const config = scope.run(() =>
			useAgentRegistryMcpConfig(
				computed(() => modalData),
				onCredentialDeleted,
			),
		);
		if (!config) throw new Error('Failed to create registry MCP config');
		await flushPromises();

		await config.selectCredential('githubMcpOAuth2Api', 'credential-2');
		credentialChangeListeners.onDeleted?.('credential-1');

		expect(onRemove).not.toHaveBeenCalled();
		expect(onCredentialDeleted).not.toHaveBeenCalled();
		scope.stop();
	});

	it('removes the connection when its selected persisted credential is deleted', async () => {
		const onRemove = vi.fn();
		const onCredentialDeleted = vi.fn();
		const modalData: AgentRegistryMcpModalData = {
			kind: 'registryMcpServer',
			projectId: 'project-1',
			mcpServer: {
				name: 'github',
				authentication: 'githubMcpOAuth2Api',
				credential: 'credential-1',
				metadata: { nodeTypeName: '@n8n/mcp-registry.github' },
			},
			onConfirm: vi.fn(),
			onRemove,
		};
		const scope = effectScope();
		const config = scope.run(() =>
			useAgentRegistryMcpConfig(
				computed(() => modalData),
				onCredentialDeleted,
			),
		);
		if (!config) throw new Error('Failed to create registry MCP config');
		await flushPromises();

		credentialChangeListeners.onDeleted?.('credential-1');

		expect(onRemove).toHaveBeenCalledOnce();
		expect(onCredentialDeleted).toHaveBeenCalledOnce();
		scope.stop();
	});

	it('removes a new connection when its draft credential is deleted', async () => {
		const onRemove = vi.fn();
		const onCredentialDeleted = vi.fn();
		const modalData: AgentRegistryMcpModalData = {
			kind: 'registryMcpServer',
			projectId: 'project-1',
			isNew: true,
			mcpServer: {
				name: 'github',
				authentication: 'githubMcpOAuth2Api',
				credential: 'credential-1',
				metadata: { nodeTypeName: '@n8n/mcp-registry.github' },
			},
			onConfirm: vi.fn(),
			onRemove,
		};
		const scope = effectScope();
		const config = scope.run(() =>
			useAgentRegistryMcpConfig(
				computed(() => modalData),
				onCredentialDeleted,
			),
		);
		if (!config) throw new Error('Failed to create registry MCP config');
		await flushPromises();

		credentialChangeListeners.onDeleted?.('credential-1');

		expect(onRemove).toHaveBeenCalledOnce();
		expect(onCredentialDeleted).toHaveBeenCalledOnce();
		scope.stop();
	});
});
