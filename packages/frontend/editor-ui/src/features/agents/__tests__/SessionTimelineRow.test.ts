/* eslint-disable import-x/no-extraneous-dependencies, @typescript-eslint/no-unsafe-assignment -- test-only patterns: @vue/test-utils is a transitive devDep, mock reads */
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import type { TimelineItem } from '../session-timeline.types';
// A static import loads the component once for the file, so no test pays for a
// cold import. The vi.mock calls below are hoisted above it.
import SessionTimelineRow from '../components/SessionTimelineRow.vue';

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
	// The component sets the badge test id, so the stub only renders the slot.
	N8nBadge: {
		props: ['variant', 'size'],
		template: '<span :data-variant="variant"><slot /></span>',
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

function renderComponent(it: TimelineItem) {
	return mount(SessionTimelineRow, {
		props: { item: it, selected: false },
		global: { stubs: STUBS },
	});
}

describe('SessionTimelineRow', () => {
	it('renders a skill with its name and pill', () => {
		const wrapper = renderComponent(item({ kind: 'skill', skillName: 'Triage' }));

		expect(wrapper.text()).toContain('Triage');
		expect(wrapper.find('[data-kind="skill"]').exists()).toBe(true);
	});

	it('renders the node icon when the node type is available', () => {
		const wrapper = renderComponent(
			item({ kind: 'node', nodeType: 'n8n-nodes-base.httpRequest', nodeTypeVersion: 4.2 }),
		);

		expect(wrapper.get('[data-testid="node-icon"]').attributes('data-size')).toBe('20');
		expect(wrapper.find('[data-kind]').exists()).toBe(false);
	});

	it('renders the pill when the node type is unavailable', () => {
		const wrapper = renderComponent(item({ kind: 'node', nodeType: 'unknown' }));

		expect(wrapper.find('[data-kind="node"]').exists()).toBe(true);
	});

	it('renders the failure icon for a generic tool soft-failure', () => {
		const wrapper = renderComponent(
			item({
				kind: 'tool',
				toolSuccess: true,
				toolOutput: { success: false, error: 'boom' },
			}),
		);
		const badge = wrapper.get('[data-test-id="timeline-tool-error-badge"]');
		expect(badge.attributes('data-variant')).toBe('danger');
	});

	it('renders the failure icon for a workflow soft-failure (success true, status error)', () => {
		const wrapper = renderComponent(
			item({
				kind: 'workflow',
				toolSuccess: true,
				toolOutput: { status: 'error', error: 'node X failed' },
			}),
		);
		expect(wrapper.find('[data-test-id="timeline-tool-error-badge"]').exists()).toBe(true);
	});

	it('does not render the failure icon for a successful tool call', () => {
		const wrapper = renderComponent(
			item({ kind: 'tool', toolSuccess: true, toolOutput: { ok: true } }),
		);
		expect(wrapper.find('[data-test-id="timeline-tool-error-badge"]').exists()).toBe(false);
	});

	it('does not render the failure icon for an in-flight tool call', () => {
		const wrapper = renderComponent(item({ kind: 'tool', toolSuccess: undefined }));
		expect(wrapper.find('[data-test-id="timeline-tool-error-badge"]').exists()).toBe(false);
	});

	it('does not render the failure icon for non-tool kinds', () => {
		const wrapper = renderComponent(item({ kind: 'user', toolSuccess: false }));
		expect(wrapper.find('[data-test-id="timeline-tool-error-badge"]').exists()).toBe(false);
	});
});

it('shows task titles and translated statuses in a signal row', () => {
	const wrapper = renderComponent(
		item({
			kind: 'background-task-signal',
			backgroundJobSignal: {
				tasks: [{ id: 'job-1', title: 'Check invoices', kind: 'subagent', status: 'failed' }],
			},
		}),
	);
	expect(wrapper.text()).toContain('Check invoices — Failed');
	expect(wrapper.find('[data-kind="background-task-signal"]').exists()).toBe(true);
});
