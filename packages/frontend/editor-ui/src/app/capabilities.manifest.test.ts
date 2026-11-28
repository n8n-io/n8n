import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import type { IUser } from '@n8n/rest-api-client/api/users';
import { useUsersStore } from '@n8n/stores/users.store';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import type { ICredentialType, INodeTypeDescription } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { registerShellCapabilities } from './capabilities.manifest';

import { ABOUT_MODAL_KEY } from '@/app/constants/modals';
import { useModalPrefetch } from '@/app/composables/usePrefetchModals';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useExistingWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { mockedStore } from '@/__tests__/utils';
import { useExposeAllWorkflowsToMcpStore } from '@/experiments/exposeAllWorkflowsToMcp/stores/exposeAllWorkflowsToMcp.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { VARIABLE_MODAL_KEY } from '@/features/settings/environments.ee/environments.constants';
import { useTagsStore } from '@/features/shared/tags/tags.store';
import type { Project } from '@/features/collaboration/projects/projects.types';

const {
	openDocumentStores,
	offerToExposeAllWorkflows,
	createSelfHealingChatHandoff,
	createAppAssistantHandoff,
	createMcpServerAssistantHandoff,
} = vi.hoisted(() => ({
	openDocumentStores: new Map<string, { mergeSettings: ReturnType<typeof vi.fn> }>(),
	offerToExposeAllWorkflows: vi.fn(),
	createSelfHealingChatHandoff: vi.fn(),
	createAppAssistantHandoff: vi.fn(),
	createMcpServerAssistantHandoff: vi.fn(),
}));

vi.mock('@/features/ai/instanceAi/composables/useSelfHealingChatHandoff', () => ({
	useSelfHealingChatHandoff: createSelfHealingChatHandoff,
}));
vi.mock('@/features/ai/instanceAi/composables/useAppAssistantHandoff', () => ({
	useAppAssistantHandoff: createAppAssistantHandoff,
}));
vi.mock('@/features/ai/instanceAi/composables/useMcpServerAssistantHandoff', () => ({
	useMcpServerAssistantHandoff: createMcpServerAssistantHandoff,
}));

vi.mock(
	'@/experiments/exposeAllWorkflowsToMcp/composables/useExposeAllWorkflowsToMcpOffer',
	() => ({
		useExposeAllWorkflowsToMcpOffer: () => ({ offerToExposeAllWorkflows }),
	}),
);

vi.mock('@/app/stores/workflowDocument.store', () => ({
	useExistingWorkflowDocumentStore: vi.fn((id: string) => openDocumentStores.get(id)),
	createWorkflowDocumentId: (id: string) => id,
	injectWorkflowDocumentStore: vi.fn(),
}));

