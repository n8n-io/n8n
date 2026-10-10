import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SessionBackgroundJobItem from '../components/timeline-items/SessionBackgroundJobItem.vue';
import type { TimelineItem } from '../session-timeline.types';

vi.mock('@/app/utils/formatters/dateFormatter', () => ({
	convertToDisplayDate: () => ({ time: '10:42' }),
}));

enableAutoUnmount(afterEach);

function item(overrides: Partial<TimelineItem> = {}): TimelineItem {
	return {
		kind: 'background-task-signal',
		executionId: 'e-1',
		timestamp: 1000,
		backgroundJobSignal: {
			tasks: [
				{ id: 'job-1', title: 'Research', kind: 'subagent', status: 'completed' },
				{ id: 'job-2', title: 'Send report', kind: 'workflow', status: 'failed' },
				{ id: 'job-3', title: 'Check data', kind: 'workflow', status: 'cancelled' },
			],
		},
		...overrides,
	};
}

function renderItem(overrides: Partial<TimelineItem> = {}, searchQuery = '') {
	return mount(SessionBackgroundJobItem, {
		props: { item: item(overrides), selected: false, searchQuery },
	});
}

describe('SessionBackgroundJobItem', () => {
	it('shows the task summary and time with collapsed details', () => {
		const wrapper = renderItem();
		expect(wrapper.get('button').text()).toContain('Research — Completed');
		expect(wrapper.get('button').text()).toContain('Send report — Failed');
		expect(wrapper.text()).toContain('10:42');
		expect(wrapper.get('button').attributes('aria-expanded')).toBe('false');
	});

	it('shows each task title and final status when expanded', async () => {
		const wrapper = renderItem();
		await wrapper.get('button').trigger('click');
		expect(wrapper.get('button').attributes('aria-expanded')).toBe('true');
		const tasks = wrapper.get('[data-test-id="background-job-signal-details"]').findAll('li');
		expect(tasks.map((task) => task.text())).toEqual([
			'Research — Completed',
			'Send report — Failed',
			'Check data — Canceled',
		]);
	});

	it.each(['research', 'failed', 'canceled'])(
		'opens details for a matching search for %s',
		async (query) => {
			const wrapper = renderItem({}, query);
			expect(wrapper.get('button').attributes('aria-expanded')).toBe('true');
			await wrapper.setProps({ searchQuery: '' });
			expect(wrapper.get('button').attributes('aria-expanded')).toBe('false');
		},
	);

	it.each([undefined, { tasks: [] }])('keeps an empty signal non-interactive', (signal) => {
		const wrapper = renderItem({ backgroundJobSignal: signal });
		expect(wrapper.get('button').text()).toContain('Background task results received');
		expect(wrapper.get('button').attributes('aria-disabled')).toBe('true');
		expect(wrapper.find('[data-test-id="background-job-signal-details"]').exists()).toBe(false);
	});
});
