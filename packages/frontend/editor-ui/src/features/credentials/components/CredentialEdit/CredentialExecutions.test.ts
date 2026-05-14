import { setActivePinia } from 'pinia';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import CredentialExecutions from './CredentialExecutions.vue';
import { useCredentialsStore } from '../../credentials.store';
import { mockedStore } from '@/__tests__/utils';
import type { CredentialExecutionSummary } from '../../credentials.api';

// Provide a deterministic localStorage shim so the session-grouping composable
// (which reads from localStorage during setup) behaves predictably across tests.
function createLocalStorageStub(): Storage {
	const store = new Map<string, string>();
	return {
		get length() {
			return store.size;
		},
		clear: () => store.clear(),
		getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
		key: (index: number) => Array.from(store.keys())[index] ?? null,
		removeItem: (key: string) => {
			store.delete(key);
		},
		setItem: (key: string, value: string) => {
			store.set(key, String(value));
		},
	};
}

const renderComponent = createComponentRenderer(CredentialExecutions, {
	props: { credentialId: 'cred_abc' },
});

const sampleRow = (
	overrides: Partial<CredentialExecutionSummary> = {},
): CredentialExecutionSummary =>
	({
		id: 'exec-1',
		workflowId: 'w-hub-placeholder',
		mode: 'single-node',
		status: 'success',
		startedAt: '2026-05-13T10:00:00Z' as unknown as Date,
		stoppedAt: '2026-05-13T10:00:00.250Z' as unknown as Date,
		actionDisplayName: 'Slack - Send a message',
		caller: { kind: 'mcp', name: 'Claude Desktop' },
		...overrides,
	}) as CredentialExecutionSummary;

