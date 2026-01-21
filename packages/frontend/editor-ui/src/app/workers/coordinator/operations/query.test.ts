import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockInstance } from 'vitest';
import type { CoordinatorState, TabConnection } from '../types';
import type { DataWorkerApi } from '../../data/worker';
import type * as Comlink from 'comlink';
import { ensureInitialized, initialize } from '../initialize';
import { exec, query, queryWithParams, isInitialized, getActiveTabId, getTabCount } from './query';

describe('Coordinator Query Operations', () => {
	let consoleSpy: {
		log: MockInstance;
		error: MockInstance;
	};

	beforeEach(() => {
		consoleSpy = {
			log: vi.spyOn(console, 'log').mockImplementation(() => {}),
			error: vi.spyOn(console, 'error').mockImplementation(() => {}),
		};
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

	describe('ensureInitialized', () => {
		it('should call initialize when not initialized', async () => {
			const state = createStateWithActiveTab();
			state.initialized = false;
			const worker = state.tabs.get('active-tab')?.dataWorker;

			await ensureInitialized(state);

			expect(worker?.initialize).toHaveBeenCalled();
		});

		it('should not call initialize when already initialized', async () => {
			const state = createStateWithActiveTab();
			state.initialized = true;
			const worker = state.tabs.get('active-tab')?.dataWorker;

			await ensureInitialized(state);

			expect(worker?.initialize).not.toHaveBeenCalled();
		});

		it('should propagate errors from initialize', async () => {
			const state = createStateWithActiveTab({
				initialize: vi.fn().mockRejectedValue(new Error('Init failed')),
			});
			state.initialized = false;

			await expect(ensureInitialized(state)).rejects.toThrow('Init failed');
		});
	});

	describe('initialize', () => {
		it('should throw error when no active data worker is available', async () => {
			const state = createMockState();

			await expect(initialize(state)).rejects.toThrow(
				'[Coordinator] No active data worker available',
			);
		});

		it('should call initialize on the active data worker', async () => {
			const state = createStateWithActiveTab();
			const worker = state.tabs.get('active-tab')?.dataWorker;

			await initialize(state);

			expect(worker?.initialize).toHaveBeenCalled();
		});

		it('should set initialized to true after successful initialization', async () => {
			const state = createStateWithActiveTab();

			await initialize(state);

			expect(state.initialized).toBe(true);
		});

		it('should not call worker.initialize when already initialized', async () => {
			const state = createStateWithActiveTab();
			state.initialized = true;
			const worker = state.tabs.get('active-tab')?.dataWorker;

			await initialize(state);

			expect(worker?.initialize).not.toHaveBeenCalled();
		});

		it('should delegate concurrent initialization handling to data worker', async () => {
			const initializeWorkerFn = vi
				.fn()
				.mockImplementation(async () => await new Promise((resolve) => setTimeout(resolve, 50)));
			const state = createStateWithActiveTab({ initialize: initializeWorkerFn });

			// Start two concurrent initializations
			// The data worker handles promise caching, coordinator relies on state.initialized
			const promise1 = initialize(state);
			const promise2 = initialize(state);

			await Promise.all([promise1, promise2]);

			// Both calls go to worker (which handles deduplication internally)
			// First call sets state.initialized=true, second call sees it and returns early
			// But since both start before either finishes, both may call worker
			expect(initializeWorkerFn).toHaveBeenCalled();
		});

		it('should log initialization messages', async () => {
			const state = createStateWithActiveTab();

			await initialize(state);

			expect(consoleSpy.log).toHaveBeenCalledWith('[Coordinator] Initialize requested');
			expect(consoleSpy.log).toHaveBeenCalledWith('[Coordinator] Initialization complete');
		});
	});

	describe('exec', () => {
		it('should throw error when no active data worker is available', async () => {
			const state = createMockState();

			await expect(exec(state, 'CREATE TABLE test (id INT)')).rejects.toThrow(
				'[Coordinator] No active data worker available',
			);
		});

		it('should call exec on the active data worker', async () => {
			const state = createStateWithActiveTab();
			state.initialized = true;
			const worker = state.tabs.get('active-tab')?.dataWorker;
			const sql = 'INSERT INTO test VALUES (1)';

			await exec(state, sql);

			expect(worker?.exec).toHaveBeenCalledWith(sql);
		});

		it('should ensure initialization before executing', async () => {
			const state = createStateWithActiveTab();
			state.initialized = false;
			const worker = state.tabs.get('active-tab')?.dataWorker;

			await exec(state, 'DELETE FROM test');

			expect(worker?.initialize).toHaveBeenCalled();
			expect(worker?.exec).toHaveBeenCalled();
		});

		it('should propagate errors from the data worker', async () => {
			const state = createStateWithActiveTab({
				exec: vi.fn().mockRejectedValue(new Error('Exec failed')),
			});
			state.initialized = true;

			await expect(exec(state, 'INVALID SQL')).rejects.toThrow('Exec failed');
		});

		it('should fetch worker after initialization to use current active tab', async () => {
			const firstWorker = createMockDataWorker({
				initialize: vi.fn().mockImplementation(async () => {
					// Simulate active tab change during initialization
					state.activeTabId = 'second-tab';
				}),
			});
			const secondWorker = createMockDataWorker();

			const firstTab = createMockTabConnection({
				id: 'first-tab',
				dataWorker: firstWorker,
				isActive: true,
			});
			const secondTab = createMockTabConnection({
				id: 'second-tab',
				dataWorker: secondWorker,
				isActive: false,
			});

			const state = createMockState({ activeTabId: 'first-tab', initialized: false });
			state.tabs.set('first-tab', firstTab);
			state.tabs.set('second-tab', secondTab);

			await exec(state, 'INSERT INTO test VALUES (1)');

			// Should use second worker (current active) not first worker (initial active)
			expect(secondWorker.exec).toHaveBeenCalledWith('INSERT INTO test VALUES (1)');
			expect(firstWorker.exec).not.toHaveBeenCalled();
		});
	});

	describe('query', () => {
		it('should throw error when no active data worker is available', async () => {
			const state = createMockState();

			await expect(query(state, 'SELECT * FROM test')).rejects.toThrow(
				'[Coordinator] No active data worker available',
			);
		});

		it('should call query on the active data worker', async () => {
			const state = createStateWithActiveTab();
			state.initialized = true;
			const worker = state.tabs.get('active-tab')?.dataWorker;
			const sql = 'SELECT * FROM test';

			await query(state, sql);

			expect(worker?.query).toHaveBeenCalledWith(sql);
		});

		it('should return query results from the data worker', async () => {
			const expectedResult = {
				columns: ['id', 'name'],
				rows: [
					[1, 'Alice'],
					[2, 'Bob'],
				],
			};
			const state = createStateWithActiveTab({
				query: vi.fn().mockResolvedValue(expectedResult),
			});
			state.initialized = true;

			const result = await query(state, 'SELECT * FROM users');

			expect(result).toEqual(expectedResult);
		});

		it('should ensure initialization before querying', async () => {
			const state = createStateWithActiveTab();
			state.initialized = false;
			const worker = state.tabs.get('active-tab')?.dataWorker;

			await query(state, 'SELECT 1');

			expect(worker?.initialize).toHaveBeenCalled();
			expect(worker?.query).toHaveBeenCalled();
		});

		it('should propagate errors from the data worker', async () => {
			const state = createStateWithActiveTab({
				query: vi.fn().mockRejectedValue(new Error('Query failed')),
			});
			state.initialized = true;

			await expect(query(state, 'INVALID SQL')).rejects.toThrow('Query failed');
		});
	});

	describe('queryWithParams', () => {
		it('should throw error when no active data worker is available', async () => {
			const state = createMockState();

			await expect(queryWithParams(state, 'SELECT * FROM test WHERE id = ?', [1])).rejects.toThrow(
				'[Coordinator] No active data worker available',
			);
		});

		it('should call queryWithParams on the active data worker', async () => {
			const state = createStateWithActiveTab();
			state.initialized = true;
			const worker = state.tabs.get('active-tab')?.dataWorker;
			const sql = 'SELECT * FROM test WHERE id = ?';
			const params = [42];

			await queryWithParams(state, sql, params);

			expect(worker?.queryWithParams).toHaveBeenCalledWith(sql, params);
		});

		it('should return query results from the data worker', async () => {
			const expectedResult = {
				columns: ['id', 'name'],
				rows: [[1, 'Alice']],
			};
			const state = createStateWithActiveTab({
				queryWithParams: vi.fn().mockResolvedValue(expectedResult),
			});
			state.initialized = true;

			const result = await queryWithParams(state, 'SELECT * FROM users WHERE id = ?', [1]);

			expect(result).toEqual(expectedResult);
		});

		it('should handle multiple parameters', async () => {
			const state = createStateWithActiveTab();
			state.initialized = true;
			const worker = state.tabs.get('active-tab')?.dataWorker;
			const sql = 'SELECT * FROM test WHERE id = ? AND name = ? AND active = ?';
			// SQLite uses 0/1 for boolean values, not true/false
			const params = [1, 'test', 1];

			await queryWithParams(state, sql, params);

			expect(worker?.queryWithParams).toHaveBeenCalledWith(sql, params);
		});

		it('should handle empty parameters array', async () => {
			const state = createStateWithActiveTab();
			state.initialized = true;
			const worker = state.tabs.get('active-tab')?.dataWorker;
			const sql = 'SELECT * FROM test';

			await queryWithParams(state, sql, []);

			expect(worker?.queryWithParams).toHaveBeenCalledWith(sql, []);
		});

		it('should ensure initialization before querying', async () => {
			const state = createStateWithActiveTab();
			state.initialized = false;
			const worker = state.tabs.get('active-tab')?.dataWorker;

			await queryWithParams(state, 'SELECT ?', [1]);

			expect(worker?.initialize).toHaveBeenCalled();
			expect(worker?.queryWithParams).toHaveBeenCalled();
		});

		it('should propagate errors from the data worker', async () => {
			const state = createStateWithActiveTab({
				queryWithParams: vi.fn().mockRejectedValue(new Error('Query with params failed')),
			});
			state.initialized = true;

			await expect(queryWithParams(state, 'SELECT ?', [1])).rejects.toThrow(
				'Query with params failed',
			);
		});
	});

	describe('isInitialized', () => {
		it('should return false when not initialized', () => {
			const state = createMockState({ initialized: false });

			expect(isInitialized(state)).toBe(false);
		});

		it('should return true when initialized', () => {
			const state = createMockState({ initialized: true });

			expect(isInitialized(state)).toBe(true);
		});
	});

	describe('getActiveTabId', () => {
		it('should return null when no active tab', () => {
			const state = createMockState({ activeTabId: null });

			expect(getActiveTabId(state)).toBeNull();
		});

		it('should return the active tab ID', () => {
			const state = createMockState({ activeTabId: 'tab-123' });

			expect(getActiveTabId(state)).toBe('tab-123');
		});
	});

	describe('getTabCount', () => {
		it('should return 0 when no tabs are registered', () => {
			const state = createMockState();

			expect(getTabCount(state)).toBe(0);
		});

		it('should return the correct count of registered tabs', () => {
			const state = createMockState();
			state.tabs.set('tab-1', createMockTabConnection({ id: 'tab-1' }));
			state.tabs.set('tab-2', createMockTabConnection({ id: 'tab-2' }));
			state.tabs.set('tab-3', createMockTabConnection({ id: 'tab-3' }));

			expect(getTabCount(state)).toBe(3);
		});
	});
});
