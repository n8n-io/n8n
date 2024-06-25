import { describe, it, expect, vi } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import GlobalExecutionsListItem from './GlobalExecutionsListItem.vue';
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

const renderComponent = createComponentRenderer(GlobalExecutionsListItem, {
	global: {
		stubs: ['font-awesome-icon', 'n8n-tooltip', 'n8n-button', 'i18n-t'],
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
			},
		});

		await fireEvent.click(getByTestId('execution-delete-dropdown-item'));
		expect(emitted().delete).toBeTruthy();
	});

	it('should open a new window on execution click', async () => {
		global.window.open = vi.fn();

		const { getByText } = renderComponent({
			props: { execution: { status: 'success', id: 123, workflowName: 'TestWorkflow' } },
		});

		await fireEvent.click(getByText('TestWorkflow'));
		expect(window.open).toHaveBeenCalledWith('mockedRoute', '_blank');
	});

	it('should show formatted start date', () => {
		const testDate = '2022-01-01T12:00:00Z';
		const { getByText } = renderComponent({
			props: { execution: { status: 'success', id: 123, startedAt: testDate } },
		});

		expect(
			getByText(`1 Jan, 2022 at ${DateTime.fromJSDate(new Date(testDate)).toFormat('HH')}:00:00`),
		).toBeInTheDocument();
	});
});
