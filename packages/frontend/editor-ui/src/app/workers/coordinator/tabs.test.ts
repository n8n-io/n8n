import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockInstance } from 'vitest';
import * as Comlink from 'comlink';
import type { CoordinatorState, TabConnection } from './types';
import type { DataWorkerApi } from '../data/worker';
import {
	generateTabId,
	getActiveDataWorker,
	selectNewActiveTab,
	handleTabDisconnect,
	registerTab,
	unregisterTab,
} from './tabs';

vi.mock('comlink', () => ({
	wrap: vi.fn(),
}));

describe('Coordinator Tab Operations', () => {
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

	function createMockState(overrides: Partial<CoordinatorState> = {}): CoordinatorState {
		return {
			tabs: new Map(),
			activeTabId: null,
			initialized: false,
			...overrides,
		};
	}

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

	describe('generateTabId', () => {
		it('should generate a tab ID with correct prefix', () => {
			const tabId = generateTabId();
			expect(tabId).toMatch(/^tab-/);
		});

		it('should generate a tab ID containing a timestamp', () => {
			const before = Date.now();
			const tabId = generateTabId();
			const after = Date.now();

			const parts = tabId.split('-');
			const timestamp = parseInt(parts[1], 10);

			expect(timestamp).toBeGreaterThanOrEqual(before);
			expect(timestamp).toBeLessThanOrEqual(after);
		});

		it('should generate unique tab IDs', () => {
			const ids = new Set<string>();
			for (let i = 0; i < 100; i++) {
				ids.add(generateTabId());
			}
			expect(ids.size).toBe(100);
		});

		it('should generate a tab ID with random suffix', () => {
			const tabId = generateTabId();
			const parts = tabId.split('-');
			expect(parts.length).toBe(3);
			expect(parts[2]).toMatch(/^[a-z0-9]+$/);
		});
	});

	describe('getActiveDataWorker', () => {
		it('should return null when there is no active tab ID', () => {
			const state = createMockState({ activeTabId: null });

			const result = getActiveDataWorker(state);

			expect(result).toBeNull();
		});

		it('should return null when active tab is not in the tabs map', () => {
			const state = createMockState({ activeTabId: 'non-existent-tab' });

			const result = getActiveDataWorker(state);

			expect(result).toBeNull();
		});

		it('should return null when active tab has no data worker', () => {
			const tabConnection = createMockTabConnection({
				id: 'tab-1',
				dataWorker: null,
			});
			const state = createMockState({ activeTabId: 'tab-1' });
			state.tabs.set('tab-1', tabConnection);

			const result = getActiveDataWorker(state);

			expect(result).toBeNull();
		});

		it('should return the data worker for the active tab', () => {
			const mockDataWorker = createMockDataWorker();
			const tabConnection = createMockTabConnection({
				id: 'tab-1',
				dataWorker: mockDataWorker,
			});
			const state = createMockState({ activeTabId: 'tab-1' });
			state.tabs.set('tab-1', tabConnection);

			const result = getActiveDataWorker(state);

			expect(result).toBe(mockDataWorker);
		});
	});

	describe('selectNewActiveTab', () => {
		it('should set activeTabId to null when no tabs are available', async () => {
			const state = createMockState();

			await selectNewActiveTab(state);

			expect(state.activeTabId).toBeNull();
			expect(state.initialized).toBe(false);
		});

		it('should skip tabs without data workers', async () => {
			const tabWithoutWorker = createMockTabConnection({
				id: 'tab-no-worker',
				dataWorker: null,
			});
			const tabWithWorker = createMockTabConnection({
				id: 'tab-with-worker',
			});
			const state = createMockState();
			state.tabs.set('tab-no-worker', tabWithoutWorker);
			state.tabs.set('tab-with-worker', tabWithWorker);

			await selectNewActiveTab(state);

			expect(state.activeTabId).toBe('tab-with-worker');
			expect(tabWithWorker.isActive).toBe(true);
		});

		it('should select the first available tab with a data worker', async () => {
			const mockDataWorker = createMockDataWorker();
			const tabConnection = createMockTabConnection({
				id: 'tab-1',
				dataWorker: mockDataWorker,
			});
			const state = createMockState();
			state.tabs.set('tab-1', tabConnection);

			await selectNewActiveTab(state);

			expect(state.activeTabId).toBe('tab-1');
			expect(tabConnection.isActive).toBe(true);
			expect(mockDataWorker.initialize).toHaveBeenCalled();
		});

		it('should set initialized to true after successful initialization', async () => {
			const tabConnection = createMockTabConnection({ id: 'tab-1' });
			const state = createMockState({ initialized: false });
			state.tabs.set('tab-1', tabConnection);

			await selectNewActiveTab(state);

			expect(state.initialized).toBe(true);
		});

		it('should try next tab if initialization fails', async () => {
			const failingWorker = createMockDataWorker({
				initialize: vi.fn().mockRejectedValue(new Error('Init failed')),
			});
			const successWorker = createMockDataWorker();

			const failingTab = createMockTabConnection({
				id: 'tab-failing',
				dataWorker: failingWorker,
			});
			const successTab = createMockTabConnection({
				id: 'tab-success',
				dataWorker: successWorker,
			});

			const state = createMockState();
			state.tabs.set('tab-failing', failingTab);
			state.tabs.set('tab-success', successTab);

			await selectNewActiveTab(state);

			expect(failingTab.isActive).toBe(false);
			expect(successTab.isActive).toBe(true);
			expect(state.activeTabId).toBe('tab-success');
			expect(state.initialized).toBe(true);
		});

		it('should set initialized to false if all tabs fail', async () => {
			const failingWorker = createMockDataWorker({
				initialize: vi.fn().mockRejectedValue(new Error('Init failed')),
			});
			const failingTab = createMockTabConnection({
				id: 'tab-failing',
				dataWorker: failingWorker,
			});

			const state = createMockState({ initialized: true });
			state.tabs.set('tab-failing', failingTab);

			await selectNewActiveTab(state);

			expect(state.activeTabId).toBeNull();
			expect(state.initialized).toBe(false);
		});
	});

	describe('handleTabDisconnect', () => {
		it('should do nothing if tab is not in the state', () => {
			const state = createMockState();

			handleTabDisconnect(state, 'non-existent-tab');

			expect(state.tabs.size).toBe(0);
		});

		it('should remove the tab from the state', () => {
			const tabConnection = createMockTabConnection({ id: 'tab-1' });
			const state = createMockState();
			state.tabs.set('tab-1', tabConnection);

			handleTabDisconnect(state, 'tab-1');

			expect(state.tabs.has('tab-1')).toBe(false);
		});

		it('should not change activeTabId if disconnected tab was not active', () => {
			const tab1 = createMockTabConnection({ id: 'tab-1' });
			const tab2 = createMockTabConnection({ id: 'tab-2' });
			const state = createMockState({ activeTabId: 'tab-2' });
			state.tabs.set('tab-1', tab1);
			state.tabs.set('tab-2', tab2);

			handleTabDisconnect(state, 'tab-1');

			expect(state.activeTabId).toBe('tab-2');
		});

		it('should reset activeTabId and initialized when active tab disconnects', () => {
			const tabConnection = createMockTabConnection({ id: 'tab-1' });
			const state = createMockState({
				activeTabId: 'tab-1',
				initialized: true,
			});
			state.tabs.set('tab-1', tabConnection);

			handleTabDisconnect(state, 'tab-1');

			expect(state.activeTabId).toBeNull();
			expect(state.initialized).toBe(false);
		});

		it('should trigger selectNewActiveTab when active tab disconnects', async () => {
			const tab1 = createMockTabConnection({ id: 'tab-1' });
			const tab2 = createMockTabConnection({ id: 'tab-2' });
			const state = createMockState({
				activeTabId: 'tab-1',
				initialized: true,
			});
			state.tabs.set('tab-1', tab1);
			state.tabs.set('tab-2', tab2);

			handleTabDisconnect(state, 'tab-1');

			// Wait for the async selectNewActiveTab to complete
			await vi.waitFor(() => {
				expect(state.activeTabId).toBe('tab-2');
			});
		});
	});

	describe('registerTab', () => {
		it('should generate a unique tab ID', () => {
			const state = createMockState();
			const mockPort = {} as MessagePort;
			vi.mocked(Comlink.wrap).mockReturnValue(createMockDataWorker());

			const tabId = registerTab(state, mockPort);

			expect(tabId).toMatch(/^tab-/);
		});

		it('should wrap the port with Comlink', () => {
			const state = createMockState();
			const mockPort = {} as MessagePort;
			vi.mocked(Comlink.wrap).mockReturnValue(createMockDataWorker());

			registerTab(state, mockPort);

			expect(Comlink.wrap).toHaveBeenCalledWith(mockPort);
		});

		it('should add the tab connection to the state', () => {
			const state = createMockState();
			const mockPort = {} as MessagePort;
			const mockDataWorker = createMockDataWorker();
			vi.mocked(Comlink.wrap).mockReturnValue(mockDataWorker);

			const tabId = registerTab(state, mockPort);

			expect(state.tabs.has(tabId)).toBe(true);
			const tabConnection = state.tabs.get(tabId);
			expect(tabConnection?.id).toBe(tabId);
			expect(tabConnection?.port).toBe(mockPort);
			expect(tabConnection?.dataWorker).toBe(mockDataWorker);
		});

		it('should make the first tab active', () => {
			const state = createMockState();
			const mockPort = {} as MessagePort;
			vi.mocked(Comlink.wrap).mockReturnValue(createMockDataWorker());

			const tabId = registerTab(state, mockPort);

			expect(state.activeTabId).toBe(tabId);
			expect(state.tabs.get(tabId)?.isActive).toBe(true);
		});

		it('should not change active tab if one already exists', () => {
			const existingTab = createMockTabConnection({ id: 'existing-tab', isActive: true });
			const state = createMockState({ activeTabId: 'existing-tab' });
			state.tabs.set('existing-tab', existingTab);

			const mockPort = {} as MessagePort;
			vi.mocked(Comlink.wrap).mockReturnValue(createMockDataWorker());

			const newTabId = registerTab(state, mockPort);

			expect(state.activeTabId).toBe('existing-tab');
			expect(state.tabs.get(newTabId)?.isActive).toBe(false);
		});

		it('should log tab registration', () => {
			const state = createMockState();
			const mockPort = {} as MessagePort;
			vi.mocked(Comlink.wrap).mockReturnValue(createMockDataWorker());

			const tabId = registerTab(state, mockPort);

			expect(consoleSpy.log).toHaveBeenCalledWith(`[Coordinator] Registering tab: ${tabId}`);
		});
	});

	describe('unregisterTab', () => {
		it('should call handleTabDisconnect with correct parameters', () => {
			const tabConnection = createMockTabConnection({ id: 'tab-1' });
			const state = createMockState();
			state.tabs.set('tab-1', tabConnection);

			unregisterTab(state, 'tab-1');

			expect(state.tabs.has('tab-1')).toBe(false);
		});

		it('should handle unregistering non-existent tab gracefully', () => {
			const state = createMockState();

			expect(() => unregisterTab(state, 'non-existent')).not.toThrow();
		});
	});
});
