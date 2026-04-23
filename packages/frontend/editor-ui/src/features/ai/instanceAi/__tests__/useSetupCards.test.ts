import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { ref } from 'vue';
import type { InstanceAiWorkflowSetupNode } from '@n8n/api-types';
import type { INodeTypeDescription } from 'n8n-workflow';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useSetupCards } from '../composables/useSetupCards';

vi.mock('@/features/setupPanel/setupPanel.utils', () => ({
	getNodeParametersIssues: () => ({}),
}));

function makeSetupNode(
	overrides: Partial<InstanceAiWorkflowSetupNode> = {},
): InstanceAiWorkflowSetupNode {
	return {
		node: {
			name: 'DataTable',
			type: 'n8n-nodes-base.dataTable',
			typeVersion: 1,
			parameters: {},
			position: [0, 0] as [number, number],
			id: 'node-1',
		},
		isTrigger: false,
		...overrides,
	} as InstanceAiWorkflowSetupNode;
}

function mockNodeType(properties: INodeTypeDescription['properties']) {
	const nodeType = { name: 'n8n-nodes-base.dataTable', properties } as INodeTypeDescription;
	const nodeTypesStore = useNodeTypesStore();
	// @ts-expect-error Known pinia issue when spying on store getters
	vi.spyOn(nodeTypesStore, 'getNodeType', 'get').mockReturnValue(() => nodeType);
}

describe('useSetupCards', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;

	beforeEach(() => {
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		workflowsStore = useWorkflowsStore();
		workflowsStore.getNodeByName = vi.fn().mockImplementation((name: string) => ({
			name,
			type: 'n8n-nodes-base.dataTable',
			typeVersion: 1,
			parameters: {},
			position: [0, 0],
			id: 'node-1',
		}));
	});

	describe('param-issue card creation', () => {
		test('skips the card when the only outstanding issue is a nested param (fixedCollection)', () => {
			mockNodeType([
				{
					name: 'filters',
					displayName: 'Filters',
					type: 'fixedCollection',
					default: {},
				},
			]);

			const setupRequests = ref<InstanceAiWorkflowSetupNode[]>([
				makeSetupNode({ parameterIssues: { filters: ['Filters are required'] } }),
			]);

			const { cards } = useSetupCards(
				setupRequests,
				() => null,
				() => false,
			);

			expect(cards.value).toHaveLength(0);
		});

		test('creates a card when the tracked issue maps to a simple (renderable) param', () => {
			mockNodeType([
				{
					name: 'tableName',
					displayName: 'Table Name',
					type: 'string',
					default: '',
				},
			]);

			const setupRequests = ref<InstanceAiWorkflowSetupNode[]>([
				makeSetupNode({ parameterIssues: { tableName: ['Table Name is required'] } }),
			]);

			const { cards } = useSetupCards(
				setupRequests,
				() => null,
				() => false,
			);

			expect(cards.value).toHaveLength(1);
			expect(cards.value[0].hasParamIssues).toBe(true);
		});

		test('creates a card when mixing simple and nested issues', () => {
			mockNodeType([
				{
					name: 'tableName',
					displayName: 'Table Name',
					type: 'string',
					default: '',
				},
				{
					name: 'filters',
					displayName: 'Filters',
					type: 'fixedCollection',
					default: {},
				},
			]);

			const setupRequests = ref<InstanceAiWorkflowSetupNode[]>([
				makeSetupNode({
					parameterIssues: {
						tableName: ['Table Name is required'],
						filters: ['Filters are required'],
					},
				}),
			]);

			const { cards } = useSetupCards(
				setupRequests,
				() => null,
				() => false,
			);

			expect(cards.value).toHaveLength(1);
			expect(cards.value[0].hasParamIssues).toBe(true);
		});

		test('keeps the card for a trigger node even when its only issue is nested', () => {
			mockNodeType([
				{
					name: 'filters',
					displayName: 'Filters',
					type: 'fixedCollection',
					default: {},
				},
			]);

			const setupRequests = ref<InstanceAiWorkflowSetupNode[]>([
				makeSetupNode({
					isTrigger: true,
					parameterIssues: { filters: ['Filters are required'] },
				}),
			]);

			const { cards } = useSetupCards(
				setupRequests,
				() => null,
				() => false,
			);

			expect(cards.value).toHaveLength(1);
		});

		test('skips the card when the tracked issue is a param with multipleValues: true', () => {
			mockNodeType([
				{
					name: 'conditions',
					displayName: 'Conditions',
					type: 'string',
					default: '',
					typeOptions: { multipleValues: true },
				},
			]);

			const setupRequests = ref<InstanceAiWorkflowSetupNode[]>([
				makeSetupNode({ parameterIssues: { conditions: ['Conditions are required'] } }),
			]);

			const { cards } = useSetupCards(
				setupRequests,
				() => null,
				() => false,
			);

			expect(cards.value).toHaveLength(0);
		});
	});
});
