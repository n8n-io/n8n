import { configure } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { flushPromises } from '@vue/test-utils';
import { createComponentRenderer } from '@/__tests__/render';
import type { OnlineChecksReport, OnlineCheckStatus } from '../agentEvals.types';
import AgentOnlineChecksPanel from '../components/AgentOnlineChecksPanel.vue';

configure({ testIdAttribute: 'data-testid' });
const { runMock, getRubricMock, generateRubricMock, listMock, casesMock, activityMock } =
	vi.hoisted(() => ({
		runMock: vi.fn(),
		getRubricMock: vi.fn(),
		generateRubricMock: vi.fn(),
		listMock: vi.fn(),
		casesMock: vi.fn(),
		activityMock: vi.fn(),
	}));
vi.mock('../agentEvals.api', () => ({
	runOnlineChecks: runMock,
	getOnlineRubric: getRubricMock,
	generateOnlineRubric: generateRubricMock,
	listOnlineSessions: listMock,
	listOnlineCases: casesMock,
	listOnlineActivity: activityMock,
	updateOnlineCheck: vi.fn(),
	listOnlineCaseResults: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
	recheckOnlineCase: vi.fn(),
}));

const rubric = {
	generatedAt: '2026-10-29T12:00:00Z',
	checks: [
		{
			id: 'promise:1',
			kind: 'promise' as const,
			question: 'Was the response playful?',
			reason: 'Use the requested tone.',
			source: { field: 'instructions' as const, quote: 'Keep the response playful.' },
		},
	],
};
const sessions = [
	{ threadId: 'thread-1', title: 'First chat', updatedAt: '2026-10-29T12:00:00Z', origin: 'chat' },
	{ threadId: 'thread-2', title: 'Second chat', updatedAt: '2026-10-29T11:00:00Z', origin: 'chat' },
];
const report = (threadId: string, status: OnlineCheckStatus = 'pass'): OnlineChecksReport => ({
	agentId: 'agent-1',
	agentName: 'Agent',
	stakes: 'no-tools',
	tools: [],
	checks: rubric.checks,
	dropped: [],
	sessions: [
		{
			threadId,
			title: threadId,
			origin: 'chat',
			turns: [],
			verdicts: [{ checkId: 'promise:1', status, reason: 'Tone evidence.' }],
		},
	],
});
const renderComponent = createComponentRenderer(AgentOnlineChecksPanel, {
	props: { projectId: 'project-1', agentId: 'agent-1' },
	global: {
		stubs: {
			AgentOnlineCheckDetails: {
				props: ['open', 'initialResultId'],
				template:
					'<aside v-if="open" data-testid="opened-assessment">{{ initialResultId }}</aside>',
			},
			RouterLink: { template: '<a><slot /></a>' },
		},
	},
});
const chooseSessions = async () => {
	const rendered = renderComponent({ pinia: createTestingPinia() });
	await flushPromises();
	await userEvent.click(rendered.getByTestId('agent-online-checks-run'));
	await flushPromises();
	return rendered;
};

beforeEach(() => {
	vi.resetAllMocks();
	getRubricMock.mockResolvedValue(rubric);
	generateRubricMock.mockResolvedValue(rubric);
	listMock.mockResolvedValue(sessions);
	casesMock.mockResolvedValue({ items: [], hasMore: false });
	activityMock.mockResolvedValue({ items: [], hasMore: false });
	runMock.mockImplementation((_context, _project, _agent, ids: string[]) =>
		Promise.resolve(report(ids[0])),
	);
});

