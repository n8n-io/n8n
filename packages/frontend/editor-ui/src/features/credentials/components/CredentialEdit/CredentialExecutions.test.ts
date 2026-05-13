import { setActivePinia } from 'pinia';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import CredentialExecutions from './CredentialExecutions.vue';
import { useCredentialsStore } from '../../credentials.store';
import { mockedStore } from '@/__tests__/utils';
import type { CredentialExecutionSummary } from '../../credentials.api';

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
});
