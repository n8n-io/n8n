import type { OperatorLogRecord } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';

import OperatorConsoleView from './OperatorConsoleView.vue';
import { useOperatorConsoleStore } from './operatorConsole.store';

const fetchHostsMock = vi.fn();
const fetchLogsMock = vi.fn();
const startTailMock = vi.fn();
const stopTailMock = vi.fn();

vi.mock('./operatorConsole.api', () => ({
	fetchOperatorLogHosts: async (...args: unknown[]) => await fetchHostsMock(...args),
	fetchOperatorLogs: async (...args: unknown[]) => await fetchLogsMock(...args),
	startOperatorLogTail: async (...args: unknown[]) => await startTailMock(...args),
	stopOperatorLogTail: async (...args: unknown[]) => await stopTailMock(...args),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '', pushRef: 'push-ref' } }),
}));

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({ set: vi.fn() }),
}));

const pushInitialize = vi.fn();
const pushTerminate = vi.fn();
vi.mock('@/app/composables/usePushConnection', () => ({
	usePushConnection: () => ({ initialize: pushInitialize, terminate: pushTerminate }),
}));

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({ pushConnect: vi.fn(), pushDisconnect: vi.fn() }),
}));

let routeQuery: Record<string, string> = {};
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRoute: () => ({ query: routeQuery }),
	useRouter: () => ({ push: vi.fn(), resolve: vi.fn() }),
}));

function makeRecord(overrides: Partial<OperatorLogRecord> = {}): OperatorLogRecord {
	return {
		seq: 1,
		ts: '2026-05-04T09:12:33.482Z',
		hostId: 'main-1',
		role: 'main',
		stream: 'log',
		level: 'info',
		origin: 'live',
		message: 'workflow started',
		...overrides,
	};
}

const renderView = createComponentRenderer(OperatorConsoleView, {
	pinia: createTestingPinia({ stubActions: false }),
});

describe('OperatorConsoleView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		routeQuery = {};
		fetchHostsMock.mockResolvedValue([
			{ hostId: 'main-1', role: 'main', lastSeenAt: '2026-05-04T09:00:00.000Z' },
		]);
		fetchLogsMock.mockResolvedValue({ records: [], nextCursor: 'c1', gap: false });
		startTailMock.mockResolvedValue(undefined);
		stopTailMock.mockResolvedValue(undefined);
	});

	it('renders the console shell and starts the tail', async () => {
		const { getByTestId } = renderView();

		expect(getByTestId('operator-console-filter-bar')).toBeInTheDocument();
		expect(getByTestId('operator-console-toolbar')).toBeInTheDocument();
		expect(getByTestId('operator-console-log-list')).toBeInTheDocument();

		await waitFor(() => expect(startTailMock).toHaveBeenCalledWith(expect.anything(), {}));
	});

	it('shows the empty state until lines arrive', async () => {
		const { getByTestId, queryByTestId } = renderView();

		await waitFor(() => expect(getByTestId('operator-console-empty')).toBeInTheDocument());

		useOperatorConsoleStore().ingestBatch({
			hostId: 'main-1',
			dropped: 0,
			records: [makeRecord()],
		});

		await waitFor(() => expect(queryByTestId('operator-console-empty')).not.toBeInTheDocument());
		await waitFor(() => expect(getByTestId('operator-console-row')).toBeInTheDocument());
	});

	it('pre-applies ?executionId= from the URL', async () => {
		routeQuery = { executionId: '4321' };
		const { getByTestId } = renderView();

		await waitFor(() =>
			expect(startTailMock).toHaveBeenCalledWith(expect.anything(), { executionId: '4321' }),
		);
		expect(getByTestId('operator-console-filter-execution')).toBeInTheDocument();
	});

	it('surfaces a drop marker rather than hiding the loss', async () => {
		const { getByTestId } = renderView();
		await waitFor(() => expect(startTailMock).toHaveBeenCalled());

		useOperatorConsoleStore().ingestBatch({
			hostId: 'main-1',
			dropped: 42,
			records: [makeRecord()],
		});

		await waitFor(() => expect(getByTestId('operator-console-marker-dropped')).toBeInTheDocument());
		expect(getByTestId('operator-console-dropped-total')).toHaveTextContent('42');
	});

	it('pauses and reports how many lines are held back', async () => {
		const { getByTestId } = renderView();
		await waitFor(() => expect(startTailMock).toHaveBeenCalled());

		await userEvent.click(getByTestId('operator-console-pause-toggle'));

		useOperatorConsoleStore().ingestBatch({
			hostId: 'main-1',
			dropped: 0,
			records: [makeRecord(), makeRecord()],
		});

		await waitFor(() =>
			expect(getByTestId('operator-console-paused-count')).toHaveTextContent('2'),
		);
	});

	it('releases the lease on unmount', async () => {
		const { unmount } = renderView();
		await waitFor(() => expect(startTailMock).toHaveBeenCalled());

		unmount();

		await waitFor(() => expect(stopTailMock).toHaveBeenCalled());
		expect(pushTerminate).toHaveBeenCalled();
	});
});
