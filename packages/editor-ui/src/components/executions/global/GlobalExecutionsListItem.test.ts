import { vi } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import { WAIT_INDEFINITELY } from 'n8n-workflow';
import GlobalExecutionsListItem from '@/components/executions/global/GlobalExecutionsListItem.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { DateTime } from 'luxon';

vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');

	return {
		...actual,
		useRouter: vi.fn(() => ({
			resolve: vi.fn(() => ({ href: 'mockedRoute' })),
		})),
	};
});

const globalExecutionsListItemQueuedTooltipRenderSpy = vi.fn();

const renderComponent = createComponentRenderer(GlobalExecutionsListItem, {
	global: {
		//stubs: ['font-awesome-icon', 'n8n-tooltip', 'n8n-button', 'i18n-t'],
		stubs: {
			'font-awesome-icon': true,
			'n8n-tooltip': true,
			'n8n-button': true,
			'i18n-t': true,
			GlobalExecutionsListItemQueuedTooltip: {
				render: globalExecutionsListItemQueuedTooltipRenderSpy,
			},
		},
	},
});

describe('GlobalExecutionsListItem', () => {
	it('should render the status text for an execution', () => {
		const { getByTestId } = renderComponent({
			props: { execution: { status: 'running', id: 123, workflowName: 'Test Workflow' } },
		});

		expect(getByTestId('execution-status')).toBeInTheDocument();
	});

	it('should emit stop event on stop button click for a running execution', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { execution: { status: 'running', id: 123, stoppedAt: undefined, waitTill: true } },
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
				},
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
				},
				workflowPermissions: {
					update: true,
				},
			},
		});

		await fireEvent.click(getByTestId('execution-delete-dropdown-item'));
		expect(emitted().delete).toBeTruthy();
	});

	it('should open a new window on execution click', async () => {
		global.window.open = vi.fn();

		const { getByText } = renderComponent({
			props: {
				execution: { status: 'success', id: 123, workflowName: 'TestWorkflow' },
				workflowPermissions: {},
			},
		});

		await fireEvent.click(getByText('TestWorkflow'));
		expect(window.open).toHaveBeenCalledWith('mockedRoute', '_blank');
		expect(globalExecutionsListItemQueuedTooltipRenderSpy).not.toHaveBeenCalled();
	});

	it('should show formatted start date', () => {
		const testDate = '2022-01-01T12:00:00Z';
		const { getByText } = renderComponent({
			props: {
				execution: { status: 'success', id: 123, startedAt: testDate },
				workflowPermissions: {},
			},
		});

		expect(
			getByText(`1 Jan, 2022 at ${DateTime.fromJSDate(new Date(testDate)).toFormat('HH')}:00:00`),
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
				},
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
				},
				workflowPermissions: {},
				concurrencyCap: 5,
			},
		});

		expect(globalExecutionsListItemQueuedTooltipRenderSpy).toHaveBeenCalled();
	});

	it('should render queued tooltip for a new execution', async () => {
		renderComponent({
			props: {
				execution: { status: 'new', id: 123, workflowName: 'Test Workflow' },
				workflowPermissions: {},
				concurrencyCap: 5,
			},
		});

		expect(globalExecutionsListItemQueuedTooltipRenderSpy).toHaveBeenCalled();
	});
});
