import type { LinkedInstanceSummary } from '@n8n/api-types';
import type { PermissionsRecord } from '@n8n/permissions';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import ActionsDropdownMenu from '@/app/components/MainHeader/ActionsDropdownMenu.vue';
import { AutoSaveState, MODAL_CANCEL, MODAL_CONFIRM } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowSaveStore } from '@/app/stores/workflowSave.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	deferred,
	linkedInstance,
	transferPreflight,
} from '../../__tests__/linkedInstances.fixtures';
import type * as LinkApi from '../../linkedInstances.api';
import type * as TransferApi from '../transfer.api';

const linkApi = vi.hoisted(() => ({
	fetchLinkedInstances: vi.fn<typeof LinkApi.fetchLinkedInstances>(),
	instancePath: (id: string) => `/linked-instances/${id}`,
}));
vi.mock('@/features/linkedInstances/linkedInstances.api', () => linkApi);

const transferApi = vi.hoisted(() => ({
	fetchTransferPreflight: vi.fn<typeof TransferApi.fetchTransferPreflight>(),
	moveWorkflow: vi.fn<typeof TransferApi.moveWorkflow>(),
}));
vi.mock('@/features/linkedInstances/transfer/transfer.api', () => transferApi);

const saving = vi.hoisted(() => ({
	saveCurrentWorkflow: vi.fn(async () => true),
	cancelAutoSave: vi.fn(),
}));
vi.mock('@/app/composables/useWorkflowSaving', () => ({ useWorkflowSaving: () => saving }));

const confirm = vi.hoisted(() => vi.fn());
vi.mock('@n8n/design-system', async () => ({
	...(await vi.importActual<object>('@n8n/design-system')),
	useMessage: () => ({ confirm }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showToast: vi.fn(), showMessage: vi.fn(), showError: vi.fn() }),
}));

vi.mock('@/app/composables/useDependencies', () => ({
	useDependencies: () => ({
		getDependencies: () => undefined,
		fetchDependencies: vi.fn(),
		fetchDependencyCounts: vi.fn(),
		hasDependencies: () => false,
	}),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRoute: () => ({
		name: 'NodeViewExisting',
		params: { workflowId: 'wf-1' },
		query: {},
		meta: {},
	}),
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		resolve: vi.fn(() => ({ href: '' })),
		currentRoute: { value: { params: {}, query: {} } },
	}),
}));

const acme = linkedInstance();
const staging = linkedInstance({ id: 'link-2', name: 'Staging', baseUrl: 'http://localhost:5680' });

const ALL_RIGHTS: PermissionsRecord['workflow'] = {
	read: true,
	update: true,
	export: true,
	publish: true,
	unpublish: true,
};

const renderMenu = createComponentRenderer(ActionsDropdownMenu, {
	global: { stubs: { WorkflowProductionChecklist: true } },
});

interface SetupOptions {
	modules?: string[];
	scopes?: Array<'instanceAi:message'>;
	/** The links, or the error of the first read. */
	links?: LinkedInstanceSummary[] | Error;
	live?: boolean;
	props?: Partial<{
		workflowPermissions: PermissionsRecord['workflow'];
		isNewWorkflow: boolean;
		isArchived: boolean;
	}>;
}

function setup(options: SetupOptions = {}) {
	const pinia = createTestingPinia({ stubActions: false });
	const settingsStore = useSettingsStore();
	settingsStore.settings = {
		...settingsStore.settings,
		activeModules: options.modules ?? ['linked-instances'],
	} as typeof settingsStore.settings;
	useRBACStore().setGlobalScopes(options.scopes ?? ['instanceAi:message']);
	useWorkflowsStore().setWorkflowId('wf-1');
	useWorkflowDocumentStore(createWorkflowDocumentId('wf-1')).setActiveState({
		activeVersionId: options.live ? 'version-1' : null,
		activeVersion: null,
	});
	const links = options.links ?? [acme, staging];
	if (links instanceof Error) linkApi.fetchLinkedInstances.mockRejectedValue(links);
	else linkApi.fetchLinkedInstances.mockResolvedValue(links);
	transferApi.fetchTransferPreflight.mockResolvedValue(transferPreflight());

	renderMenu({
		pinia,
		props: {
			workflowPermissions: ALL_RIGHTS,
			isNewWorkflow: false,
			isArchived: false,
			id: 'wf-1',
			name: 'Daily report',
			tags: [],
			...options.props,
		},
	});
	return { uiStore: useUIStore(), saveStore: useWorkflowSaveStore() };
}

