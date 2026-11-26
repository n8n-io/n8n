import { createTestingPinia } from '@pinia/testing';
import type { WorkerStatus } from '@n8n/api-types';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import { WORKER_HISTORY_LENGTH, useOrchestrationStore } from '../orchestration.store';
import WorkerChartsAccordion from './WorkerChartsAccordion.vue';

// The stub shows the data that each chart receives. A canvas does not render in jsdom.
vi.mock('@n8n/design-system/charts', () => ({
	Line: {
		props: ['data', 'options'],
		template:
			'<div data-test-id="worker-line-chart" :data-label="data.datasets[0].label" :data-values="data.datasets[0].data.join(\',\')" />',
	},
}));

const workerStatus = (overrides: Partial<WorkerStatus> = {}): WorkerStatus => ({
	senderId: 'worker-1',
	runningJobsSummary: [],
	isInContainer: false,
	process: {
		memory: { available: 250, constraint: 0, rss: 0, heapTotal: 0, heapUsed: 0 },
		uptime: 0,
	},
	host: { memory: { total: 1000, free: 0 } },
	freeMem: 0,
	totalMem: 0,
	uptime: 0,
	loadAvg: [1, 2, 3],
	cpus: '',
	arch: 'x64',
	platform: 'linux',
	hostname: 'worker-1',
	interfaces: [],
	version: '',
	poolName: '',
	queueName: '',
	...overrides,
});

const renderComponent = createComponentRenderer(WorkerChartsAccordion, {
	props: { workerId: 'worker-1' },
});

const chartValues = (charts: HTMLElement[]) =>
	charts.map((chart) => (chart.getAttribute('data-values') ?? '').split(',').map(Number));

describe('WorkerChartsAccordion', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
	});

	it('renders a line chart each for jobs, processor and memory, prefilled with zeros', async () => {
		const { getByText, getAllByTestId } = renderComponent();

		await userEvent.click(getByText('Performance Monitoring'));

		const charts = getAllByTestId('worker-line-chart');
		expect(charts.map((chart) => chart.getAttribute('data-label'))).toEqual([
			'Job Count',
			'Processor Usage',
			'Memory Usage (%)',
		]);
		for (const values of chartValues(charts)) {
			expect(values).toEqual(Array<number>(WORKER_HISTORY_LENGTH).fill(0));
		}
	});

	it('adds the status of its worker to the charts', async () => {
		const { getByText, getAllByTestId } = renderComponent();
		await userEvent.click(getByText('Performance Monitoring'));

		const job = {
			executionId: '1',
			workflowId: 'w',
			workflowName: 'Acme',
			mode: 'manual' as const,
			startedAt: new Date(),
			status: 'running' as const,
		};
		// The component reads the history when `updateWorkerStatus` starts, before the action adds
		// the new status. So the history holds the same status once already, and the newest point
		// is that status whether or not the chart also shows the status that the action adds.
		const status = workerStatus({ runningJobsSummary: [job, { ...job, executionId: '2' }] });
		const store = useOrchestrationStore();
		store.workersHistory = { 'worker-1': [{ data: status, timestamp: Date.now() }] };
		store.updateWorkerStatus(status);
		await vi.waitFor(() => {
			expect(chartValues(getAllByTestId('worker-line-chart'))[0].at(-1)).toBe(2);
		});

		const [jobs, cpu, memory] = chartValues(getAllByTestId('worker-line-chart'));
		expect(jobs).toHaveLength(WORKER_HISTORY_LENGTH);
		// The average of the load averages 1, 2 and 3.
		expect(cpu.at(-1)).toBe(2);
		// 750 of 1000 used.
		expect(memory.at(-1)).toBe(75);
	});

	it('ignores the status of another worker', async () => {
		const { getByText, getAllByTestId } = renderComponent();
		await userEvent.click(getByText('Performance Monitoring'));

		const job = {
			executionId: '1',
			workflowId: 'w',
			workflowName: 'Acme',
			mode: 'manual' as const,
			startedAt: new Date(),
			status: 'running' as const,
		};
		const other = workerStatus({ senderId: 'worker-2', runningJobsSummary: [job] });
		const store = useOrchestrationStore();
		store.workersHistory = { 'worker-2': [{ data: other, timestamp: Date.now() }] };
		store.updateWorkerStatus(other);
		await new Promise((resolve) => setTimeout(resolve, 0));

		for (const values of chartValues(getAllByTestId('worker-line-chart'))) {
			expect(values).toEqual(Array<number>(WORKER_HISTORY_LENGTH).fill(0));
		}
	});
});
