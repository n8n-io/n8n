/* eslint-disable import-x/no-extraneous-dependencies, @typescript-eslint/no-unsafe-assignment -- test-only patterns: @vue/test-utils is a transitive devDep, mock reads */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { mount } from '@vue/test-utils';
import type { TimelineItem } from '../session-timeline.types';

beforeAll(() => {
	// The chart wires a ResizeObserver and reads matchMedia on scroll.
	class ResizeObserverMock {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
	(window as unknown as { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver =
		ResizeObserverMock;
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches: false,
		media: query,
		addEventListener() {},
		removeEventListener() {},
	}));
});

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@/app/utils/formatters/dateFormatter', () => ({
	convertToDisplayDate: () => ({ date: '', time: '00:00' }),
}));

vi.mock('@n8n/utils/string/truncate', () => ({
	truncate: (value: string) => value,
}));

vi.mock('../utils/toolDisplayName', () => ({
	formatToolNameForDisplay: (name: string) => name,
	resolveToolNameForDisplay: (name: string) => name,
}));

const STUBS = {
	N8nHoverCard: { template: '<div><slot name="content" /></div>' },
	N8nIconButton: {
		props: ['icon', 'variant', 'size', 'disabled', 'ariaLabel'],
		template: '<button :data-icon="icon" :disabled="disabled" />',
	},
	N8nIcon: {
		props: ['icon', 'size'],
		template: '<span :data-icon="icon" />',
	},
	SessionTimelinePill: {
		props: ['kind', 'label', 'showLabel'],
		template: '<span :data-kind="kind" />',
	},
};

function item(partial: Partial<TimelineItem>): TimelineItem {
	return {
		kind: 'tool',
		executionId: 'e1',
		timestamp: 1000,
		endTimestamp: 1500,
		toolName: 'http',
		...partial,
	} as TimelineItem;
}

async function renderComponent(items: TimelineItem[]) {
	const { default: SessionTimelineChart } = await import('../components/SessionTimelineChart.vue');
	return mount(SessionTimelineChart, {
		props: {
			items,
			idleRanges: [],
			sessionStart: 1000,
			sessionEnd: 2000,
			visibleKinds: new Set<string>(),
			selectedIndex: null,
		},
		global: { stubs: STUBS },
	});
}

describe('SessionTimelineChart failure marking', () => {
	it('marks a failed tool block with the failed class and data attribute', async () => {
		const wrapper = await renderComponent([
			item({ kind: 'tool', toolSuccess: false, toolOutput: { error: 'boom' } }),
		]);
		const block = wrapper.find('[data-test-id="timeline-block"]');
		expect(block.exists()).toBe(true);
		expect(block.attributes('data-failed')).toBe('true');
		expect(block.classes()).toContain('failed');
	}, 30_000);

	it('marks a workflow soft-failure block as failed', async () => {
		const wrapper = await renderComponent([
			item({
				kind: 'workflow',
				toolSuccess: true,
				toolOutput: { status: 'error', error: 'x' },
			}),
		]);
		const block = wrapper.find('[data-test-id="timeline-block"]');
		expect(block.attributes('data-failed')).toBe('true');
		expect(block.classes()).toContain('failed');
	});

	it('does not mark a successful tool block as failed', async () => {
		const wrapper = await renderComponent([
			item({ kind: 'tool', toolSuccess: true, toolOutput: { ok: true } }),
		]);
		const block = wrapper.find('[data-test-id="timeline-block"]');
		expect(block.attributes('data-failed')).toBeUndefined();
		expect(block.classes()).not.toContain('failed');
	});
});