describe('AgentOnlineChecksPanel', () => {
	it('shows the saved rubric without generating or running checks', async () => {
		const { getByTestId } = renderComponent({ pinia: createTestingPinia() });
		await flushPromises();
		expect(getByTestId('agent-online-rubric')).toHaveTextContent('Rubric · 1');
		expect(generateRubricMock).not.toHaveBeenCalled();
		expect(runMock).not.toHaveBeenCalled();
	});

	it('lists sessions with all selected before any checks run', async () => {
		const { getAllByTestId, getByTestId } = await chooseSessions();
		expect(getAllByTestId('agent-online-session')).toHaveLength(2);
		expect(getByTestId('agent-online-session-select-thread-1')).toBeChecked();
		expect(getByTestId('agent-online-session-select-thread-2')).toBeChecked();
		expect(runMock).not.toHaveBeenCalled();
	});

	it('checks only selected sessions', async () => {
		const { getByTestId } = await chooseSessions();
		await userEvent.click(getByTestId('agent-online-session-select-thread-2'));
		await userEvent.click(getByTestId('agent-online-sessions-confirm'));
		await flushPromises();
		expect(runMock).toHaveBeenCalledExactlyOnceWith(expect.anything(), 'project-1', 'agent-1', [
			'thread-1',
		]);
		expect(getByTestId('agent-online-session-status-thread-1')).toHaveTextContent('Good');
	});

	it('lets a person clear all sessions and select one again', async () => {
		const { getByTestId } = await chooseSessions();
		await userEvent.click(getByTestId('agent-online-sessions-select-all'));
		expect(getByTestId('agent-online-sessions-confirm')).toBeDisabled();
		await userEvent.click(getByTestId('agent-online-session-select-thread-2'));
		await userEvent.click(getByTestId('agent-online-sessions-confirm'));
		await flushPromises();
		expect(runMock).toHaveBeenCalledExactlyOnceWith(expect.anything(), 'project-1', 'agent-1', [
			'thread-2',
		]);
	});

	it('shows progress and keeps each result visible while the next session runs', async () => {
		let finishSecond!: (value: OnlineChecksReport) => void;
		runMock.mockResolvedValueOnce(report('thread-1')).mockImplementationOnce(
			() =>
				new Promise<OnlineChecksReport>((resolve) => {
					finishSecond = resolve;
				}),
		);
		const { getByTestId } = await chooseSessions();
		await userEvent.click(getByTestId('agent-online-sessions-confirm'));
		await flushPromises();
		expect(getByTestId('agent-online-session-status-thread-1')).toHaveTextContent('Good');
		expect(getByTestId('agent-online-session-status-thread-2')).toHaveTextContent('Checking');
		expect(getByTestId('agent-online-session-select-thread-1')).toBeDisabled();
		expect(getByTestId('agent-online-sessions-progress')).toHaveTextContent('1 of 2');
		finishSecond(report('thread-2', 'fail'));
		await flushPromises();
		expect(getByTestId('agent-online-session-status-thread-2')).toHaveTextContent('Needs work');
	});

	it.each(['unsure', 'not_run', 'not_applicable'] as const)(
		'shows %s as needing review',
		async (status) => {
			runMock.mockImplementation((_context, _project, _agent, ids: string[]) =>
				Promise.resolve(report(ids[0], status)),
			);
			const { getByTestId } = await chooseSessions();
			await userEvent.click(getByTestId('agent-online-sessions-confirm'));
			await flushPromises();
			expect(getByTestId('agent-online-session-status-thread-1')).toHaveTextContent('Needs review');
		},
	);

	it('shows a failed request on its session and continues with the next one', async () => {
		runMock.mockRejectedValueOnce(new Error('Model unavailable'));
		const { getByTestId, getByText } = await chooseSessions();
		await userEvent.click(getByTestId('agent-online-sessions-confirm'));
		await flushPromises();
		expect(getByTestId('agent-online-session-status-thread-1')).toHaveTextContent("Couldn't check");
		expect(getByText('Model unavailable')).toBeInTheDocument();
		expect(getByTestId('agent-online-session-status-thread-2')).toHaveTextContent('Good');
	});

	it('does not mark a missing result as good', async () => {
		runMock.mockResolvedValue({ ...report('thread-1'), sessions: [] });
		const { getByTestId } = await chooseSessions();
		await userEvent.click(getByTestId('agent-online-sessions-confirm'));
		await flushPromises();
		expect(getByTestId('agent-online-session-status-thread-1')).toHaveTextContent("Couldn't check");
	});

	it('stops scheduling checks when the person changes agents', async () => {
		let finish!: (value: OnlineChecksReport) => void;
		runMock.mockImplementationOnce(
			() =>
				new Promise<OnlineChecksReport>((resolve) => {
					finish = resolve;
				}),
		);
		const rendered = await chooseSessions();
		await userEvent.click(rendered.getByTestId('agent-online-sessions-confirm'));
		await rendered.rerender({ agentId: 'agent-2' });
		finish(report('thread-1'));
		await flushPromises();
		expect(runMock).toHaveBeenCalledTimes(1);
		expect(rendered.queryByTestId('agent-online-sessions')).not.toBeInTheDocument();
	});

	it('shows an empty state when there are no sessions', async () => {
		listMock.mockResolvedValue([]);
		const { getByTestId, queryByTestId } = await chooseSessions();
		expect(getByTestId('agent-online-checks-no-sessions')).toBeInTheDocument();
		expect(queryByTestId('agent-online-sessions-confirm')).not.toBeInTheDocument();
	});

	it('shows a session loading error without running checks', async () => {
		listMock.mockRejectedValue(new Error('Could not read sessions'));
		const { getByTestId } = await chooseSessions();
		expect(getByTestId('agent-online-checks-error')).toHaveTextContent('Could not read sessions');
		expect(runMock).not.toHaveBeenCalled();
	});

	it('generates a rubric without evaluating sessions', async () => {
		getRubricMock.mockResolvedValue(null);
		const { getByTestId } = renderComponent({ pinia: createTestingPinia() });
		await flushPromises();
		await userEvent.click(getByTestId('agent-online-rubric-generate'));
		await flushPromises();
		expect(getByTestId('agent-online-rubric')).toHaveTextContent('Rubric · 1');
		expect(runMock).not.toHaveBeenCalled();
	});
	it('stops scheduling checks when the session view unmounts', async () => {
		let finish!: (value: OnlineChecksReport) => void;
		runMock.mockImplementationOnce(
			() =>
				new Promise<OnlineChecksReport>((resolve) => {
					finish = resolve;
				}),
		);
		const rendered = await chooseSessions();
		await userEvent.click(rendered.getByTestId('agent-online-sessions-confirm'));
		rendered.unmount();
		finish(report('thread-1'));
		await flushPromises();
		expect(runMock).toHaveBeenCalledTimes(1);
	});
});

