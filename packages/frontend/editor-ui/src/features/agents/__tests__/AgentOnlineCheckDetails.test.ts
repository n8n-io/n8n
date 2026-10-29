import { configure } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { flushPromises } from '@vue/test-utils';
import type { AgentOnlineCaseResult, AgentOnlineRubric } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import AgentOnlineCheckDetails from '../components/AgentOnlineCheckDetails.vue';

configure({ testIdAttribute: 'data-testid' });
const { listResults, recheck, reviewMock } = vi.hoisted(() => ({
	listResults: vi.fn(),
	recheck: vi.fn(),
	reviewMock: vi.fn(),
}));
vi.mock('../agentEvals.api', () => ({
	listOnlineCaseResults: listResults,
	recheckOnlineCase: recheck,
	reviewOnlineCheck: reviewMock,
}));
const rubric: AgentOnlineRubric = {
	generatedAt: '2026-10-29T12:00:00Z',
	checks: [
		{
			id: 'tone',
			kind: 'promise',
			question: 'Was the tone playful?',
			reason: 'Use the requested tone',
			source: { field: 'instructions', quote: 'Keep it playful' },
		},
	],
};
const oldRubric: AgentOnlineRubric = {
	generatedAt: '2026-10-28T12:00:00Z',
	checks: [{ ...rubric.checks[0], question: 'Was the tone formal?' }],
};
const latest: AgentOnlineCaseResult = {
	id: 2,
	caseId: 1,
	rubric,
	configHash: 'latest',
	checkedAt: '2026-10-29T13:00:00Z',
	verdicts: [{ checkId: 'tone', status: 'pass', reason: 'The reply was playful' }],
};
const old: AgentOnlineCaseResult = {
	...latest,
	id: 1,
	rubric: oldRubric,
	checkedAt: '2026-10-28T13:00:00Z',
	verdicts: [{ checkId: 'tone', status: 'fail', reason: 'The reply was too casual' }],
};
const testCase = {
	id: 1,
	title: 'Saved conversation',
	recentResults: [],
	threadId: 'thread',
	createdAt: '2026-10-28T12:00:00Z',
	latestResult: latest,
};
const renderComponent = createComponentRenderer(AgentOnlineCheckDetails, {
	props: { open: true, projectId: 'project', agentId: 'agent', testCase, rubric },
	global: { stubs: { ElDrawer: { template: '<aside><slot /></aside>' } } },
});
beforeEach(() => {
	vi.resetAllMocks();
	listResults.mockResolvedValue({ items: [latest, old], hasMore: false });
	recheck.mockResolvedValue({ ...latest, id: 3 });
});
it('opens saved results without running a check and shows the rubric from each assessment', async () => {
	const { getByTestId, getByText, queryByText } = renderComponent({ pinia: createTestingPinia() });
	await flushPromises();
	expect(recheck).not.toHaveBeenCalled();
	expect(getByTestId('agent-online-detail-check')).toHaveTextContent('Was the tone playful?');
	expect(getByTestId('agent-online-detail-check')).toHaveTextContent('The reply was playful');
	await userEvent.click(getByTestId('agent-online-result-history').querySelectorAll('button')[1]);
	expect(getByTestId('agent-online-detail-check')).toHaveTextContent('Was the tone formal?');
	expect(getByTestId('agent-online-detail-check')).toHaveTextContent('The reply was too casual');
	expect(queryByText('Was the tone playful?')).not.toBeInTheDocument();
});
it('adds an assessment only after an explicit recheck and refreshes history', async () => {
	const newResult = { ...latest, id: 3 };
	listResults
		.mockResolvedValueOnce({ items: [latest, old], hasMore: false })
		.mockResolvedValueOnce({ items: [newResult, latest, old], hasMore: false });
	const { getByTestId, emitted } = renderComponent({ pinia: createTestingPinia() });
	await flushPromises();
	await userEvent.click(getByTestId('agent-online-case-recheck'));
	await flushPromises();
	expect(recheck).toHaveBeenCalledExactlyOnceWith(expect.anything(), 'project', 'agent', 1);
	expect(getByTestId('agent-online-result-history').querySelectorAll('button')).toHaveLength(3);
	expect(emitted().updated).toHaveLength(1);
});
it('shows the current rubric in the sidebar without requesting result history', async () => {
	const { getByTestId, queryByTestId } = renderComponent({
		pinia: createTestingPinia(),
		props: { testCase: null },
	});
	await flushPromises();
	expect(listResults).not.toHaveBeenCalled();
	expect(getByTestId('agent-online-detail-check')).toHaveTextContent('Keep it playful');
	expect(queryByTestId('agent-online-case-recheck')).not.toBeInTheDocument();
});
it('keeps the prior results when a recheck request fails', async () => {
	recheck.mockRejectedValue(new Error('Model unavailable. Try again.'));
	const { getByTestId, getByText } = renderComponent({ pinia: createTestingPinia() });
	await flushPromises();
	await userEvent.click(getByTestId('agent-online-case-recheck'));
	await flushPromises();
	expect(getByText('Model unavailable. Try again.')).toBeVisible();
	expect(getByTestId('agent-online-result-history').querySelectorAll('button')).toHaveLength(2);
});

it('opens the assessment selected from the timeline', async () => {
	const { getByTestId } = renderComponent({
		pinia: createTestingPinia(),
		props: { initialResultId: 1 },
	});
	await flushPromises();
	expect(getByTestId('agent-online-detail-check')).toHaveTextContent('Was the tone formal?');
	expect(recheck).not.toHaveBeenCalled();
});

it('saves a human review without changing the original score', async () => {
	reviewMock.mockResolvedValue({ checkId: 'tone', feedback: 'good' });
	const { getByTestId } = renderComponent({
		pinia: createTestingPinia(),
		props: { initialResultId: 1 },
	});
	await flushPromises();
	expect(getByTestId('agent-online-score')).toHaveTextContent('0 of 1 passed');
	await userEvent.click(getByTestId('agent-online-review-good-tone'));
	await flushPromises();
	expect(reviewMock).toHaveBeenCalledExactlyOnceWith(
		expect.anything(),
		'project',
		'agent',
		1,
		'tone',
		'good',
	);
	expect(getByTestId('agent-online-review-saved')).toHaveTextContent('Your review: Good response');
	expect(getByTestId('agent-online-score')).toHaveTextContent('0 of 1 passed');
});

it('shows the recorded conversation for a human review', async () => {
	listResults.mockResolvedValue({
		items: [old],
		hasMore: false,
		conversation: [{ userMessage: 'Send a fortune', reply: 'Sent the fortune' }],
	});
	const { getByTestId, getByText } = renderComponent({
		pinia: createTestingPinia(),
		props: { initialResultId: 1 },
	});
	await flushPromises();
	await userEvent.click(
		getByTestId('agent-online-recorded-conversation').querySelector('summary')!,
	);
	expect(getByText('Send a fortune')).toBeVisible();
	expect(getByText('Sent the fortune')).toBeVisible();
	expect(recheck).not.toHaveBeenCalled();
});
