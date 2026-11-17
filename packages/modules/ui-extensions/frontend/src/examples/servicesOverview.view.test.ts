import type { UiExtensionPanelData } from '@n8n/api-types';
import { fireEvent } from '@testing-library/vue';

import {
	NOW,
	otherPage,
	overview,
	overviewService,
	panelData,
	renderBuiltinView,
} from '../__tests__/render-builtin-view';

const render = (data: UiExtensionPanelData | null) =>
	renderBuiltinView('builtin:services-overview', otherPage, data);

describe('Services overview page', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('shows the summary, a card for each service and the recent failures', () => {
		const { getByTestId, getAllByTestId } = render(panelData({ overview: overview() }));

		expect(getByTestId('services-overview-stat-workflows').textContent).toContain('3');
		expect(getByTestId('services-overview-stat-workflows').textContent).toContain('Active: 1');
		expect(getByTestId('services-overview-stat-services').textContent).toContain('1');
		expect(getByTestId('services-overview-stat-accounts').textContent).toContain('1');
		expect(getByTestId('services-overview-stat-successRate').textContent).toContain('75%');

		const [card] = getAllByTestId('services-overview-card');
		expect(card.textContent).toContain('Slack');
		expect(card.textContent).toContain('Used in 2 workflows (1 active)');
		expect(card.textContent).toContain('Healthy');
		expect(card.textContent).toContain('Sales Slack');
		expect(getAllByTestId('services-overview-workflow').map((el) => el.textContent)).toEqual([
			expect.stringContaining('Lead routing'),
			expect.stringContaining('Digest'),
		]);

		expect(getAllByTestId('services-overview-failure')[0].textContent).toContain('Digest');
	});

	it('says "1 workflow" for a service in one workflow, and marks a failing service', () => {
		const { getByTestId } = render(
			panelData({
				overview: overview({
					services: [overviewService({ workflowCount: 1, health: 'failing' })],
				}),
			}),
		);

		expect(getByTestId('services-overview-usage').textContent).toBe(
			'Used in 1 workflow (1 active)',
		);
		expect(getByTestId('services-overview-health').textContent).toContain('Failing');
	});

	it('opens a workflow, a failed run, and asks for new data', async () => {
		const { getAllByTestId, getByTestId, actions } = render(panelData({ overview: overview() }));

		await fireEvent.click(getAllByTestId('services-overview-workflow')[0]);
		await fireEvent.click(getAllByTestId('services-overview-failure')[0]);
		await fireEvent.click(getByTestId('services-overview-refresh'));

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

		expect(getByTestId('services-overview-empty').textContent).toContain(
			'No workflow uses a service yet',
		);
		expect(queryByTestId('services-overview-card')).toBeNull();
		expect(queryByTestId('services-overview-failures')).toBeNull();
	});

	it('says when it looks at the newest workflows only', () => {
		const { getByTestId } = render(
			panelData({ overview: overview({ workflows: { total: 300, active: 2, scanned: 200 } }) }),
		);

		expect(getByTestId('services-overview-partial').textContent).toContain('200');
	});

	it('shows no success rate without finished runs', () => {
		const { getByTestId } = render(
			panelData({ overview: overview({ runs: { scanned: 0, succeeded: 0, failed: 0 } }) }),
		);

		expect(getByTestId('services-overview-stat-successRate').textContent).toContain('None');
	});

	it.each([
		['before the data arrives', null, 'services-overview-loading'],
		['while loading', panelData({ state: 'loading' }), 'services-overview-loading'],
		['after an error', panelData({ state: 'error' }), 'services-overview-error'],
		['without overview data', panelData(), 'services-overview-error'],
	])('shows the right state %s', (_case, data, testId) => {
		const { getByTestId } = render(data);

		expect(getByTestId(testId)).toBeTruthy();
	});

	it('retries after an error', async () => {
		const { getByTestId, actions } = render(panelData({ state: 'error' }));

		await fireEvent.click(getByTestId('services-overview-retry'));

		expect(actions).toEqual([{ type: 'refresh' }]);
	});
});
