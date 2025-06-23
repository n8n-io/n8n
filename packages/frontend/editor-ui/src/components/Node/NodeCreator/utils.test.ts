import type {
	ActionTypeDescription,
	NodeCreateElement,
	SectionCreateElement,
	SimplifiedNodeType,
} from '@/Interface';
import {
	formatTriggerActionName,
	filterAndSearchNodes,
	groupItemsInSections,
	prepareCommunityNodeDetailsViewStack,
	removeTrailingTrigger,
	sortNodeCreateElements,
	shouldShowCommunityNodeDetails,
} from './utils';
import {
	mockActionCreateElement,
	mockNodeCreateElement,
	mockSectionCreateElement,
} from './__tests__/utils';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

import { mock } from 'vitest-mock-extended';
import type { ViewStack } from './composables/useViewStacks';

vi.mock('@/stores/settings.store', () => ({
	useSettingsStore: vi.fn(() => ({ settings: {}, isAskAiEnabled: true })),
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
			const result = filterAndSearchNodes(mergedNodes, 'sample', false);

			expect(result.length).toEqual(1);
			expect(result[0].key).toEqual('n8n-nodes-preview-test.SampleNode');
		});

		test('should return two nodes', () => {
			const result = filterAndSearchNodes(mergedNodes, 'node', false);

			expect(result.length).toEqual(2);
			expect(result[1].key).toEqual('n8n-nodes-preview-test.SampleNode');
			expect(result[0].key).toEqual('n8n-nodes-preview-test.OtherNode');
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
});
