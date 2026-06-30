import { NodeConnectionTypes, type INodeProperties, type INodeTypeDescription } from 'n8n-workflow';
import { useActionsGenerator } from './useActionsGeneration';
import { usePostHog } from '@/app/stores/posthog.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { SIMPLE_MEMORY_NODE_TYPE } from '@/app/constants';
import { mockedStore } from '@/__tests__/utils';

let posthogStore: ReturnType<typeof usePostHog>;
let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;

describe('useActionsGenerator', () => {
	const { generateMergedNodesAndActions } = useActionsGenerator();
	const NODE_NAME = 'n8n-nodes-base.test';
	const baseV2NodeWoProps: INodeTypeDescription = {
		name: NODE_NAME,
		displayName: 'Test',
		description: 'Test Node',
		defaultVersion: 2,
		version: 2,
		group: ['output'],
		defaults: {
			name: 'Test',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
	};

	beforeEach(() => {
		vi.clearAllMocks();

		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);

		posthogStore = usePostHog();
		vi.spyOn(posthogStore, 'isVariantEnabled').mockReturnValue(true);

		settingsStore = mockedStore(useSettingsStore);
		settingsStore.isQueueModeEnabled = false;
		settingsStore.isMultiMain = false;
	});

	describe('App actions for resource category', () => {
		const resourcePropertyWithUser: INodeProperties = {
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'User',
					value: 'user',
				},
			],
			default: 'user',
		};
		const resourcePropertyWithUserAndPage: INodeProperties = {
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'User',
					value: 'user',
				},
				{
					name: 'Page',
					value: 'page',
				},
			],
			default: 'user',
		};

		it('returns single action for single resource & single operation without resource filter', () => {
			const node: INodeTypeDescription = {
				...baseV2NodeWoProps,
				properties: [
					resourcePropertyWithUser,
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						noDataExpression: true,
						displayOptions: {},
						options: [
							{
								name: 'Get',
								value: 'get',
								description: 'Get description',
							},
						],
						default: 'get',
					},
				],
			};

			const { actions } = generateMergedNodesAndActions([node], []);
			expect(actions).toEqual({
				[NODE_NAME]: [
					expect.objectContaining({
						actionKey: 'get',
						description: 'Get description',
						displayName: 'User Get',
						codex: {
							label: 'User Actions',
							categories: ['Actions'],
						},
					}),
				],
			});
		});

		it('returns single action for single resource & single operation with matching resource filter', () => {
			const node: INodeTypeDescription = {
				...baseV2NodeWoProps,
				properties: [
					resourcePropertyWithUser,
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						noDataExpression: true,
						displayOptions: {
							show: {
								resource: ['user'],
							},
						},
						options: [
							{
								name: 'Get',
								value: 'get',
								description: 'Get description',
							},
						],
						default: 'get',
					},
				],
			};

			const { actions } = generateMergedNodesAndActions([node], []);
			expect(actions).toEqual({
				[NODE_NAME]: [
					expect.objectContaining({
						actionKey: 'get',
						description: 'Get description',
						displayName: 'User Get',
						codex: {
							label: 'User Actions',
							categories: ['Actions'],
						},
					}),
				],
			});
		});

		it('returns nothing for multiple resources & single operation without resource filter', () => {
			const node: INodeTypeDescription = {
				...baseV2NodeWoProps,
				properties: [
					resourcePropertyWithUserAndPage,
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						noDataExpression: true,
						displayOptions: {},
						options: [
							{
								name: 'Get',
								value: 'get',
								description: 'Get description',
							},
						],
						default: 'get',
					},
				],
			};

			const { actions } = generateMergedNodesAndActions([node], []);
			expect(actions).toEqual({
				[NODE_NAME]: [],
			});
		});

		it('returns single action for multiple resources & single operation with resource filter', () => {
			const node: INodeTypeDescription = {
				...baseV2NodeWoProps,
				properties: [
					resourcePropertyWithUserAndPage,
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						noDataExpression: true,
						displayOptions: {
							show: {
								resource: ['user'],
							},
						},
						options: [
							{
								name: 'Get',
								value: 'get',
								description: 'Get description',
							},
						],
						default: 'get',
					},
				],
			};

			const { actions } = generateMergedNodesAndActions([node], []);
			expect(actions).toEqual({
				[NODE_NAME]: [
					expect.objectContaining({
						actionKey: 'get',
						description: 'Get description',
						displayName: 'User Get',
						codex: {
							label: 'User Actions',
							categories: ['Actions'],
						},
					}),
				],
			});
		});

		it('returns multiple actions for multiple resources & multiple operations with resource filters', () => {
			const node: INodeTypeDescription = {
				...baseV2NodeWoProps,
				properties: [
					resourcePropertyWithUserAndPage,
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						noDataExpression: true,
						displayOptions: {
							show: {
								resource: ['user'],
							},
						},
						options: [
							{
								name: 'Get',
								value: 'get',
								description: 'Get description',
							},
						],
						default: 'get',
					},
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						noDataExpression: true,
						displayOptions: {
							show: {
								resource: ['page'],
							},
						},
						options: [
							{
								name: 'Get',
								value: 'get',
								description: 'Get description',
							},
						],
						default: 'get',
					},
				],
			};

			const { actions } = generateMergedNodesAndActions([node], []);
			expect(actions).toEqual({
				[NODE_NAME]: [
					expect.objectContaining({
						actionKey: 'get',
						description: 'Get description',
						displayName: 'User Get',
						codex: {
							label: 'User Actions',
							categories: ['Actions'],
						},
					}),
					expect.objectContaining({
						actionKey: 'get',
						description: 'Get description',
						displayName: 'Page Get',
						codex: {
							label: 'Page Actions',
							categories: ['Actions'],
						},
					}),
				],
			});
		});

		it('returns correct action for single resource & multiple operations with different versions', () => {
			const node: INodeTypeDescription = {
				...baseV2NodeWoProps,
				properties: [
					resourcePropertyWithUser,
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						noDataExpression: true,
						displayOptions: {
							show: {
								'@version': [1],
								resource: ['user'],
							},
						},
						options: [
							{
								name: 'Get Version 1',
								value: 'getv1',
								description: 'Get version 1',
							},
						],
						default: 'getv1',
					},
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						noDataExpression: true,
						displayOptions: {
							show: {
								'@version': [2],
								resource: ['user'],
							},
						},
						options: [
							{
								name: 'Get Version 2',
								value: 'getv2',
								description: 'Get version 2',
							},
						],
						default: 'getv2',
					},
				],
			};

			const { actions } = generateMergedNodesAndActions([node], []);
			expect(actions).toEqual({
				[NODE_NAME]: [
					expect.objectContaining({
						actionKey: 'getv2',
						description: 'Get version 2',
						displayName: 'User Get Version 2',
						codex: {
							label: 'User Actions',
							categories: ['Actions'],
						},
					}),
				],
			});
		});

		it('returns correct action for single resource & single operation with multiple versions', () => {
			const node: INodeTypeDescription = {
				...baseV2NodeWoProps,
				properties: [
					resourcePropertyWithUser,
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						noDataExpression: true,
						displayOptions: {
							show: {
								'@version': [1, 2],
								resource: ['user'],
							},
						},
						options: [
							{
								name: 'Get Version 2',
								value: 'getv2',
								description: 'Get version 2',
							},
						],
						default: 'getv2',
					},
				],
			};

			const { actions } = generateMergedNodesAndActions([node], []);
			expect(actions).toEqual({
				[NODE_NAME]: [
					expect.objectContaining({
						actionKey: 'getv2',
						description: 'Get version 2',
						displayName: 'User Get Version 2',
						codex: {
							label: 'User Actions',
							categories: ['Actions'],
						},
					}),
				],
			});
		});
	});

	describe('Simple Memory node filtering', () => {
		const simpleMemoryNode: INodeTypeDescription = {
			name: SIMPLE_MEMORY_NODE_TYPE,
			displayName: 'Simple Memory',
			description: 'Stores in n8n memory',
			defaultVersion: 1,
			version: 1,
			group: ['transform'],
			defaults: {
				name: 'Simple Memory',
			},
			inputs: [],
			outputs: [NodeConnectionTypes.AiMemory],
			properties: [],
		};

		const regularNode: INodeTypeDescription = {
			name: 'n8n-nodes-base.regularNode',
			displayName: 'Regular Node',
			description: 'A regular node',
			defaultVersion: 1,
			version: 1,
			group: ['output'],
			defaults: {
				name: 'Regular Node',
			},
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			properties: [],
		};

		it('should include Simple Memory node in regular mode', () => {
			settingsStore.isQueueModeEnabled = false;
			settingsStore.isMultiMain = false;

			const { mergedNodes } = generateMergedNodesAndActions([simpleMemoryNode, regularNode], []);

			const nodeNames = mergedNodes.map((n) => n.name);
			expect(nodeNames).toContain(SIMPLE_MEMORY_NODE_TYPE);
			expect(nodeNames).toContain('n8n-nodes-base.regularNode');
		});

		it('should filter out Simple Memory node when queue mode is enabled', () => {
			settingsStore.isQueueModeEnabled = true;
			settingsStore.isMultiMain = false;

			const { mergedNodes } = generateMergedNodesAndActions([simpleMemoryNode, regularNode], []);

			const nodeNames = mergedNodes.map((n) => n.name);
			expect(nodeNames).not.toContain(SIMPLE_MEMORY_NODE_TYPE);
			expect(nodeNames).toContain('n8n-nodes-base.regularNode');
		});

		it('should filter out Simple Memory node when multi-main is enabled', () => {
			settingsStore.isQueueModeEnabled = false;
			settingsStore.isMultiMain = true;

			const { mergedNodes } = generateMergedNodesAndActions([simpleMemoryNode, regularNode], []);

			const nodeNames = mergedNodes.map((n) => n.name);
			expect(nodeNames).not.toContain(SIMPLE_MEMORY_NODE_TYPE);
			expect(nodeNames).toContain('n8n-nodes-base.regularNode');
		});
	});
});
