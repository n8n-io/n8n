/* eslint-disable import-x/no-extraneous-dependencies, @typescript-eslint/no-unsafe-assignment -- test-only patterns: @vue/test-utils is a transitive devDep, mock reads */
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import type { TimelineItem } from '../session-timeline.types';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({ resolve: () => ({ href: '/wf/1' }) }),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType: (name: string) => (name === 'n8n-nodes-base.httpRequest' ? { name } : undefined),
	}),
}));

vi.mock('@/app/utils/formatters/dateFormatter', () => ({
	convertToDisplayDate: () => ({ date: '', time: '00:00' }),
}));

vi.mock('@n8n/utils/string/truncate', () => ({
	truncate: (value: string) => value,
}));

vi.mock('../utils/delegate-tool', () => ({
	delegateLabel: () => 'Sub-agent',
	isDelegateSubAgentTool: () => false,
}));

vi.mock('../utils/toolDisplayName', () => ({
	formatToolNameForDisplay: (name: string) => name,
	resolveToolNameForDisplay: (name: string) => name,
}));

const STUBS = {
	N8nTooltip: { template: '<span><slot /></span>' },
	N8nIcon: {
		props: ['icon', 'size'],
		template:
			'<span :data-icon="icon" :data-testid="icon ? `icon-${icon}` : undefined"><slot /></span>',
	},
	N8nBadge: {
		props: ['theme', 'size'],
		template: '<span data-test-id="timeline-tool-error-badge"><slot /></span>',
	},
	SessionTimelinePill: {
		props: ['kind'],
		template: '<span :data-testid="pill" :data-kind="kind" />',
	},
	NodeIcon: {
		props: ['nodeType', 'size'],
		template: '<span data-testid="node-icon" :data-node-type="nodeType.name" :data-size="size" />',
	},
};

function item(partial: Partial<TimelineItem>): TimelineItem {
	return {
		kind: 'tool',
		executionId: 'e1',
		timestamp: 1000,
		toolName: 'http',
		...partial,
	} as TimelineItem;
}

async function renderComponent(it: TimelineItem) {
	const { default: SessionTimelineRow } = await import('../components/SessionTimelineRow.vue');
	return mount(SessionTimelineRow, {
		props: { item: it, selected: false },
		global: { stubs: STUBS },
	});
}

describe('SessionTimelineRow', () => {
	it('renders a skill with its name and pill', async () => {
		const wrapper = await renderComponent(item({ kind: 'skill', skillName: 'Triage' }));

		expect(wrapper.text()).toContain('Triage');
		expect(wrapper.get('[data-kind="skill"]').exists()).toBe(true);
	});

	it('renders the node icon when the node type is available', async () => {
		const wrapper = await renderComponent(
			item({ kind: 'node', nodeType: 'n8n-nodes-base.httpRequest', nodeTypeVersion: 4.2 }),
		);

		expect(wrapper.get('[data-testid="node-icon"]').attributes('data-size')).toBe('20');
		expect(wrapper.find('[data-kind]').exists()).toBe(false);
	});

	it('renders the pill when the node type is unavailable', async () => {
		const wrapper = await renderComponent(item({ kind: 'node', nodeType: 'unknown' }));

		expect(wrapper.get('[data-kind="node"]').exists()).toBe(true);
	});

	it('renders the failure icon for a generic tool soft-failure', async () => {
		const wrapper = await renderComponent(
			item({
				kind: 'tool',
				toolSuccess: true,
				toolOutput: { success: false, error: 'boom' },
			}),
		);
		expect(wrapper.find('[data-test-id="timeline-tool-error-badge"]').exists()).toBe(true);
	}, 30_000);

	it('renders the failure icon for a workflow soft-failure (success true, status error)', async () => {
		const wrapper = await renderComponent(
			item({
				kind: 'workflow',
				toolSuccess: true,
				toolOutput: { status: 'error', error: 'node X failed' },
			}),
		);
		expect(wrapper.find('[data-test-id="timeline-tool-error-badge"]').exists()).toBe(true);
	});

	it('does not render the failure icon for a successful tool call', async () => {
		const wrapper = await renderComponent(
			item({ kind: 'tool', toolSuccess: true, toolOutput: { ok: true } }),
		);
		expect(wrapper.find('[data-test-id="timeline-tool-error-badge"]').exists()).toBe(false);
	});

	it('does not render the failure icon for an in-flight tool call', async () => {
		const wrapper = await renderComponent(item({ kind: 'tool', toolSuccess: undefined }));
		expect(wrapper.find('[data-test-id="timeline-tool-error-badge"]').exists()).toBe(false);
	});

	it('does not render the failure icon for non-tool kinds', async () => {
		const wrapper = await renderComponent(item({ kind: 'user', toolSuccess: false }));
		expect(wrapper.find('[data-test-id="timeline-tool-error-badge"]').exists()).toBe(false);
	});
});
