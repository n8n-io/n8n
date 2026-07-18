import type {
	ActionTypeDescription,
	NodeCreateElement,
	SectionCreateElement,
	SimplifiedNodeType,
} from '@/Interface';
import {
	extractAiGatewaySection,
	finalizeItems,
	formatTriggerActionName,
	filterAndSearchNodes,
	groupItemsInSections,
	prepareCommunityNodeDetailsViewStack,
	removeTrailingTrigger,
	showsAiGatewaySection,
	sortNodeCreateElements,
	shouldShowCommunityNodeDetails,
	getHumanInTheLoopActions,
	getHumanInTheLoopCallout,
	getRootSearchCallouts,
	getSendAndWaitNodes,
	matchesAliasForConnectBoost,
	nodeTypesToCreateElements,
	mapToolSubcategoryIcon,
	searchNodes,
} from './nodeCreator.utils';
import {
	mockActionCreateElement,
	mockNodeCreateElement,
	mockSectionCreateElement,
	mockSimplifiedNodeType,
} from './__tests__/utils';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

import { mock } from 'vitest-mock-extended';
import type { ViewStack } from './composables/useViewStacks';
import { NodeConnectionTypes, SEND_AND_WAIT_OPERATION } from 'n8n-workflow';
import {
	DISCORD_NODE_TYPE,
	MICROSOFT_TEAMS_NODE_TYPE,
	AI_CATEGORY_OTHER_TOOLS,
	AI_CATEGORY_VECTOR_STORES,
	AI_CATEGORY_HUMAN_IN_THE_LOOP,
	AI_CATEGORY_MCP_NODES,
	AI_CATEGORY_ROOT_NODES,
	AI_SUBCATEGORY,
	DEFAULT_SUBCATEGORY,
	HITL_SUBCATEGORY,
	HUMAN_IN_THE_LOOP_CATEGORY,
	REGULAR_NODE_CREATOR_VIEW,
	TRIGGER_NODE_CREATOR_VIEW,
} from '@/app/constants';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSettingsStore } from '@/app/stores/settings.store';

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: vi.fn(() => ({ settings: {}, isAskAiEnabled: true })),
}));

vi.mock('@/app/stores/aiGateway.store', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/app/stores/aiGateway.store')>()),
	useAiGatewayStore: vi.fn(() => ({
		isNodeSupported: vi.fn(() => false),
		isNodeTypeVersionSupported: vi.fn(() => true),
	})),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		getNodeVersions: vi.fn(() => []),
		communityNodeType: vi.fn(() => null),
	})),
}));

