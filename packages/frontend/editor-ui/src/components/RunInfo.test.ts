import { describe, it, expect, vi } from 'vitest';
import type { ITaskData } from 'n8n-workflow';
import RunInfo from './RunInfo.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mock } from 'vitest-mock-extended';

vi.mock('@/utils/formatters/dateFormatter', () => ({
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
	it('should display success status when execution status is success', () => {
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

		// Check tooltip content exists in the DOM (even if hidden)
		expect(document.body).toHaveTextContent('Success');
		expect(document.body).toHaveTextContent('Start time:');
		expect(document.body).toHaveTextContent('Jan 15 at 10:30:00');
		expect(document.body).toHaveTextContent('Execution time:');
		expect(document.body).toHaveTextContent('1500 ms');
	});

	it('should display cancelled status when execution status is canceled', () => {
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

		// Check tooltip content exists in the DOM (even if hidden)
		expect(document.body).toHaveTextContent('Canceled');
		expect(document.body).toHaveTextContent('Start time:');
		expect(document.body).toHaveTextContent('Jan 15 at 10:30:00');
		expect(document.body).toHaveTextContent('Execution time:');
		expect(document.body).toHaveTextContent('800 ms');
	});

	it('should display error status when there is an error', () => {
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

		// Check tooltip content exists in the DOM (even if hidden)
		expect(document.body).toHaveTextContent('Failed');
		expect(document.body).toHaveTextContent('Start time:');
		expect(document.body).toHaveTextContent('Jan 15 at 10:30:00');
		expect(document.body).toHaveTextContent('Execution time:');
		expect(document.body).toHaveTextContent('1200 ms');
	});
});
