import { describe, it, expect, vi } from 'vitest';
import type { ITaskData } from 'n8n-workflow';
import RunInfo from './RunInfo.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { getTooltip, hoverTooltipTrigger } from '@/__tests__/utils';
import { waitFor } from '@testing-library/vue';
import { mock } from 'vitest-mock-extended';

vi.mock('@/app/utils/formatters/dateFormatter', () => ({
	convertToDisplayDateComponents: vi.fn(() => ({
		date: 'Jan 15',
		time: '10:30:00',
	})),
}));

vi.mock('@n8n/i18n', async (importOriginal) => {
	return {
		...(await importOriginal()),
		useI18n: () => ({
			baseText: vi.fn((key: string) => {
				const translations: Record<string, string> = {
					'runData.executionStatus.success': 'Success',
					'runData.executionStatus.canceled': 'Canceled',
					'runData.executionStatus.failed': 'Failed',
					'runData.startTime': 'Start time',
					'runData.executionTime': 'Execution time',
					'runData.ms': 'ms',
				};
				return translations[key] || key;
			}),
		}),
	};
});

const renderComponent = createComponentRenderer(RunInfo);

describe('RunInfo', () => {
	it('should display success status when execution status is success', async () => {
		const successTaskData: ITaskData = mock<ITaskData>({
			startTime: Date.now(),
			executionTime: 1500,
			executionStatus: 'success',
			data: {},
			error: undefined,
		});

		const { getByTestId, container } = renderComponent({
			props: {
				taskData: successTaskData,
				hasStaleData: false,
				hasPinData: false,
			},
		});

		expect(getByTestId('node-run-status-success')).toBeInTheDocument();
		expect(getByTestId('node-run-info')).toBeInTheDocument();

		const tooltipDiv = container.querySelector('.tooltipRow');
		expect(tooltipDiv).toBeInTheDocument();

		const statusIcon = getByTestId('node-run-status-success');
		expect(statusIcon).toHaveClass('success');

		const infoIcon = getByTestId('node-run-info');
		expect(infoIcon).toBeInTheDocument();

		// Verify the component renders with success status
		expect(statusIcon).toHaveAttribute('data-test-id', 'node-run-status-success');

		// Verify tooltip shows execution details on hover
		await hoverTooltipTrigger(infoIcon);
		await waitFor(() => {
			const tooltip = getTooltip();
			expect(tooltip).toHaveTextContent('Success');
			expect(tooltip).toHaveTextContent('Start time');
			expect(tooltip).toHaveTextContent('Execution time');
		});
	});

	it('should display cancelled status when execution status is canceled', async () => {
		const cancelledTaskData: ITaskData = mock<ITaskData>({
			startTime: 1757506978099,
			executionTime: 800,
			executionStatus: 'canceled',
			data: {},
			error: undefined,
		});

		const { getByTestId, container, queryByTestId } = renderComponent({
			props: {
				taskData: cancelledTaskData,
				hasStaleData: false,
				hasPinData: false,
			},
		});

		expect(queryByTestId('node-run-status-success')).not.toBeInTheDocument();
		expect(getByTestId('node-run-info')).toBeInTheDocument();

		const tooltipDiv = container.querySelector('.tooltipRow');
		expect(tooltipDiv).toBeInTheDocument();

		const infoIcon = getByTestId('node-run-info');
		expect(infoIcon).toBeInTheDocument();

		// For cancelled status, only info tooltip is shown (no status icon)
		expect(infoIcon).toHaveAttribute('data-test-id', 'node-run-info');

		// Verify tooltip shows canceled status on hover
		await hoverTooltipTrigger(infoIcon);
		await waitFor(() => {
			const tooltip = getTooltip();
			expect(tooltip).toHaveTextContent('Canceled');
			expect(tooltip).toHaveTextContent('Start time');
			expect(tooltip).toHaveTextContent('Execution time');
		});
	});

	it('should display error status when there is an error', async () => {
		const errorTaskData: ITaskData = mock<ITaskData>({
			startTime: 1757506978099,
			executionTime: 1200,
			executionStatus: 'success',
			data: {},
			error: {
				message: 'Something went wrong',
				name: 'Error',
			},
		});

		const { getByTestId, container } = renderComponent({
			props: {
				taskData: errorTaskData,
				hasStaleData: false,
				hasPinData: false,
			},
		});

		expect(getByTestId('node-run-status-danger')).toBeInTheDocument();
		expect(getByTestId('node-run-info')).toBeInTheDocument();

		const tooltipDiv = container.querySelector('.tooltipRow');
		expect(tooltipDiv).toBeInTheDocument();

		const statusIcon = getByTestId('node-run-status-danger');
		expect(statusIcon).toHaveClass('danger');

		const infoIcon = getByTestId('node-run-info');
		expect(infoIcon).toBeInTheDocument();

		// Verify the component renders with error status
		expect(statusIcon).toHaveAttribute('data-test-id', 'node-run-status-danger');

		// Verify tooltip shows failed status on hover
		await hoverTooltipTrigger(infoIcon);
		await waitFor(() => {
			const tooltip = getTooltip();
			expect(tooltip).toHaveTextContent('Failed');
			expect(tooltip).toHaveTextContent('Start time');
			expect(tooltip).toHaveTextContent('Execution time');
		});
	});
});
