import { setActivePinia, createPinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InstanceAiMcpConnectionResponse, McpRegistryServerResponse } from '@n8n/api-types';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn().mockReturnValue({
		restApiContext: { baseUrl: 'http://localhost:5678/rest' },
	}),
}));

const mockShowError = vi.fn();
vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn().mockReturnValue({
		showError: (...args: unknown[]) => mockShowError(...args),
		showMessage: vi.fn(),
	}),
}));

vi.mock('@n8n/i18n', () => ({
	i18n: { baseText: (key: string) => key },
}));

const mockFetchMcpRegistryServers = vi.fn();
const mockFetchMcpConnections = vi.fn();
const mockCreateMcpConnection = vi.fn();
const mockUpdateMcpConnection = vi.fn();
const mockDeleteMcpConnection = vi.fn();
const mockFetchMcpConnectionTools = vi.fn();

vi.mock('../instanceAi.mcp.api', () => ({
	fetchMcpRegistryServers: (...args: unknown[]) => mockFetchMcpRegistryServers(...args),
	fetchMcpConnections: (...args: unknown[]) => mockFetchMcpConnections(...args),
	fetchMcpConnectionTools: (...args: unknown[]) => mockFetchMcpConnectionTools(...args),
	createMcpConnection: (...args: unknown[]) => mockCreateMcpConnection(...args),
	updateMcpConnection: (...args: unknown[]) => mockUpdateMcpConnection(...args),
	deleteMcpConnection: (...args: unknown[]) => mockDeleteMcpConnection(...args),
}));

import { useInstanceAiMcpStore } from '../instanceAiMcp.store';

const makeConnection = (
	overrides: Partial<InstanceAiMcpConnectionResponse> = {},
): InstanceAiMcpConnectionResponse => ({
	id: overrides.id ?? 'conn-1',
	serverSlug: overrides.serverSlug ?? 'linear',
	serverTitle: overrides.serverTitle ?? 'Linear',
	serverIcons: overrides.serverIcons ?? [],
	credentialId: overrides.credentialId ?? 'cred-1',
	credentialName: overrides.credentialName ?? 'Linear OAuth2',
	credentialType: overrides.credentialType ?? 'mcpOAuth2Api',
	toolFilter: overrides.toolFilter ?? null,
	createdAt: '2026-05-01T00:00:00.000Z',
	updatedAt: '2026-05-01T00:00:00.000Z',
});

const makeServer = (slug: string): McpRegistryServerResponse => ({
	slug,
	name: `com.test/${slug}`,
	title: slug,
	description: `${slug} description`,
	tagline: `${slug} tagline`,
	version: '1.0.0',
	updatedAt: '2026-05-01T00:00:00.000Z',
	icons: [],
	credentialType: `${slug}McpOAuth2Api`,
	tools: [],
	isOfficial: true,
	status: 'active',
});

function createDeferred<T>() {
	let resolve!: (value: T | PromiseLike<T>) => void;
	const promise = new Promise<T>((promiseResolve) => {
		resolve = promiseResolve;
	});
	return { promise, resolve };
}