describe('CredentialExecutions', () => {
	let credentialsStore: ReturnType<typeof mockedStore<typeof useCredentialsStore>>;

	beforeEach(() => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);
		credentialsStore = mockedStore(useCredentialsStore);

		const stub = createLocalStorageStub();
		Object.defineProperty(window, 'localStorage', {
			configurable: true,
			value: stub,
		});
		stub.clear();
	});

	it('shows the empty state when the credential has no executions', async () => {
		credentialsStore.fetchCredentialExecutions.mockResolvedValueOnce({
			results: [],
			total: 0,
			succeeded: 0,
			failed: 0,
		});

		const { getByTestId, queryByTestId } = renderComponent();

		await waitFor(() => expect(getByTestId('credential-executions-empty')).toBeInTheDocument());
		expect(queryByTestId('credential-executions-table')).not.toBeInTheDocument();
		expect(queryByTestId('credential-executions-summary')).not.toBeInTheDocument();
	});

	it('renders the aggregate header and rows once loaded', async () => {
		credentialsStore.fetchCredentialExecutions.mockResolvedValueOnce({
			results: [sampleRow(), sampleRow({ id: 'exec-2', actionDisplayName: 'Slack - List users' })],
			total: 2,
			succeeded: 2,
			failed: 0,
		});

		const { getByTestId, getAllByTestId } = renderComponent();

		await waitFor(() => expect(getByTestId('credential-executions-summary')).toBeInTheDocument());
		expect(getByTestId('credential-executions-summary')).toHaveTextContent(
			'2 executions · 2 succeeded · 0 failed',
		);
		const rows = getAllByTestId('credential-executions-row');
		expect(rows).toHaveLength(2);
		expect(rows[0]).toHaveTextContent('Slack - Send a message');
		expect(rows[0]).toHaveTextContent('MCP (Claude Desktop)');
	});

	it('shows an error state and recovers on retry', async () => {
		credentialsStore.fetchCredentialExecutions
			.mockRejectedValueOnce(new Error('boom'))
			.mockResolvedValueOnce({
				results: [sampleRow()],
				total: 1,
				succeeded: 1,
				failed: 0,
			});

		const { getByTestId, getByRole } = renderComponent();

		await waitFor(() => expect(getByTestId('credential-executions-error')).toBeInTheDocument());

		await userEvent.click(getByRole('button'));

		await waitFor(() => expect(getByTestId('credential-executions-summary')).toBeInTheDocument());
	});

	it('paginates with lastId when "Load more" is clicked', async () => {
		const firstPage = Array.from({ length: 20 }, (_, i) => sampleRow({ id: `exec-${i + 1}` }));
		credentialsStore.fetchCredentialExecutions
			.mockResolvedValueOnce({
				results: firstPage,
				total: 30,
				succeeded: 30,
				failed: 0,
			})
			.mockResolvedValueOnce({
				results: [sampleRow({ id: 'exec-21' })],
				total: 30,
				succeeded: 30,
				failed: 0,
			});

		const { getByTestId, getAllByTestId } = renderComponent();

		await waitFor(() => expect(getAllByTestId('credential-executions-row')).toHaveLength(20));

		await userEvent.click(getByTestId('credential-executions-load-more'));

		await waitFor(() => expect(getAllByTestId('credential-executions-row')).toHaveLength(21));

		const callArgs = credentialsStore.fetchCredentialExecutions.mock.calls;
		expect(callArgs[0]).toEqual(['cred_abc', { limit: 20, lastId: undefined }]);
		expect(callArgs[1]).toEqual(['cred_abc', { limit: 20, lastId: 'exec-20' }]);
	});

	it('groups rows that share a session id under a session group header', async () => {
		credentialsStore.fetchCredentialExecutions.mockResolvedValueOnce({
			results: [
				sampleRow({
					id: 'exec-1',
					caller: { kind: 'mcp', name: 'Claude Desktop', sessionId: 'sess-1' },
				}),
				sampleRow({
					id: 'exec-2',
					actionDisplayName: 'Slack - List users',
					caller: { kind: 'mcp', name: 'Claude Desktop', sessionId: 'sess-1' },
				}),
				sampleRow({
					id: 'exec-3',
					actionDisplayName: 'Notion - Append block',
					caller: { kind: 'mcp', name: 'Claude Desktop' },
				}),
			],
			total: 3,
			succeeded: 3,
			failed: 0,
		});

		const { getByTestId, getAllByTestId } = renderComponent();

		await waitFor(() => expect(getByTestId('credential-executions-summary')).toBeInTheDocument());
		// Group + remaining solo row.
		expect(getByTestId('credential-executions-session-group')).toBeVisible();
		// All three rows are still rendered (two inside the group, one outside).
		expect(getAllByTestId('credential-executions-row')).toHaveLength(3);
	});

	it('does not render a session group when the toggle is off', async () => {
		window.localStorage.setItem('executions.groupBySession', 'false');
		credentialsStore.fetchCredentialExecutions.mockResolvedValueOnce({
			results: [
				sampleRow({
					id: 'exec-1',
					caller: { kind: 'mcp', name: 'Claude Desktop', sessionId: 'sess-1' },
				}),
				sampleRow({
					id: 'exec-2',
					caller: { kind: 'mcp', name: 'Claude Desktop', sessionId: 'sess-1' },
				}),
			],
			total: 2,
			succeeded: 2,
			failed: 0,
		});

		const { getByTestId, queryByTestId, getAllByTestId } = renderComponent();

		await waitFor(() => expect(getByTestId('credential-executions-summary')).toBeInTheDocument());
		expect(queryByTestId('credential-executions-session-group')).toBeNull();
		expect(getAllByTestId('credential-executions-row')).toHaveLength(2);
	});

	it('flattens single-row sessions (no group for sessions of 1)', async () => {
		credentialsStore.fetchCredentialExecutions.mockResolvedValueOnce({
			results: [
				sampleRow({
					id: 'exec-1',
					caller: { kind: 'mcp', name: 'Claude Desktop', sessionId: 'sess-1' },
				}),
			],
			total: 1,
			succeeded: 1,
			failed: 0,
		});

		const { getByTestId, queryByTestId } = renderComponent();

		await waitFor(() => expect(getByTestId('credential-executions-summary')).toBeInTheDocument());
		expect(queryByTestId('credential-executions-session-group')).toBeNull();
	});

	it('shows the group-by-session toggle only when single-node rows are present', async () => {
		credentialsStore.fetchCredentialExecutions.mockResolvedValueOnce({
			results: [sampleRow()],
			total: 1,
			succeeded: 1,
			failed: 0,
		});

		const { getByTestId } = renderComponent();

		await waitFor(() =>
			expect(getByTestId('credential-executions-group-by-session-toolbar')).toBeVisible(),
		);
	});
});
