import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CoordinatorState, TabConnection } from '../types';
import type { DataWorkerApi } from '../../data/worker';
import type * as Comlink from 'comlink';
import { loadNodeTypes } from './loadNodeTypes';

describe('Coordinator loadNodeTypes Operation', () => {
	beforeEach(() => {
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	function createMockDataWorker(
		overrides: Partial<DataWorkerApi> = {},
	): Comlink.Remote<DataWorkerApi> {
		return {
			initialize: vi.fn().mockResolvedValue(undefined),
			exec: vi.fn().mockResolvedValue(undefined),
			query: vi.fn().mockResolvedValue({ columns: [], rows: [] }),
			queryWithParams: vi.fn().mockResolvedValue({ columns: [], rows: [] }),
			close: vi.fn().mockResolvedValue(undefined),
			isInitialized: vi.fn().mockReturnValue(true),
			loadNodeTypes: vi.fn().mockResolvedValue(undefined),
			...overrides,
		} as unknown as Comlink.Remote<DataWorkerApi>;
	}

	function createMockTabConnection(overrides: Partial<TabConnection> = {}): TabConnection {
		return {
			id: 'test-tab-id',
			port: {} as MessagePort,
			dataWorker: createMockDataWorker(),
			isActive: false,
			...overrides,
		};
	}

	function createMockState(overrides: Partial<CoordinatorState> = {}): CoordinatorState {
		return {
			tabs: new Map(),
			activeTabId: null,
			initialized: false,
			...overrides,
		};
	}

	function createStateWithActiveTab(
		workerOverrides: Partial<DataWorkerApi> = {},
	): CoordinatorState {
		const mockDataWorker = createMockDataWorker(workerOverrides);
		const tabConnection = createMockTabConnection({
			id: 'active-tab',
			dataWorker: mockDataWorker,
			isActive: true,
		});
		const state = createMockState({ activeTabId: 'active-tab' });
		state.tabs.set('active-tab', tabConnection);
		return state;
	}

	describe('loadNodeTypes', () => {
		it('should throw error when no active data worker is available', async () => {
			const state = createMockState();

			await expect(loadNodeTypes(state, 'http://localhost:5678')).rejects.toThrow(
				'[Coordinator] No active data worker available',
			);
		});

		it('should call loadNodeTypes on the active data worker with the correct baseUrl', async () => {
			const state = createStateWithActiveTab();
			state.initialized = true;
			const worker = state.tabs.get('active-tab')?.dataWorker;
			const baseUrl = 'http://localhost:5678';

			await loadNodeTypes(state, baseUrl);

			expect(worker?.loadNodeTypes).toHaveBeenCalledWith(baseUrl);
		});

		it('should ensure initialization before loading node types', async () => {
			const state = createStateWithActiveTab();
			state.initialized = false;
			const worker = state.tabs.get('active-tab')?.dataWorker;

			await loadNodeTypes(state, 'http://localhost:5678');

			expect(worker?.initialize).toHaveBeenCalled();
			expect(worker?.loadNodeTypes).toHaveBeenCalled();
		});

		it('should not call initialize if already initialized', async () => {
			const state = createStateWithActiveTab();
			state.initialized = true;
			const worker = state.tabs.get('active-tab')?.dataWorker;

			await loadNodeTypes(state, 'http://localhost:5678');

			expect(worker?.initialize).not.toHaveBeenCalled();
			expect(worker?.loadNodeTypes).toHaveBeenCalled();
		});

		it('should propagate errors from the data worker', async () => {
			const state = createStateWithActiveTab({
				loadNodeTypes: vi.fn().mockRejectedValue(new Error('Failed to load node types')),
			});
			state.initialized = true;

			await expect(loadNodeTypes(state, 'http://localhost:5678')).rejects.toThrow(
				'Failed to load node types',
			);
		});

		it('should handle different base URLs', async () => {
			const state = createStateWithActiveTab();
			state.initialized = true;
			const worker = state.tabs.get('active-tab')?.dataWorker;

			const testUrls = [
				'http://localhost:5678',
				'https://my-n8n.example.com',
				'http://192.168.1.100:5678',
				'https://n8n.cloud.example.com/api',
			];

			for (const url of testUrls) {
				vi.clearAllMocks();
				await loadNodeTypes(state, url);
				expect(worker?.loadNodeTypes).toHaveBeenCalledWith(url);
			}
		});

		it('should handle empty base URL', async () => {
			const state = createStateWithActiveTab();
			state.initialized = true;
			const worker = state.tabs.get('active-tab')?.dataWorker;

			await loadNodeTypes(state, '');

			expect(worker?.loadNodeTypes).toHaveBeenCalledWith('');
		});

		it('should propagate initialization errors', async () => {
			const state = createStateWithActiveTab({
				initialize: vi.fn().mockRejectedValue(new Error('Initialization failed')),
			});
			state.initialized = false;

			await expect(loadNodeTypes(state, 'http://localhost:5678')).rejects.toThrow(
				'Initialization failed',
			);
		});

		it('should not call loadNodeTypes if initialization fails', async () => {
			const loadNodeTypesFn = vi.fn();
			const state = createStateWithActiveTab({
				initialize: vi.fn().mockRejectedValue(new Error('Initialization failed')),
				loadNodeTypes: loadNodeTypesFn,
			});
			state.initialized = false;

			await expect(loadNodeTypes(state, 'http://localhost:5678')).rejects.toThrow();

			expect(loadNodeTypesFn).not.toHaveBeenCalled();
		});
	});
});
