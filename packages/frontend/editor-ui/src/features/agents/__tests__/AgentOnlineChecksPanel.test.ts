import { configure } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';

import { createComponentRenderer } from '@/__tests__/render';
import type { OnlineChecksReport } from '../agentEvals.types';
import AgentOnlineChecksPanel from '../components/AgentOnlineChecksPanel.vue';

configure({ testIdAttribute: 'data-testid' });

const { runOnlineChecksMock } = vi.hoisted(() => ({ runOnlineChecksMock: vi.fn() }));
vi.mock('../agentEvals.api', () => ({ runOnlineChecks: runOnlineChecksMock }));

const report = (
	verdicts: OnlineChecksReport['sessions'][number]['verdicts'],
): OnlineChecksReport => ({
	agentId: 'agent-1',
	agentName: 'Order Help Desk',
	stakes: 'acts-with-approval',
	tools: [
		{
			name: 'lookup_order',
			source: 'workflow',
			action: 'reads',
			basis: 'name',
			requireApproval: false,
		},
		{
			name: 'issue_refund',
			source: 'workflow',
			action: 'acts',
			basis: 'name',
			requireApproval: true,
		},
	],
	checks: [
		{
			id: 'tool:tool_failed',
			kind: 'tool',
			question: 'Did every tool call work?',
			reason: 'A failed tool call often means a wrong setup.',
			source: { field: 'tools' },
		},
		{
			id: 'promise:1',
			kind: 'promise',
			question: 'Did the agent avoid promising a refund?',
			reason: 'The instructions forbid it.',
			source: { field: 'instructions', quote: 'Never promise a refund.' },
		},
	],
	dropped: [],
	sessions: [
		{
			threadId: 'thread-1',
			title: 'Session #3',
			origin: 'chat',
			turns: [{ userMessage: 'Refund please', reply: 'Refunded!', toolCalls: 1, runFailed: false }],
			verdicts,
		},
	],
});

const renderComponent = createComponentRenderer(AgentOnlineChecksPanel, {
	props: { projectId: 'project-1', agentId: 'agent-1' },
	global: { stubs: { RouterLink: { template: '<a data-testid="router-link"><slot /></a>' } } },
});

const run = async (props: Record<string, unknown> = {}) => {
	const rendered = renderComponent({ pinia: createTestingPinia(), props });
	await userEvent.click(rendered.getByTestId('agent-online-checks-run'));
	await flushPromises();
	return rendered;
};

describe('AgentOnlineChecksPanel', () => {
	beforeEach(() => {
		runOnlineChecksMock.mockReset();
	});

	it('runs the checks for this agent when asked', async () => {
		runOnlineChecksMock.mockResolvedValue(report([]));

		await run();

		expect(runOnlineChecksMock).toHaveBeenCalledWith(expect.anything(), 'project-1', 'agent-1');
	});

	it('shows a card for each failed or unsure check, failures first', async () => {
		runOnlineChecksMock.mockResolvedValue(
			report([
				{ checkId: 'tool:tool_failed', status: 'pass', reason: 'All worked.' },
				{ checkId: 'tool:tool_failed', status: 'unsure', reason: 'Hard to tell.' },
				{
					checkId: 'promise:1',
					status: 'fail',
					reason: 'It said it had refunded.',
					moment: { turnIndex: 0 },
				},
			]),
		);

		const { getAllByTestId } = await run();

		const cards = getAllByTestId('agent-online-check-finding');
		expect(cards).toHaveLength(2);
		expect(cards[0]).toHaveTextContent('Did the agent avoid promising a refund?');
		expect(cards[0]).toHaveTextContent('It said it had refunded.');
		expect(cards[0]).toHaveTextContent('Session #3');
		expect(cards[1]).toHaveTextContent('Hard to tell.');
	});

	it('says so when nothing needs a look', async () => {
		runOnlineChecksMock.mockResolvedValue(
			report([{ checkId: 'promise:1', status: 'pass', reason: 'Fine.' }]),
		);

		const { getByTestId, queryAllByTestId } = await run();

		expect(queryAllByTestId('agent-online-check-finding')).toHaveLength(0);
		expect(getByTestId('agent-online-checks-clear')).toBeInTheDocument();
	});

	it('lists what each tool can do', async () => {
		runOnlineChecksMock.mockResolvedValue(report([]));

		const { getByTestId } = await run();

		expect(getByTestId('agent-online-checks-tools')).toHaveTextContent('lookup_order');
		expect(getByTestId('agent-online-checks-tools')).toHaveTextContent('issue_refund');
	});

	it('shows the error when the run fails', async () => {
		runOnlineChecksMock.mockRejectedValue(new Error('This agent needs a model'));

		const { getByTestId } = await run();

		expect(getByTestId('agent-online-checks-error')).toHaveTextContent('This agent needs a model');
	});

	it('does not run when disabled', async () => {
		const { getByTestId } = renderComponent({
			pinia: createTestingPinia(),
			props: { disabled: true },
		});

		expect(getByTestId('agent-online-checks-run')).toBeDisabled();
	});
});
