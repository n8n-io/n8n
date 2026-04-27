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
	it('emits click when the card or run button is activated', async () => {
		const wrapper = mountCard(readyToRunItem);

		await wrapper.find('[data-testid="resource-feature-card"]').trigger('click');
		await wrapper.find('[data-testid="resource-feature-card"]').trigger('keydown.enter');
		await wrapper.find('button').trigger('click');

		expect(wrapper.emitted('click')).toHaveLength(3);
	});

	it('does not treat run button keyboard events as card activation', async () => {
		const wrapper = mountCard(readyToRunItem);
		const runButton = wrapper.find('button');

		await runButton.trigger('keydown.enter');
		await runButton.trigger('keyup.space');

		expect(wrapper.emitted('click')).toBeUndefined();
	});
});
