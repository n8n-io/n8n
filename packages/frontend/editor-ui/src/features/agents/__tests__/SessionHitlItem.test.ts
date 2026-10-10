import { N8nBadge, N8nCodeBlock } from '@n8n/design-system';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SessionHitlItem from '../components/timeline-items/SessionHitlItem.vue';
import type { TimelineItem } from '../session-timeline.types';

vi.mock('@/app/utils/formatters/dateFormatter', () => ({
	convertToDisplayDate: () => ({ time: '10:42' }),
}));

enableAutoUnmount(afterEach);

function item(overrides: Partial<TimelineItem> = {}): TimelineItem {
	return {
		kind: 'suspension',
		executionId: 'e-1',
		timestamp: 1000,
		hitlRequestType: 'approval',
		hitlToolDisplayName: 'Send email',
		hitlRequest: { args: { subject: 'Hello' } },
		...overrides,
	};
}

function renderItem(overrides: Partial<TimelineItem> = {}, searchQuery = '') {
	return mount(SessionHitlItem, {
		props: { item: item(overrides), selected: false, searchQuery },
	});
}

describe('SessionHitlItem', () => {
	it('shows the request label, badge, and time with collapsed details', async () => {
		const wrapper = renderItem();
		expect(wrapper.text()).toContain('Approval request for Send email');
		expect(wrapper.getComponent(N8nBadge).text()).toBe('Approval requested');
		expect(wrapper.text()).toContain('10:42');
		expect(wrapper.get('button').attributes('aria-expanded')).toBe('false');
		await wrapper.get('button').trigger('click');
		expect(wrapper.get('button').attributes('aria-expanded')).toBe('true');
		expect(wrapper.getComponent(N8nCodeBlock).props('code')).toBe(
			JSON.stringify({ subject: 'Hello' }, null, 2),
		);
	});

	it.each([
		['approved', 'Approved', 'success'],
		['declined', 'Declined', 'outline'],
		['responded', 'Response received', 'outline'],
	] as const)('shows the %s response badge and response data', async (status, label, theme) => {
		const wrapper = renderItem({
			kind: 'hitl-response',
			hitlResponseStatus: status,
			hitlResponse: { decision: status },
		});
		expect(wrapper.getComponent(N8nBadge).text()).toBe(label);
		expect(wrapper.getComponent(N8nBadge).props('variant')).toBe(theme);
		await wrapper.get('button').trigger('click');
		expect(wrapper.getComponent(N8nCodeBlock).props('code')).toBe(
			JSON.stringify({ decision: status }, null, 2),
		);
	});

	it('opens matching request details for search and closes when search clears', async () => {
		const wrapper = renderItem({ hitlRequest: '{"args":{"subject":"Hello"}}' }, 'hello');
		expect(wrapper.get('button').attributes('aria-expanded')).toBe('true');
		expect(wrapper.getComponent(N8nCodeBlock).props('code')).toContain('Hello');
		await wrapper.setProps({ searchQuery: '' });
		expect(wrapper.get('button').attributes('aria-expanded')).toBe('false');
	});

	it('keeps requests without data non-interactive', () => {
		const wrapper = renderItem({ hitlRequest: undefined });
		expect(wrapper.get('button').attributes('aria-disabled')).toBe('true');
		expect(wrapper.findComponent(N8nCodeBlock).exists()).toBe(false);
	});

	it('shows plain response text without JSON parsing errors', async () => {
		const wrapper = renderItem({ kind: 'hitl-response', hitlResponse: 'Continue' });
		await wrapper.get('button').trigger('click');
		expect(wrapper.getComponent(N8nCodeBlock).props('code')).toBe('Continue');
	});
});
