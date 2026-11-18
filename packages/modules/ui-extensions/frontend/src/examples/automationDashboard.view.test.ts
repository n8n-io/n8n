import type { UiExtensionPanelData, UiExtensionRun } from '@n8n/api-types';
import { fireEvent } from '@testing-library/vue';

import {
	NOW,
	otherPage,
	overview,
	overviewService,
	panelData,
	renderBuiltinView,
	run,
} from '../__tests__/render-builtin-view';

const render = (data: UiExtensionPanelData | null) =>
	renderBuiltinView('builtin:automation-dashboard', otherPage, data);

describe('Automation dashboard page', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('shows the summary, a card for each service in order and the recent failures', () => {
		const sheets = overviewService({
			nodeType: 'n8n-nodes-base.googleSheets',
			displayName: 'Google Sheets',
			workflowCount: 1,
			activeWorkflowCount: 0,
			health: 'unknown',
			accounts: ['Finance Sheets'],
			workflows: [{ id: 'wf-3', name: 'Budget sync', active: false, lastRun: null }],
		});
		const { getByTestId, getAllByTestId } = render(
			panelData({ overview: overview({ services: [overviewService(), sheets] }) }),
		);

		expect(getByTestId('automation-dashboard-stat-workflows').textContent).toContain('3');
		expect(getByTestId('automation-dashboard-stat-workflows').textContent).toContain('Active: 1');
		expect(getByTestId('automation-dashboard-stat-services').textContent).toContain('2');
		expect(getByTestId('automation-dashboard-stat-services').textContent).toContain('Accounts: 2');
		expect(getByTestId('automation-dashboard-stat-successRate').textContent).toContain('75%');

		const cards = getAllByTestId('automation-dashboard-card');
		expect(cards).toHaveLength(2);
		const [slackCard, sheetsCard] = cards;
		expect(slackCard.textContent).toContain('Slack');
		expect(slackCard.textContent).toContain('Used in 2 workflows (1 active)');
		expect(slackCard.textContent).toContain('Healthy');
		expect(slackCard.textContent).toContain('Sales Slack');
		expect(sheetsCard.textContent).toContain('Google Sheets');
		expect(sheetsCard.textContent).toContain('Used in 1 workflow (0 active)');
		expect(sheetsCard.textContent).toContain('No recent runs');
		expect(sheetsCard.textContent).toContain('Finance Sheets');
		expect(getAllByTestId('automation-dashboard-workflow').map((el) => el.textContent)).toEqual([
			expect.stringContaining('Lead routing'),
			expect.stringContaining('Digest'),
			expect.stringContaining('Budget sync'),
		]);

		expect(getAllByTestId('automation-dashboard-failure')[0].textContent).toContain('Digest');
	});

	it('charts the run times oldest first, coloured by status, and opens a run from its bar', async () => {
		const { getAllByTestId, actions } = render(panelData({ overview: overview() }));

		const bars = getAllByTestId('automation-dashboard-bar');
		expect(bars.map((bar) => bar.getAttribute('data-status'))).toEqual([
			'success',
			'success',
			'success',
			'error',
		]);
		// The longest run is the full height.
		expect(bars[3].style.height).toBe('100%');
		expect(bars[0].style.height).toBe('50%');
		expect(bars[3].getAttribute('aria-label')).toBe('Failed, 3 sec. Open this run');

		await fireEvent.click(bars[3]);
		expect(actions).toEqual([{ type: 'openExecution', workflowId: 'wf-2', executionId: '9' }]);
	});

	it('shows the average and the longest run time', () => {
		const { getByTestId } = render(panelData({ overview: overview() }));

		const stat = getByTestId('automation-dashboard-stat-averageDuration').textContent;
		// (3 × 1.5 s + 3 s) / 4 = 1.875 s, rounded to one decimal.
		expect(stat).toContain('1.9 sec');
		expect(stat).toContain('Longest: 3 sec');
	});

	it('lists the workflows that failed, the most failures first, and opens one', async () => {
		const failing = (
			id: string,
			workflowId: string,
			workflowName: string,
			status: UiExtensionRun['status'] = 'error',
		) => run(id, { workflowId, workflowName, status });
		const items = [
			failing('6', 'wf-a', 'Invoice sync'),
			failing('5', 'wf-b', 'Lead routing'),
			failing('4', 'wf-a', 'Invoice sync', 'crashed'),
			failing('3', 'wf-c', 'Healthy one', 'success'),
			failing('2', 'wf-b', 'Lead routing', 'success'),
		];
		const { getAllByTestId, actions } = render(
			panelData({
				overview: overview({ runs: { scanned: 5, succeeded: 2, failed: 3, items } }),
			}),
		);

		const rows = getAllByTestId('automation-dashboard-attention-item');
		expect(rows.map((el) => el.textContent)).toEqual([
			expect.stringContaining('Invoice sync'),
			expect.stringContaining('Lead routing'),
		]);
		expect(
			getAllByTestId('automation-dashboard-attention-failures').map((el) => el.textContent),
		).toEqual(['Failures: 2 of 2', 'Failures: 1 of 2']);

		await fireEvent.click(rows[0]);
		expect(actions).toEqual([{ type: 'openWorkflow', workflowId: 'wf-a' }]);
	});

	it('says when no workflow failed, and draws no chart without runs', () => {
		const { getByTestId, queryByTestId } = render(
			panelData({
				overview: overview({
					runs: { scanned: 0, succeeded: 0, failed: 0, items: [] },
					failures: [],
				}),
			}),
		);

		expect(getByTestId('automation-dashboard-attention-empty').textContent).toContain(
			'No workflow failed in these runs.',
		);
		expect(queryByTestId('automation-dashboard-activity')).toBeNull();
		expect(getByTestId('automation-dashboard-stat-averageDuration').textContent).toContain('None');
	});

	it('says "1 workflow" for a service in one workflow, and marks a failing service', () => {
		const { getByTestId } = render(
			panelData({
				overview: overview({
					services: [overviewService({ workflowCount: 1, health: 'failing' })],
				}),
			}),
		);

		expect(getByTestId('automation-dashboard-usage').textContent).toBe(
			'Used in 1 workflow (1 active)',
		);
		expect(getByTestId('automation-dashboard-health').textContent).toContain('Failing');
	});

	it('opens a workflow, a failed run, and asks for new data', async () => {
		const { getAllByTestId, getByTestId, actions } = render(panelData({ overview: overview() }));

		await fireEvent.click(getAllByTestId('automation-dashboard-workflow')[0]);
		await fireEvent.click(getAllByTestId('automation-dashboard-failure')[0]);
		await fireEvent.click(getByTestId('automation-dashboard-refresh'));

		expect(actions).toEqual([
			{ type: 'openWorkflow', workflowId: 'wf-1' },
			{ type: 'openExecution', workflowId: 'wf-2', executionId: '9' },
			{ type: 'refresh' },
		]);
	});

	it('shows the empty state when no workflow uses a service', () => {
		const { getByTestId, queryByTestId } = render(
			panelData({ overview: overview({ services: [], failures: [] }) }),
		);

		expect(getByTestId('automation-dashboard-empty').textContent).toContain(
			'No workflow uses a service yet',
		);
		expect(queryByTestId('automation-dashboard-card')).toBeNull();
		expect(queryByTestId('automation-dashboard-failures')).toBeNull();
	});

	it('says when it looks at the newest workflows only', () => {
		const { getByTestId } = render(
			panelData({ overview: overview({ workflows: { total: 300, active: 2, scanned: 200 } }) }),
		);

		expect(getByTestId('automation-dashboard-partial').textContent).toContain('200');
	});

	it.each([
		[1, 'Of the last run'],
		[4, 'Of the last 4 runs'],
	])('counts %i scanned runs in words', (scanned, text) => {
		const { getByTestId } = render(
			panelData({ overview: overview({ runs: { scanned, succeeded: 1, failed: 0, items: [] } }) }),
		);

		expect(getByTestId('automation-dashboard-stat-successRate').textContent).toContain(text);
	});

	it('shows no success rate without finished runs', () => {
		const { getByTestId } = render(
			panelData({
				overview: overview({ runs: { scanned: 0, succeeded: 0, failed: 0, items: [] } }),
			}),
		);

		expect(getByTestId('automation-dashboard-stat-successRate').textContent).toContain('None');
	});

	it.each([
		['before the data arrives', null, 'automation-dashboard-loading'],
		['while loading', panelData({ state: 'loading' }), 'automation-dashboard-loading'],
		['after an error', panelData({ state: 'error' }), 'automation-dashboard-error'],
		['without overview data', panelData(), 'automation-dashboard-error'],
	])('shows the right state %s', (_case, data, testId) => {
		const { getByTestId } = render(data);

		expect(getByTestId(testId)).toBeTruthy();
	});

	it('retries after an error', async () => {
		const { getByTestId, actions } = render(panelData({ state: 'error' }));

		await fireEvent.click(getByTestId('automation-dashboard-retry'));

		expect(actions).toEqual([{ type: 'refresh' }]);
	});
});
