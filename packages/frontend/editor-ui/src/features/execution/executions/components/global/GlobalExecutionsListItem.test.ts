import { vi } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import { WAIT_INDEFINITELY, type ExecutionSummary } from 'n8n-workflow';
import GlobalExecutionsListItem from './GlobalExecutionsListItem.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { DateTime } from 'luxon';
import type { ExecutionColumnDefinition } from '../../executions.types';

vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');

	return {
		...actual,
		useRouter: vi.fn(() => ({
			resolve: vi.fn(() => ({ href: 'mockedRoute' })),
			push: vi.fn(),
		})),
	};
});

const globalExecutionsListItemQueuedTooltipRenderSpy = vi.fn();

const renderComponent = createComponentRenderer(GlobalExecutionsListItem, {
	global: {
		stubs: {
			N8nButton: true,
			I18nT: true,
			GlobalExecutionsListItemQueuedTooltip: {
				render: globalExecutionsListItemQueuedTooltipRenderSpy,
			},
		},
	},
});

const DEFAULT_VISIBLE_COLUMNS: ExecutionColumnDefinition[] = [
	{
		id: 'workflow',
		labelKey: 'generic.workflow',
		toggleable: true,
		visible: true,
		group: 'standard',
	},
	{
		id: 'status',
		labelKey: 'executionsList.status',
		toggleable: true,
		visible: true,
		group: 'standard',
	},
	{
		id: 'startedAt',
		labelKey: 'executionsList.startedAt',
		toggleable: true,
		visible: true,
		group: 'standard',
	},
	{
		id: 'runTime',
		labelKey: 'executionsList.runTime',
		toggleable: true,
		visible: true,
		group: 'standard',
	},
	{ id: 'id', labelKey: 'executionsList.id', toggleable: true, visible: true, group: 'standard' },
	{
		id: 'tags',
		labelKey: 'executionsList.columns.tags',
		toggleable: true,
		visible: true,
		group: 'annotation',
	},
	{
		id: 'rating',
		labelKey: 'executionsList.columns.rating',
		toggleable: true,
		visible: true,
		group: 'annotation',
	},
	{
		id: 'mode',
		labelKey: 'executionsList.columns.mode',
		toggleable: true,
		visible: true,
		group: 'standard',
	},
];

