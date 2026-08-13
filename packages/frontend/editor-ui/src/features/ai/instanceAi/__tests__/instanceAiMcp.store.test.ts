import { setActivePinia, createPinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
	InstanceAiMcpConnectionResponse,
	InstanceAiMcpConnectionToolsResponse,
	McpRegistryServerResponse,
} from '@n8n/api-types';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn().mockReturnValue({
		restApiContext: { baseUrl: 'http://localhost:5678/rest' },
	}),
}));

const mockShowError = vi.fn();
const mockShowMessage = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: vi.fn().mockReturnValue({
		showError: (...args: unknown[]) => mockShowError(...args),
		showMessage: (...args: unknown[]) => mockShowMessage(...args),
	}),
}));

const deletionListeners = new Set<(credentialId: string) => void>();
vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({}),
	listenForCredentialChanges: ({
		onCredentialDeleted,
	}: {
		onCredentialDeleted: (credentialId: string) => void;
	}) => {
		deletionListeners.add(onCredentialDeleted);
		return () => deletionListeners.delete(onCredentialDeleted);
	},
}));

function emitCredentialDeleted(id: string): void {
	for (const listener of deletionListeners) listener(id);
}

vi.mock('@n8n/i18n', () => ({
	i18n: { baseText: (key: string) => key },
}));

const mockFetchMcpRegistryServers = vi.fn();
const mockFetchMcpConnections = vi.fn();
const mockCreateMcpConnection = vi.fn();
const mockUpdateMcpConnection = vi.fn();
const mockDeleteMcpConnection = vi.fn();
const mockFetchAllMcpConnectionTools = vi.fn();
const mockFetchMcpConnectionTools = vi.fn();