describe('NodeCreator - utils', () => {
	describe('groupItemsInSections', () => {
		it('should handle multiple sections (with "other" section)', () => {
			const node1 = mockNodeCreateElement({ key: 'popularNode' });
			const node2 = mockNodeCreateElement({ key: 'newNode' });
			const node3 = mockNodeCreateElement({ key: 'otherNode' });
			const result = groupItemsInSections(
				[node1, node2, node3],
				[
					{ key: 'popular', title: 'Popular', items: [node1.key] },
					{ key: 'new', title: 'New', items: [node2.key] },
				],
			) as SectionCreateElement[];
			expect(result.length).toEqual(3);
			expect(result[0].title).toEqual('Popular');
			expect(result[0].children).toEqual([node1]);
			expect(result[1].title).toEqual('New');
			expect(result[1].children).toEqual([node2]);
			expect(result[2].title).toEqual('Other');
			expect(result[2].children).toEqual([node3]);
		});

		it('should handle no sections', () => {
			const node1 = mockNodeCreateElement({ key: 'popularNode' });
			const node2 = mockNodeCreateElement({ key: 'newNode' });
			const node3 = mockNodeCreateElement({ key: 'otherNode' });
			const result = groupItemsInSections([node1, node2, node3], []);
			expect(result).toEqual([node1, node2, node3]);
		});

		it('should handle only empty sections', () => {
			const node1 = mockNodeCreateElement({ key: 'popularNode' });
			const node2 = mockNodeCreateElement({ key: 'newNode' });
			const node3 = mockNodeCreateElement({ key: 'otherNode' });
			const result = groupItemsInSections(
				[node1, node2, node3],
				[
					{ key: 'popular', title: 'Popular', items: [] },
					{ key: 'new', title: 'New', items: ['someOtherNodeType'] },
				],
			);
			expect(result).toEqual([node1, node2, node3]);
		});
	});

	describe('sortNodeCreateElements', () => {
		it('should sort nodes alphabetically by displayName', () => {
			const node1 = mockNodeCreateElement({ key: 'newNode' }, { displayName: 'xyz' });
			const node2 = mockNodeCreateElement({ key: 'popularNode' }, { displayName: 'abc' });
			const node3 = mockNodeCreateElement({ key: 'otherNode' }, { displayName: 'ABC' });
			expect(sortNodeCreateElements([node1, node2, node3])).toEqual([node2, node3, node1]);
		});

		it('should not change order for other types (sections, actions)', () => {
			const node1 = mockSectionCreateElement();
			const node2 = mockActionCreateElement();
			const node3 = mockSectionCreateElement();
			expect(sortNodeCreateElements([node1, node2, node3])).toEqual([node1, node2, node3]);
		});
	});

	describe('formatTriggerActionName', () => {
		test.each([
			['project.created', 'project created'],
			['Project Created', 'project created'],
			['field.value.created', 'field value created'],
			['attendee.checked_in', 'attendee checked in'],
		])('Action name %i should become as %i', (actionName, expected) => {
			expect(formatTriggerActionName(actionName)).toEqual(expected);
		});
	});

	describe('filterAndSearchNodes', () => {
		beforeEach(() => {
			setActivePinia(createTestingPinia());
		});

		const mergedNodes: SimplifiedNodeType[] = [
			{
				displayName: 'Sample Node',
				defaults: {
					name: 'SampleNode',
				},
				description: 'Sample description',
				name: 'n8n-nodes-preview-test.SampleNode',
				group: ['transform'],
				outputs: ['main'],
			},
			{
				displayName: 'Other Node',
				defaults: {
					name: 'OtherNode',
				},
				description: 'Other node description',
				name: 'n8n-nodes-preview-test.OtherNode',
				group: ['transform'],
				outputs: ['main'],
			},
		];

		test('should return only one node', () => {
			const result = filterAndSearchNodes(mergedNodes, 'sample');

			expect(result.length).toEqual(1);
			expect(result[0].key).toEqual('n8n-nodes-preview-test.SampleNode');
		});

		test('should return two nodes', () => {
			const result = filterAndSearchNodes(mergedNodes, 'node');

			expect(result.length).toEqual(2);
			expect(result[1].key).toEqual('n8n-nodes-preview-test.SampleNode');
			expect(result[0].key).toEqual('n8n-nodes-preview-test.OtherNode');
		});

		test('should return [] when in HITL subcategory', () => {
			const result = filterAndSearchNodes(mergedNodes, 'node', { isHitlSubcategory: true });
			expect(result).toEqual([]);
		});

		describe('AI subcategory pickers', () => {
			const aiNodes: SimplifiedNodeType[] = [
				{
					displayName: 'Instagram Tool',
					defaults: { name: 'Instagram' },
					description: 'Instagram as tool',
					name: '@mookielianhd/n8n-nodes-preview-instagram.instagramTool',
					group: ['transform'],
					outputs: ['ai_tool'],
				},
				{
					displayName: 'Instagram',
					defaults: { name: 'Instagram' },
					description: 'Instagram node',
					name: '@mookielianhd/n8n-nodes-preview-instagram.instagram',
					group: ['transform'],
					outputs: ['main'],
				},
				{
					displayName: 'Other Tool',
					defaults: { name: 'OtherTool' },
					description: 'Other tool',
					name: 'n8n-nodes-preview-other.otherTool',
					group: ['transform'],
					outputs: [{ type: 'ai_tool' }],
				},
				{
					displayName: 'Acme Language Model',
					defaults: { name: 'AcmeLM' },
					description: 'Community language model',
					name: 'n8n-nodes-preview-acme.acmeLanguageModel',
					group: ['transform'],
					outputs: ['ai_languageModel'],
				},
			];

			test('in the Tools picker surfaces only AiTool-output community nodes', () => {
				const result = filterAndSearchNodes(aiNodes, 'instagram', {
					isAiSubcategory: true,
					aiConnectionType: 'ai_tool',
				});

				expect(result).toHaveLength(1);
				expect(result[0].key).toEqual('@mookielianhd/n8n-nodes-preview-instagram.instagramTool');
			});

			test('supports object-form outputs when matching the picker connection type', () => {
				const result = filterAndSearchNodes(aiNodes, 'other', {
					isAiSubcategory: true,
					aiConnectionType: 'ai_tool',
				});

				expect(result).toHaveLength(1);
				expect(result[0].key).toEqual('n8n-nodes-preview-other.otherTool');
			});

			test('in the Language Model picker surfaces only AiLanguageModel-output nodes', () => {
				const result = filterAndSearchNodes(aiNodes, 'acme', {
					isAiSubcategory: true,
					aiConnectionType: 'ai_languageModel',
				});

				expect(result).toHaveLength(1);
				expect(result[0].key).toEqual('n8n-nodes-preview-acme.acmeLanguageModel');
			});

			test('does not leak AiTool nodes into the Language Model picker', () => {
				const result = filterAndSearchNodes(aiNodes, 'instagram', {
					isAiSubcategory: true,
					aiConnectionType: 'ai_languageModel',
				});

				expect(result).toEqual([]);
			});

			test('returns [] when AI subcategory is active but the connection type is unknown', () => {
				const result = filterAndSearchNodes(aiNodes, 'instagram', {
					isAiSubcategory: true,
				});

				expect(result).toEqual([]);
			});

			test('returns [] when search is empty even in AI subcategory', () => {
				const result = filterAndSearchNodes(aiNodes, '', {
					isAiSubcategory: true,
					aiConnectionType: 'ai_tool',
				});

				expect(result).toEqual([]);
			});

			test('skips nodes with expression-string outputs without throwing', () => {
				const nodesWithExpressionOutputs: SimplifiedNodeType[] = [
					{
						displayName: 'Dynamic Outputs Node',
						defaults: { name: 'Dynamic' },
						description: 'Node with dynamically computed outputs',
						name: 'n8n-nodes-preview-dynamic.dynamic',
						group: ['transform'],
						// INodeTypeDescription.outputs can be an expression string, not an array
						outputs:
							'={{ $parameter["mode"] === "tool" ? ["ai_tool"] : ["main"] }}' as unknown as SimplifiedNodeType['outputs'],
					},
					...aiNodes,
				];

				const result = filterAndSearchNodes(nodesWithExpressionOutputs, 'dynamic', {
					isAiSubcategory: true,
					aiConnectionType: 'ai_tool',
				});

				expect(result).toEqual([]);
			});
		});
	});
	describe('prepareCommunityNodeDetailsViewStack', () => {
		beforeEach(() => {
			setActivePinia(createTestingPinia());
		});
		const nodeCreateElement: NodeCreateElement = {
			key: 'n8n-nodes-preview-test.OtherNode',
			properties: {
				defaults: {
					name: 'OtherNode',
				},
				description: 'Other node description',
				displayName: 'Other Node',
				group: ['transform'],
				name: 'n8n-nodes-preview-test.OtherNode',
				outputs: ['main'],
			},
			subcategory: '*',
			type: 'node',
			uuid: 'n8n-nodes-preview-test.OtherNode-32f238f0-2b05-47ce-b43d-7fab6d7ba3cb',
		};

		test('should return "community-node" view stack', () => {
			const result = prepareCommunityNodeDetailsViewStack(nodeCreateElement, undefined, undefined);

			expect(result).toEqual({
				communityNodeDetails: {
					description: 'Other node description',
					installed: false,
					key: 'n8n-nodes-preview-test.OtherNode',
					nodeIcon: undefined,
					packageName: 'n8n-nodes-test',
					title: 'Other Node',
					official: false,
				},
				hasSearch: false,
				items: [
					{
						key: 'n8n-nodes-preview-test.OtherNode',
						properties: {
							defaults: {
								name: 'OtherNode',
							},
							description: 'Other node description',
							displayName: 'Other Node',
							group: ['transform'],
							name: 'n8n-nodes-preview-test.OtherNode',
							outputs: ['main'],
						},
						subcategory: '*',
						type: 'node',
						uuid: 'n8n-nodes-preview-test.OtherNode-32f238f0-2b05-47ce-b43d-7fab6d7ba3cb',
					},
				],
				mode: 'community-node',
				rootView: undefined,
				subcategory: 'Other Node',
				title: 'Node details',
			});
		});

		test('should return "actions" view stack', () => {
			const nodeActions: ActionTypeDescription[] = [
				{
					name: 'n8n-nodes-preview-test.OtherNode',
					group: ['trigger'],
					codex: {
						label: 'Log Actions',
						categories: ['Actions'],
					},
					iconUrl: 'icons/n8n-nodes-preview-test/dist/nodes/Test/test.svg',
					outputs: ['main'],
					defaults: {
						name: 'LogSnag',
					},
					actionKey: 'publish',
					description: 'Publish an event',
					displayOptions: {
						show: {
							resource: ['log'],
						},
					},
					values: {
						operation: 'publish',
					},
					displayName: 'Publish an event',
				},
				{
					name: 'n8n-nodes-preview-test.OtherNode',
					group: ['trigger'],
					codex: {
						label: 'Insight Actions',
						categories: ['Actions'],
					},
					iconUrl: 'icons/n8n-nodes-preview-test/dist/nodes/Test/test.svg',
					outputs: ['main'],
					defaults: {
						name: 'LogSnag',
					},
					actionKey: 'publish',
					description: 'Publish an insight',
					displayOptions: {
						show: {
							resource: ['insight'],
						},
					},
					values: {
						operation: 'publish',
					},
					displayName: 'Publish an insight',
				},
			];
			const result = prepareCommunityNodeDetailsViewStack(
				nodeCreateElement,
				undefined,
				undefined,
				nodeActions,
			);

			expect(result).toEqual({
				communityNodeDetails: {
					description: 'Other node description',
					installed: false,
					key: 'n8n-nodes-preview-test.OtherNode',
					nodeIcon: undefined,
					packageName: 'n8n-nodes-test',
					title: 'Other Node',
					official: false,
				},
				hasSearch: false,
				items: [
					{
						key: 'n8n-nodes-preview-test.OtherNode',
						properties: {
							actionKey: 'publish',
							codex: {
								categories: ['Actions'],
								label: 'Log Actions',
							},
							defaults: {
								name: 'LogSnag',
							},
							description: 'Publish an event',
							displayName: 'Publish an event',
							displayOptions: {
								show: {
									resource: ['log'],
								},
							},
							group: ['trigger'],
							iconUrl: 'icons/n8n-nodes-preview-test/dist/nodes/Test/test.svg',
							name: 'n8n-nodes-preview-test.OtherNode',
							outputs: ['main'],
							values: {
								operation: 'publish',
							},
						},
						subcategory: 'Other Node',
						type: 'action',
						uuid: expect.any(String),
					},
					{
						key: 'n8n-nodes-preview-test.OtherNode',
						properties: {
							actionKey: 'publish',
							codex: {
								categories: ['Actions'],
								label: 'Insight Actions',
							},
							defaults: {
								name: 'LogSnag',
							},
							description: 'Publish an insight',
							displayName: 'Publish an insight',
							displayOptions: {
								show: {
									resource: ['insight'],
								},
							},
							group: ['trigger'],
							iconUrl: 'icons/n8n-nodes-preview-test/dist/nodes/Test/test.svg',
							name: 'n8n-nodes-preview-test.OtherNode',
							outputs: ['main'],
							values: {
								operation: 'publish',
							},
						},
						subcategory: 'Other Node',
						type: 'action',
						uuid: expect.any(String),
					},
				],
				mode: 'actions',
				rootView: undefined,
				subcategory: 'Other Node',
				title: 'Node details',
			});
		});
	});
	describe('removeTrailingTrigger', () => {
		test.each([
			['Telegram Trigger', 'Telegram'],
			['Trigger Telegram', 'Trigger Telegram'],
			['Telegram Tri', 'Telegram'],
			['Telegram Bot', 'Telegram Bot'],
			['Tri', 'Tri'],
			['Trigger', 'Trigger'],
			['Telegram', 'Telegram'],
			['Telegram Trigger Bot', 'Telegram Trigger Bot'],
			['Telegram Trig', 'Telegram'],
			['Telegram Bot trigger', 'Telegram Bot'],
			['Telegram TRIGGER', 'Telegram'],
			['', ''],
			['Telegram　Trigger', 'Telegram　Trigger'], // full-width space,
			['Telegram Trigger  ', 'Telegram Trigger'],
			['Telegram   Trigger', 'Telegram'],
		])('should transform "%s" to "%s"', (input, expected) => {
			expect(removeTrailingTrigger(input)).toEqual(expected);
		});
	});

	describe('shouldShowCommunityNodeDetails', () => {
		it('should return false if rootView is "AI Other" and title is "Tools"', () => {
			const viewStack = mock<ViewStack>({ rootView: 'AI Other', title: 'Tools' });
			expect(shouldShowCommunityNodeDetails(true, viewStack)).toBe(false);
			expect(shouldShowCommunityNodeDetails(false, viewStack)).toBe(false);
		});

		it('should return false if communityNode is true and communityNodeDetails is defined in viewStack', () => {
			const viewStack = mock<ViewStack>({ communityNodeDetails: { title: 'test' } });
			expect(shouldShowCommunityNodeDetails(true, viewStack)).toBe(false);
		});

		it('should return true if communityNode is true and communityNodeDetails is not defined in viewStack, and the viewStack does not have rootView "AI Other" and title "Tools"', () => {
			expect(shouldShowCommunityNodeDetails(true, {})).toBe(true);
		});

		it('should return false if communityNode is false and communityNodeDetails is not defined in viewStack', () => {
			expect(shouldShowCommunityNodeDetails(false, {})).toBe(false);
		});
	});

	describe('getHumanInTheLoopActions', () => {
		it('should return an empty array if no actions are passed in', () => {
			const actions: ActionTypeDescription[] = [];
			expect(getHumanInTheLoopActions(actions)).toEqual([]);
		});

		it('should return an empty array if no actions have the SEND_AND_WAIT_OPERATION actionKey', () => {
			const actions: ActionTypeDescription[] = [
				{
					name: 'Test Action',
					group: ['trigger'],
					codex: {
						label: 'Test Actions',
						categories: ['Actions'],
					},
					iconUrl: 'icons/n8n-nodes-preview-test/dist/nodes/Test/test.svg',
					outputs: ['main'],
					defaults: {
						name: 'TestAction',
					},
					actionKey: 'test',
					description: 'Test action',
					displayName: 'Test Action',
				},
			];
			expect(getHumanInTheLoopActions(actions)).toEqual([]);
		});

		it('should set the resource and operation for Discord actions', () => {
			const actions: ActionTypeDescription[] = [
				{
					name: DISCORD_NODE_TYPE,
					group: ['trigger'],
					codex: {
						label: 'Discord Actions',
						categories: ['Actions'],
					},
					iconUrl: 'icons/n8n-nodes-preview-test/dist/nodes/Test/test.svg',
					outputs: ['main'],
					defaults: {
						name: 'DiscordAction',
					},
					actionKey: SEND_AND_WAIT_OPERATION,
					description: 'Discord action',
					displayName: 'Discord Action',
					values: {},
				},
			];
			const result = getHumanInTheLoopActions(actions);
			expect(result[0].values).toEqual({
				resource: 'message',
				operation: SEND_AND_WAIT_OPERATION,
			});
		});

		it('should set the resource and operation for Microsoft Teams actions', () => {
			const actions: ActionTypeDescription[] = [
				{
					name: MICROSOFT_TEAMS_NODE_TYPE,
					group: ['trigger'],
					codex: {
						label: 'Microsoft Teams Actions',
						categories: ['Actions'],
					},
					iconUrl: 'icons/n8n-nodes-preview-test/dist/nodes/Test/test.svg',
					outputs: ['main'],
					defaults: {
						name: 'MicrosoftTeamsAction',
					},
					actionKey: SEND_AND_WAIT_OPERATION,
					description: 'Microsoft Teams action',
					displayName: 'Microsoft Teams Action',
					values: {},
				},
			];
			const result = getHumanInTheLoopActions(actions);
			expect(result[0].values).toEqual({
				resource: 'chatMessage',
				operation: SEND_AND_WAIT_OPERATION,
			});
		});
	});

	describe('nodeTypesToCreateElements', () => {
		it('should return an empty array when nodeTypes is empty', () => {
			const createElements = [
				mockNodeCreateElement({ key: 'node1' }, { displayName: 'Node 1' }),
				mockNodeCreateElement({ key: 'node2' }, { displayName: 'Node 2' }),
			];
			expect(nodeTypesToCreateElements([], createElements)).toEqual([]);
		});

		it('should return an empty array when createElements is empty', () => {
			expect(nodeTypesToCreateElements(['node1', 'node2'], [])).toEqual([]);
		});

		it('should find and return elements matching the nodeTypes', () => {
			const node1 = mockNodeCreateElement({ key: 'node1' }, { displayName: 'Node 1' });
			const node2 = mockNodeCreateElement({ key: 'node2' }, { displayName: 'Node 2' });
			const node3 = mockNodeCreateElement({ key: 'node3' }, { displayName: 'Node 3' });
			const createElements = [node1, node2, node3];

			const result = nodeTypesToCreateElements(['node1', 'node3'], createElements);

			expect(result.length).toBe(2);
			expect(result[0].key).toBe('node1');
			expect(result[1].key).toBe('node3');
		});

		it('should skip nodeTypes that do not exist in createElements', () => {
			const node1 = mockNodeCreateElement({ key: 'node1' }, { displayName: 'Node 1' });
			const node2 = mockNodeCreateElement({ key: 'node2' }, { displayName: 'Node 2' });
			const createElements = [node1, node2];

			const result = nodeTypesToCreateElements(['node1', 'nonExistent', 'node2'], createElements);

			expect(result.length).toBe(2);
			expect(result[0].key).toBe('node1');
			expect(result[1].key).toBe('node2');
		});

		it('should sort elements alphabetically when sortAlphabetically is true (default)', () => {
			const node1 = mockNodeCreateElement({ key: 'node1' }, { displayName: 'Zebra Node' });
			const node2 = mockNodeCreateElement({ key: 'node2' }, { displayName: 'Alpha Node' });
			const node3 = mockNodeCreateElement({ key: 'node3' }, { displayName: 'Beta Node' });
			const createElements = [node1, node2, node3];

			const result = nodeTypesToCreateElements(['node1', 'node2', 'node3'], createElements);

			expect(result.length).toBe(3);
			expect(result[0].key).toBe('node2'); // Alpha Node
			expect(result[1].key).toBe('node3'); // Beta Node
			expect(result[2].key).toBe('node1'); // Zebra Node
		});

		it('should preserve order from nodeTypes array when sortAlphabetically is false', () => {
			const node1 = mockNodeCreateElement({ key: 'node1' }, { displayName: 'Zebra Node' });
			const node2 = mockNodeCreateElement({ key: 'node2' }, { displayName: 'Alpha Node' });
			const node3 = mockNodeCreateElement({ key: 'node3' }, { displayName: 'Beta Node' });
			const createElements = [node1, node2, node3];

			const result = nodeTypesToCreateElements(['node3', 'node1', 'node2'], createElements, false);

			expect(result.length).toBe(3);
			expect(result[0].key).toBe('node3');
			expect(result[1].key).toBe('node1');
			expect(result[2].key).toBe('node2');
		});

		it('should handle duplicate nodeTypes in the input array', () => {
			const node1 = mockNodeCreateElement({ key: 'node1' }, { displayName: 'Node 1' });
			const createElements = [node1];

			const result = nodeTypesToCreateElements(['node1', 'node1', 'node1'], createElements);

			expect(result.length).toBe(3);
			expect(result[0].key).toBe('node1');
			expect(result[1].key).toBe('node1');
			expect(result[2].key).toBe('node1');
		});

		it('should work with different element types (nodes, actions, sections)', () => {
			const node1 = mockNodeCreateElement({ key: 'node1' }, { displayName: 'Node 1' });
			const action1 = mockActionCreateElement('subcategory', { displayName: 'Action 1' });
			action1.key = 'action1';
			const section1 = mockSectionCreateElement({ key: 'section1' });
			const createElements = [node1, action1, section1];

			const result = nodeTypesToCreateElements(['node1', 'action1', 'section1'], createElements);

			expect(result.length).toBe(3);
			expect(result.some((el) => el.key === 'node1')).toBe(true);
			expect(result.some((el) => el.key === 'action1')).toBe(true);
			expect(result.some((el) => el.key === 'section1')).toBe(true);
		});

		it('should handle case-sensitive key matching', () => {
			const node1 = mockNodeCreateElement({ key: 'Node1' }, { displayName: 'Node 1' });
			const node2 = mockNodeCreateElement({ key: 'node1' }, { displayName: 'Node 1 Lowercase' });
			const createElements = [node1, node2];

			const result = nodeTypesToCreateElements(['Node1', 'node1'], createElements);

			expect(result.length).toBe(2);
			expect(result[0].key).toBe('Node1');
			expect(result[1].key).toBe('node1');
		});
	});

	describe('finalizeItems - MCP registry tool isNew flag', () => {
		const makeMcpNode = (subcategoriesAi: string[]) =>
			mockNodeCreateElement(undefined, {
				name: 'mcpRegistryNode',
				codex: {
					categories: ['AI'],
					subcategories: { [AI_SUBCATEGORY]: subcategoriesAi },
				},
			});

		it('should flag registry-generated MCP tools as new', () => {
			const node = makeMcpNode([AI_CATEGORY_MCP_NODES]);
			const [result] = finalizeItems([node]) as NodeCreateElement[];
			expect(result.properties.isNew).toBe(true);
		});

		it('should not flag MCP nodes that are also Root Nodes (e.g. McpTrigger)', () => {
			const node = makeMcpNode([AI_CATEGORY_ROOT_NODES, AI_CATEGORY_MCP_NODES]);
			const [result] = finalizeItems([node]) as NodeCreateElement[];
			expect(result.properties.isNew).toBeUndefined();
		});

		it('should not flag tools that are not in the MCP subcategory', () => {
			const node = makeMcpNode(['Tools']);
			const [result] = finalizeItems([node]) as NodeCreateElement[];
			expect(result.properties.isNew).toBeUndefined();
		});
	});

	describe('finalizeItems - Free credits badge (minNodeTypeVersion gate)', () => {
		const makeGatewayNode = (name = 'gatewayNode') => mockNodeCreateElement(undefined, { name });

		beforeEach(() => {
			vi.mocked(useSettingsStore).mockReturnValue({
				isAiGatewayEnabled: true,
			} as unknown as ReturnType<typeof useSettingsStore>);
			vi.mocked(useAiGatewayStore).mockReturnValue({
				isNodeSupported: vi.fn(() => true),
				isNodeTypeVersionSupported: vi.fn(() => true),
			} as unknown as ReturnType<typeof useAiGatewayStore>);
			vi.mocked(useNodeTypesStore).mockReturnValue({
				getNodeVersions: vi.fn(() => [1, 1.1]),
			} as unknown as ReturnType<typeof useNodeTypesStore>);
		});

		it('should show Free credits badge when latest version meets the minimum', () => {
			const [result] = finalizeItems([makeGatewayNode()]) as NodeCreateElement[];
			expect(result.properties.tag).toEqual({ text: 'Free credits', pill: true });
		});

		it('should suppress Free credits badge when latest version is below the minimum', () => {
			vi.mocked(useAiGatewayStore).mockReturnValue({
				isNodeSupported: vi.fn(() => true),
				isNodeTypeVersionSupported: vi.fn(() => false),
			} as unknown as ReturnType<typeof useAiGatewayStore>);

			const [result] = finalizeItems([makeGatewayNode()]) as NodeCreateElement[];
			expect(result.properties.tag).toBeUndefined();
		});

		it('should suppress Free credits badge when gateway is disabled', () => {
			vi.mocked(useSettingsStore).mockReturnValue({
				isAiGatewayEnabled: false,
			} as unknown as ReturnType<typeof useSettingsStore>);

			const [result] = finalizeItems([makeGatewayNode()]) as NodeCreateElement[];
			expect(result.properties.tag).toBeUndefined();
		});

		it('should pass the latest (max) version to the version check', () => {
			const isNodeTypeVersionSupported = vi.fn(() => true);
			vi.mocked(useNodeTypesStore).mockReturnValue({
				getNodeVersions: vi.fn(() => [1, 1.1, 2]),
			} as unknown as ReturnType<typeof useNodeTypesStore>);
			vi.mocked(useAiGatewayStore).mockReturnValue({
				isNodeSupported: vi.fn(() => true),
				isNodeTypeVersionSupported,
			} as unknown as ReturnType<typeof useAiGatewayStore>);

			finalizeItems([makeGatewayNode('my-node')]);
			expect(isNodeTypeVersionSupported).toHaveBeenCalledWith('my-node', 2);
		});

		it('should fall back to version 1 when the node type has no known versions', () => {
			const isNodeTypeVersionSupported = vi.fn(() => true);
			vi.mocked(useNodeTypesStore).mockReturnValue({
				getNodeVersions: vi.fn(() => []),
				communityNodeType: vi.fn(() => null),
			} as unknown as ReturnType<typeof useNodeTypesStore>);
			vi.mocked(useAiGatewayStore).mockReturnValue({
				isNodeSupported: vi.fn(() => true),
				isNodeTypeVersionSupported,
			} as unknown as ReturnType<typeof useAiGatewayStore>);

			finalizeItems([makeGatewayNode('my-node')]);
			expect(isNodeTypeVersionSupported).toHaveBeenCalledWith('my-node', 1);
		});

		it('should fall back to the community node description version for a preview node', () => {
			// Preview community nodes are absent from the core map, so getNodeVersions
			// is empty; the version must come from the community node description.
			const isNodeTypeVersionSupported = vi.fn(() => true);
			vi.mocked(useNodeTypesStore).mockReturnValue({
				getNodeVersions: vi.fn(() => []),
				communityNodeType: vi.fn(() => ({ nodeDescription: { version: [1, 2] } })),
			} as unknown as ReturnType<typeof useNodeTypesStore>);
			vi.mocked(useAiGatewayStore).mockReturnValue({
				isNodeSupported: vi.fn(() => true),
				isNodeTypeVersionSupported,
			} as unknown as ReturnType<typeof useAiGatewayStore>);

			finalizeItems([makeGatewayNode('my-node')]);
			expect(isNodeTypeVersionSupported).toHaveBeenCalledWith('my-node', 2);
		});

		it('should show Free credits badge for a Tool-suffixed node whose base name is in the gateway config', () => {
			// "llamaParsePlatformTool" is not in config, but "llamaParsePlatform" is.
			vi.mocked(useAiGatewayStore).mockReturnValue({
				isNodeSupported: vi.fn((name: string) => name === 'llamaParsePlatform'),
				isNodeTypeVersionSupported: vi.fn(() => true),
			} as unknown as ReturnType<typeof useAiGatewayStore>);

			const [result] = finalizeItems([
				makeGatewayNode('llamaParsePlatformTool'),
			]) as NodeCreateElement[];
			expect(result.properties.tag).toEqual({ text: expect.any(String), pill: true });
		});

		it('should show Free credits badge for an uninstalled preview node whose canonical name is in the gateway config', () => {
			// Preview community nodes carry a `-preview` token; the gateway config
			// only lists the canonical name, so the token must be stripped.
			vi.mocked(useAiGatewayStore).mockReturnValue({
				isNodeSupported: vi.fn((name: string) => name === '@vendor/n8n-nodes-connect.connect'),
				isNodeTypeVersionSupported: vi.fn(() => true),
			} as unknown as ReturnType<typeof useAiGatewayStore>);

			const [result] = finalizeItems([
				makeGatewayNode('@vendor/n8n-nodes-preview-connect.connect'),
			]) as NodeCreateElement[];
			expect(result.properties.tag).toEqual({ text: expect.any(String), pill: true });
		});

		it('should suppress Free credits badge when neither the Tool-suffixed name nor the base name is in the gateway config', () => {
			vi.mocked(useAiGatewayStore).mockReturnValue({
				isNodeSupported: vi.fn(() => false),
				isNodeTypeVersionSupported: vi.fn(() => true),
			} as unknown as ReturnType<typeof useAiGatewayStore>);

			const [result] = finalizeItems([makeGatewayNode('unknownTool')]) as NodeCreateElement[];
			expect(result.properties.tag).toBeUndefined();
		});
	});

	describe('showsAiGatewaySection', () => {
		it.each<[string, ViewStack, boolean]>([
			['Language Models list', { connectionType: NodeConnectionTypes.AiLanguageModel }, true],
			[
				'nodes panel "Action in an app"',
				{ rootView: REGULAR_NODE_CREATOR_VIEW, subcategory: DEFAULT_SUBCATEGORY },
				true,
			],
			['tools panel "Action in an app"', { subcategory: AI_CATEGORY_OTHER_TOOLS }, true],
			[
				'trigger panel "On app event"',
				{ rootView: TRIGGER_NODE_CREATOR_VIEW, subcategory: DEFAULT_SUBCATEGORY },
				false,
			],
			[
				'any view while searching',
				{ connectionType: NodeConnectionTypes.AiLanguageModel, search: 'gpt' },
				false,
			],
			['unrelated subcategory', { subcategory: AI_CATEGORY_VECTOR_STORES }, false],
		])('%s -> %s', (_, stack, expected) => {
			expect(showsAiGatewaySection(stack)).toBe(expected);
		});

		it('should return false without a stack', () => {
			expect(showsAiGatewaySection(undefined)).toBe(false);
		});
	});

	describe('extractAiGatewaySection', () => {
		const makeNode = (name: string) => mockNodeCreateElement({ key: name }, { name });

		beforeEach(() => {
			vi.mocked(useSettingsStore).mockReturnValue({
				isAiGatewayEnabled: true,
			} as unknown as ReturnType<typeof useSettingsStore>);
			vi.mocked(useAiGatewayStore).mockReturnValue({
				isNodeSupported: vi.fn((name: string) => name.startsWith('supported')),
				isNodeTypeVersionSupported: vi.fn(() => true),
			} as unknown as ReturnType<typeof useAiGatewayStore>);
			vi.mocked(useNodeTypesStore).mockReturnValue({
				getNodeVersions: vi.fn(() => [1]),
			} as unknown as ReturnType<typeof useNodeTypesStore>);
		});

		it('should split gateway-supported nodes into an Included in n8n section', () => {
			const supported = makeNode('supportedNode');
			const other = makeNode('otherNode');

			const result = extractAiGatewaySection([supported, other]);

			expect(result).not.toBeNull();
			expect(result?.section.key).toBe('n8nConnect');
			expect(result?.section.title).toBe('Included in n8n');
			expect(result?.section.trailing).toBe('creditsBalance');
			expect(result?.section.showSeparator).toBe(true);
			expect(result?.section.children.map((child) => child.key)).toEqual(['supportedNode']);
			expect(result?.rest).toEqual([other]);
		});

		it('should tag section children with the Free credits pill', () => {
			const result = extractAiGatewaySection([makeNode('supportedNode')]);
			const [child] = result?.section.children as NodeCreateElement[];
			expect(child.properties.tag).toEqual({ text: 'Free credits', pill: true });
		});

		it('should return null when no node is gateway-supported', () => {
			expect(extractAiGatewaySection([makeNode('otherNode')])).toBeNull();
		});

		it('should return null when the gateway is disabled', () => {
			vi.mocked(useSettingsStore).mockReturnValue({
				isAiGatewayEnabled: false,
			} as unknown as ReturnType<typeof useSettingsStore>);

			expect(extractAiGatewaySection([makeNode('supportedNode')])).toBeNull();
		});
	});

	describe('matchesAliasForConnectBoost', () => {
		it('should match an exact alias', () => {
			expect(matchesAliasForConnectBoost('scrape', ['scrape'])).toBe(true);
		});

		it('should match an exact alias below 3 characters', () => {
			expect(matchesAliasForConnectBoost('ai', ['ai'])).toBe(true);
		});

		it('should match case-insensitively', () => {
			expect(matchesAliasForConnectBoost('SCRAPE', ['Scrape'])).toBe(true);
		});

		it('should match a whole-alias prefix of 3+ characters', () => {
			expect(matchesAliasForConnectBoost('scr', ['scrape'])).toBe(true);
			expect(matchesAliasForConnectBoost('scra', ['scrape'])).toBe(true);
		});

		it('should not match a partial prefix below 3 characters', () => {
			expect(matchesAliasForConnectBoost('sc', ['scrape'])).toBe(false);
		});

		it('should match an alias-token prefix', () => {
			expect(matchesAliasForConnectBoost('pdf', ['pdf parser'])).toBe(true);
			expect(matchesAliasForConnectBoost('pars', ['pdf parser'])).toBe(true);
		});

		it('should not match a fuzzy subsequence', () => {
			// 'shee' appears in-order in 'search engine' but no token starts with it
			expect(matchesAliasForConnectBoost('shee', ['search engine'])).toBe(false);
		});

		it('should not match an empty query', () => {
			expect(matchesAliasForConnectBoost('', ['scrape'])).toBe(false);
		});

		// The 3-char threshold exists specifically so short aliases like `ocr` and
		// `pdf` stay boostable while 1-2 char partials remain noise-free.
		it.each<[string, string[], boolean]>([
			['serp', ['serp'], true],
			['fetch', ['fetch'], true],
			['browse', ['browser', 'browse'], true],
			['ocr', ['ocr'], true],
			['pdf', ['pdf', 'parse'], true],
			['scrap', ['scrape'], true],
			['inv', ['invoice'], true],
			['invoice', ['pdf', 'extract', 'ocr', 'invoice', 'scan', 'parse'], true],
			['oc', ['ocr'], false],
			['pd', ['pdf'], false],
		])('matches "%s" against %j -> %s', (query, aliases, expected) => {
			expect(matchesAliasForConnectBoost(query, aliases)).toBe(expected);
		});
	});

	describe('searchNodes - n8n Connect boost', () => {
		const makeNode = (name: string, displayName: string, alias: string[] = []) =>
			mockNodeCreateElement(
				{ key: name },
				{ name, displayName, codex: { categories: [], subcategories: {}, alias } },
			);

		const mockStores = ({
			gatewayEnabled = true,
			supportedNodes = [] as string[],
			versionSupported = true,
		} = {}) => {
			vi.mocked(useSettingsStore).mockReturnValue({
				isAskAiEnabled: true,
				isAiGatewayEnabled: gatewayEnabled,
			} as unknown as ReturnType<typeof useSettingsStore>);
			vi.mocked(useAiGatewayStore).mockReturnValue({
				isNodeSupported: vi.fn((name: string) => supportedNodes.includes(name)),
				isNodeTypeVersionSupported: vi.fn(() => versionSupported),
			} as unknown as ReturnType<typeof useAiGatewayStore>);
			vi.mocked(useNodeTypesStore).mockReturnValue({
				getNodeVersions: vi.fn(() => [1]),
			} as unknown as ReturnType<typeof useNodeTypesStore>);
		};

		// Two nodes with the same alias: without the boost the earlier item wins
		// the tie, so connect ranking first proves the boost was applied.
		const plainNode = makeNode('plainNode', 'Plain Node', ['scrape']);
		const connectNode = makeNode('connectNode', 'Connect Node', ['scrape']);

		it('should rank a Connect node above an equal non-Connect match on alias prefix', () => {
			mockStores({ supportedNodes: ['connectNode'] });

			const result = searchNodes('scra', [plainNode, connectNode]);
			expect(result.map((item) => item.key)).toEqual(['connectNode', 'plainNode']);
		});

		it('should not boost when the gateway is disabled', () => {
			mockStores({ gatewayEnabled: false, supportedNodes: ['connectNode'] });

			const result = searchNodes('scra', [plainNode, connectNode]);
			expect(result.map((item) => item.key)).toEqual(['plainNode', 'connectNode']);
		});

		it('should not boost a node missing from the gateway config', () => {
			mockStores({ supportedNodes: [] });

			const result = searchNodes('scra', [plainNode, connectNode]);
			expect(result.map((item) => item.key)).toEqual(['plainNode', 'connectNode']);
		});

		it('should not boost a node whose latest version is below the gateway minimum', () => {
			mockStores({ supportedNodes: ['connectNode'], versionSupported: false });

			const result = searchNodes('scra', [plainNode, connectNode]);
			expect(result.map((item) => item.key)).toEqual(['plainNode', 'connectNode']);
		});

		it('should boost a Tool-suffixed node via its base name', () => {
			mockStores({ supportedNodes: ['connect'] });
			const plainTool = makeNode('plainTool', 'Plain Tool', ['scrape']);
			const connectTool = makeNode('connectTool', 'Connect Tool', ['scrape']);

			const result = searchNodes('scra', [plainTool, connectTool]);
			expect(result.map((item) => item.key)).toEqual(['connectTool', 'plainTool']);
		});

		it('should not boost on a fuzzy subsequence match and keep the intent match on top', () => {
			mockStores({ supportedNodes: ['firecrawl'] });
			const sheets = makeNode('googleSheets', 'Google Sheets');
			const firecrawl = makeNode('firecrawl', 'Firecrawl', ['search engine']);

			const result = searchNodes('shee', [firecrawl, sheets]);
			expect(result[0].key).toEqual('googleSheets');
		});

		// The boost must apply to both core and community nodes as long as they are
		// listed as AI Gateway-supported.
		it('should boost both core and community Connect nodes above a non-Connect node', () => {
			const core = makeNode('n8n-nodes-base.brave', 'Brave', ['serp']);
			const community = makeNode('@mendable/n8n-nodes-firecrawl.firecrawl', 'Firecrawl', ['serp']);
			const plain = makeNode('plainNode', 'Plain Node', ['serp']);
			mockStores({ supportedNodes: [core.key, community.key] });

			const keys = searchNodes('serp', [plain, core, community]).map((item) => item.key);

			expect(keys[2]).toBe('plainNode');
			expect(keys.slice(0, 2)).toEqual(expect.arrayContaining([core.key, community.key]));
		});

		it('should not boost a supported node that has no alias metadata', () => {
			mockStores({ supportedNodes: ['connectNoAlias'] });
			// codex present but without an `alias` array exercises the `?? []` fallback:
			// with no aliases there is nothing to match, so no boost is applied.
			const connectNoAlias = mockNodeCreateElement(
				{ key: 'connectNoAlias' },
				{
					name: 'connectNoAlias',
					displayName: 'Scrape Tool',
					codex: { categories: [], subcategories: {} },
				},
			);
			const plain = mockNodeCreateElement(
				{ key: 'plainNode' },
				{
					name: 'plainNode',
					displayName: 'Scrape Tool',
					codex: { categories: [], subcategories: {} },
				},
			);

			const keys = searchNodes('scrape', [plain, connectNoAlias]).map((item) => item.key);
			expect(keys).toEqual(['plainNode', 'connectNoAlias']);
		});

		it('should not boost non-node items even when their name is gateway-supported', () => {
			mockStores({ supportedNodes: ['connectAction'] });
			const plain = makeNode('plainNode', 'Serp Tool', ['serp']);
			// An action element that matches by alias and is "supported": the type guard
			// must skip it, so it is never boosted above the (unboosted) node.
			const action = mockActionCreateElement(undefined, {
				name: 'connectAction',
				displayName: 'Serp Action',
				codex: { label: 'Serp', categories: [], alias: ['serp'] },
			} as unknown as Partial<ActionTypeDescription>);
			action.key = 'connectAction';

			const keys = searchNodes('serp', [plain, action]).map((item) => item.key);
			expect(keys[0]).toBe('plainNode');
		});
	});

	describe('mapToolSubcategoryIcon', () => {
		it('should return "globe" for AI_CATEGORY_OTHER_TOOLS', () => {
			expect(mapToolSubcategoryIcon(AI_CATEGORY_OTHER_TOOLS)).toBe('globe');
		});

		it('should return "database" for AI_CATEGORY_VECTOR_STORES', () => {
			expect(mapToolSubcategoryIcon(AI_CATEGORY_VECTOR_STORES)).toBe('database');
		});

		it('should return "badge-check" for AI_CATEGORY_HUMAN_IN_THE_LOOP', () => {
			expect(mapToolSubcategoryIcon(AI_CATEGORY_HUMAN_IN_THE_LOOP)).toBe('badge-check');
		});

		it('should return "globe" as default for unknown section keys', () => {
			expect(mapToolSubcategoryIcon('unknown-section')).toBe('globe');
			expect(mapToolSubcategoryIcon('')).toBe('globe');
			expect(mapToolSubcategoryIcon('some-other-key')).toBe('globe');
		});
	});

	describe('getSendAndWaitNodes', () => {
		const hitlNode = mockSimplifiedNodeType({
			name: 'n8n-nodes-base.slack',
			codex: { categories: ['Communication', HUMAN_IN_THE_LOOP_CATEGORY] },
		});
		const otherNode = mockSimplifiedNodeType({
			name: 'n8n-nodes-base.httpRequest',
			codex: { categories: ['Core Nodes'] },
		});

		it('returns the names of nodes in the HITL category', () => {
			expect(getSendAndWaitNodes([hitlNode, otherNode])).toEqual(['n8n-nodes-base.slack']);
		});

		it('returns an empty array when there are no nodes', () => {
			expect(getSendAndWaitNodes(undefined as unknown as SimplifiedNodeType[])).toEqual([]);
		});
	});

	describe('getHumanInTheLoopCallout', () => {
		it('builds a subcategory tile targeting the HITL view with its send-and-wait nodes', () => {
			const hitlNode = mockSimplifiedNodeType({
				name: 'n8n-nodes-base.slack',
				codex: { categories: [HUMAN_IN_THE_LOOP_CATEGORY] },
			});

			const callout = getHumanInTheLoopCallout([hitlNode]);

			expect(callout).toMatchObject({
				type: 'subcategory',
				key: HITL_SUBCATEGORY,
				properties: { title: HITL_SUBCATEGORY, icon: 'badge-check' },
			});
			expect(callout.properties.sections).toEqual([
				expect.objectContaining({ key: 'sendAndWait', items: ['n8n-nodes-base.slack'] }),
			]);
		});
	});

	describe('getRootSearchCallouts', () => {
		const hitlNode = mockSimplifiedNodeType({
			name: 'n8n-nodes-base.slack',
			codex: { categories: [HUMAN_IN_THE_LOOP_CATEGORY] },
		});

		const findHitlCallout = (search: string) =>
			getRootSearchCallouts(search, {}, [hitlNode]).find((item) => item.key === HITL_SUBCATEGORY);

		it.each(['human', 'human in the loop', 'hitl', 'approval', 'review', 'HUMAN', 'Human Review'])(
			'surfaces the Human review subcategory when searching "%s"',
			(search) => {
				expect(findHitlCallout(search)?.type).toBe('subcategory');
			},
		);

		it.each(['slack', 'set', 'webhook', ''])(
			'does not surface the Human review subcategory for unrelated search "%s"',
			(search) => {
				expect(findHitlCallout(search)).toBeUndefined();
			},
		);

		it('does not surface the rag starter callout unless it is enabled', () => {
			expect(getRootSearchCallouts('rag', {}, [])).toEqual([]);
		});
	});
});
