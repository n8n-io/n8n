import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import N8nChatRating from './ChatRating.vue';

const global = {
	stubs: {
		N8nTooltip: {
			props: ['content'],
			template: '<div :data-tooltip="content"><slot /></div>',
		},
	},
};

describe('N8nChatRating', () => {
	it.each([
		['message-thumbs-up-button', 'up'],
		['message-thumbs-down-button', 'down'],
	])('emits the rating of the %s', async (testId, rating) => {
		const wrapper = mount(N8nChatRating, { global });

		await wrapper.get(`[data-test-id="${testId}"]`).trigger('click');

		expect(wrapper.emitted('rate')).toEqual([[rating]]);
	});

	it('labels the buttons', () => {
		const wrapper = mount(N8nChatRating, { global });

		expect(wrapper.get('[data-test-id="message-thumbs-up-button"]').attributes('aria-label')).toBe(
			'Helpful',
		);
		expect(
			wrapper.get('[data-test-id="message-thumbs-down-button"]').attributes('aria-label'),
		).toBe('Not helpful');
	});

	it('shows a thank-you note instead of the thumbs once rated', () => {
		const wrapper = mount(N8nChatRating, { props: { rating: 'down' }, global });

		expect(wrapper.find('[data-test-id="message-thumbs-up-button"]').exists()).toBe(false);
		expect(wrapper.find('[data-test-id="message-thumbs-down-button"]').exists()).toBe(false);
		expect(wrapper.get('[data-test-id="message-rating-success"]').text()).toBe(
			'Thanks for your feedback!',
		);
	});
});
