import { setActivePinia, createPinia } from 'pinia';
import { useParameterOverridesStore } from './parameterOverrides.store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

// Mock localStorage
const localStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
	value: localStorageMock,
	writable: true,
});

describe('parameterOverrides.store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		localStorageMock.getItem.mockReset();
		localStorageMock.setItem.mockReset();
		localStorageMock.clear.mockReset();
	});

	describe('Initialization', () => {
		it('initializes with empty state when localStorage is empty', () => {
			localStorageMock.getItem.mockReturnValue(null);
			const store = useParameterOverridesStore();
			expect(store.parameterOverrides).toEqual({});
		});

		it('initializes with data from localStorage', () => {
			const mockData = {
				'workflow-1': {
					'node-1': { param1: 'value1' },
				},
			};
			localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData));
			const store = useParameterOverridesStore();
			expect(store.parameterOverrides).toEqual(mockData);
		});

		it('handles localStorage errors gracefully', () => {
			localStorageMock.getItem.mockImplementation(() => {
				throw new Error('Storage error');
			});
			const store = useParameterOverridesStore();
			expect(store.parameterOverrides).toEqual({});
		});
	});

	describe('Getters', () => {
		it('gets parameter overrides for a node', () => {
			const mockData = {
				'workflow-1': {
					'node-1': { param1: 'value1', param2: 'value2' },
				},
			};
			localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData));
			const store = useParameterOverridesStore();

			const overrides = store.getParameterOverrides('workflow-1', 'node-1');
			expect(overrides).toEqual({ param1: 'value1', param2: 'value2' });
		});

		it('returns empty object for non-existent workflow/node', () => {
			const store = useParameterOverridesStore();

			const overrides = store.getParameterOverrides('non-existent', 'node-1');
			expect(overrides).toEqual({});
		});

		it('gets a specific parameter override', () => {
			const mockData = {
				'workflow-1': {
					'node-1': { param1: 'value1', param2: 'value2' },
				},
			};
			localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData));
			const store = useParameterOverridesStore();

			const override = store.getParameterOverride('workflow-1', 'node-1', 'param1');
			expect(override).toBe('value1');
		});

		it('returns undefined for non-existent parameter', () => {
			const mockData = {
				'workflow-1': {
					'node-1': { param1: 'value1' },
				},
			};
			localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData));
			const store = useParameterOverridesStore();

			const override = store.getParameterOverride('workflow-1', 'node-1', 'non-existent');
			expect(override).toBeUndefined();
		});
	});

	describe('Actions', () => {
		it('adds a parameter override', () => {
			const store = useParameterOverridesStore();

			store.addParameterOverride('workflow-1', 'node-1', 'param1', 'value1');

			expect(store.parameterOverrides['workflow-1']['node-1']['param1']).toBe('value1');
		});

		it('adds multiple parameter overrides', () => {
			const store = useParameterOverridesStore();

			store.addParameterOverrides('workflow-1', 'node-1', {
				param1: 'value1',
				param2: 'value2',
			});

			expect(store.parameterOverrides['workflow-1']['node-1']).toEqual({
				param1: 'value1',
				param2: 'value2',
			});
		});

		it('clears parameter overrides for a node', () => {
			const mockData = {
				'workflow-1': {
					'node-1': { param1: 'value1', param2: 'value2' },
					'node-2': { param3: 'value3' },
				},
			};
			localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData));
			const store = useParameterOverridesStore();

			store.clearParameterOverrides('workflow-1', 'node-1');

			expect(store.parameterOverrides['workflow-1']['node-1']).toEqual({});
			expect(store.parameterOverrides['workflow-1']['node-2']).toEqual({ param3: 'value3' });
		});

		it('clears all parameter overrides for a workflow', () => {
			const mockData = {
				'workflow-1': {
					'node-1': { param1: 'value1' },
					'node-2': { param2: 'value2' },
				},
				'workflow-2': {
					'node-3': { param3: 'value3' },
				},
			};
			localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData));
			const store = useParameterOverridesStore();

			store.clearAllParameterOverrides('workflow-1');

			expect(store.parameterOverrides['workflow-1']).toEqual({});
			expect(store.parameterOverrides['workflow-2']).toEqual({
				'node-3': { param3: 'value3' },
			});
		});

		it('clears all parameter overrides when no workflowId is provided', () => {
			const mockData = {
				'workflow-1': {
					'node-1': { param1: 'value1' },
				},
				'workflow-2': {
					'node-2': { param2: 'value2' },
				},
			};
			localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData));
			const store = useParameterOverridesStore();

			store.clearAllParameterOverrides();

			expect(store.parameterOverrides).toEqual({});
		});
	});

	describe('substituteParameters', () => {
		it('substitutes parameters in a node', () => {
			const store = useParameterOverridesStore();

			store.addParameterOverrides('workflow-1', 'id1', {
				param1: 'override1',
				'parent.child': 'override2',
				'parent.array[0].value': 'overrideArray1',
				'parent.array[1].value': 'overrideArray2',
			});

			const nodeParameters = {
				param1: 'original1',
				parent: {
					child: 'original2',
					array: [
						{
							name: 'name',
							value: 'original1',
						},
						{
							name: 'name2',
							value: 'original2',
						},
					],
				},
			};

			const result = store.substituteParameters('workflow-1', 'id1', nodeParameters);

			expect(result).toEqual({
				param1: 'override1',
				parent: {
					child: 'override2',
					array: [
						{
							name: 'name',
							value: 'overrideArray1',
						},
						{
							name: 'name2',
							value: 'overrideArray2',
						},
					],
				},
			});
		});
	});

	describe('Persistence', () => {
		it('saves to localStorage when state changes', async () => {
			const store = useParameterOverridesStore();

			localStorageMock.setItem.mockReset();

			store.addParameterOverride('workflow-1', 'node-1', 'param1', 'value1');

			// Wait for the next tick to allow the watch to execute
			await nextTick();

			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				'n8n-parameter-overrides',
				JSON.stringify({
					'workflow-1': {
						'node-1': { param1: 'value1' },
					},
				}),
			);
		});

		it('should handle localStorage errors when saving', async () => {
			const store = useParameterOverridesStore();

			localStorageMock.setItem.mockReset();

			localStorageMock.setItem.mockImplementation(() => {
				throw new Error('Storage error');
			});

			store.addParameterOverride('workflow-1', 'node-1', 'param1', 'value1');

			await nextTick();

			expect(store.parameterOverrides['workflow-1']['node-1'].param1).toBe('value1');
		});
	});
});
