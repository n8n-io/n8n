import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import ResourceCard from '../ResourceCard.vue';
import type { ResourceItem } from '../../data/resourceCenterData';
import type { CardVariant } from '../ResourceCard.vue';

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

const readyToRunItem: ResourceItem = {
	id: 'summarize-the-news',
	type: 'ready-to-run',
	title: 'Summarize the news',
	description: 'Get AI-powered news summaries',
	quickStartId: 'summarize-the-news',
	nodeCount: 4,
};

function mountCard(item: ResourceItem, variant: CardVariant = 'header') {
	return mount(ResourceCard, {
		props: { item, variant },
		global: {
			plugins: [createTestingPinia({ createSpy: vi.fn })],
		},
	});
}

const variants: CardVariant[] = ['header', 'accent', 'spotlight'];

describe('ResourceCard', () => {
	describe.each(variants)('variant "%s"', (variant) => {
		it('renders badge for each type', () => {
			const items = [
				{ item: templateItem, expected: 'Template' },
				{ item: videoItem, expected: 'Video' },
				{ item: readyToRunItem, expected: 'Ready to Run' },
			];
			for (const { item, expected } of items) {
				const wrapper = mountCard(item, variant);
				expect(wrapper.find('[data-testid="resource-card-badge"]').text()).toContain(expected);
			}
		});

		it('renders title', () => {
			const wrapper = mountCard(templateItem, variant);
			expect(wrapper.find('[data-testid="resource-card-title"]').text()).toBe(templateItem.title);
		});

		it('renders metadata', () => {
			const wrapper = mountCard(videoItem, variant);
			const cardText = wrapper.find('[data-testid="resource-card"]').text();
			expect(cardText).toContain('15 min');
			expect(cardText).toContain('Beginner');
		});

		it('emits click event when clicked', async () => {
			const wrapper = mountCard(templateItem, variant);
			await wrapper.find('[data-testid="resource-card"]').trigger('click');
			expect(wrapper.emitted('click')).toHaveLength(1);
		});
	});
});