it('shows saved test cases on reload without running checks', async () => {
	casesMock.mockResolvedValue({
		items: [
			{
				id: 1,
				title: 'Earlier test case',
				recentResults: [
					{ id: 9, checkedAt: '2026-10-27T12:00:00Z', status: 'good' },
					{ id: 10, checkedAt: '2026-10-28T12:00:00Z', status: 'bad' },
				],
				threadId: 'old-thread',
				createdAt: '2026-10-28T12:00:00Z',
				latestResult: {
					id: 10,
					caseId: 1,
					checkedAt: '2026-10-28T12:00:00Z',
					rubric,
					configHash: 'old',
					verdicts: [{ checkId: 'promise:1', status: 'fail', reason: 'Earlier verdict' }],
				},
			},
		],
		hasMore: false,
	});
	const { getByTestId, getByText } = renderComponent({ pinia: createTestingPinia() });
	await flushPromises();
	expect(getByTestId('agent-online-saved-case')).toHaveTextContent('Needs work');
	expect(getByTestId('agent-online-saved-case')).toHaveTextContent('Last checked');
	expect(getByText('Earlier test case')).toBeVisible();
	expect(
		getByTestId('agent-online-saved-case').querySelectorAll(
			'[data-testid=agent-online-result-dot]',
		),
	).toHaveLength(2);
	expect(runMock).not.toHaveBeenCalled();
});

it('opens the chosen assessment when a history dot is clicked', async () => {
	casesMock.mockResolvedValue({
		items: [
			{
				id: 1,
				title: 'Test with history',
				threadId: 'old',
				createdAt: '2026-10-28T12:00:00Z',
				latestResult: null,
				recentResults: [{ id: 7, checkedAt: '2026-10-28T12:00:00Z', status: 'bad' }],
			},
		],
		hasMore: false,
	});
	const { getByTestId } = renderComponent({ pinia: createTestingPinia() });
	await flushPromises();
	await userEvent.click(getByTestId('agent-online-result-dot'));
	expect(getByTestId('opened-assessment')).toHaveTextContent('7');
	expect(runMock).not.toHaveBeenCalled();
});

it('shows dated assessment activity and opens a selected result without running checks', async () => {
	activityMock.mockResolvedValue({
		items: [
			{
				caseId: 1,
				title: 'Saved activity session',
				result: {
					id: 50,
					caseId: 1,
					checkedAt: '2026-10-29T13:00:00Z',
					rubric,
					configHash: 'hash',
					verdicts: [{ checkId: 'promise:1', status: 'pass', reason: 'Playful' }],
				},
			},
		],
		hasMore: false,
	});
	const { getByTestId, getByRole } = renderComponent({ pinia: createTestingPinia() });
	await flushPromises();
	await userEvent.click(getByTestId('agent-online-activity-tab'));
	await flushPromises();
	expect(getByTestId('agent-online-activity-row')).toHaveTextContent('1 of 1');
	await userEvent.click(getByRole('button', { name: 'Saved activity session', exact: true }));
	expect(getByTestId('opened-assessment')).toHaveTextContent('50');
	expect(runMock).not.toHaveBeenCalled();
});
