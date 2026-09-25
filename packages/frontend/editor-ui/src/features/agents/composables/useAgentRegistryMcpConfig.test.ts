import { computed, effectScope } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { McpRegistryDiscoveryResponse, McpRegistryServerResponse } from '@n8n/api-types';
import type { McpToolSettings } from '@/features/shared/toolsConnection/types';

import {
	type AgentRegistryMcpModalData,
	useAgentRegistryMcpConfig,
} from './useAgentRegistryMcpConfig';
import { useAgentMcpDiscovery } from './useAgentMcpDiscovery';

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
});
