/* eslint-disable import-x/no-extraneous-dependencies */
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import ResourceCard from '../ResourceCard.vue';
import type { ResourceItem } from '../../data/resourceCenterData';

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({ getNodeType: vi.fn(() => null) }),
}));

const templateItem: ResourceItem = {
	id: 7639,
	type: 'template',
	title: 'Chat with your Google Sheet',
	description: 'Talk to your data using AI',
	templateId: 7639,
	nodeTypes: ['n8n-nodes-base.googleSheets'],
	nodeCount: 5,
	setupTime: '5 min',
};

const videoItem: ResourceItem = {
	id: '4cQWJViybAQ',
	type: 'video',
	title: 'Build your first workflow',
	description: 'Get started with n8n',
	videoId: '4cQWJViybAQ',
	duration: '15 min',
	level: 'Beginner',
};

function mountCard(item: ResourceItem) {
	return mount(ResourceCard, {
		props: { item },
		global: {
			plugins: [createTestingPinia({ createSpy: vi.fn })],
		},
	});
}

describe('ResourceCard', () => {
	it('renders badge for template and video cards', () => {
		const items = [
			{ item: templateItem, expected: 'Template' },
			{ item: videoItem, expected: 'Video' },
		];

		for (const { item, expected } of items) {
			const wrapper = mountCard(item);
			expect(wrapper.find('[data-testid="resource-card-badge"]').text()).toContain(expected);
		}
	});

	it('renders the title', () => {
		const wrapper = mountCard(templateItem);

		expect(wrapper.find('[data-testid="resource-card-title"]').text()).toBe(templateItem.title);
	});

	it('renders template metadata', () => {
		const wrapper = mountCard(templateItem);
		const cardText = wrapper.find('[data-testid="resource-card"]').text();

		expect(cardText).toContain('5 min');
		expect(cardText).toContain('5 nodes');
	});

	it('renders a source label for videos', () => {
		const wrapper = mountCard(videoItem);

		expect(wrapper.find('[data-testid="resource-card"]').text()).toContain('youtube.com');
	});

	it('emits click when the card is clicked', async () => {
		const wrapper = mountCard(templateItem);

		await wrapper.find('[data-testid="resource-card"]').trigger('click');

		expect(wrapper.emitted('click')).toHaveLength(1);
	});
});