vi.mock('../instanceAi.mcp.api', () => ({
	fetchMcpRegistryServers: (...args: unknown[]) => mockFetchMcpRegistryServers(...args),
	fetchMcpConnections: (...args: unknown[]) => mockFetchMcpConnections(...args),
	fetchAllMcpConnectionTools: (...args: unknown[]) => mockFetchAllMcpConnectionTools(...args),
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
		mockFetchMcpRegistryServers.mockReset();
		mockFetchMcpConnections.mockReset();
		mockFetchAllMcpConnectionTools.mockReset();
		mockFetchAllMcpConnectionTools.mockResolvedValue([]);
		mockFetchMcpConnectionTools.mockReset();
		mockFetchMcpConnectionTools.mockResolvedValue({
			id: 'conn-1',
			status: 'connected',
			tools: [],
		} satisfies InstanceAiMcpConnectionToolsResponse);
		mockCreateMcpConnection.mockReset();
		mockUpdateMcpConnection.mockReset();
		mockDeleteMcpConnection.mockReset();
		deletionListeners.clear();
		setActivePinia(createPinia());
		store = useInstanceAiMcpStore();
	});

	describe('fetchConnections', () => {
		it('marks connections as connecting until bulk tool loading completes', async () => {
			const bulkRequest = createDeferred<InstanceAiMcpConnectionToolsResponse[]>();
			mockFetchMcpConnections.mockResolvedValue([makeConnection()]);
			mockFetchAllMcpConnectionTools.mockReturnValue(bulkRequest.promise);

			await store.fetchConnections();

			expect(store.connections[0]).toMatchObject({ id: 'conn-1', status: 'connecting' });

			bulkRequest.resolve([{ id: 'conn-1', status: 'connected', tools: [] }]);
			await vi.waitFor(() => expect(store.connections[0].status).toBe('connected'));
		});

		it('applies bulk statuses and caches tools for connected servers', async () => {
			mockFetchMcpConnections.mockResolvedValue([
				makeConnection({ id: 'conn-1' }),
				makeConnection({ id: 'conn-2', serverSlug: 'notion' }),
			]);
			mockFetchAllMcpConnectionTools.mockResolvedValue([
				{ id: 'conn-1', status: 'connected', tools: [{ name: 'search' }] },
				{ id: 'conn-2', status: 'disconnected', tools: [], failureReason: 'unknown' },
			] satisfies InstanceAiMcpConnectionToolsResponse[]);

			await store.fetchConnections();

			await vi.waitFor(() => {
				expect(store.connections.map(({ id, status }) => ({ id, status }))).toEqual([
					{ id: 'conn-1', status: 'connected' },
					{ id: 'conn-2', status: 'disconnected' },
				]);
			});
			expect(store.connectionToolsById.get('conn-1')).toEqual([{ name: 'search' }]);
			expect(store.connectionToolsById.has('conn-2')).toBe(false);
			expect(mockShowMessage).not.toHaveBeenCalled();
		});

		it('reports bulk tool check errors', async () => {
			const error = new Error('boom');
			mockFetchMcpConnections.mockResolvedValue([makeConnection()]);
			mockFetchAllMcpConnectionTools.mockRejectedValue(error);

			await store.fetchConnections();

			await vi.waitFor(() => {
				expect(mockShowError).toHaveBeenCalledWith(error, 'instanceAi.mcp.error.checkConnections');
			});
			expect(store.connections[0].status).toBe('disconnected');
		});

		it('surfaces errors via toast', async () => {
			const error = new Error('boom');
			mockFetchMcpConnections.mockRejectedValue(error);

			await store.fetchConnections();

			expect(mockShowError).toHaveBeenCalledWith(error, 'instanceAi.mcp.error.fetchConnections');
			expect(store.connections).toEqual([]);
		});

		it('sends one request for callers that mount together', async () => {
			mockFetchMcpConnections.mockResolvedValue([makeConnection()]);

			await Promise.all([store.fetchConnections(), store.fetchConnections()]);

			expect(mockFetchMcpConnections).toHaveBeenCalledTimes(1);
			expect(mockFetchAllMcpConnectionTools).toHaveBeenCalledTimes(1);
			expect(store.connections).toHaveLength(1);
		});

		it('refetches once the in-flight request has settled', async () => {
			mockFetchMcpConnections.mockResolvedValue([makeConnection()]);

			await store.fetchConnections();
			await store.fetchConnections();

			expect(mockFetchMcpConnections).toHaveBeenCalledTimes(2);
		});

		it('ignores an older bulk result after connections are refetched', async () => {
			const staleBulkRequest = createDeferred<InstanceAiMcpConnectionToolsResponse[]>();
			const currentBulkRequest = createDeferred<InstanceAiMcpConnectionToolsResponse[]>();
			mockFetchMcpConnections.mockResolvedValue([makeConnection()]);
			mockFetchAllMcpConnectionTools
				.mockReturnValueOnce(staleBulkRequest.promise)
				.mockReturnValueOnce(currentBulkRequest.promise);

			await store.fetchConnections();
			await store.fetchConnections();

			staleBulkRequest.resolve([
				{ id: 'conn-1', status: 'connected', tools: [{ name: 'stale_tool' }] },
			]);
			currentBulkRequest.resolve([
				{ id: 'conn-1', status: 'disconnected', tools: [], failureReason: 'server_unavailable' },
			]);

			await vi.waitFor(() => expect(store.connections[0].status).toBe('disconnected'));
			expect(store.connectionToolsById.has('conn-1')).toBe(false);
		});

		it('loads only once through the lazy entry point', async () => {
			mockFetchMcpConnections.mockResolvedValue([makeConnection()]);

			await store.fetchConnectionsLazy();
			await store.fetchConnectionsLazy();

			expect(mockFetchMcpConnections).toHaveBeenCalledTimes(1);
			expect(mockFetchAllMcpConnectionTools).toHaveBeenCalledTimes(1);
		});

		it('leaves a failed fetch for the next caller to retry', async () => {
			mockFetchMcpConnections.mockRejectedValueOnce(new Error('boom'));
			mockFetchMcpConnections.mockResolvedValue([makeConnection()]);

			await store.fetchConnectionsLazy();
			await store.fetchConnectionsLazy();

			expect(mockFetchMcpConnections).toHaveBeenCalledTimes(2);
			expect(store.connections).toHaveLength(1);
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

		it('fetches once for concurrent callers', async () => {
			mockFetchMcpRegistryServers.mockResolvedValue([makeServer('linear')]);

			await Promise.all([store.fetchCatalogLazy(), store.fetchCatalogLazy()]);

			expect(mockFetchMcpRegistryServers).toHaveBeenCalledTimes(1);
		});

		it('leaves a failed fetch for the next caller to retry', async () => {
			mockFetchMcpRegistryServers.mockRejectedValueOnce(new Error('boom'));
			mockFetchMcpRegistryServers.mockResolvedValue([makeServer('linear')]);

			await store.fetchCatalogLazy();
			await store.fetchCatalogLazy();

			expect(mockFetchMcpRegistryServers).toHaveBeenCalledTimes(2);
			expect(store.catalog).toHaveLength(1);
		});
	});

	describe('fetchConnectionToolsLazy', () => {
		it.each([
			['server_unavailable', 'instanceAi.mcp.error.connection.serverUnavailable'],
			['authentication', 'instanceAi.mcp.error.connection.authentication'],
			['unknown', 'instanceAi.mcp.error.connection.unknown'],
		] as const)('shows the connection error for %s failures', async (failureReason, message) => {
			mockFetchMcpConnections.mockResolvedValue([makeConnection()]);
			mockFetchAllMcpConnectionTools.mockResolvedValue([
				{ id: 'conn-1', status: 'disconnected', tools: [], failureReason: 'unknown' },
			]);
			await store.fetchConnections();
			await vi.waitFor(() => expect(store.connections[0].status).toBe('disconnected'));
			mockFetchMcpConnectionTools.mockResolvedValue({
				id: 'conn-1',
				status: 'disconnected',
				tools: [],
				failureReason,
			});

			await store.fetchConnectionToolsLazy('conn-1');

			expect(mockShowMessage).toHaveBeenCalledWith({
				type: 'error',
				title: 'instanceAi.mcp.error.connection.title',
				message,
			});
		});

		it('shows the unknown connection error when the request fails', async () => {
			mockFetchMcpConnections.mockResolvedValue([makeConnection()]);
			mockFetchAllMcpConnectionTools.mockResolvedValue([
				{ id: 'conn-1', status: 'disconnected', tools: [], failureReason: 'unknown' },
			]);
			await store.fetchConnections();
			await vi.waitFor(() => expect(store.connections[0].status).toBe('disconnected'));
			mockFetchMcpConnectionTools.mockRejectedValue(new Error('boom'));

			await store.fetchConnectionToolsLazy('conn-1');

			expect(mockShowMessage).toHaveBeenCalledWith({
				type: 'error',
				title: 'instanceAi.mcp.error.connection.title',
				message: 'instanceAi.mcp.error.connection.unknown',
			});
		});

		it('retries a disconnected connection and caches its tools', async () => {
			mockFetchMcpConnections.mockResolvedValue([makeConnection()]);
			mockFetchAllMcpConnectionTools.mockResolvedValue([
				{ id: 'conn-1', status: 'disconnected', tools: [], failureReason: 'unknown' },
			]);
			await store.fetchConnections();
			await vi.waitFor(() => expect(store.connections[0].status).toBe('disconnected'));

			const toolsRequest = createDeferred<InstanceAiMcpConnectionToolsResponse>();
			mockFetchMcpConnectionTools.mockReturnValue(toolsRequest.promise);
			const retry = store.fetchConnectionToolsLazy('conn-1');

			expect(store.connections[0].status).toBe('connecting');
			toolsRequest.resolve({
				id: 'conn-1',
				status: 'connected',
				tools: [{ name: 'search' }],
			});
			await retry;

			expect(store.connections[0].status).toBe('connected');
			expect(store.connectionToolsById.get('conn-1')).toEqual([{ name: 'search' }]);
		});

		it('refreshes tools after credential changes and ignores the stale response', async () => {
			mockFetchMcpConnections.mockResolvedValue([makeConnection()]);
			mockFetchAllMcpConnectionTools.mockResolvedValue([
				{ id: 'conn-1', status: 'disconnected', tools: [], failureReason: 'unknown' },
			]);
			await store.fetchConnections();
			await vi.waitFor(() => expect(store.connections[0].status).toBe('disconnected'));

			const staleToolsRequest = createDeferred<InstanceAiMcpConnectionToolsResponse>();
			const freshToolsRequest = createDeferred<InstanceAiMcpConnectionToolsResponse>();
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

			staleToolsRequest.resolve({
				id: 'conn-1',
				status: 'connected',
				tools: [{ name: 'old_tool' }],
			});
			await staleFetch;
			expect(store.connectionToolsById.get('conn-1')).toBeUndefined();

			freshToolsRequest.resolve({
				id: 'conn-1',
				status: 'connected',
				tools: [{ name: 'fresh_tool' }],
			});
			await vi.waitFor(() => {
				expect(store.connectionToolsById.get('conn-1')).toEqual([{ name: 'fresh_tool' }]);
			});
		});
	});

	describe('connect', () => {
		it('appends the new connection on success', async () => {
			const created = makeConnection({ id: 'conn-new' });
			const toolsRequest = createDeferred<InstanceAiMcpConnectionToolsResponse>();
			mockCreateMcpConnection.mockResolvedValue(created);
			mockFetchMcpConnectionTools.mockReturnValue(toolsRequest.promise);

			const result = await store.connect({ serverSlug: 'linear', credentialId: 'cred-1' });

			expect(result).toEqual({ ...created, status: 'connecting' });
			expect(store.connections).toContainEqual({ ...created, status: 'connecting' });
			toolsRequest.resolve({ id: 'conn-new', status: 'connected', tools: [] });
			await vi.waitFor(() => expect(store.connections[0].status).toBe('connected'));
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

			expect(result).toEqual({ ...updated, status: 'connecting' });
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

	describe('credential deletion', () => {
		beforeEach(async () => {
			mockFetchMcpConnections.mockResolvedValue([
				makeConnection({ id: 'conn-1', serverSlug: 'linear', credentialId: 'cred-1' }),
				makeConnection({ id: 'conn-2', serverSlug: 'notion', credentialId: 'cred-2' }),
			]);
			await store.fetchConnections();
			store.connectionToolsById.set('conn-1', [{ name: 'search' }]);
		});

		it('drops connections that used the deleted credential', () => {
			emitCredentialDeleted('cred-1');

			expect(store.connections.map((c) => c.id)).toEqual(['conn-2']);
			expect(store.connectionToolsById.get('conn-1')).toBeUndefined();
		});

		it('leaves connections alone when an unrelated credential is deleted', () => {
			emitCredentialDeleted('cred-other');

			expect(store.connections.map((c) => c.id)).toEqual(['conn-1', 'conn-2']);
			expect(store.connectionToolsById.get('conn-1')).toEqual([{ name: 'search' }]);
		});
	});
});
