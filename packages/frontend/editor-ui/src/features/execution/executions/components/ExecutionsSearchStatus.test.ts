import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useExecutionsStore } from '../executions.store';
import type { ExecutionSummaryWithScopes } from '../executions.types';
import ExecutionsSearchStatus from './ExecutionsSearchStatus.vue';

const showError = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError }),
}));

const renderComponent = createComponentRenderer(ExecutionsSearchStatus);

describe('ExecutionsSearchStatus', () => {
	let executionsStore: ReturnType<typeof mockedStore<typeof useExecutionsStore>>;

	const givenMatches = (count: number) => {
		executionsStore.executionsById = Object.fromEntries(
			Array.from({ length: count }, (_, i) => [`${i}`, {} as ExecutionSummaryWithScopes]),
		);
	};

	beforeEach(() => {
		showError.mockReset();
		createTestingPinia();
		executionsStore = mockedStore(useExecutionsStore);
		executionsStore.loading = false;
		executionsStore.hasMoreExecutions = true;
		executionsStore.searchedCount = 2340;
		executionsStore.searchedBackTo = '2020-11-03T14:02:00.000Z';
		givenMatches(7);
	});

	it('says how far back the search went and offers to continue', async () => {
		const { getByTestId } = renderComponent();

		const status = getByTestId('executions-search-status');
		expect(status).toHaveTextContent(/Searched 2,340 executions back to Nov 3, 2020 \d\d:02:00/);
		expect(status).toHaveTextContent('7 matches');

		await userEvent.click(getByTestId('executions-search-continue'));

		expect(executionsStore.loadMoreExecutions).toHaveBeenCalledTimes(1);
	});

	it('reports no matches together with the range that it searched', () => {
		givenMatches(0);

		const { getByTestId } = renderComponent();

		expect(getByTestId('executions-search-status')).toHaveTextContent(
			/Searched 2,340 executions back to .* · 0 matches/,
		);
	});

	it('uses the singular for one execution and one match', () => {
		executionsStore.searchedCount = 1;
		givenMatches(1);

		const { getByTestId } = renderComponent();

		expect(getByTestId('executions-search-status')).toHaveTextContent(
			/Searched 1 execution back to .* · 1 match(?!es)/,
		);
	});

	it('says that the search is complete, with nothing more to do', () => {
		executionsStore.hasMoreExecutions = false;

		const { getByTestId, queryByTestId } = renderComponent();

		expect(getByTestId('executions-search-status')).toHaveTextContent(
			'Searched all executions (2,340) · 7 matches',
		);
		expect(queryByTestId('executions-search-continue')).not.toBeInTheDocument();
	});

	it('shows progress and no button while a search runs', () => {
		executionsStore.loading = true;

		const { getByTestId, queryByTestId } = renderComponent();

		expect(getByTestId('executions-search-status')).toHaveTextContent(
			'Searching. Executions searched so far: 2,340',
		);
		expect(queryByTestId('executions-search-continue')).not.toBeInTheDocument();
	});

	it('lets the user start again when the search did not start', () => {
		executionsStore.searchedCount = 0;
		executionsStore.searchedBackTo = null;
		givenMatches(0);

		const { getByTestId } = renderComponent();

		expect(getByTestId('executions-search-status')).toHaveTextContent('The search did not start');
		expect(getByTestId('executions-search-continue')).toBeInTheDocument();
	});

	it('shows the error when the search cannot continue', async () => {
		const error = new Error('Another search is in progress. Try again in a moment.');
		executionsStore.loadMoreExecutions.mockRejectedValue(error);
		const { getByTestId } = renderComponent();

		await userEvent.click(getByTestId('executions-search-continue'));

		expect(showError).toHaveBeenCalledWith(error, 'Problem searching executions');
	});
});
