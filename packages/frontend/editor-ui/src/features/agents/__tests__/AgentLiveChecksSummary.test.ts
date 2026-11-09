import { configure } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import AgentLiveChecksSummary from '../components/AgentLiveChecksSummary.vue';

configure({ testIdAttribute: 'data-test-id' });

const { getLiveChecksMock } = vi.hoisted(() => ({ getLiveChecksMock: vi.fn() }));
vi.mock('../agentEvals.api', () => ({ getLiveChecks: getLiveChecksMock }));

const renderComponent = createComponentRenderer(AgentLiveChecksSummary, {
	props: { projectId: 'project-1', agentId: 'agent-1' },
});

const render = async () => {
	const rendered = renderComponent({ pinia: createTestingPinia() });
	await flushPromises();
	return rendered;
};

const check = (overrides: Record<string, unknown> = {}) => ({
	checkId: 'tool:tool_failed',
	question: 'Did every tool call succeed?',
	failed: 6,
	prevFailed: 0,
	moreOften: true,
	...overrides,
});

describe('AgentLiveChecksSummary', () => {
	beforeEach(() => {
		getLiveChecksMock.mockReset();
	});

	it('shows failed sessions per check beside the last version, as counts', async () => {
		getLiveChecksMock.mockResolvedValue({
			current: { versionId: 'v-2', sessions: 15, since: '2026-11-01T00:00:00.000Z' },
			previous: { versionId: 'v-1', sessions: 340 },
			checks: [check(), check({ checkId: 'tool:empty_reply', failed: 0, moreOften: false })],
		});

		const { getAllByTestId, getByTestId } = await render();

		const rows = getAllByTestId('agent-live-check-row');
		expect(rows).toHaveLength(2);
		expect(rows[0]).toHaveTextContent('6 of 15 sessions');
		expect(rows[0]).toHaveTextContent('Last version: 0 of 340');
		expect(getByTestId('agent-live-check-more-often')).toHaveTextContent('More often');
	});

	it('shows no last-version count when only this version ran', async () => {
		getLiveChecksMock.mockResolvedValue({
			current: { versionId: 'v-2', sessions: 4, since: '2026-11-01T00:00:00.000Z' },
			previous: null,
			checks: [check({ prevFailed: null, moreOften: false })],
		});

		const { getByTestId, queryByTestId } = await render();

		expect(getByTestId('agent-live-check-row')).not.toHaveTextContent('Last version');
		expect(queryByTestId('agent-live-check-more-often')).toBeNull();
	});

	it('says so when the published version has no live session yet', async () => {
		getLiveChecksMock.mockResolvedValue({ current: null, previous: null, checks: [check()] });

		const { getByTestId, queryByTestId } = await render();

		expect(getByTestId('agent-live-checks-empty')).toBeVisible();
		expect(queryByTestId('agent-live-check-row')).toBeNull();
	});

	it('shows nothing for an agent with no published checks, or when the read fails', async () => {
		getLiveChecksMock.mockResolvedValue({ current: null, previous: null, checks: [] });
		const first = await render();
		expect(first.queryByTestId('agent-live-checks')).toBeNull();
		first.unmount();

		getLiveChecksMock.mockRejectedValue(new Error('Not found'));
		const second = await render();
		expect(second.queryByTestId('agent-live-checks')).toBeNull();
	});
});
