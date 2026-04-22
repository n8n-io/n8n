/* eslint-disable import-x/no-extraneous-dependencies */
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import ResourceFeatureCard from '../ResourceFeatureCard.vue';
import type { ResourceItem } from '../../data/resourceCenterData';

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({ getNodeType: vi.fn(() => null) }),
}));

const readyToRunItem: ResourceItem = {
	id: 'summarize-the-news',
	type: 'ready-to-run',
	title: 'Summarize the news',
	description: 'Get AI-powered news summaries',
	quickStartId: 'summarize-the-news',
	nodeTypes: ['n8n-nodes-base.gmail'],
};

function mountCard(item: ResourceItem) {
	return mount(ResourceFeatureCard, {
		props: { item, tone: 'rose' },
		global: {
			plugins: [createTestingPinia({ createSpy: vi.fn })],
		},
	});
}

describe('ResourceFeatureCard', () => {
	it('renders the hero copy and run button', () => {
		const wrapper = mountCard(readyToRunItem);
		const cardText = wrapper.find('[data-testid="resource-feature-card"]').text();

		expect(cardText).toContain('Summarize the news');
		expect(cardText).toContain('Ready to run');
		expect(cardText).toContain('Run');
	});

	it('emits click when the card is clicked', async () => {
		const wrapper = mountCard(readyToRunItem);

		await wrapper.find('[data-testid="resource-feature-card"]').trigger('click');

		expect(wrapper.emitted('click')).toHaveLength(1);
	});
});
