import { afterEach, describe, expect, it } from 'vitest';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import SessionTimelineSidePanel from '../components/SessionTimelineSidePanel.vue';
import type { AgentExecutionThread } from '../composables/useAgentThreadsApi';
import type { SessionTimelineMetadata } from '../types';

const thread = { id: 'thread-1', title: 'Review invoices' } as AgentExecutionThread;
const metadata: SessionTimelineMetadata = {
	trigger: { source: 'slack', icon: 'message-circle', label: 'Slack' },
	totalTokens: 1250,
	totalCost: 0.012,
	durationLabel: '12 seconds',
};

const iconStub = {
	props: ['icon'],
	template: '<span :data-icon="icon" />',
};

enableAutoUnmount(afterEach);

function mountPanel(
	props: Partial<{
		thread: AgentExecutionThread;
		metadata: SessionTimelineMetadata;
		isVisible: boolean;
	}> = {},
) {
	return mount(SessionTimelineSidePanel, {
		props: { thread, metadata, isVisible: true, ...props },
		global: { stubs: { N8nIcon: iconStub } },
	});
}

describe('SessionTimelineSidePanel', () => {
	it('displays the trigger, cost, duration, and thread title', () => {
		const wrapper = mountPanel();

		expect(wrapper.text()).toContain('Slack');
		expect(wrapper.text()).toContain('($0.012)');
		expect(wrapper.text()).toContain('12 seconds');
		expect(wrapper.text()).toContain('Review invoices');
	});

	it('uses the supplied trigger icon', () => {
		const wrapper = mountPanel({
			metadata: { ...metadata, trigger: { source: null, icon: 'calendar', label: 'Schedule' } },
		});

		expect(wrapper.find('[data-icon="calendar"]').exists()).toBe(true);
		expect(wrapper.find('[data-icon="message-circle"]').exists()).toBe(false);
	});

	it.each([
		[0, '0'],
		[999, '999'],
		[1250, '1.3K'],
		[1000000, '1M'],
	])('formats %i tokens as %s', (totalTokens, expected) => {
		const wrapper = mountPanel({ metadata: { ...metadata, totalTokens } });

		expect(wrapper.get('li:nth-child(2)').text()).toBe(`${expected} ($0.012)`);
	});

	it('adds and removes the visibility class without removing the panel', async () => {
		const wrapper = mountPanel({ isVisible: false });
		const hiddenClasses = wrapper.get('aside').classes();

		await wrapper.setProps({ isVisible: true });
		const visibleClasses = wrapper.get('aside').classes();
		expect(visibleClasses).toHaveLength(hiddenClasses.length + 1);
		expect(visibleClasses).toEqual(expect.arrayContaining(hiddenClasses));

		await wrapper.setProps({ isVisible: false });
		expect(wrapper.get('aside').classes()).toEqual(hiddenClasses);
	});

	it('updates the displayed details when props change', async () => {
		const wrapper = mountPanel();

		await wrapper.setProps({
			thread: { ...thread, title: 'Review orders' },
			metadata: {
				trigger: { source: null, icon: 'calendar', label: 'Schedule' },
				totalTokens: 1000000,
				totalCost: 0.5,
				durationLabel: '1 minute',
			},
		});

		expect(wrapper.text()).toContain('Schedule');
		expect(wrapper.get('li:nth-child(2)').text()).toBe('1M ($0.5)');
		expect(wrapper.text()).toContain('1 minute');
		expect(wrapper.text()).toContain('Review orders');
		expect(wrapper.text()).not.toContain('Slack');
		expect(wrapper.text()).not.toContain('12 seconds');
		expect(wrapper.text()).not.toContain('Review invoices');
		expect(wrapper.find('[data-icon="calendar"]').exists()).toBe(true);
	});
});
