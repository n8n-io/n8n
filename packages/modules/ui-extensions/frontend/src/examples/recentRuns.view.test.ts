import type { UiExtensionPageContext, UiExtensionPanelData } from '@n8n/api-types';
import { fireEvent } from '@testing-library/vue';

import {
	NOW,
	listPage,
	otherPage,
	panelData,
	renderBuiltinView,
	run,
	workflowPage,
} from '../__tests__/render-builtin-view';

const render = (context: UiExtensionPageContext, data: UiExtensionPanelData | null) =>
	renderBuiltinView('builtin:recent-runs', context, data);

describe('Recent runs view', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('lists the runs of the open workflow with status, time, duration and mode', () => {
		const { getAllByTestId, getByTestId, queryByTestId } = render(
			workflowPage([]),
			panelData({
				runs: {
					scope: 'workflow',
					items: [
						run('2', { status: 'error', mode: 'trigger' }),
						run('1', { startedAt: '2026-11-16T09:00:00.000Z', stoppedAt: null }),
					],
				},
			}),
		);

		expect(getByTestId('recent-runs-subtitle').textContent).toBe('Lead routing');
		const rows = getAllByTestId('recent-runs-run');
		expect(rows).toHaveLength(2);
		expect(rows[0].textContent).toContain('Failed');
		expect(rows[0].textContent).toContain('5 minutes ago');
		expect(rows[0].textContent).toContain('1.5 sec');
		expect(rows[0].textContent).toContain('Trigger');
		expect(rows[1].textContent).toContain('Succeeded');
		expect(rows[1].textContent).toContain('3 hours ago');
		expect(getAllByTestId('recent-runs-duration')).toHaveLength(1);
		expect(queryByTestId('recent-runs-workflow')).toBeNull();
		expect(queryByTestId('recent-runs-last-error')).toBeNull();
	});

	it('shows the node and the message of the last failure', () => {
		const { getByTestId } = render(
			workflowPage([]),
			panelData({
				runs: {
					scope: 'workflow',
					items: [run('2', { status: 'error' })],
					lastError: { nodeName: 'Notify sales', message: 'channel_not_found' },
				},
			}),
		);

		const callout = getByTestId('recent-runs-last-error');
		expect(callout.textContent).toContain('The last run failed in Notify sales');
		expect(callout.textContent).toContain('channel_not_found');
	});

	it('shows a failure without a node', () => {
		const { getByTestId } = render(
			workflowPage([]),
			panelData({
				runs: { scope: 'workflow', items: [], lastError: { message: 'Timed out' } },
			}),
		);

		expect(getByTestId('recent-runs-last-error').textContent).toContain('The last run failed');
	});

	it('shows the workflow name of each run on the workflows list', () => {
		const { getAllByTestId, getByTestId } = render(
			listPage,
			panelData({
				runs: {
					scope: 'all',
					items: [run('9', { workflowName: 'Invoices', mode: 'webhook' })],
				},
			}),
		);

		expect(getByTestId('recent-runs-subtitle').textContent).toBe('All workflows');
		expect(getAllByTestId('recent-runs-workflow')[0].textContent).toBe('Invoices');
		expect(getByTestId('recent-runs-mode').textContent).toContain('Webhook');
	});

	it('shows a mode that it has no label for as it is', () => {
		const { getByTestId } = render(
			workflowPage([]),
			panelData({ runs: { scope: 'workflow', items: [run('1', { mode: 'cli' })] } }),
		);

		expect(getByTestId('recent-runs-mode').textContent).toContain('cli');
	});

	it('opens a run when the user selects it', async () => {
		const { getByTestId, actions } = render(
			listPage,
			panelData({
				runs: { scope: 'all', items: [run('9', { workflowId: 'wf-7' })] },
			}),
		);

		await fireEvent.click(getByTestId('recent-runs-run'));

		expect(actions).toEqual([{ type: 'openExecution', workflowId: 'wf-7', executionId: '9' }]);
	});

	it('asks for the data again from the refresh button', async () => {
		const { getByTestId, actions } = render(
			workflowPage([]),
			panelData({ runs: { scope: 'workflow', items: [] } }),
		);

		await fireEvent.click(getByTestId('recent-runs-refresh'));

		expect(actions).toEqual([{ type: 'refresh' }]);
	});

	it.each([
		['workflow', workflowPage([]), 'This workflow has no runs yet.'],
		['all', listPage, 'No runs yet.'],
	] as const)('says so when there are no runs (%s)', (scope, context, text) => {
		const { getByTestId } = render(context, panelData({ runs: { scope, items: [] } }));

		expect(getByTestId('recent-runs-empty').textContent).toContain(text);
	});

	it.each([null, panelData({ state: 'loading' })])(
		'shows loading until the data is ready',
		(data) => {
			const { getByTestId, queryByTestId } = render(workflowPage([]), data);

			expect(getByTestId('recent-runs-loading').textContent).toBe('Loading…');
			expect(queryByTestId('recent-runs-run')).toBeNull();
		},
	);

	it('shows an error with a retry when the data does not load', async () => {
		const { getByTestId, actions } = render(workflowPage([]), panelData({ state: 'error' }));

		expect(getByTestId('recent-runs-error').textContent).toContain("Couldn't load the data.");
		await fireEvent.click(getByTestId('recent-runs-retry'));
		expect(actions).toEqual([{ type: 'refresh' }]);
	});

	it('updates when new data arrives', async () => {
		const { data, findAllByTestId, getByTestId } = render(
			workflowPage([]),
			panelData({ state: 'loading' }),
		);
		expect(getByTestId('recent-runs-loading')).toBeTruthy();

		data.value = panelData({ runs: { scope: 'workflow', items: [run('1'), run('2')] } });

		expect(await findAllByTestId('recent-runs-run')).toHaveLength(2);
	});

	it('asks to open a workflow or the list on other pages', () => {
		const { getByTestId, queryByTestId } = render(otherPage, panelData());

		expect(getByTestId('recent-runs-other-page')).toBeTruthy();
		expect(queryByTestId('recent-runs-refresh')).toBeNull();
	});
});