describe('GlobalExecutionsListItem', () => {
	it('should render the status text for an execution', () => {
		const { getByTestId } = renderComponent({
			props: {
				execution: { status: 'running', id: 123, workflowName: 'Test Workflow' },
				visibleColumns: DEFAULT_VISIBLE_COLUMNS,
			} as unknown as ExecutionSummary,
		});

		expect(getByTestId('execution-status')).toBeInTheDocument();
	});

	it('should emit stop event on stop button click for a running execution', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				execution: { status: 'running', id: 123, stoppedAt: undefined, waitTill: true },
				visibleColumns: DEFAULT_VISIBLE_COLUMNS,
			} as unknown as ExecutionSummary,
		});

		const stopButton = getByTestId('stop-execution-button');

		expect(stopButton).toBeInTheDocument();

		await fireEvent.click(stopButton);
		expect(emitted().stop).toBeTruthy();
	});

	it('should emit retry events on retry original and retry saved dropdown items click', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				execution: {
					status: 'error',
					id: 123,
					stoppedAt: '01-01-2024',
					finished: false,
					retryOf: undefined,
					retrySuccessfulId: undefined,
					waitTill: false,
				} as unknown as ExecutionSummary,
				visibleColumns: DEFAULT_VISIBLE_COLUMNS,
				workflowPermissions: {
					execute: true,
				},
			},
		});

		await fireEvent.click(getByTestId('execution-retry-saved-dropdown-item'));
		expect(emitted().retrySaved).toBeTruthy();

		await fireEvent.click(getByTestId('execution-retry-original-dropdown-item'));
		expect(emitted().retryOriginal).toBeTruthy();
	});

	it('should emit delete event on delete dropdown item click', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				execution: {
					status: 'error',
					id: 123,
					stoppedAt: undefined,
				} as unknown as ExecutionSummary,
				visibleColumns: DEFAULT_VISIBLE_COLUMNS,
				workflowPermissions: {
					update: true,
				},
			},
		});

		await fireEvent.click(getByTestId('execution-delete-dropdown-item'));
		expect(emitted().delete).toBeTruthy();
	});

	it('should show formatted start date', () => {
		const testDate = '2022-01-01T12:00:00Z';
		const { getByText } = renderComponent({
			props: {
				execution: {
					status: 'success',
					id: 123,
					startedAt: testDate,
				} as unknown as ExecutionSummary,
				visibleColumns: DEFAULT_VISIBLE_COLUMNS,
				workflowPermissions: {},
			},
		});

		expect(
			getByText(`Jan 1, 2022, ${DateTime.fromJSDate(new Date(testDate)).toFormat('HH')}:00:00`),
		).toBeInTheDocument();
	});

	it('should not render queued tooltip for a not indefinitely waiting execution', async () => {
		renderComponent({
			props: {
				execution: {
					status: 'waiting',
					waitTill: new Date(Date.now() + 10000000).toISOString(),
					id: 123,
					workflowName: 'Test Workflow',
				} as unknown as ExecutionSummary,
				visibleColumns: DEFAULT_VISIBLE_COLUMNS,
				workflowPermissions: {},
				concurrencyCap: 5,
			},
		});

		expect(globalExecutionsListItemQueuedTooltipRenderSpy).not.toHaveBeenCalled();
	});

	it('should render queued tooltip for an indefinitely waiting execution', async () => {
		renderComponent({
			props: {
				execution: {
					status: 'waiting',
					waitTill: WAIT_INDEFINITELY,
					id: 123,
					workflowName: 'Test Workflow',
				} as unknown as ExecutionSummary,
				visibleColumns: DEFAULT_VISIBLE_COLUMNS,
				workflowPermissions: {},
				concurrencyCap: 5,
			},
		});

		expect(globalExecutionsListItemQueuedTooltipRenderSpy).toHaveBeenCalled();
	});

	it('should render queued tooltip for a new execution', async () => {
		renderComponent({
			props: {
				execution: {
					status: 'new',
					id: 123,
					workflowName: 'Test Workflow',
				} as unknown as ExecutionSummary,
				visibleColumns: DEFAULT_VISIBLE_COLUMNS,
				workflowPermissions: {},
				concurrencyCap: 5,
			},
		});

		expect(globalExecutionsListItemQueuedTooltipRenderSpy).toHaveBeenCalled();
	});

	afterEach(() => {
		vitest.useRealTimers();
	});

	it('uses `createdAt` to calculate running time if `startedAt` is undefined', async () => {
		const createdAt = new Date('2024-09-27T12:00:00Z');
		const now = new Date('2024-09-27T12:30:00Z');
		vitest.useFakeTimers({ now });
		const { getByTestId } = renderComponent({
			props: {
				execution: {
					status: 'running',
					id: 123,
					workflowName: 'Test Workflow',
					createdAt,
				} as unknown as ExecutionSummary,
				visibleColumns: DEFAULT_VISIBLE_COLUMNS,
				workflowPermissions: {},
				concurrencyCap: 5,
			},
		});

		const executionTimeElement = getByTestId('execution-time');
		expect(executionTimeElement).toBeVisible();
		expect(executionTimeElement.textContent).toBe('-1727438401s');
	});

	it('uses `createdAt` to calculate running time if `startedAt` is undefined and `stoppedAt` is defined', async () => {
		const createdAt = new Date('2024-09-27T12:00:00Z');
		const now = new Date('2024-09-27T12:30:00Z');
		vitest.useFakeTimers({ now });
		const { getByTestId } = renderComponent({
			props: {
				execution: {
					status: 'running',
					id: 123,
					workflowName: 'Test Workflow',
					createdAt,
					stoppedAt: now,
				} as unknown as ExecutionSummary,
				visibleColumns: DEFAULT_VISIBLE_COLUMNS,
				workflowPermissions: {},
				concurrencyCap: 5,
			},
		});

		const executionTimeElement = getByTestId('execution-time');
		expect(executionTimeElement).toBeVisible();
		expect(executionTimeElement.textContent).toBe('30m 0s');
	});

	it('should render annotation tags when present', () => {
		const { getByText } = renderComponent({
			props: {
				execution: {
					status: 'success',
					id: 123,
					stoppedAt: '2024-01-01',
					annotation: {
						tags: [
							{ id: 't1', name: 'important' },
							{ id: 't2', name: 'reviewed' },
						],
					},
				} as unknown as ExecutionSummary,
				visibleColumns: DEFAULT_VISIBLE_COLUMNS,
				workflowPermissions: {},
			},
		});

		expect(getByText('important')).toBeInTheDocument();
		expect(getByText('reviewed')).toBeInTheDocument();
	});

	it('should render dash when no annotation tags', () => {
		const { container } = renderComponent({
			props: {
				execution: {
					status: 'success',
					id: 123,
					stoppedAt: '2024-01-01',
				} as unknown as ExecutionSummary,
				visibleColumns: DEFAULT_VISIBLE_COLUMNS,
				workflowPermissions: {},
			},
		});

		const tagsCells = container.querySelectorAll('td');
		const tagsCell = Array.from(tagsCells).find((td) => td.textContent?.trim() === '-');
		expect(tagsCell).toBeTruthy();
	});

	it('should render thumbs-up icon for vote up', () => {
		const { container } = renderComponent({
			props: {
				execution: {
					status: 'success',
					id: 123,
					stoppedAt: '2024-01-01',
					annotation: { vote: 'up', tags: [] },
				} as unknown as ExecutionSummary,
				visibleColumns: DEFAULT_VISIBLE_COLUMNS,
				workflowPermissions: {},
			},
		});

		const thumbsUp = container.querySelector('[data-icon="thumbs-up"]');
		expect(thumbsUp).toBeInTheDocument();
	});

	it('should render thumbs-down icon for vote down', () => {
		const { container } = renderComponent({
			props: {
				execution: {
					status: 'success',
					id: 123,
					stoppedAt: '2024-01-01',
					annotation: { vote: 'down', tags: [] },
				} as unknown as ExecutionSummary,
				visibleColumns: DEFAULT_VISIBLE_COLUMNS,
				workflowPermissions: {},
			},
		});

		const thumbsDown = container.querySelector('[data-icon="thumbs-down"]');
		expect(thumbsDown).toBeInTheDocument();
	});

	it('should render customData column value', () => {
		const customDataColumns: ExecutionColumnDefinition[] = [
			...DEFAULT_VISIBLE_COLUMNS,
			{
				id: 'customData:orderId',
				labelKey: 'orderId',
				toggleable: true,
				visible: true,
				group: 'customData',
			},
		];

		const { getByText } = renderComponent({
			props: {
				execution: {
					status: 'success',
					id: 123,
					stoppedAt: '2024-01-01',
					customData: { orderId: 'ORD-999' },
				} as unknown as ExecutionSummary,
				visibleColumns: customDataColumns,
				workflowPermissions: {},
			},
		});

		expect(getByText('ORD-999')).toBeInTheDocument();
	});

	it('should render dash for missing customData value', () => {
		const customDataColumns: ExecutionColumnDefinition[] = [
			...DEFAULT_VISIBLE_COLUMNS,
			{
				id: 'customData:orderId',
				labelKey: 'orderId',
				toggleable: true,
				visible: true,
				group: 'customData',
			},
		];

		const { container } = renderComponent({
			props: {
				execution: {
					status: 'success',
					id: 123,
					stoppedAt: '2024-01-01',
				} as unknown as ExecutionSummary,
				visibleColumns: customDataColumns,
				workflowPermissions: {},
			},
		});

		const cells = container.querySelectorAll('td');
		const dashCells = Array.from(cells).filter((td) => td.textContent?.trim() === '-');
		// At least 3 dashes: tags, rating, and the missing customData
		expect(dashCells.length).toBeGreaterThanOrEqual(3);
	});
});
