import { setActivePinia, createPinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import {
	type IAgentRequestStoreState,
	type IAgentRequest,
	useAgentRequestStore,
} from './useAgentRequestStore';

// Mock localStorage
let mockLocalStorageValue: IAgentRequestStoreState = {};

const NODE_ID_1 = '123e4567-e89b-12d3-a456-426614174000';
const NODE_ID_2 = '987fcdeb-51a2-43d7-b654-987654321000';
const NODE_ID_3 = '456abcde-f789-12d3-a456-426614174000';

vi.mock('@vueuse/core', () => ({
	useLocalStorage: vi.fn((_key, defaultValue) => {
		if (Object.keys(mockLocalStorageValue).length === 0) {
			Object.assign(mockLocalStorageValue, structuredClone(defaultValue));
		}
		return {
			value: mockLocalStorageValue,
		};
	}),
}));

describe('agentRequest.store', () => {
	beforeEach(() => {
		mockLocalStorageValue = {};
		setActivePinia(createPinia());
	});

	describe('Initialization', () => {
		it('initializes with empty state when localStorage is empty', () => {
			const store = useAgentRequestStore();
			expect(store.agentRequests.value).toEqual({});
		});

		it('initializes with data from localStorage', () => {
			const mockData: IAgentRequestStoreState = {
				'workflow-1': {
					[NODE_ID_1]: { query: { param1: 'value1' } },
				},
			};
			mockLocalStorageValue = mockData;

			const store = useAgentRequestStore();
			expect(store.agentRequests.value).toEqual(mockData);
		});
	});

	describe('Getters', () => {
		it('gets parameter overrides for a node', () => {
			const store = useAgentRequestStore();

			store.setAgentRequestForNode('workflow-1', NODE_ID_1, {
				query: { param1: 'value1', param2: 'value2' },
			});

			const overrides = store.getAgentRequests('workflow-1', NODE_ID_1);
			expect(overrides).toEqual({ param1: 'value1', param2: 'value2' });
		});

		it('returns empty object for non-existent workflow/node', () => {
			const store = useAgentRequestStore();

			const overrides = store.getAgentRequests('non-existent', NODE_ID_1);
			expect(overrides).toEqual({});
		});

		it('gets a specific parameter override', () => {
			const store = useAgentRequestStore();
			store.setAgentRequestForNode('workflow-1', NODE_ID_1, {
				query: { param1: 'value1', param2: 'value2' },
			});

			const override = store.getQueryValue('workflow-1', NODE_ID_1, 'param1');
			expect(override).toBe('value1');
		});

		it('returns undefined for non-existent parameter', () => {
			const store = useAgentRequestStore();
			store.setAgentRequestForNode('workflow-1', NODE_ID_1, {
				query: { param1: 'value1' },
			});

			const override = store.getQueryValue('workflow-1', NODE_ID_1, 'non-existent');
			expect(override).toBeUndefined();
		});

		it('handles string query type', () => {
			const store = useAgentRequestStore();
			store.setAgentRequestForNode('workflow-1', NODE_ID_1, {
				query: 'string-query',
			});

			const query = store.getAgentRequests('workflow-1', NODE_ID_1);
			expect(query).toBe('string-query');
		});
	});

	describe('Actions', () => {
		it('sets parameter overrides for a node', () => {
			const store = useAgentRequestStore();

			store.setAgentRequestForNode('workflow-1', NODE_ID_1, {
				query: { param1: 'value1', param2: 'value2' },
			});

			expect(
				(store.agentRequests.value['workflow-1'] as unknown as { [key: string]: IAgentRequest })[
					NODE_ID_1
				].query,
			).toEqual({
				param1: 'value1',
				param2: 'value2',
			});
		});

		it('clears parameter overrides for a node', () => {
			const store = useAgentRequestStore();
			store.setAgentRequestForNode('workflow-1', NODE_ID_1, {
				query: { param1: 'value1', param2: 'value2' },
			});
			store.setAgentRequestForNode('workflow-1', NODE_ID_2, {
				query: { param3: 'value3' },
			});

			store.clearAgentRequests('workflow-1', NODE_ID_1);

			expect(
				(store.agentRequests.value['workflow-1'] as unknown as { [key: string]: IAgentRequest })[
					NODE_ID_1
				].query,
			).toEqual({});
			expect(
				(store.agentRequests.value['workflow-1'] as unknown as { [key: string]: IAgentRequest })[
					NODE_ID_2
				].query,
			).toEqual({
				param3: 'value3',
			});
		});

		it('clears all parameter overrides for a workflow', () => {
			const store = useAgentRequestStore();
			store.setAgentRequestForNode('workflow-1', NODE_ID_1, {
				query: { param1: 'value1' },
			});
			store.setAgentRequestForNode('workflow-1', NODE_ID_2, {
				query: { param2: 'value2' },
			});
			store.setAgentRequestForNode('workflow-2', NODE_ID_3, {
				query: { param3: 'value3' },
			});

			store.clearAllAgentRequests('workflow-1');

			expect(store.agentRequests.value['workflow-1']).toEqual({});
			expect(store.agentRequests.value['workflow-2']).toEqual({
				[NODE_ID_3]: { query: { param3: 'value3' } },
			});
		});

		it('clears all parameter overrides when no workflowId is provided', () => {
			const store = useAgentRequestStore();
			store.setAgentRequestForNode('workflow-1', NODE_ID_1, {
				query: { param1: 'value1' },
			});
			store.setAgentRequestForNode('workflow-2', NODE_ID_2, {
				query: { param2: 'value2' },
			});

			store.clearAllAgentRequests();

			expect(store.agentRequests.value).toEqual({});
		});
	});

	describe('Persistence', () => {
		it('saves to localStorage when state changes', async () => {
			const store = useAgentRequestStore();

			store.setAgentRequestForNode('workflow-1', NODE_ID_1, {
				query: { param1: 'value1' },
			});

			await nextTick();

			expect(mockLocalStorageValue).toEqual({
				'workflow-1': {
					[NODE_ID_1]: { query: { param1: 'value1' } },
				},
			});
		});
	});
});
