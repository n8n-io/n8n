import type { CustomNodeResponse, ParentCustomActionResponse } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer, mockedStore, waitAllPromises } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';
import { screen, within } from '@testing-library/vue';

import { useCustomNodesStore } from '../custom-nodes.store';
import { createNode, createParentAction } from '../custom-nodes.test.utils';
import SettingsCustomNodesView from './SettingsCustomNodesView.vue';

const { showMessage, showError } = vi.hoisted(() => ({ showMessage: vi.fn(), showError: vi.fn() }));

vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showMessage, showError }) }));
vi.mock('@n8n/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({ set: vi.fn() }),
}));

const renderView = createComponentRenderer(SettingsCustomNodesView);

const setup = (data: {
	nodes?: CustomNodeResponse[];
	parentActions?: ParentCustomActionResponse[];
}) => {
	const pinia = createTestingPinia();
	const store = mockedStore(useCustomNodesStore);
	store.nodes = data.nodes ?? [];
	store.parentActions = data.parentActions ?? [];
	store.fetchAll.mockResolvedValue();
	store.iconUrl.mockImplementation((id: string) => `/rest/custom-nodes/nodes/${id}/icon`);
	store.deleteNode.mockResolvedValue();
	store.deleteAction.mockResolvedValue();
	return { store, ...renderView({ pinia }) };
};

describe('SettingsCustomNodesView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('fetches the lists on mount', async () => {
		const { store } = setup({});
		await waitAllPromises();

		expect(store.fetchAll).toHaveBeenCalledTimes(1);
	});

	it('shows the empty state when there is nothing', async () => {
		const { getByTestId } = setup({});
		await waitAllPromises();

		expect(getByTestId('custom-nodes-empty-state')).toHaveTextContent(
			'No custom nodes or actions yet.',
		);
	});

	it('lists nodes and parent actions grouped by parent', async () => {
		const { getAllByTestId, queryByTestId } = setup({
			nodes: [createNode({ displayName: 'Acme', hasIcon: true })],
			parentActions: [
				createParentAction({ id: 'p1', name: 'Archive channel' }),
				createParentAction({ id: 'p2', name: 'Pin message' }),
				createParentAction({
					id: 'p3',
					name: 'Add row',
					parentNodeType: 'n8n-nodes-base.googleSheets',
				}),
			],
		});
		await waitAllPromises();

		expect(queryByTestId('custom-nodes-empty-state')).not.toBeInTheDocument();
		expect(getAllByTestId('custom-nodes-node-row')).toHaveLength(1);
		expect(getAllByTestId('custom-nodes-node-row')[0]).toHaveTextContent('Acme');
		expect(getAllByTestId('custom-nodes-node-row')[0].querySelector('img')).toHaveAttribute(
			'src',
			'/rest/custom-nodes/nodes/node-1/icon',
		);
		const sections = getAllByTestId('custom-nodes-parent-section');
		expect(sections).toHaveLength(2);
		expect(sections[0]).toHaveTextContent('n8n-nodes-base.slack');
		expect(within(sections[0]).getAllByTestId('custom-nodes-parent-action-row')).toHaveLength(2);
		expect(sections[1]).toHaveTextContent('Add row');
	});

	it('asks for confirmation and then deletes a node', async () => {
		const { store, getByTestId } = setup({ nodes: [createNode()] });
		await waitAllPromises();

		await userEvent.click(getByTestId('custom-nodes-delete-node'));
		expect(store.deleteNode).not.toHaveBeenCalled();
		const dialog = await screen.findByRole('dialog');
		expect(dialog).toHaveTextContent('Delete "Acme"?');

		await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
		await waitAllPromises();

		expect(store.deleteNode).toHaveBeenCalledWith('node-1');
		expect(showMessage).toHaveBeenCalled();
	});

	it('deletes a parent action after confirmation', async () => {
		const { store, getByTestId } = setup({ parentActions: [createParentAction()] });
		await waitAllPromises();

		await userEvent.click(getByTestId('custom-nodes-delete-action'));
		const dialog = await screen.findByRole('dialog');
		await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
		await waitAllPromises();

		expect(store.deleteAction).toHaveBeenCalledWith('parent-action-1');
	});

	it('does not delete when the user cancels', async () => {
		const { store, getByTestId } = setup({ nodes: [createNode()] });
		await waitAllPromises();

		await userEvent.click(getByTestId('custom-nodes-delete-node'));
		const dialog = await screen.findByRole('dialog');
		await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
		await waitAllPromises();

		expect(store.deleteNode).not.toHaveBeenCalled();
	});

	it('shows an error when the delete fails', async () => {
		const { store, getByTestId } = setup({ nodes: [createNode()] });
		store.deleteNode.mockRejectedValue(new Error('nope'));
		await waitAllPromises();

		await userEvent.click(getByTestId('custom-nodes-delete-node'));
		const dialog = await screen.findByRole('dialog');
		await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
		await waitAllPromises();

		expect(showError).toHaveBeenCalled();
	});
});
