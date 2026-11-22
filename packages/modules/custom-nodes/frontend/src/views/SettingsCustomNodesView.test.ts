import type { CustomNodeResponse, ParentCustomActionResponse } from '@n8n/api-types';
import type { Scope } from '@n8n/permissions';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer, mockedStore, waitAllPromises } from '@n8n/frontend-test-utils';
import { useRBACStore } from '@n8n/stores/rbac.store';
import type { INodeTypeDescription } from 'n8n-workflow';
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

// The wizard has its own tests. Here it only shows whether it is open and with which data.
const renderView = createComponentRenderer(SettingsCustomNodesView, {
	global: {
		stubs: {
			CustomActionWizardModal: {
				props: ['open', 'data'],
				template:
					'<div v-if="open" data-test-id="custom-action-wizard-stub">{{ JSON.stringify(data) }}</div>',
			},
		},
	},
});

const ALL_SCOPES: Scope[] = [
	'customNode:list',
	'customNode:create',
	'customNode:update',
	'customNode:delete',
];

const setup = (data: {
	nodes?: CustomNodeResponse[];
	parentActions?: ParentCustomActionResponse[];
	scopes?: Scope[];
}) => {
	const pinia = createTestingPinia();
	const scopes = data.scopes ?? ALL_SCOPES;
	mockedStore(useRBACStore).hasScope.mockImplementation(
		(scope: Scope | Scope[]) => typeof scope === 'string' && scopes.includes(scope),
	);
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
		capabilityRegistry.provide(capabilities.typeDescriptions, {
			load: vi.fn(async () => {}),
			nodeTypes: () => [
				{ name: 'n8n-nodes-base.slack', displayName: 'Slack' } as INodeTypeDescription,
			],
			credentialTypeDisplayName: () => undefined,
		});
	});

	afterEach(() => {
		capabilityRegistry.clear();
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
			'/rest/custom-nodes/nodes/node-1/icon?v=2026-01-01T00%3A00%3A00.000Z-0',
		);
		const sections = getAllByTestId('custom-nodes-parent-section');
		expect(sections).toHaveLength(2);
		expect(sections[0]).toHaveTextContent('Actions for Slack');
		expect(within(sections[0]).getAllByTestId('custom-nodes-parent-action-row')).toHaveLength(2);
		expect(sections[1]).toHaveTextContent('Actions for n8n-nodes-base.googleSheets');
		expect(sections[1]).toHaveTextContent('Add row');
	});

	it('marks a parent action whose parent node is not available', async () => {
		const { getAllByTestId } = setup({
			parentActions: [
				createParentAction({ id: 'p1', name: 'Archive channel' }),
				createParentAction({ id: 'p2', name: 'Pin message', parentAvailable: false }),
			],
		});
		await waitAllPromises();

		const rows = getAllByTestId('custom-nodes-parent-action-row');
		expect(
			within(rows[0]).queryByTestId('custom-nodes-parent-unavailable'),
		).not.toBeInTheDocument();
		expect(within(rows[1]).getByTestId('custom-nodes-parent-unavailable')).toHaveTextContent(
			'Not available for this node',
		);
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

	describe('create buttons', () => {
		it('shows only the empty state button when the list is empty', async () => {
			const view = setup({});
			await waitAllPromises();

			expect(view.queryByTestId('custom-nodes-create')).not.toBeInTheDocument();
			expect(view.getAllByRole('button', { name: 'Create' })).toHaveLength(1);
			expect(view.getByTestId('custom-nodes-empty-create')).toBeInTheDocument();
		});

		it('shows only the header button when the list has entries', async () => {
			const view = setup({ nodes: [createNode()] });
			await waitAllPromises();

			expect(view.queryByTestId('custom-nodes-empty-create')).not.toBeInTheDocument();
			expect(view.getAllByRole('button', { name: 'Create' })).toHaveLength(1);
			expect(view.getByTestId('custom-nodes-create')).toBeInTheDocument();
		});
	});

	describe('wizard', () => {
		const openedWith = (view: { getByTestId: (id: string) => HTMLElement }) =>
			JSON.parse(view.getByTestId('custom-action-wizard-stub').textContent ?? '');

		it('opens the wizard to create from the header', async () => {
			const view = setup({ nodes: [createNode()] });
			await waitAllPromises();
			expect(view.queryByTestId('custom-action-wizard-stub')).not.toBeInTheDocument();

			await userEvent.click(view.getByTestId('custom-nodes-create'));

			expect(openedWith(view)).toEqual({ mode: 'create' });
		});

		it('opens the wizard to create from the empty state', async () => {
			const view = setup({});
			await waitAllPromises();

			await userEvent.click(view.getByTestId('custom-nodes-empty-create'));

			expect(openedWith(view)).toEqual({ mode: 'create' });
		});

		it('opens the wizard to add an action to a custom node', async () => {
			const view = setup({ nodes: [createNode()] });
			await waitAllPromises();

			await userEvent.click(view.getByTestId('custom-nodes-add-action'));

			expect(openedWith(view)).toEqual({ mode: 'create', customNodeId: 'node-1' });
		});

		it('opens the wizard to edit an action of a custom node', async () => {
			const view = setup({ nodes: [createNode()] });
			await waitAllPromises();

			expect(view.getAllByTestId('custom-nodes-node-action-row')[0]).toHaveTextContent(
				'Send message',
			);
			await userEvent.click(view.getByTestId('custom-nodes-edit-node-action'));

			expect(openedWith(view)).toEqual({ mode: 'edit', actionId: 'action-1' });
		});

		it('opens the wizard to edit an action of a parent node', async () => {
			const view = setup({ parentActions: [createParentAction()] });
			await waitAllPromises();

			await userEvent.click(view.getByTestId('custom-nodes-edit-action'));

			expect(openedWith(view)).toEqual({ mode: 'edit', actionId: 'parent-action-1' });
		});

		it('hides the edit, add action, and icon buttons without customNode:update', async () => {
			const { queryByTestId, getByTestId } = setup({
				nodes: [createNode()],
				parentActions: [createParentAction()],
				scopes: ['customNode:list', 'customNode:create', 'customNode:delete'],
			});
			await waitAllPromises();

			expect(queryByTestId('custom-nodes-edit-node-action')).not.toBeInTheDocument();
			expect(queryByTestId('custom-nodes-edit-action')).not.toBeInTheDocument();
			expect(queryByTestId('custom-nodes-add-action')).not.toBeInTheDocument();
			expect(queryByTestId('custom-nodes-icon-upload')).not.toBeInTheDocument();
			expect(getByTestId('custom-nodes-create')).toBeInTheDocument();
			expect(getByTestId('custom-nodes-delete-node')).toBeInTheDocument();
		});

		it('hides the create buttons without customNode:create', async () => {
			const { queryByTestId, getByTestId } = setup({
				nodes: [createNode()],
				scopes: ['customNode:list', 'customNode:update', 'customNode:delete'],
			});
			await waitAllPromises();

			expect(queryByTestId('custom-nodes-create')).not.toBeInTheDocument();
			expect(getByTestId('custom-nodes-add-action')).toBeInTheDocument();
		});

		it('hides the create button of the empty state without customNode:create', async () => {
			const { queryByTestId, getByTestId } = setup({
				scopes: ['customNode:list', 'customNode:update'],
			});
			await waitAllPromises();

			expect(getByTestId('custom-nodes-empty-state')).toBeInTheDocument();
			expect(queryByTestId('custom-nodes-empty-create')).not.toBeInTheDocument();
		});

		it('hides the delete buttons without customNode:delete', async () => {
			const { queryByTestId, getByTestId } = setup({
				nodes: [createNode()],
				parentActions: [createParentAction()],
				scopes: ['customNode:list', 'customNode:create', 'customNode:update'],
			});
			await waitAllPromises();

			expect(queryByTestId('custom-nodes-delete-node')).not.toBeInTheDocument();
			expect(queryByTestId('custom-nodes-delete-action')).not.toBeInTheDocument();
			expect(getByTestId('custom-nodes-edit-action')).toBeInTheDocument();
		});
	});
});
