import type { UiExtensionPageContext, UiExtensionPanelData } from '@n8n/api-types';
import { fireEvent } from '@testing-library/vue';

import {
	NOW,
	listPage,
	otherPage,
	panelData,
	renderBuiltinView,
	serviceNode,
	workflowPage,
} from '../__tests__/render-builtin-view';

const render = (context: UiExtensionPageContext, data: UiExtensionPanelData | null) =>
	renderBuiltinView('builtin:service-data', context, data);

describe('Service data view', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('shows a card with the target, the account and the items of each service node', () => {
		const { getAllByTestId, getByTestId } = render(
			workflowPage([]),
			panelData({
				services: [
					serviceNode({
						lastRun: {
							executionId: '42',
							status: 'success',
							finishedAt: '2026-11-16T11:58:00.000Z',
							itemCount: 5,
							items: [
								{ ts: '1', text: 'hello from qa' },
								{ ts: '2', text: 'second' },
							],
						},
					}),
					serviceNode({
						nodeName: 'Add row',
						displayName: 'Google Sheets',
						resource: undefined,
						operation: 'Append Row',
						targets: [],
						credentialName: undefined,
						lastRun: null,
					}),
				],
			}),
		);

		const [slack, sheets] = getAllByTestId('service-data-card');
		expect(slack.textContent).toContain('Slack');
		expect(slack.textContent).toContain('Notify sales');
		expect(slack.textContent).toContain('Message › Send');
		expect(slack.textContent).toContain('Channel: #alerts');
		expect(slack.textContent).toContain('Account: Sales Slack');
		expect(slack.textContent).toContain('Succeeded');
		expect(slack.textContent).toContain('2 minutes ago');
		expect(slack.textContent).toContain('Items: 5');
		const items = getAllByTestId('service-data-item');
		expect(items).toHaveLength(2);
		expect(items[0].textContent).toContain('text');
		expect(items[0].textContent).toContain('hello from qa');

		expect(sheets.textContent).toContain('Append Row');
		expect(sheets.textContent).not.toContain('Account:');
		expect(sheets.textContent).toContain('Run the workflow to see what this node read or wrote.');
		expect(getByTestId('service-data-subtitle').textContent).toBe('Lead routing');
	});

	it('opens the target in the service from its link', async () => {
		const { getByTestId, actions } = render(
			workflowPage([]),
			panelData({ services: [serviceNode()] }),
		);

		const link = getByTestId('service-data-target-link');
		expect(link.getAttribute('aria-label')).toBe('Open #alerts in the service');
		await fireEvent.click(link);

		expect(actions).toEqual([{ type: 'openUrl', url: 'https://example.slack.com/archives/C123' }]);
	});

	it('shows no link for a target without a URL', () => {
		const { getByTestId, queryByTestId } = render(
			workflowPage([]),
			panelData({ services: [serviceNode({ targets: [{ label: 'Channel', name: 'C123' }] })] }),
		);

		expect(getByTestId('service-data-target').textContent).toContain('Channel: C123');
		expect(queryByTestId('service-data-target-link')).toBeNull();
	});

	it('shows the error of a node that failed', () => {
		const { getByTestId, queryByTestId } = render(
			workflowPage([]),
			panelData({
				services: [
					serviceNode({
						lastRun: {
							executionId: '42',
							status: 'error',
							finishedAt: null,
							itemCount: 0,
							items: [],
							error: 'channel_not_found',
						},
					}),
				],
			}),
		);

		expect(getByTestId('service-data-node-error').textContent).toContain('channel_not_found');
		expect(getByTestId('service-data-card').textContent).toContain('Failed');
		expect(queryByTestId('service-data-item')).toBeNull();
	});

	it('says so when a node returned no items', () => {
		const { getByTestId } = render(
			workflowPage([]),
			panelData({
				services: [
					serviceNode({
						lastRun: {
							executionId: '42',
							status: 'success',
							finishedAt: null,
							itemCount: 0,
							items: [],
						},
					}),
				],
			}),
		);

		expect(getByTestId('service-data-card').textContent).toContain('This node returned no items.');
	});

	it('says so when the workflow uses no services', () => {
		const { getByTestId } = render(workflowPage([]), panelData({ services: [] }));

		expect(getByTestId('service-data-empty').textContent).toBe(
			'This workflow uses no outside services yet.',
		);
	});

	it.each([null, panelData({ state: 'loading' })])(
		'shows loading until the data is ready',
		(data) => {
			const { getByTestId } = render(workflowPage([]), data);

			expect(getByTestId('service-data-loading').textContent).toBe('Loading…');
		},
	);

	it('shows an error with a retry when the data does not load', async () => {
		const { getByTestId, actions } = render(workflowPage([]), panelData({ state: 'error' }));

		expect(getByTestId('service-data-error').textContent).toContain("Couldn't load the data.");
		await fireEvent.click(getByTestId('service-data-retry'));
		await fireEvent.click(getByTestId('service-data-refresh'));
		expect(actions).toEqual([{ type: 'refresh' }, { type: 'refresh' }]);
	});

	it.each([
		['the workflows list', listPage],
		['another page', otherPage],
	])('asks to open a workflow on %s', (_name, context) => {
		const { getByTestId, queryByTestId } = render(context, panelData());

		expect(getByTestId('service-data-open-workflow').textContent).toContain(
			'Open a workflow to see the data from its services.',
		);
		expect(queryByTestId('service-data-refresh')).toBeNull();
	});
});
