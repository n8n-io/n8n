import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { waitFor } from '@testing-library/vue';
import type { IWorkflowDb } from '@/Interface';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { createTestWorkflow } from '@/__tests__/mocks';
import { useWorkflowNavigationCommands } from './useWorkflowNavigationCommands';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useTagsStore } from '@/features/shared/tags/tags.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useFoldersStore } from '@/features/core/folders/folders.store';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import * as permissionsModule from '@n8n/permissions';

vi.mock('lodash/debounce', () => ({
	default: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

const resolveMock = vi.fn(() => ({ fullPath: '/resolved/path' }));

vi.mock('vue-router', () => ({
	useRouter: () => ({ resolve: resolveMock }),
	useRoute: () => ({ params: { folderId: 'folder-xyz' } }),
	RouterLink: vi.fn(),
}));

vi.mock('@/features/shared/nodeCreator/composables/useActionsGeneration', () => ({
	useActionsGenerator: () => ({
		generateMergedNodesAndActions: (
			visibleNodeTypes: Array<{ name: string; displayName?: string }>,
		) => ({
			mergedNodes: visibleNodeTypes,
		}),
	}),
}));

vi.mock('@n8n/permissions', async (importOriginal) => ({
	...(await importOriginal()),
	getResourcePermissions: vi.fn(() => ({
		workflow: {
			create: true,
		},
	})),
}));

describe('useWorkflowNavigationCommands', () => {
	let mockNodeTypesStore: ReturnType<typeof useNodeTypesStore>;
	let mockCredentialsStore: ReturnType<typeof useCredentialsStore>;
	let mockWorkflowsStore: ReturnType<typeof useWorkflowsStore>;
	let mockWorkflowsListStore: ReturnType<typeof useWorkflowsListStore>;
	let mockProjectsStore: ReturnType<typeof useProjectsStore>;
	let mockTagsStore: ReturnType<typeof useTagsStore>;
	let mockSourceControlStore: ReturnType<typeof useSourceControlStore>;
	let mockFoldersStore: ReturnType<typeof useFoldersStore>;

	const allWorkflows = [
		createTestWorkflow({
			id: 'w1',
			name: 'Alpha',
			active: false,
			isArchived: false,
			homeProject: { id: 'proj-1', type: ProjectTypes.Personal } as IWorkflowDb['homeProject'],
			parentFolder: { id: 'f2', name: 'Child' } as IWorkflowDb['parentFolder'],
			tags: ['Marketing'] as IWorkflowDb['tags'],
		}),
		createTestWorkflow({
			id: 'w2',
			name: 'Beta',
			active: true,
			isArchived: false,
			homeProject: { id: 'proj-2', name: 'Team A' } as IWorkflowDb['homeProject'],
			parentFolder: undefined,
			tags: [],
		}),
		createTestWorkflow({
			id: 'w3',
			name: 'Gamma',
			active: true,
			isArchived: true, // should be filtered out
			homeProject: { id: 'proj-2', name: 'Team A' } as IWorkflowDb['homeProject'],
			parentFolder: undefined,
			tags: [],
		}),
	];

	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia());

		const folderCache = new Map<string, { id: string; name: string; parentFolder?: string }>();

		mockNodeTypesStore = useNodeTypesStore();
		Object.defineProperty(mockNodeTypesStore, 'allNodeTypes', {
			value: [{ name: 'n8n-nodes-base.httpRequest', displayName: 'http request' }],
			configurable: true,
		});
		Object.defineProperty(mockNodeTypesStore, 'getNodeType', {
			value: vi.fn((name: string) => ({ name, displayName: 'http request' })),
			configurable: true,
		});

		mockCredentialsStore = useCredentialsStore();
		Object.defineProperty(mockCredentialsStore, 'httpOnlyCredentialTypes', {
			value: [],
			configurable: true,
		});

		mockProjectsStore = useProjectsStore();
		Object.defineProperty(mockProjectsStore, 'currentProjectId', {
			value: 'proj-1',
			configurable: true,
		});

		mockTagsStore = useTagsStore();
		mockTagsStore.tagsById = { t1: { id: 't1', name: 'Marketing' } };
		mockTagsStore.fetchAll = vi.fn().mockResolvedValue(undefined);

		mockSourceControlStore = useSourceControlStore();
		mockSourceControlStore.preferences.branchReadOnly = false;

		mockFoldersStore = useFoldersStore();
		Object.defineProperty(mockFoldersStore, 'cacheFolders', {
			value: vi.fn((folders: Array<{ id: string; name: string; parentFolder?: string }>) => {
				for (const f of folders) folderCache.set(f.id, f);
			}),
			configurable: true,
		});
		Object.defineProperty(mockFoldersStore, 'getCachedFolder', {
			value: vi.fn((id: string) => folderCache.get(id)),
			configurable: true,
		});

		mockWorkflowsStore = useWorkflowsStore();
		mockWorkflowsListStore = useWorkflowsListStore();
		Object.defineProperty(mockWorkflowsStore, 'canViewWorkflows', {
			value: true,
			configurable: true,
		});
		vi.spyOn(mockWorkflowsListStore, 'searchWorkflows').mockImplementation(
			async (params: { query?: string; nodeTypes?: string[]; tags?: string[] }) => {
				if (params.nodeTypes && params.nodeTypes.length > 0) {
					return [
						{ ...allWorkflows[0], nodes: [{ type: 'n8n-nodes-base.httpRequest' }] } as IWorkflowDb,
					];
				}
				if (params.tags && params.tags.length > 0) {
					return [allWorkflows[0]];
				}
				if (typeof params.query === 'string') {
					return [allWorkflows[0], allWorkflows[1], allWorkflows[2]];
				}
				return [];
			},
		);

		Object.defineProperty(window, 'location', {
			value: { href: '' },
			writable: true,
		});

		resolveMock.mockClear();
		vi.mocked(permissionsModule).getResourcePermissions.mockRestore();
	});

	it('exposes create and open commands, respecting read-only mode', () => {
		const api = useWorkflowNavigationCommands({
			lastQuery: ref(''),
			activeNodeId: ref(null),
			currentProjectName: ref('My Project'),
		});

		const ids = api.commands.value.map((c) => c.id);
		expect(ids).toEqual(expect.arrayContaining(['create-workflow', 'open-workflow']));

		mockSourceControlStore.preferences.branchReadOnly = true;
		const apiReadOnly = useWorkflowNavigationCommands({
			lastQuery: ref(''),
			activeNodeId: ref(null),
			currentProjectName: ref('My Project'),
		});
		const idsReadOnly = apiReadOnly.commands.value.map((c) => c.id);
		expect(idsReadOnly).not.toContain('create-workflow');
	});

	it('should not include create workflow command when user has no permission', () => {
		vi.mocked(permissionsModule).getResourcePermissions.mockReturnValue({
			workflow: {
				create: false,
			},
		} as unknown as permissionsModule.PermissionsRecord);
		const apiReadOnly = useWorkflowNavigationCommands({
			lastQuery: ref(''),
			activeNodeId: ref(null),
			currentProjectName: ref('My Project'),
		});
		const idsReadOnly = apiReadOnly.commands.value.map((c) => c.id);
		expect(idsReadOnly).not.toContain('create-workflow');
	});

	it('should not include any commands when user is chat user', () => {
		vi.mocked(permissionsModule).getResourcePermissions.mockReturnValue({
			workflow: {
				create: false,
			},
		} as unknown as permissionsModule.PermissionsRecord);
		Object.defineProperty(mockWorkflowsStore, 'canViewWorkflows', {
			value: false,
		});

		const { commands } = useWorkflowNavigationCommands({
			lastQuery: ref(''),
			activeNodeId: ref(null),
			currentProjectName: ref('My Project'),
		});
		expect(commands.value.length).toBe(0);
	});

	it('initialize() loads tags', async () => {
		const api = useWorkflowNavigationCommands({
			lastQuery: ref(''),
			activeNodeId: ref(null),
			currentProjectName: ref('My Project'),
		});
		await api.initialize?.();
		expect(mockTagsStore.fetchAll).toHaveBeenCalled();
	});

	it('loads workflows when navigating to Open, filters archived, orders current project first', async () => {
		const api = useWorkflowNavigationCommands({
			lastQuery: ref(''),
			activeNodeId: ref(null),
			currentProjectName: ref('My Project'),
		});

		api.handlers?.onCommandBarNavigateTo?.('open-workflow');

		await waitFor(() => {
			const open = api.commands.value.find((c) => c.id === 'open-workflow');
			expect(open?.children?.length).toBeGreaterThan(0);
		});

		const children = api.commands.value.find((c) => c.id === 'open-workflow')?.children;
		if (!children) {
			throw new Error('Open workflow command not found');
		}
		expect(children).toHaveLength(2);
		expect(children[0].id).toBe('w1');
		expect(children[1].id).toBe('w2');

		// Suffix contains project/folder breadcrumbs
		const first = children[0];
		expect((first.title as unknown as { props?: { suffix?: string } }).props?.suffix).toContain(
			'projects.menu.personal',
		);
		expect((first.title as unknown as { props?: { suffix?: string } }).props?.suffix).toContain(
			'Child',
		);
	});

	it('open workflow item navigates using router.resolve', async () => {
		const api = useWorkflowNavigationCommands({
			lastQuery: ref(''),
			activeNodeId: ref(null),
			currentProjectName: ref('My Project'),
		});

		api.handlers?.onCommandBarNavigateTo?.('open-workflow');
		await waitFor(() => {
			const open = api.commands.value.find((c) => c.id === 'open-workflow');
			expect(open?.children?.length).toBeGreaterThan(0);
		});

		const openWorkflowCommand = api.commands.value.find((c) => c.id === 'open-workflow');
		if (!openWorkflowCommand?.children) {
			throw new Error('Open workflow command not found');
		}
		const item = openWorkflowCommand.children[0];
		if (item?.handler) {
			await item.handler();
		}
		expect(resolveMock).toHaveBeenCalled();
	});

	it('create workflow navigates to NEW_WORKFLOW route with project and folder', async () => {
		const api = useWorkflowNavigationCommands({
			lastQuery: ref(''),
			activeNodeId: ref(null),
			currentProjectName: ref('My Project'),
		});

		const createCmd = api.commands.value.find((c) => c.id === 'create-workflow');
		if (createCmd?.handler) {
			await createCmd.handler();
		}
		expect(resolveMock).toHaveBeenCalled();
	});

	it('search by node display name and by tag contributes keywords and icons', async () => {
		const lastQuery = ref('http request');
		const activeNodeId = ref('open-workflow');
		const api = useWorkflowNavigationCommands({
			lastQuery,
			activeNodeId,
			currentProjectName: ref('X'),
		});

		// Trigger fetch with query matching node display name
		(api.handlers?.onCommandBarChange as (q: string) => void)('http request');
		await waitFor(() => {
			const open = api.commands.value.find((c) => c.id === 'open-workflow');
			expect(open?.children?.length).toBeGreaterThan(0);
		});

		const item = api.commands.value.find((c) => c.id === 'open-workflow')?.children?.[0];
		if (!item) {
			throw new Error('Open workflow command not found');
		}
		// Expect keywords to include workflow name and tags
		expect(item.keywords).toEqual(expect.arrayContaining(['Alpha', 'Marketing']));
		// Icon present when matched by node type
		expect(item.icon).toBeDefined();
	});

	it('root workflow items have correct title and section', async () => {
		const api = useWorkflowNavigationCommands({
			lastQuery: ref('Alpha'),
			activeNodeId: ref(null),
			currentProjectName: ref('My Project'),
		});
		(api.handlers?.onCommandBarChange as (q: string) => void)('Alpha');
		await waitFor(() => {
			expect(api.commands.value.length).toBeGreaterThan(2);
		});
		const alphaWf = api.commands.value.find((c) => c.id === 'w1');
		expect((alphaWf?.title as unknown as { props?: { title?: string } }).props?.title).toBe(
			'generic.openResource',
		);
		expect(alphaWf?.section).toBe('commandBar.sections.workflows');
	});

	it('open workflow children have correct title and section', async () => {
		const api = useWorkflowNavigationCommands({
			lastQuery: ref(''),
			activeNodeId: ref(null),
			currentProjectName: ref('My Project'),
		});
		api.handlers?.onCommandBarNavigateTo?.('open-workflow');
		await waitFor(() => {
			const open = api.commands.value.find((c) => c.id === 'open-workflow');
			expect(open?.children?.length).toBeGreaterThan(0);
		});
		const children = api.commands.value.find((c) => c.id === 'open-workflow')?.children;
		if (!children) {
			throw new Error('Open workflow command not found');
		}
		expect(children).toHaveLength(2);
		expect((children[0].title as unknown as { props?: { title?: string } }).props?.title).toBe(
			'Alpha',
		);
		expect(children[0].section).toBe('commandBar.workflows.open');
	});
});
