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

// Reads useRootStore for download URLs; shows the file ids and thread instead.
vi.mock('../components/AgentChatMessageAttachments.vue', () => ({
	default: {
		props: ['attachments', 'threadId'],
		template: '<div :data-thread-id="threadId">{{ attachments.map((a) => a.fileId).join() }}</div>',
	},
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

function renderItem(
	overrides: Partial<TimelineItem> = {},
	scope: { projectId?: string; agentId?: string; threadId?: string } = {},
) {
	return mount(SessionCapabilityItem, {
		props: { item: item(overrides), selected: false, ...scope },
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
		expect(wrapper.getComponent(N8nAiActivityStepButton).props('interactive')).toBe(false);
		expect(wrapper.get('button').attributes('aria-expanded')).toBe('false');
		expect(wrapper.get('button').attributes('aria-disabled')).toBe('true');
		await wrapper.get('button').trigger('click');
		expect(wrapper.findComponent(N8nAnimatedCollapsibleContent).exists()).toBe(false);
	});

	it.each(['waiting', 'completed'] as const)('keeps %s rows expandable', async (activityStatus) => {
		const wrapper = renderItem({ activityStatus });
		expect(wrapper.get('button').attributes('aria-expanded')).toBe('false');
		expect(wrapper.getComponent(N8nAiActivityStepButton).props('loading')).toBe(false);

		await wrapper.get('button').trigger('click');
		expect(wrapper.get('button').attributes('aria-expanded')).toBe('true');
		expect(wrapper.text()).toContain('GET');

		await wrapper.get('button').trigger('click');
		expect(wrapper.get('button').attributes('aria-expanded')).toBe('false');
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

	it('shows a muted close icon without an expand action when interrupted', async () => {
		const wrapper = renderItem({ activityStatus: 'interrupted' });
		expect(
			wrapper.findAllComponents(N8nIcon).some((icon) => icon.props('icon') === 'circle-x'),
		).toBe(true);
		expect(wrapper.get('button').attributes('aria-expanded')).toBe('false');
		expect(wrapper.get('button').attributes('aria-disabled')).toBe('true');
		expect(wrapper.classes().some((name) => name.includes('interrupted'))).toBe(true);
		await wrapper.get('button').trigger('click');
		expect(wrapper.findComponent(N8nAnimatedCollapsibleContent).exists()).toBe(false);
	});

	it('enables expansion when a running call completes', async () => {
		const wrapper = renderItem({ activityStatus: 'running' });
		await wrapper.setProps({ item: item({ activityStatus: 'completed' }) });
		expect(wrapper.findComponent(N8nSpinner).exists()).toBe(false);
		expect(wrapper.get('button').attributes('aria-expanded')).toBe('false');
		await wrapper.get('button').trigger('click');
		expect(wrapper.get('button').attributes('aria-expanded')).toBe('true');
		expect(wrapper.text()).toContain('GET');
	});

	it('does not expand a running row for a matching search', async () => {
		const wrapper = renderItem({ activityStatus: 'running' });
		await wrapper.setProps({ searchQuery: 'http' });
		expect(wrapper.get('button').attributes('aria-expanded')).toBe('false');
		expect(wrapper.get('button').attributes('aria-disabled')).toBe('true');
		expect(wrapper.findComponent(N8nAnimatedCollapsibleContent).exists()).toBe(false);
	});
});

describe('SessionCapabilityItem output files', () => {
	it('shows the files of a tool output without expanding the step', async () => {
		const file = { fileId: 'f-1', fileName: 'cat.png', mimeType: 'image/png', sizeBytes: 3 };
		const wrapper = renderItem(
			{ toolOutput: JSON.stringify({ status: 'success', files: [file] }) },
			{ projectId: 'p1', agentId: 'a2', threadId: 'child' },
		);
		expect(wrapper.get('button').attributes('aria-expanded')).toBe('false');
		const files = wrapper.get('[data-test-id="timeline-tool-output-files"]');
		expect(files.text()).toBe('f-1');
		expect(files.attributes('data-thread-id')).toBe('child');
	});
});
