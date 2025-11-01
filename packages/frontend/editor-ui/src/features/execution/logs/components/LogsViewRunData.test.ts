import { createTestNode, createTestTaskData, createTestWorkflowObject } from '@/__tests__/mocks';
import { createTestLogEntry } from '../__test__/mocks';
import { fireEvent, render, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import LogsViewRunData from './LogsViewRunData.vue';
import { createTestingPinia, type TestingPinia } from '@pinia/testing';

describe('LogViewRunData', () => {
	let pinia: TestingPinia;

	const nodeB = createTestNode({ name: 'B' });
	const runDataB = createTestTaskData({
		data: {
			main: [
				[{ json: { p: '0' } }, { json: { p: '1' } }, { json: { p: '2' } }, { json: { p: '3' } }],
			],
		},
	});
	const workflow = createTestWorkflowObject({ nodes: [nodeB] });
	const logEntry = createTestLogEntry({
		node: nodeB,
		runIndex: 0,
		runData: runDataB,
		workflow,
		execution: { resultData: { runData: { B: [runDataB] } } },
	});

	beforeEach(() => {
		pinia = createTestingPinia({ stubActions: false, fakeApp: true });
	});

	it('should display item count', async () => {
		const rendered = render(LogsViewRunData, {
			global: { plugins: [pinia] },
			props: { title: '', logEntry, collapsingTableColumnName: null, paneType: 'output' },
		});

		expect(rendered.getByTestId('run-data-item-count')).toHaveTextContent('4 items');
	});

	it('should display matched and total item count unless display mode is schema', async () => {
		const rendered = render(LogsViewRunData, {
			global: { plugins: [pinia] },
			props: { title: '', logEntry, collapsingTableColumnName: null, paneType: 'output' },
		});

		await fireEvent.click(await rendered.findByTestId('radio-button-table'));
		await userEvent.type(await rendered.findByTestId('ndv-search'), '0');

		await waitFor(() => {
			expect(rendered.getByTestId('run-data-item-count')).toHaveTextContent('1 of 4 items');
		});

		await fireEvent.click(await rendered.findByTestId('radio-button-schema'));

		await waitFor(() => {
			expect(rendered.getByTestId('run-data-item-count')).toHaveTextContent('4 items');
		});
	});
});
