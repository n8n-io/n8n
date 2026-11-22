import { createComponentRenderer, mockedStore, waitAllPromises } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import { useCustomNodesStore } from '../custom-nodes.store';
import { createAction } from '../custom-nodes.test.utils';
import ActionHistoryDialog from './ActionHistoryDialog.vue';

const { showMessage, showError } = vi.hoisted(() => ({ showMessage: vi.fn(), showError: vi.fn() }));

vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showMessage, showError }) }));

vi.mock('@n8n/design-system', async () => {
	const actual = await vi.importActual<typeof import('@n8n/design-system')>('@n8n/design-system');
	const { N8nDialogStub } = await import('../__tests__/designSystemStubs');
	return { ...actual, N8nDialog: N8nDialogStub };
});

const renderDialog = createComponentRenderer(ActionHistoryDialog);

const action = createAction({
	newestVersion: 2,
	versions: [
		{
			version: 1,
			currentRevision: 1,
			revisionCount: 1,
			createdAt: '2026-01-01T00:00:00.000Z',
			pinValues: { operation: 'a' },
		},
		{
			version: 2,
			currentRevision: 2,
			revisionCount: 2,
			createdAt: '2026-02-01T00:00:00.000Z',
			pinValues: { operation: 'b' },
		},
	],
});

const detail = {
	version: 2,
	draft: action.draft,
	revisions: [
		{ revision: 1, changeNote: 'First try', createdAt: '2026-02-01T00:00:00.000Z', current: false },
		{ revision: 2, createdAt: '2026-02-02T00:00:00.000Z', current: true },
	],
};

const setup = async () => {
	const pinia = createTestingPinia();
	const store = mockedStore(useCustomNodesStore);
	store.fetchActionVersion.mockResolvedValue(detail);
	store.rollbackRevision.mockResolvedValue(action);
	const view = renderDialog({ pinia, props: { open: true, action } });
	await waitAllPromises();
	return { store, ...view };
};

describe('ActionHistoryDialog', () => {
	beforeEach(() => vi.clearAllMocks());

	it('lists the versions and the revisions of the newest version', async () => {
		const { store, getAllByTestId } = await setup();

		const versions = getAllByTestId('custom-nodes-history-version');
		expect(versions.map((v) => v.textContent?.trim())).toEqual(['Version 2', 'Version 1']);
		expect(getAllByTestId('custom-nodes-history-versions')[0]).toHaveTextContent('Newest');
		expect(store.fetchActionVersion).toHaveBeenCalledWith('action-1', 2);

		const revisions = getAllByTestId('custom-nodes-history-revision');
		expect(revisions).toHaveLength(2);
		expect(revisions[0]).toHaveTextContent('Revision 2');
		expect(revisions[0]).toHaveTextContent('Current');
		expect(revisions[1]).toHaveTextContent('First try');
	});

	it('loads the revisions of another version', async () => {
		const { store, getAllByTestId } = await setup();

		await userEvent.click(getAllByTestId('custom-nodes-history-version')[1]);
		await waitAllPromises();

		expect(store.fetchActionVersion).toHaveBeenCalledWith('action-1', 1);
	});

	it('offers roll back only on a non-current revision, asks, then rolls back and refreshes', async () => {
		const { store, getAllByTestId, getByTestId } = await setup();
		expect(getAllByTestId('custom-nodes-history-rollback')).toHaveLength(1);

		await userEvent.click(getByTestId('custom-nodes-history-rollback'));
		expect(store.rollbackRevision).not.toHaveBeenCalled();
		await userEvent.click(getByTestId('custom-nodes-history-confirm'));
		await waitAllPromises();

		expect(store.rollbackRevision).toHaveBeenCalledWith('action-1', 2, { revision: 1 });
		expect(store.fetchActionVersion).toHaveBeenCalledTimes(2);
		expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
	});

	it('does not roll back when the user cancels', async () => {
		const { store, getByTestId } = await setup();

		await userEvent.click(getByTestId('custom-nodes-history-rollback'));
		await userEvent.click(getByTestId('custom-nodes-history-cancel'));

		expect(store.rollbackRevision).not.toHaveBeenCalled();
	});
});
