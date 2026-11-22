import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { createComponentRenderer, mockedStore, waitAllPromises } from '@n8n/frontend-test-utils';
import type { Scope } from '@n8n/permissions';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import type { INodeTypeDescription } from 'n8n-workflow';

import { useCustomNodesStore } from '../custom-nodes.store';
import {
	createAction,
	createDraft,
	createNode,
	createParentAction,
} from '../custom-nodes.test.utils';
import CustomActionWizardModal from './CustomActionWizardModal.vue';
import type { CustomActionWizardData } from './wizard.types';

const { showMessage, showError } = vi.hoisted(() => ({ showMessage: vi.fn(), showError: vi.fn() }));

vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showMessage, showError }) }));

vi.mock('@n8n/design-system', async () => {
	const actual = await vi.importActual<typeof import('@n8n/design-system')>('@n8n/design-system');
	const { N8nCombobox2Stub, N8nDialogStub, N8nSelect2Stub } = await import(
		'../__tests__/designSystemStubs'
	);
	return {
		...actual,
		N8nCombobox2: N8nCombobox2Stub,
		N8nDialog: N8nDialogStub,
		N8nSelect2: N8nSelect2Stub,
	};
});

const SLACK = {
	name: 'n8n-nodes-base.slack',
	displayName: 'Slack',
	credentials: [{ name: 'slackApi', required: true }],
} as INodeTypeDescription;

const renderModal = createComponentRenderer(CustomActionWizardModal);

const setup = async (
	data: CustomActionWizardData = { mode: 'create' },
	scopes: Scope[] = ['customNode:list', 'customNode:create', 'customNode:update'],
) => {
	const pinia = createTestingPinia();
	mockedStore(useRBACStore).hasScope.mockImplementation(
		(scope: Scope | Scope[]) => typeof scope === 'string' && scopes.includes(scope),
	);
	const store = mockedStore(useCustomNodesStore);
	store.nodes = [createNode()];
	store.parentActions = [
		createParentAction({
			draft: createDraft({
				name: 'Archive channel',
				request: {
					method: 'POST',
					url: 'https://slack.test/api/archive',
					headers: {},
					query: {},
					bodyType: 'none',
					body: {},
				},
			}),
		}),
	];
	store.parents = [{ nodeType: 'n8n-nodes-base.slack', shape: 'resource' }];
	store.fetchAll.mockResolvedValue();
	store.fetchParents.mockResolvedValue();
	store.preview.mockResolvedValue({
		issues: [],
		properties: [{ displayName: 'Channel', name: 'channel', type: 'string', default: '' }],
	});
	const view = renderModal({
		pinia,
		props: { open: true, data },
	});
	await waitAllPromises();
	return { store, ...view };
};

type View = Awaited<ReturnType<typeof setup>>;

async function next(view: View, times = 1) {
	for (let index = 0; index < times; index++) {
		await userEvent.click(view.getByTestId('custom-action-wizard-next'));
	}
	await waitAllPromises();
}

