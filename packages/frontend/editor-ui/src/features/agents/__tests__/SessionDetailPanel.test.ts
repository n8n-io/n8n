/* eslint-disable import-x/no-extraneous-dependencies, @typescript-eslint/no-unsafe-assignment -- test-only patterns: @vue/test-utils is a transitive devDep, mock reads */
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import type { TimelineItem } from '../session-timeline.types';

vi.setConfig({ testTimeout: 30_000 });

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
	i18n: { baseText: (key: string) => key },
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({
		resolve: () => ({ href: '/exec/1' }),
	}),
}));

vi.mock('@/app/utils/formatters/dateFormatter', () => ({
	convertToDisplayDate: () => ({ date: '2026-01-01', time: '00:00' }),
}));

vi.mock('@/features/ai/shared/agentsChat/n8nChatInteraction', () => ({
	parseIntegrationActionCard: () => null,
}));

vi.mock('@/features/ai/shared/agentsChat/types', () => ({}));

const STUBS = {
	N8nButton: { template: '<button><slot /></button>' },
	N8nCallout: {
		props: ['theme'],
		template: '<div :data-testid="`callout-${theme}`" :data-theme="theme"><slot /></div>',
	},
	N8nIconButton: {
		props: ['icon', 'variant'],
		template: '<button :data-icon="icon"><slot /></button>',
	},
	N8nText: { props: ['bold'], template: '<span><slot /></span>' },
	N8nCard: { template: '<div><slot /></div>' },
	N8nIcon: {
		props: ['icon', 'size'],
		template: '<span :data-icon="icon" />',
	},
	N8nTooltip: { template: '<span><slot /></span>' },
	VueMarkdown: { props: ['source'], template: '<div class="md">{{ source }}</div>' },
	AgentChatMessageAttachments: { template: '<div />' },
	RichInteractionCard: { template: '<div />' },
	WorkflowExecutionLogViewer: {
		props: ['workflowId', 'workflowExecutionId'],
		template: '<div data-testid="wf-log-viewer" />',
	},
	ToolIoView: {
		props: ['name', 'input', 'output', 'nodeParameters', 'success'],
		template: '<div data-testid="tool-io-view" />',
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

async function renderComponent(it: TimelineItem | null) {
	const { default: SessionDetailPanel } = await import('../components/SessionDetailPanel.vue');
	return mount(SessionDetailPanel, {
		props: { item: it, projectId: 'p1', agentId: 'a1' },
		global: { stubs: STUBS },
	});
}

describe('SessionDetailPanel failure callout', () => {
	it('shows the danger callout for a failed tool call', async () => {
		const wrapper = await renderComponent(
			item({ kind: 'tool', toolSuccess: false, toolOutput: { error: 'timed out' } }),
		);
		const callout = wrapper.find('[data-test-id="tool-error-callout"]');
		expect(callout.exists()).toBe(true);
		expect(callout.text()).toContain('timed out');
		expect(wrapper.find('[data-testid="detail-failed-icon"]').exists()).toBe(true);
	}, 30_000);

	it('shows the danger callout for a workflow soft-failure even with a linked execution', async () => {
		const wrapper = await renderComponent(
			item({
				kind: 'workflow',
				toolSuccess: true,
				toolOutput: { status: 'error', error: 'node X failed', executionId: 'exec-42' },
				workflowId: 'wf-1',
				workflowExecutionId: 'exec-42',
			}),
		);
		// Callout present alongside the log viewer.
		expect(wrapper.find('[data-test-id="workflow-error-callout"]').exists()).toBe(true);
		expect(wrapper.find('[data-test-id="workflow-error-callout"]').text()).toContain(
			'node X failed',
		);
		expect(wrapper.find('[data-testid="wf-log-viewer"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="detail-failed-icon"]').exists()).toBe(true);
	});

	it('shows the danger callout for a failed node call', async () => {
		const wrapper = await renderComponent(
			item({ kind: 'node', toolSuccess: false, toolOutput: { error: 'bad input' } }),
		);
		const callout = wrapper.find('[data-test-id="node-error-callout"]');
		expect(callout.exists()).toBe(true);
		expect(callout.text()).toContain('bad input');
	});

	it('does not show a failure callout for a successful tool call', async () => {
		const wrapper = await renderComponent(
			item({ kind: 'tool', toolSuccess: true, toolOutput: { ok: true } }),
		);
		expect(wrapper.find('[data-testid="tool-error-callout"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="detail-failed-icon"]').exists()).toBe(false);
	});
});
