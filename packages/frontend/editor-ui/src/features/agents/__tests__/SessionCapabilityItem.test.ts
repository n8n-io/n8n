import {
	N8nAiActivityStepButton,
	N8nAnimatedCollapsibleContent,
	N8nIcon,
	N8nSpinner,
} from '@n8n/design-system';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SessionCapabilityItem from '../components/timeline-items/SessionCapabilityItem.vue';
import type { TimelineItem } from '../session-timeline.types';

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({ getNodeType: () => null }),
}));

vi.mock('@/app/utils/formatters/dateFormatter', () => ({
	convertToDisplayDate: () => ({ time: '00:00' }),
}));

vi.mock('../utils/toolDisplayName', () => ({
	formatToolNameForDisplay: (name: string) => name,
	resolveToolNameForDisplay: (name: string) => name,
}));

enableAutoUnmount(afterEach);

function item(overrides: Partial<TimelineItem> = {}): TimelineItem {
	return {
		kind: 'tool',
		executionId: 'e-1',
		timestamp: 1000,
		toolName: 'http',
		toolInput: { method: 'GET' },
		activityStatus: 'completed',
		...overrides,
	};
}

function renderItem(overrides: Partial<TimelineItem> = {}) {
	return mount(SessionCapabilityItem, {
		props: { item: item(overrides), selected: false },
		global: {
			stubs: {
				N8nTooltip: {
					template:
						'<span><slot /><span data-testid="tooltip"><slot name="content" /></span></span>',
				},
				NodeIcon: true,
			},
		},
	});
}

describe('SessionCapabilityItem activity status', () => {
	it('shows a grid spinner and shimmer without an expand action while running', async () => {
		const wrapper = renderItem({ activityStatus: 'running' });
		expect(wrapper.getComponent(N8nSpinner).props('type')).toBe('grid');
		expect(wrapper.getComponent(N8nAiActivityStepButton).props('loading')).toBe(true);
		expect(wrapper.find('[aria-expanded]').exists()).toBe(false);
		await wrapper.get('button').trigger('click');
		expect(wrapper.findComponent(N8nAnimatedCollapsibleContent).exists()).toBe(false);
	});

	it.each(['waiting', 'completed'] as const)('keeps %s rows expandable', (activityStatus) => {
		const wrapper = renderItem({ activityStatus });
		expect(wrapper.get('button').attributes('aria-expanded')).toBe('false');
		expect(wrapper.getComponent(N8nAiActivityStepButton).props('loading')).toBe(false);
	});

	it('shows a danger alert icon with the error tooltip for a failed call', () => {
		const wrapper = renderItem({
			activityStatus: 'failed',
			toolOutcome: 'error',
			toolOutput: { error: 'Request failed' },
		});
		const icon = wrapper
			.findAllComponents(N8nIcon)
			.find((component) => component.props('icon') === 'circle-alert');
		expect(icon?.props('color')).toBe('danger');
		expect(wrapper.get('[data-testid="tooltip"]').text()).toContain('Request failed');
	});

	it('shows a muted close icon without an expand action when interrupted', () => {
		const wrapper = renderItem({ activityStatus: 'interrupted' });
		expect(
			wrapper.findAllComponents(N8nIcon).some((icon) => icon.props('icon') === 'circle-x'),
		).toBe(true);
		expect(wrapper.find('[aria-expanded]').exists()).toBe(false);
		expect(wrapper.classes().some((name) => name.includes('interrupted'))).toBe(true);
	});

	it('enables expansion when a running call completes', async () => {
		const wrapper = renderItem({ activityStatus: 'running' });
		await wrapper.setProps({ item: item({ activityStatus: 'completed' }) });
		expect(wrapper.findComponent(N8nSpinner).exists()).toBe(false);
		expect(wrapper.get('button').attributes('aria-expanded')).toBe('false');
	});

	it('does not expand a running row for a matching search', async () => {
		const wrapper = renderItem({ activityStatus: 'running' });
		await wrapper.setProps({ searchQuery: 'http' });
		expect(wrapper.find('[aria-expanded]').exists()).toBe(false);
	});
});