describe('CustomActionWizardModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		capabilityRegistry.provide(capabilities.typeDescriptions, {
			load: vi.fn(async () => {}),
			nodeTypes: () => [SLACK],
			credentialTypeDisplayName: () => undefined,
		});
	});

	afterEach(() => {
		capabilityRegistry.clear();
	});

	it('loads the nodes and the parents', async () => {
		const { store, getByTestId } = await setup();

		expect(store.fetchAll).toHaveBeenCalled();
		expect(store.fetchParents).toHaveBeenCalled();
		expect(getByTestId('custom-action-wizard-step')).toHaveTextContent('Step 1 of 4: Node');
	});

	it('creates a custom node with its first action', async () => {
		const view = await setup();
		await userEvent.type(view.getByTestId('custom-action-wizard-node-name'), 'Acme');
		await userEvent.type(
			view.getByTestId('custom-action-wizard-node-base-url'),
			'https://api.acme.test',
		);
		await userEvent.type(view.getByTestId('custom-action-wizard-action-name'), 'Get item');
		await next(view);
		await userEvent.type(view.getByTestId('custom-action-wizard-url'), '/items');
		await next(view, 2);

		expect(view.getByTestId('custom-action-wizard-review-host')).toHaveTextContent('api.acme.test');
		expect(view.queryByTestId('custom-action-wizard-credential-note')).not.toBeInTheDocument();
		await userEvent.click(view.getByTestId('custom-action-wizard-save'));
		await waitAllPromises();

		expect(view.store.createNode).toHaveBeenCalledWith(
			expect.objectContaining({
				displayName: 'Acme',
				baseUrl: 'https://api.acme.test',
				auth: { kind: 'none' },
				actions: [
					expect.objectContaining({
						name: 'Get item',
						request: expect.objectContaining({ url: '/items' }),
					}),
				],
			}),
		);
		expect(showMessage).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'Custom node created' }),
		);
		expect(view.emitted('saved')).toEqual([[]]);
		expect(view.emitted('update:open')).toEqual([[false]]);
	});

	describe('icon of a new custom node', () => {
		const fillAndSave = async (view: View, icon?: File) => {
			await userEvent.type(view.getByTestId('custom-action-wizard-node-name'), 'Acme');
			await userEvent.type(
				view.getByTestId('custom-action-wizard-node-base-url'),
				'https://api.acme.test',
			);
			await userEvent.type(view.getByTestId('custom-action-wizard-action-name'), 'Get item');
			if (icon) {
				await userEvent.upload(view.getByTestId('custom-action-wizard-icon-input'), icon);
				await waitAllPromises();
			}
			await next(view);
			await userEvent.type(view.getByTestId('custom-action-wizard-url'), '/items');
			await next(view, 2);
			await userEvent.click(view.getByTestId('custom-action-wizard-save'));
			await waitAllPromises();
		};
		const png = () => new File([new Uint8Array([1, 2, 3])], 'icon.png', { type: 'image/png' });

		it('creates the node, then uploads the chosen icon', async () => {
			const view = await setup();
			view.store.createNode.mockResolvedValue(createNode({ id: 'new-node' }));

			await fillAndSave(view, png());

			expect(view.store.setNodeIcon).toHaveBeenCalledWith('new-node', {
				iconDataUri: 'data:image/png;base64,AQID',
			});
			expect(showMessage).toHaveBeenCalledWith(
				expect.objectContaining({ title: 'Custom node created' }),
			);
			expect(view.emitted('update:open')).toEqual([[false]]);
		});

		it('keeps the node and shows the escaped reason when the icon is rejected', async () => {
			const view = await setup();
			view.store.createNode.mockResolvedValue(createNode({ id: 'new-node' }));
			view.store.setNodeIcon.mockRejectedValue(new Error('Element <script> is not allowed'));

			await fillAndSave(view, png());

			expect(showMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					title:
						'Custom node created, but the icon was not accepted: Element &lt;script&gt; is not allowed. Upload a PNG from the settings page.',
				}),
			);
			expect(view.emitted('saved')).toEqual([[]]);
			expect(view.emitted('update:open')).toEqual([[false]]);
		});

		it('sends no icon when none is chosen', async () => {
			const view = await setup();
			view.store.createNode.mockResolvedValue(createNode({ id: 'new-node' }));

			await fillAndSave(view);

			expect(view.store.createNode).toHaveBeenCalled();
			expect(view.store.setNodeIcon).not.toHaveBeenCalled();
		});
	});

	it('adds an action to a parent node with an absolute URL', async () => {
		const view = await setup({ mode: 'create', parentNodeType: 'n8n-nodes-base.slack' });
		expect(view.getByTestId('custom-action-wizard-target-select')).toHaveValue(
			'parent:n8n-nodes-base.slack',
		);
		await userEvent.type(view.getByTestId('custom-action-wizard-action-name'), 'Archive');
		await next(view);
		expect(view.getByTestId('custom-action-wizard-url-hint')).toHaveTextContent('full URL');
		await userEvent.type(
			view.getByTestId('custom-action-wizard-url'),
			'https://slack.test/api/archive',
		);
		await next(view, 2);

		expect(view.getByTestId('custom-action-wizard-review-host')).toHaveTextContent('slack.test');
		expect(view.getByTestId('custom-action-wizard-credential-note')).toBeInTheDocument();
		await userEvent.click(view.getByTestId('custom-action-wizard-save'));
		await waitAllPromises();

		expect(view.store.addParentAction).toHaveBeenCalledWith(
			expect.objectContaining({ parentNodeType: 'n8n-nodes-base.slack' }),
		);
		expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ title: 'Action added' }));
	});

	it.each<[string, Scope[], string[]]>([
		[
			'customNode:create',
			['customNode:list', 'customNode:create'],
			['parent:n8n-nodes-base.slack'],
		],
		['customNode:update', ['customNode:list', 'customNode:update'], ['node:node-1']],
	])('offers only the nodes that %s allows as the target', async (_name, scopes, values) => {
		const view = await setup({ mode: 'create' }, scopes);
		await userEvent.click(view.getByTestId('custom-action-wizard-choice-existing'));

		const options = view
			.getByTestId('custom-action-wizard-target-select')
			.querySelectorAll('option:not([disabled])');
		expect([...options].map((option) => option.getAttribute('value'))).toEqual(values);
	});

	it('adds an action to a custom node', async () => {
		const view = await setup({ mode: 'create', customNodeId: 'node-1' });
		await userEvent.type(view.getByTestId('custom-action-wizard-action-name'), 'List');
		await next(view);
		await userEvent.type(view.getByTestId('custom-action-wizard-url'), '/list');
		await next(view, 2);
		await userEvent.click(view.getByTestId('custom-action-wizard-save'));
		await waitAllPromises();

		expect(view.store.addActionToNode).toHaveBeenCalledWith(
			'node-1',
			expect.objectContaining({ draft: expect.objectContaining({ name: 'List' }) }),
		);
	});

	it.each([
		['version', 'New version created'],
		['cosmetic', 'Changes applied'],
		['none', 'No changes'],
	] as const)('saves an existing action and shows the edit kind %s', async (kind, title) => {
		const view = await setup({ mode: 'edit', actionId: 'parent-action-1' });
		view.store.saveAction.mockResolvedValue({ action: createAction(), kind });

		expect(view.getByRole('heading', { name: 'Edit custom action' })).toBeInTheDocument();
		expect(view.getByTestId('custom-action-wizard-edit-target')).toHaveTextContent(
			'Action of Slack',
		);
		await next(view, 3);
		await userEvent.click(view.getByTestId('custom-action-wizard-save'));
		await waitAllPromises();

		expect(view.store.saveAction).toHaveBeenCalledWith('parent-action-1', {
			draft: expect.objectContaining({ name: 'Archive channel' }),
			changeNote: undefined,
		});
		expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ title }));
	});

	it('closes with a message when the action to edit does not exist', async () => {
		const view = await setup({ mode: 'edit', actionId: 'missing' });

		expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
		expect(view.emitted('update:open')).toEqual([[false]]);
	});

	it('fills the wizard from an HTTP Request node and names the secrets it did not copy', async () => {
		const view = await setup({
			mode: 'create',
			httpRequestParameters: {
				url: 'https://slack.test/api/chat.archive',
				authentication: 'predefinedCredentialType',
				nodeCredentialType: 'slackApi',
				sendHeaders: true,
				headerParameters: { parameters: [{ name: 'Authorization', value: 'Bearer x' }] },
			},
		});

		// The credential belongs to Slack, so the wizard offers Slack as the node.
		expect(view.getByTestId('custom-action-wizard-target-select')).toHaveValue(
			'parent:n8n-nodes-base.slack',
		);
		await userEvent.type(view.getByTestId('custom-action-wizard-action-name'), 'Archive');
		await next(view);
		expect(view.getByTestId('custom-action-wizard-url')).toHaveValue(
			'https://slack.test/api/chat.archive',
		);
		await next(view, 2);

		expect(view.getByTestId('custom-action-wizard-secrets-note')).toHaveTextContent(
			'Not copied: Authorization.',
		);
	});

	it('lists the issues on the review step and does not save', async () => {
		const view = await setup();
		await next(view, 3);

		expect(view.store.preview).not.toHaveBeenCalled();
		expect(view.getAllByTestId('custom-action-wizard-issue').length).toBeGreaterThan(0);
		expect(view.getByTestId('custom-action-wizard-save')).toBeDisabled();

		await userEvent.click(view.getAllByTestId('custom-action-wizard-issue-go-to')[0]);
		expect(view.getByTestId('custom-action-wizard-step')).toHaveTextContent('Step 1 of 4: Node');
		expect(view.getAllByTestId('custom-action-wizard-field-issues').length).toBeGreaterThan(0);
	});

	it('shows an error and stays open when the save fails', async () => {
		const view = await setup({ mode: 'create', customNodeId: 'node-1' });
		view.store.addActionToNode.mockRejectedValue(new Error('nope'));
		await userEvent.type(view.getByTestId('custom-action-wizard-action-name'), 'List');
		await next(view);
		await userEvent.type(view.getByTestId('custom-action-wizard-url'), '/list');
		await next(view, 2);
		await userEvent.click(view.getByTestId('custom-action-wizard-save'));
		await waitAllPromises();

		expect(showError).toHaveBeenCalled();
		expect(view.emitted('update:open')).toBeUndefined();
		expect(view.emitted('saved')).toBeUndefined();
	});

	it('closes on cancel', async () => {
		const view = await setup();

		await userEvent.click(view.getByTestId('custom-action-wizard-cancel'));

		expect(view.emitted('update:open')).toEqual([[false]]);
	});

	it('closes from the dialog close button', async () => {
		const view = await setup();

		await userEvent.click(view.getByTestId('dialog-close'));

		expect(view.emitted('update:open')).toEqual([[false]]);
	});

	it('shows the edit title in the edit mode', async () => {
		const view = await setup({ mode: 'edit', actionId: 'parent-action-1' });

		expect(view.getByRole('heading', { name: 'Edit custom action' })).toBeInTheDocument();
	});

	it('renders nothing while it is closed', async () => {
		const pinia = createTestingPinia();
		const store = mockedStore(useCustomNodesStore);
		const view = renderModal({ pinia, props: { open: false } });
		await waitAllPromises();

		expect(view.queryByRole('dialog')).not.toBeInTheDocument();
		expect(store.fetchAll).not.toHaveBeenCalled();
	});
});