describe('useInstanceAiMcpStore', () => {
	let store: ReturnType<typeof useInstanceAiMcpStore>;

	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createPinia());
		store = useInstanceAiMcpStore();
	});

	describe('fetchConnections', () => {
		it('loads connections into state', async () => {
			mockFetchMcpConnections.mockResolvedValue([makeConnection()]);

			await store.fetchConnections();

			expect(store.connections).toHaveLength(1);
			expect(store.connections[0].id).toBe('conn-1');
		});

		it('surfaces errors via toast', async () => {
			const error = new Error('boom');
			mockFetchMcpConnections.mockRejectedValue(error);

			await store.fetchConnections();

			expect(mockShowError).toHaveBeenCalledWith(error, 'instanceAi.mcp.error.fetchConnections');
			expect(store.connections).toEqual([]);
		});
	});

	describe('fetchCatalogLazy', () => {
		it('fetches the catalog only once', async () => {
			mockFetchMcpRegistryServers.mockResolvedValue([makeServer('linear')]);

			await store.fetchCatalogLazy();
			await store.fetchCatalogLazy();

			expect(mockFetchMcpRegistryServers).toHaveBeenCalledTimes(1);
			expect(store.catalog).toHaveLength(1);
		});
	});

	describe('fetchConnectionToolsLazy', () => {
		it('refreshes tools after credential changes and ignores the stale response', async () => {
			const staleTools = [{ name: 'old_tool' }];
			const freshTools = [{ name: 'fresh_tool' }];
			const staleToolsRequest = createDeferred<typeof staleTools>();
			const freshToolsRequest = createDeferred<typeof freshTools>();
			mockFetchMcpConnectionTools
				.mockReturnValueOnce(staleToolsRequest.promise)
				.mockReturnValueOnce(freshToolsRequest.promise);
			mockUpdateMcpConnection.mockResolvedValue(
				makeConnection({ id: 'conn-1', credentialId: 'cred-2' }),
			);

			const staleFetch = store.fetchConnectionToolsLazy('conn-1');
			expect(mockFetchMcpConnectionTools).toHaveBeenCalledTimes(1);

			await store.updateConnection('conn-1', { credentialId: 'cred-2' });
			expect(mockFetchMcpConnectionTools).toHaveBeenCalledTimes(2);

			staleToolsRequest.resolve(staleTools);
			await staleFetch;
			expect(store.connectionToolsById.get('conn-1')).toBeUndefined();

			freshToolsRequest.resolve(freshTools);
			await vi.waitFor(() => {
				expect(store.connectionToolsById.get('conn-1')).toEqual(freshTools);
			});
		});
	});

	describe('connect', () => {
		it('appends the new connection on success', async () => {
			const created = makeConnection({ id: 'conn-new' });
			mockCreateMcpConnection.mockResolvedValue(created);

			const result = await store.connect({ serverSlug: 'linear', credentialId: 'cred-1' });

			expect(result).toEqual(created);
			expect(store.connections).toContainEqual(created);
		});

		it('returns null and reports an error on failure', async () => {
			const error = new Error('conflict');
			mockCreateMcpConnection.mockRejectedValue(error);

			const result = await store.connect({ serverSlug: 'linear', credentialId: 'cred-1' });

			expect(result).toBeNull();
			expect(mockShowError).toHaveBeenCalledWith(error, 'instanceAi.mcp.error.connect');
		});
	});

	describe('updateConnection', () => {
		it('replaces the connection in state', async () => {
			const existing = makeConnection({ id: 'conn-1' });
			const updated = makeConnection({ id: 'conn-1', credentialName: 'Renamed' });
			mockFetchMcpConnections.mockResolvedValue([existing]);
			await store.fetchConnections();
			mockUpdateMcpConnection.mockResolvedValue(updated);

			const result = await store.updateConnection('conn-1', { inclusionMode: 'except' });

			expect(result).toEqual(updated);
			expect(store.connections[0].credentialName).toBe('Renamed');
		});
	});

	describe('disconnect', () => {
		it('removes the connection from state', async () => {
			const existing = makeConnection({ id: 'conn-1' });
			mockFetchMcpConnections.mockResolvedValue([existing]);
			await store.fetchConnections();
			mockDeleteMcpConnection.mockResolvedValue(undefined);

			const ok = await store.disconnect('conn-1');

			expect(ok).toBe(true);
			expect(store.connections).toEqual([]);
		});
	});

	describe('connectionsByServerSlug', () => {
		it('groups connections by server slug', async () => {
			mockFetchMcpConnections.mockResolvedValue([
				makeConnection({ id: 'c1', serverSlug: 'linear', credentialId: 'cred-1' }),
				makeConnection({ id: 'c2', serverSlug: 'linear', credentialId: 'cred-2' }),
				makeConnection({ id: 'c3', serverSlug: 'notion', credentialId: 'cred-3' }),
			]);

			await store.fetchConnections();

			expect(store.connectionsByServerSlug.get('linear')).toHaveLength(2);
			expect(store.connectionsByServerSlug.get('notion')).toHaveLength(1);
		});
	});
});
