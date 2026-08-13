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

const customVideoItem: ResourceItem = {
	...videoItem,
	id: 'custom-video',
	url: 'https://www.n8n.io/workflows/resource-center',
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
	it('falls back to youtube.com when a video has no custom URL', () => {
		const wrapper = mountCard(videoItem);

		expect(wrapper.find('[data-testid="resource-card"]').text()).toContain('youtube.com');
	});

	it('renders the hostname from a custom video URL', () => {
		const wrapper = mountCard(customVideoItem);

		expect(wrapper.find('[data-testid="resource-card"]').text()).toContain('n8n.io');
	});

	it('emits click for mouse and keyboard activation', async () => {
		const wrapper = mountCard(templateItem);

		await wrapper.find('[data-testid="resource-card"]').trigger('click');
		await wrapper.find('[data-testid="resource-card"]').trigger('keydown.enter');
		await wrapper.find('[data-testid="resource-card"]').trigger('keyup.space');

		expect(wrapper.emitted('click')).toHaveLength(3);
	});
});
