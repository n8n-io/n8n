import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ReviewChangesBanner from './ReviewChangesBanner.vue';
import { createTestingPinia } from '@pinia/testing';
import { NodeDiffStatus, type INode } from 'n8n-workflow';
import type { NodeChangeEntry } from '@/features/ai/assistant/composables/useReviewChanges';

vi.mock('@n8n/i18n', () => {
	const baseText = (key: string, options?: { interpolate?: Record<string, string> }) => {
		if (options?.interpolate) {
			return `${key} [${JSON.stringify(options.interpolate)}]`;
		}
		return key;
	};
	return {
		useI18n: () => ({ baseText }),
		i18n: { baseText },
	};
});

const mockNodeType = { displayName: 'HTTP Request', name: 'n8n-nodes-base.httpRequest' };

const mockNodeChanges: NodeChangeEntry[] = [
	{
		status: NodeDiffStatus.Added,
		node: {
			id: 'node-1',
			name: 'HTTP Request',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		} as INode,
		nodeType: mockNodeType as NodeChangeEntry['nodeType'],
	},
	{
		status: NodeDiffStatus.Modified,
		node: {
			id: 'node-2',
			name: 'Set',
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		} as INode,
		nodeType: mockNodeType as NodeChangeEntry['nodeType'],
	},
];

const mountComponent = (props: { nodeChanges?: NodeChangeEntry[]; expanded?: boolean } = {}) => {
	return mount(ReviewChangesBanner, {
		props: {
			nodeChanges: props.nodeChanges ?? mockNodeChanges,
			expanded: props.expanded ?? false,
		},
		global: {
			plugins: [createTestingPinia()],
			stubs: {
				N8nIcon: {
					template: '<span class="n8n-icon" :data-icon="icon"></span>',
					props: ['icon', 'size'],
				},
				N8nButton: {
					template:
						'<button class="n8n-button" @click="$emit(\'click\', $event)"><slot /></button>',
					props: ['size', 'variant', 'class'],
					inheritAttrs: false,
				},
				NodeIcon: {
					template: '<span class="node-icon"></span>',
					props: ['nodeType', 'size'],
				},
				DiffBadge: {
					template: '<span class="diff-badge" :data-type="type"></span>',
					props: ['type'],
				},
			},
		},
	});
};

describe('ReviewChangesBanner', () => {
	it('renders the banner with data-test-id', () => {
		const wrapper = mountComponent();
		expect(wrapper.find('[data-test-id="review-changes-banner"]').exists()).toBe(true);
	});

	it('displays edits count text with node changes count', () => {
		const wrapper = mountComponent();
		expect(wrapper.text()).toContain('aiAssistant.builder.reviewChanges.editsCount');
		expect(wrapper.text()).toContain('"count":"2"');
	});

	it('renders a list item for each node change with name, DiffBadge, and NodeIcon', () => {
		const wrapper = mountComponent();
		const items = wrapper.findAll('li');
		expect(items).toHaveLength(2);

		expect(items[0].find('.diff-badge').exists()).toBe(true);
		expect(items[0].find('.diff-badge').attributes('data-type')).toBe(NodeDiffStatus.Added);
		expect(items[0].find('.node-icon').exists()).toBe(true);
		expect(items[0].text()).toContain('HTTP Request');

		expect(items[1].find('.diff-badge').attributes('data-type')).toBe(NodeDiffStatus.Modified);
		expect(items[1].text()).toContain('Set');
	});

	it('emits toggle when header is clicked', async () => {
		const wrapper = mountComponent();
		await wrapper.find('[role="button"]').trigger('click');
		expect(wrapper.emitted('toggle')).toHaveLength(1);
	});

	it('emits toggle when Enter is pressed on header', async () => {
		const wrapper = mountComponent();
		await wrapper.find('[role="button"]').trigger('keydown.enter');
		expect(wrapper.emitted('toggle')).toHaveLength(1);
	});

	it('emits openDiff when the open diff button is clicked', async () => {
		const wrapper = mountComponent();
		await wrapper.find('.n8n-button').trigger('click');
		expect(wrapper.emitted('openDiff')).toHaveLength(1);
	});

	it('emits selectNode with node id when a node item is clicked', async () => {
		const wrapper = mountComponent();
		const items = wrapper.findAll('li');
		await items[0].trigger('click');
		expect(wrapper.emitted('selectNode')).toEqual([['node-1']]);
	});

	it('emits selectNode with node id when Enter is pressed on a node item', async () => {
		const wrapper = mountComponent();
		const items = wrapper.findAll('li');
		await items[1].trigger('keydown.enter');
		expect(wrapper.emitted('selectNode')).toEqual([['node-2']]);
	});

	it('hides NodeIcon when nodeType is null', () => {
		const changesWithNullType: NodeChangeEntry[] = [
			{
				status: NodeDiffStatus.Added,
				node: {
					id: 'node-1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				} as INode,
				nodeType: null,
			},
		];
		const wrapper = mountComponent({ nodeChanges: changesWithNullType });
		const items = wrapper.findAll('li');
		expect(items[0].find('.node-icon').exists()).toBe(false);
	});
});