const menuTrigger = () => screen.getByRole('button', { name: 'More actions' });
const moveItemId = (linkId: string) => `workflow-menu-item-move-to-linked-instance:${linkId}`;
const moveItem = (linkId: string) => screen.queryByTestId(moveItemId(linkId));
const findMoveItem = async (linkId: string) => await screen.findByTestId(moveItemId(linkId));

async function openMenu() {
	await waitFor(() => expect(linkApi.fetchLinkedInstances).toHaveBeenCalled());
	await userEvent.click(menuTrigger());
	await screen.findByTestId('workflow-menu-item-download');
}

describe('workflow menu: Move to a linked instance', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		saving.saveCurrentWorkflow.mockResolvedValue(true);
	});

	describe('entries', () => {
		it('lists one "Move to {name}" entry for each link', async () => {
			setup();
			await openMenu();

			await waitFor(() => expect(moveItem('link-1')).toHaveTextContent('Move to Acme Cloud'));
			expect(moveItem('link-2')).toHaveTextContent('Move to Staging');
		});

		it.each<[string, SetupOptions]>([
			['the linked-instances module is off', { modules: [] }],
			['the user lacks the scope of the routes', { scopes: [] }],
			['the user has no link', { links: [] }],
			[
				'the user cannot export the workflow',
				{ props: { workflowPermissions: { ...ALL_RIGHTS, export: false } } },
			],
			['the workflow is archived', { props: { isArchived: true } }],
			['the workflow is not saved yet', { props: { isNewWorkflow: true } }],
			['the links cannot be read', { links: new Error('Network error') }],
		])('shows no move when %s', async (_label, options) => {
			setup(options);
			await userEvent.click(menuTrigger());
			await screen.findByTestId('workflow-menu-item-download');
			// A read of the links that runs now would add the entries after this.
			await flushPromises();

			expect(moveItem('link-1')).not.toBeInTheDocument();
		});

		it('does not ask the server for links while the module is off', async () => {
			setup({ modules: [] });
			await userEvent.click(menuTrigger());
			await screen.findByTestId('workflow-menu-item-download');

			expect(linkApi.fetchLinkedInstances).not.toHaveBeenCalled();
		});

		it('reads the links again each time the menu opens', async () => {
			setup();
			await openMenu();
			await findMoveItem('link-1');
			await userEvent.keyboard('{Escape}');
			linkApi.fetchLinkedInstances.mockResolvedValue([staging]);

			await userEvent.click(menuTrigger());

			await waitFor(() => expect(moveItem('link-1')).not.toBeInTheDocument());
			expect(moveItem('link-2')).toBeInTheDocument();
		});

		it('keeps the entries when a later read fails', async () => {
			setup();
			await openMenu();
			await findMoveItem('link-1');
			await userEvent.keyboard('{Escape}');
			linkApi.fetchLinkedInstances.mockRejectedValue(new Error('Network error'));
			const reads = linkApi.fetchLinkedInstances.mock.calls.length;

			await userEvent.click(menuTrigger());
			await waitFor(() => expect(linkApi.fetchLinkedInstances).toHaveBeenCalledTimes(reads + 1));
			await flushPromises();

			expect(moveItem('link-1')).toBeInTheDocument();
			expect(moveItem('link-2')).toBeInTheDocument();
		});
	});

	describe('opening the dialog', () => {
		it('opens the dialog for the chosen link when the editor has no changes', async () => {
			setup();
			await openMenu();
			await userEvent.click(await findMoveItem('link-2'));

			expect(
				await screen.findByRole('dialog', { name: 'Move "Daily report" to Staging?' }),
			).toBeVisible();
			expect(confirm).not.toHaveBeenCalled();
			expect(saving.saveCurrentWorkflow).not.toHaveBeenCalled();
			expect(transferApi.fetchTransferPreflight).toHaveBeenCalledWith(expect.anything(), 'link-2', {
				workflowId: 'wf-1',
			});
		});

		it('offers to turn off a live workflow here, but not to turn on the copy there', async () => {
			setup({ live: true });
			await openMenu();
			await userEvent.click(await findMoveItem('link-1'));

			expect(
				await screen.findByRole('checkbox', { name: 'Turn off the copy on this computer' }),
			).toBeVisible();
			// The editor has no request for a live automation. The Assistant can make one.
			expect(
				screen.queryByRole('checkbox', { name: 'Turn it on in Acme Cloud' }),
			).not.toBeInTheDocument();
		});

		it('puts focus back on the menu button when the dialog closes', async () => {
			setup();
			await openMenu();
			await userEvent.click(await findMoveItem('link-1'));
			await screen.findByTestId('transfer-moves');

			await userEvent.click(screen.getByTestId('transfer-cancel'));

			await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
			await waitFor(() => expect(menuTrigger()).toHaveFocus());
		});
	});

	describe('unsaved changes', () => {
		it('asks to save first, saves, then opens the dialog', async () => {
			const { uiStore } = setup();
			uiStore.markStateDirty();
			confirm.mockResolvedValue(MODAL_CONFIRM);
			await openMenu();

			await userEvent.click(await findMoveItem('link-1'));

			expect(await screen.findByRole('dialog')).toBeVisible();
			expect(confirm).toHaveBeenCalledWith(
				'Acme Cloud gets the saved version of this workflow. Save your changes so that they move too.',
				'Save your changes before moving?',
				expect.objectContaining({
					confirmButtonText: 'Save and continue',
					cancelButtonText: 'Cancel',
				}),
			);
			expect(saving.saveCurrentWorkflow).toHaveBeenCalledTimes(1);
		});

		it('moves nothing and puts focus back on the menu button when the user cancels', async () => {
			const { uiStore } = setup();
			uiStore.markStateDirty();
			confirm.mockResolvedValue(MODAL_CANCEL);
			await openMenu();

			await userEvent.click(await findMoveItem('link-1'));

			await waitFor(() => expect(menuTrigger()).toHaveFocus());
			expect(saving.saveCurrentWorkflow).not.toHaveBeenCalled();
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
			expect(transferApi.fetchTransferPreflight).not.toHaveBeenCalled();
		});

		it('opens no dialog when the save fails', async () => {
			const { uiStore } = setup();
			uiStore.markStateDirty();
			confirm.mockResolvedValue(MODAL_CONFIRM);
			saving.saveCurrentWorkflow.mockResolvedValue(false);
			await openMenu();

			await userEvent.click(await findMoveItem('link-1'));

			await waitFor(() => expect(saving.saveCurrentWorkflow).toHaveBeenCalled());
			await waitFor(() => expect(menuTrigger()).toHaveFocus());
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});

		it('waits for an autosave that runs and asks nothing when it saved every change', async () => {
			const { uiStore, saveStore } = setup();
			const autosave = deferred<boolean>();
			uiStore.markStateDirty();
			saveStore.setAutoSaveState(AutoSaveState.InProgress);
			saveStore.setPendingSave(autosave.promise);
			await openMenu();

			await userEvent.click(await findMoveItem('link-1'));
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
			uiStore.markStateClean();
			autosave.resolve(true);

			expect(await screen.findByRole('dialog')).toBeVisible();
			expect(confirm).not.toHaveBeenCalled();
			expect(saving.saveCurrentWorkflow).not.toHaveBeenCalled();
		});

		it('stops a scheduled autosave and saves at once', async () => {
			const { uiStore, saveStore } = setup();
			uiStore.markStateDirty();
			saveStore.setAutoSaveState(AutoSaveState.Scheduled);
			confirm.mockResolvedValue(MODAL_CONFIRM);
			await openMenu();

			await userEvent.click(await findMoveItem('link-1'));

			expect(await screen.findByRole('dialog')).toBeVisible();
			expect(saving.cancelAutoSave).toHaveBeenCalled();
			expect(saving.saveCurrentWorkflow).toHaveBeenCalledTimes(1);
		});
	});
});
