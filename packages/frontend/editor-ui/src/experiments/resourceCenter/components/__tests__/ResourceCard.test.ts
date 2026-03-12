import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import ResourceCard from '../ResourceCard.vue';
import type { ResourceItem } from '../../data/resourceCenterData';

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

function mountCard(item: ResourceItem) {
	return mount(ResourceCard, {
		props: { item },
		global: {
			plugins: [createTestingPinia({ createSpy: vi.fn })],
		},
	});
}

describe('ResourceCard', () => {
	describe('type badge', () => {
		it('renders "Template" badge for template items', () => {
			const wrapper = mountCard(templateItem);
			expect(wrapper.find('[data-testid="resource-card-badge"]').text()).toBe('Template');
		});

		it('renders "Video" badge for video items', () => {
			const wrapper = mountCard(videoItem);
			expect(wrapper.find('[data-testid="resource-card-badge"]').text()).toContain('Video');
		});

		it('renders "Ready to Run" badge for ready-to-run items', () => {
			const wrapper = mountCard(readyToRunItem);
			expect(wrapper.find('[data-testid="resource-card-badge"]').text()).toContain('Ready to Run');
		});
	});

	describe('content', () => {
		it('renders title', () => {
			const wrapper = mountCard(templateItem);
			expect(wrapper.find('[data-testid="resource-card-title"]').text()).toBe(templateItem.title);
		});

		it('renders description', () => {
			const wrapper = mountCard(templateItem);
			expect(wrapper.find('[data-testid="resource-card-description"]').text()).toBe(
				templateItem.description,
			);
		});
	});

	describe('metadata', () => {
		it('shows duration and level for video items', () => {
			const wrapper = mountCard(videoItem);
			const meta = wrapper.find('[data-testid="resource-card-metadata"]').text();
			expect(meta).toContain('15 min');
			expect(meta).toContain('Beginner');
		});

		it('shows "No setup" and node count for ready-to-run items', () => {
			const wrapper = mountCard(readyToRunItem);
			const meta = wrapper.find('[data-testid="resource-card-metadata"]').text();
			expect(meta).toContain('No setup');
		});

		it('shows setup time and node count for template items', () => {
			const wrapper = mountCard(templateItem);
			const meta = wrapper.find('[data-testid="resource-card-metadata"]').text();
			expect(meta).toContain('5 min');
		});
	});

	describe('interaction', () => {
		it('emits click event when clicked', async () => {
			const wrapper = mountCard(templateItem);
			await wrapper.trigger('click');
			expect(wrapper.emitted('click')).toHaveLength(1);
		});
	});
});