describe('registerShellCapabilities', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia());
	});

	// Only here, never in `beforeEach`: the first test must read the registry as the
	// import of the manifest left it, so a `provide()` at its module scope fails it.
	afterEach(() => {
		capabilityRegistry.clear();
	});

	it('leaves the modal openers unprovided until it is called', () => {
		expect(capabilityRegistry.has(capabilities.modalOpeners)).toBe(false);
	});

	it('provides the modal openers', () => {
		registerShellCapabilities();

		expect(capabilityRegistry.has(capabilities.modalOpeners)).toBe(true);
	});

	it('provides the chat setup factory without initializing it at registration', () => {
		registerShellCapabilities();

		expect(capabilityRegistry.use(capabilities.createSelfHealingChatHandoff)).toBe(
			createSelfHealingChatHandoff,
		);
		expect(createSelfHealingChatHandoff).not.toHaveBeenCalled();
		expect(capabilityRegistry.use(capabilities.createAppAssistantHandoff)).toBe(
			createAppAssistantHandoff,
		);
		expect(createAppAssistantHandoff).not.toHaveBeenCalled();
		expect(capabilityRegistry.use(capabilities.createMcpServerAssistantHandoff)).toBe(
			createMcpServerAssistantHandoff,
		);
		expect(createMcpServerAssistantHandoff).not.toHaveBeenCalled();
	});

	it('forwards openModal to the UI store', () => {
		registerShellCapabilities();
		const uiStore = useUIStore();

		capabilityRegistry.use(capabilities.modalOpeners).openModal(ABOUT_MODAL_KEY);

		expect(uiStore.openModal).toHaveBeenCalledWith(ABOUT_MODAL_KEY);
	});

	it('forwards openModalWithData to the UI store', () => {
		registerShellCapabilities();
		const uiStore = useUIStore();
		const payload = { name: ABOUT_MODAL_KEY, data: { source: 'test' } };

		capabilityRegistry.use(capabilities.modalOpeners).openModalWithData(payload);

		expect(uiStore.openModalWithData).toHaveBeenCalledWith(payload);
	});

	it('forwards closeModal to the UI store', () => {
		registerShellCapabilities();
		const uiStore = useUIStore();

		capabilityRegistry.use(capabilities.modalCloser).closeModal(ABOUT_MODAL_KEY);

		expect(uiStore.closeModal).toHaveBeenCalledWith(ABOUT_MODAL_KEY);
	});

	// The shell owns the prefetch, so its preload-error handler sees a module's prefetch too.
	it('provides the shell modal prefetch', () => {
		registerShellCapabilities();

		expect(capabilityRegistry.use(capabilities.modalPrefetch)).toBe(useModalPrefetch);
	});

	// Dev HMR re-evaluates the manifest, so a second registration must not warn. The
	// module-level opener object keeps the identity stable across the replay.
	it('stays silent when it is called again', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		registerShellCapabilities();
		registerShellCapabilities();

		expect(warn).not.toHaveBeenCalled();
	});

	describe('workflowMcpAccessSync', () => {
		let workflowsListStore: ReturnType<typeof useWorkflowsListStore>;

		const seedListEntry = (id: string, settings?: { availableInMCP: boolean }) => {
			workflowsListStore.workflowsById = {
				[id]: { id, name: id, ...(settings ? { settings } : {}) },
			} as unknown as typeof workflowsListStore.workflowsById;
		};

		beforeEach(() => {
			openDocumentStores.clear();
			registerShellCapabilities();
			workflowsListStore = useWorkflowsListStore();
		});

		it('provides the sync capability', () => {
			expect(capabilityRegistry.has(capabilities.workflowMcpAccessSync)).toBe(true);
		});

		it('patches availableInMCP on an existing list entry', () => {
			seedListEntry('wf-1', { availableInMCP: false });

			capabilityRegistry.use(capabilities.workflowMcpAccessSync)(['wf-1'], true);

			expect(workflowsListStore.workflowsById['wf-1'].settings?.availableInMCP).toBe(true);
		});

		it('creates the settings object on a list entry that has none', () => {
			seedListEntry('wf-1');

			capabilityRegistry.use(capabilities.workflowMcpAccessSync)(['wf-1'], true);

			expect(workflowsListStore.workflowsById['wf-1'].settings?.availableInMCP).toBe(true);
		});

		it('leaves the list store alone for an unknown id', () => {
			seedListEntry('wf-1', { availableInMCP: false });

			capabilityRegistry.use(capabilities.workflowMcpAccessSync)(['wf-unknown'], true);

			expect(workflowsListStore.workflowsById['wf-1'].settings?.availableInMCP).toBe(false);
			expect(workflowsListStore.workflowsById['wf-unknown']).toBeUndefined();
		});

		it('merges the new value only into open document stores', () => {
			const openStore = { mergeSettings: vi.fn() };
			const otherOpenStore = { mergeSettings: vi.fn() };
			openDocumentStores.set('wf-1', openStore);
			openDocumentStores.set('wf-3', otherOpenStore);

			capabilityRegistry.use(capabilities.workflowMcpAccessSync)(['wf-1', 'wf-2'], false);

			expect(openStore.mergeSettings).toHaveBeenCalledTimes(1);
			expect(openStore.mergeSettings).toHaveBeenCalledWith({ availableInMCP: false });
			expect(otherOpenStore.mergeSettings).not.toHaveBeenCalled();
			expect(useExistingWorkflowDocumentStore).toHaveBeenCalledWith('wf-2');
		});
	});

	describe('mcpExposeAllOffer', () => {
		beforeEach(() => {
			registerShellCapabilities();
		});

		it('reads enrollment from the experiment store', () => {
			const experimentStore = mockedStore(useExposeAllWorkflowsToMcpStore);
			const offer = capabilityRegistry.use(capabilities.mcpExposeAllOffer);

			experimentStore.isEnabled = false;
			expect(offer.isEnabled()).toBe(false);

			experimentStore.isEnabled = true;
			expect(offer.isEnabled()).toBe(true);
		});

		it('forwards the offer and its result', async () => {
			offerToExposeAllWorkflows.mockResolvedValue(true);
			const onExposed = vi.fn();

			const opened = await capabilityRegistry.use(capabilities.mcpExposeAllOffer).offer(onExposed);

			expect(opened).toBe(true);
			expect(offerToExposeAllWorkflows).toHaveBeenCalledWith(onExposed);
		});
	});

	describe('project permissions', () => {
		beforeEach(() => {
			registerShellCapabilities();
		});

		it('combines the global scopes with the scopes of the project', () => {
			mockedStore(useUsersStore).currentUser = mock<IUser>({ globalScopes: ['app:list'] });
			mockedStore(useProjectsStore).myProjects = [
				mock<ProjectListItem>({ id: 'project-1', scopes: ['app:delete'] }),
				mock<ProjectListItem>({ id: 'project-2', scopes: ['app:update'] }),
			];

			const scopes = capabilityRegistry.use(capabilities.projectPermissions).scopesFor('project-1');

			expect(scopes).toEqual(['app:list', 'app:delete']);
		});

		it('reads the read-only state from source control', () => {
			mockedStore(useSourceControlStore).preferences = mock({ branchReadOnly: true });

			expect(capabilityRegistry.use(capabilities.projectPermissions).isReadOnly()).toBe(true);
		});
	});

	describe('project context', () => {
		beforeEach(() => {
			registerShellCapabilities();
		});

		it('reads and sets the project that the shell shows', () => {
			const projectsStore = mockedStore(useProjectsStore);
			const project = mock<Project>({ id: 'project-1' });
			projectsStore.currentProject = project;
			const context = capabilityRegistry.use(capabilities.projectContext);

			expect(context.currentProject()).toBe(project);

			const changed = mock<Project>({ id: 'project-1', name: 'Renamed' });
			context.setCurrentProject(changed);

			expect(projectsStore.setCurrentProject).toHaveBeenCalledWith(changed);
		});

		it('reloads the project lists and counts', async () => {
			const projectsStore = mockedStore(useProjectsStore);
			const context = capabilityRegistry.use(capabilities.projectContext);

			await Promise.all([
				context.getMyProjects(),
				context.getProjectsCount(),
				context.getAllProjects(),
			]);

			expect(projectsStore.getMyProjects).toHaveBeenCalled();
			expect(projectsStore.getProjectsCount).toHaveBeenCalled();
			expect(projectsStore.getAllProjects).toHaveBeenCalled();
		});
	});

	describe('resource editors', () => {
		beforeEach(() => {
			registerShellCapabilities();
		});

		it('opens the credential editor in manual mode with the options', () => {
			const uiStore = mockedStore(useUIStore);
			const options = { initialName: 'Billing API', appendToBody: true };

			capabilityRegistry
				.use(capabilities.resourceEditors)
				.openCredentialEditor('httpBasicAuth', options);

			expect(uiStore.openNewCredential).toHaveBeenCalledWith(
				'httpBasicAuth',
				false,
				true,
				undefined,
				undefined,
				undefined,
				undefined,
				options,
			);
		});

		it('opens the variable editor for a new variable', () => {
			const uiStore = mockedStore(useUIStore);

			capabilityRegistry
				.use(capabilities.resourceEditors)
				.openVariableEditor({ fixedKey: true, projectId: null });

			expect(uiStore.openModalWithData).toHaveBeenCalledWith({
				name: VARIABLE_MODAL_KEY,
				data: { fixedKey: true, projectId: null, mode: 'new' },
			});
		});

		it('reads and closes the editor modals', () => {
			const uiStore = mockedStore(useUIStore);
			uiStore.modalsById = { [CREDENTIAL_EDIT_MODAL_KEY]: { open: true } };
			const editors = capabilityRegistry.use(capabilities.resourceEditors);

			expect(editors.isEditorOpen('credential')).toBe(true);
			expect(editors.isEditorOpen('variable')).toBe(false);

			editors.closeEditor('variable');

			expect(uiStore.closeModal).toHaveBeenCalledWith(VARIABLE_MODAL_KEY);
		});
	});

	describe('environments settings', () => {
		beforeEach(() => {
			registerShellCapabilities();
		});

		it('reads and saves the protected instance setting', async () => {
			const sourceControlStore = mockedStore(useSourceControlStore);
			sourceControlStore.preferences = mock({ branchReadOnly: true });
			const settings = capabilityRegistry.use(capabilities.environmentsSettings);

			expect(settings.isProtected()).toBe(true);

			await settings.setProtected(false);

			expect(sourceControlStore.updatePreferences).toHaveBeenCalledWith({ branchReadOnly: false });
		});
	});

	describe('apps feedback form URL', () => {
		it('reads the URL from the PostHog flag payload', () => {
			registerShellCapabilities();
			const posthog = mockedStore(usePostHog);
			posthog.getFeatureFlagPayload.mockReturnValue('https://forms.example.com/apps');
			const readFormUrl = capabilityRegistry.use(capabilities.appsFeedbackFormUrl);

			expect(readFormUrl()).toBe('https://forms.example.com/apps');
			expect(posthog.getFeatureFlagPayload).toHaveBeenCalledWith('config_apps_feedback_form_url');
		});

		it('ignores a payload that is not a string', () => {
			registerShellCapabilities();
			mockedStore(usePostHog).getFeatureFlagPayload.mockReturnValue({ url: 'https://example.com' });

			expect(capabilityRegistry.use(capabilities.appsFeedbackFormUrl)()).toBeUndefined();
		});
	});

	describe('custom MCP servers flag', () => {
		it.each([
			['test', true],
			['control', false],
			[true, false],
			[undefined, false],
		])('reads the variant %j of the flag as %j', (variant, expected) => {
			registerShellCapabilities();
			const posthog = mockedStore(usePostHog);
			posthog.getVariant.mockReturnValue(variant);

			expect(capabilityRegistry.use(capabilities.customMcpServersEnabled)()).toBe(expected);
			expect(posthog.getVariant).toHaveBeenCalledWith('155_custom_mcp_servers');
		});
	});

	describe('tag names', () => {
		it('reads the names from the tags store', () => {
			registerShellCapabilities();
			mockedStore(useTagsStore).tagsById = { tag: { id: 'tag', name: 'Billing' } };
			const tags = capabilityRegistry.use(capabilities.tagNames);

			expect(tags.nameOf('tag')).toBe('Billing');
			expect(tags.nameOf('unknown')).toBeUndefined();
		});
	});

	describe('type descriptions', () => {
		it('loads the node and credential types and reads them from their stores', async () => {
			registerShellCapabilities();
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const credentialsStore = mockedStore(useCredentialsStore);
			const notion = mock<INodeTypeDescription>({ name: 'n8n-nodes-base.notion' });
			nodeTypesStore.allNodeTypes = [notion];
			credentialsStore.getCredentialTypeByName = vi.fn((name: string) =>
				name === 'notionApi' ? mock<ICredentialType>({ displayName: 'Notion API' }) : undefined,
			);
			const types = capabilityRegistry.use(capabilities.typeDescriptions);

			await types.load();

			expect(nodeTypesStore.loadNodeTypesIfNotLoaded).toHaveBeenCalled();
			expect(credentialsStore.fetchCredentialTypes).toHaveBeenCalledWith(false);
			expect(types.nodeTypes()).toEqual([notion]);
			expect(types.credentialTypeDisplayName('notionApi')).toBe('Notion API');
		});

		it.each([
			{ first: 'nodeTypes', last: 'credentialTypes' },
			{ first: 'credentialTypes', last: 'nodeTypes' },
		] as const)('waits for $last after $first loads', async ({ first, last }) => {
			registerShellCapabilities();
			const loads = {
				nodeTypes: createDeferredPromise(),
				credentialTypes: createDeferredPromise(),
			};
			mockedStore(useNodeTypesStore).loadNodeTypesIfNotLoaded.mockReturnValue(
				loads.nodeTypes.promise,
			);
			mockedStore(useCredentialsStore).fetchCredentialTypes.mockReturnValue(
				loads.credentialTypes.promise,
			);
			let loaded = false;

			const load = capabilityRegistry
				.use(capabilities.typeDescriptions)
				.load()
				.then(() => (loaded = true));
			loads[first].resolve();
			await flushPromises();

			expect(loaded).toBe(false);

			loads[last].resolve();
			await load;

			expect(loaded).toBe(true);
		});

		it('shares a failed load with a retry until both stores answer', async () => {
			registerShellCapabilities();
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const credentialsStore = mockedStore(useCredentialsStore);
			const credentialTypes = createDeferredPromise();
			nodeTypesStore.loadNodeTypesIfNotLoaded.mockRejectedValue(new Error('offline'));
			credentialsStore.fetchCredentialTypes.mockReturnValue(credentialTypes.promise);
			const types = capabilityRegistry.use(capabilities.typeDescriptions);

			const first = types.load();
			await flushPromises();
			const retry = types.load();
			credentialTypes.resolve();

			await expect(first).rejects.toThrow('offline');
			await expect(retry).rejects.toThrow('offline');
			expect(nodeTypesStore.loadNodeTypesIfNotLoaded).toHaveBeenCalledTimes(1);
			expect(credentialsStore.fetchCredentialTypes).toHaveBeenCalledTimes(1);
		});
	});
});
