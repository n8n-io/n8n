import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import type { INodeTypeDescription } from 'n8n-workflow';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { createTestNode, createTestWorkflow } from '@/__tests__/mocks';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { HTTP_REQUEST_NODE_TYPE, VIEWS } from '@/app/constants';
import type { IWorkflowDb, WorkflowListItem } from '@/Interface';
import { getWorkflowsAndFolders } from '@/app/api/workflows';
import type { FolderListItem } from '@/features/core/folders/folders.types';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import {
	ProjectTypes,
	type Project,
	type ProjectSharingData,
} from '@/features/collaboration/projects/projects.types';
import { useTagsStore } from '@/features/shared/tags/tags.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import type { CommandBarSearchRequest } from '../types';
import { useWorkflowNavigationCommands } from './useWorkflowNavigationCommands';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

const resolveMock = vi.fn((location: { params?: { workflowId?: string; folderId?: string } }) => ({
	href: location.params?.folderId
		? `/folders/${location.params.folderId}`
		: `/workflow/${location.params?.workflowId}`,
	fullPath: '/workflow/new',
}));
const pushMock = vi.fn();

vi.mock('vue-router', () => ({
	useRouter: () => ({ resolve: resolveMock, push: pushMock }),
	useRoute: () => ({ params: { folderId: 'folder-1' } }),
	RouterLink: vi.fn(),
}));

vi.mock('@/app/api/workflows', async (importOriginal) => ({
	...(await importOriginal()),
	getWorkflowsAndFolders: vi.fn(),
}));

const WORKFLOW_FIELDS = ['id', 'name', 'updatedAt', 'ownedBy', 'parentFolder'];

const httpRequestNodeType = {
	name: HTTP_REQUEST_NODE_TYPE,
	displayName: 'HTTP Request',
} as INodeTypeDescription;

const teamProject: ProjectSharingData = {
	id: 'team-1',
	name: 'Team A',
	icon: { type: 'icon', value: 'rocket' },
	type: ProjectTypes.Team,
	createdAt: '',
	updatedAt: '',
};

const personalProject: ProjectSharingData = {
	...teamProject,
	id: 'personal-1',
	name: 'Jane Doe <jane@example.com>',
	icon: null,
	type: ProjectTypes.Personal,
};

const createFolder = (overrides: Partial<FolderListItem> = {}): FolderListItem => ({
	id: 'f1',
	name: 'Reports',
	resource: 'folder',
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-03T00:00:00.000Z',
	workflowCount: 0,
	subFolderCount: 0,
	homeProject: teamProject,
	...overrides,
});

const createWorkflows = (count: number) =>
	Array.from({ length: count }, (_, index) => createTestWorkflow({ id: `w${index}` }));

describe('useWorkflowNavigationCommands', () => {
	let workflowsStore: MockedStore<typeof useWorkflowsStore>;
	let workflowsListStore: MockedStore<typeof useWorkflowsListStore>;
	let projectsStore: MockedStore<typeof useProjectsStore>;
	let tagsStore: MockedStore<typeof useTagsStore>;
	let sourceControlStore: MockedStore<typeof useSourceControlStore>;
	let settingsStore: MockedStore<typeof useSettingsStore>;

	const createCommands = () =>
		useWorkflowNavigationCommands({ currentProjectName: ref('My Project') });

	const createSource = () => {
		const { source } = createCommands();
		if (!source) throw new Error('Workflow source is missing');
		return source;
	};

	const search = async (request: Partial<CommandBarSearchRequest> = {}) =>
		await createSource().search({ query: '', offset: 0, limit: 10, ...request });

	const mockSearchResults = ({
		byName = [],
		byNodeType = [],
		byTag = [],
	}: {
		byName?: IWorkflowDb[];
		byNodeType?: IWorkflowDb[];
		byTag?: IWorkflowDb[];
	}) => {
		workflowsListStore.searchWorkflows.mockImplementation(async ({ nodeTypes, tags }) => {
			if (nodeTypes) return byNodeType;
			if (tags) return byTag;
			return byName;
		});
	};

	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();

		const nodeTypesStore = mockedStore(useNodeTypesStore);
		nodeTypesStore.allNodeTypes = [httpRequestNodeType];
		nodeTypesStore.getNodeType = (name: string) =>
			name === HTTP_REQUEST_NODE_TYPE ? httpRequestNodeType : null;

		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.canViewWorkflows = true;

		workflowsListStore = mockedStore(useWorkflowsListStore);
		workflowsListStore.searchWorkflows.mockResolvedValue([]);

		projectsStore = mockedStore(useProjectsStore);
		projectsStore.currentProject = { id: 'team-1', scopes: ['workflow:create'] } as Project;

		tagsStore = mockedStore(useTagsStore);
		tagsStore.tagsById = { t1: { id: 't1', name: 'Marketing' } };

		sourceControlStore = mockedStore(useSourceControlStore);
		sourceControlStore.preferences.branchReadOnly = false;

		settingsStore = mockedStore(useSettingsStore);
		settingsStore.isFoldersFeatureEnabled = false;

		vi.mocked(getWorkflowsAndFolders).mockResolvedValue({ count: 0, data: [] });

		Object.defineProperty(window, 'location', {
			value: { href: '' },
			writable: true,
		});
	});

	describe('commands', () => {
		it('returns the create workflow command when the user can create workflows', () => {
			const { commands } = createCommands();

			expect(commands.value).toEqual([
				expect.objectContaining({
					id: 'create-workflow',
					title: 'commandBar.workflows.create',
					section: 'commandBar.sections.workflows',
				}),
			]);
		});

		it('returns no commands when the user cannot create workflows', () => {
			projectsStore.currentProject = { id: 'team-1', scopes: ['workflow:read'] } as Project;

			const { commands } = createCommands();

			expect(commands.value).toEqual([]);
		});

		it('returns no commands when the branch is read-only', () => {
			sourceControlStore.preferences.branchReadOnly = true;

			const { commands } = createCommands();

			expect(commands.value).toEqual([]);
		});

		it('navigates to a new workflow in the current project and folder', async () => {
			const { commands } = createCommands();

			await commands.value[0].handler?.();

			expect(resolveMock).toHaveBeenCalledWith({
				name: VIEWS.NEW_WORKFLOW,
				query: { projectId: 'team-1', parentFolderId: 'folder-1' },
			});
			expect(window.location.href).toBe('/workflow/new');
		});
	});

	describe('source', () => {
		it('is available only when the user can view workflows', () => {
			const source = createSource();

			expect(source.isAvailable()).toBe(true);

			workflowsStore.canViewWorkflows = false;

			expect(source.isAvailable()).toBe(false);
		});

		it('searches non-archived workflows by name with server-side paging', async () => {
			await search({ query: '  alpha  ', offset: 20, limit: 10 });

			expect(workflowsListStore.searchWorkflows).toHaveBeenCalledTimes(1);
			expect(workflowsListStore.searchWorkflows).toHaveBeenCalledWith({
				query: 'alpha',
				isArchived: false,
				select: WORKFLOW_FIELDS,
				options: { skip: 20, take: 11, sortBy: 'updatedAt:desc', includeScopes: false },
			});
		});

		it('sends no query when the search text is empty', async () => {
			await search({ query: '   ' });

			expect(workflowsListStore.searchWorkflows).toHaveBeenCalledWith(
				expect.objectContaining({ query: undefined }),
			);
		});

		it('reports more results when the response contains the extra row', async () => {
			mockSearchResults({ byName: createWorkflows(3) });

			const result = await search({ limit: 2 });

			expect(result.items.map((item) => item.id)).toEqual(['w0', 'w1']);
			expect(result.hasMore).toBe(true);
		});

		it('reports no more results when the response has no extra row', async () => {
			mockSearchResults({ byName: createWorkflows(2) });

			const result = await search({ limit: 2 });

			expect(result.items).toHaveLength(2);
			expect(result.hasMore).toBe(false);
		});
	});

	describe('items', () => {
		it('maps a workflow to an item with its project and folder', async () => {
			mockSearchResults({
				byName: [
					createTestWorkflow({
						id: 'w1',
						name: 'Alpha',
						updatedAt: '2026-01-02T00:00:00.000Z',
						homeProject: teamProject,
						parentFolder: { id: 'f1', name: 'Reports', parentFolderId: null },
					}),
				],
			});

			const { items } = await search();

			expect(items).toEqual([
				{
					id: 'w1',
					title: 'Alpha',
					description: 'Team A / Reports',
					descriptionIcon: { type: 'icon', value: 'rocket' },
					icon: { type: 'icon', value: 'workflow' },
					timestamp: '2026-01-02T00:00:00.000Z',
					href: '/workflow/w1',
					handler: expect.any(Function),
				},
			]);
			expect(resolveMock).toHaveBeenCalledWith({
				name: VIEWS.WORKFLOW,
				params: { workflowId: 'w1' },
			});
		});

		it('uses the unnamed label when the workflow has no name', async () => {
			mockSearchResults({ byName: [createTestWorkflow({ id: 'w1', name: '' })] });

			const { items } = await search();

			expect(items[0].title).toBe('commandBar.workflows.unnamed');
		});

		it('uses the personal label for workflows in a personal project', async () => {
			mockSearchResults({
				byName: [createTestWorkflow({ id: 'w1', homeProject: personalProject })],
			});

			const { items } = await search();

			expect(items[0].description).toBe('projects.menu.personal');
			expect(items[0].descriptionIcon).toEqual({ type: 'icon', value: 'user' });
		});

		it('navigates to the workflow when the item handler runs', async () => {
			mockSearchResults({ byName: [createTestWorkflow({ id: 'w1' })] });

			const { items } = await search();
			await items[0].handler?.();

			expect(window.location.href).toBe('/workflow/w1');
		});
	});

	describe('node type and tag matches', () => {
		it('includes workflows that use a node matching the query with the node icon', async () => {
			mockSearchResults({
				byName: [createTestWorkflow({ id: 'w1', updatedAt: '2026-01-01T00:00:00.000Z' })],
				byNodeType: [
					createTestWorkflow({
						id: 'w2',
						updatedAt: '2026-01-02T00:00:00.000Z',
						nodes: [createTestNode({ type: HTTP_REQUEST_NODE_TYPE })],
					}),
				],
			});

			const { items } = await search({ query: 'http request', limit: 5 });

			expect(workflowsListStore.searchWorkflows).toHaveBeenCalledWith({
				nodeTypes: [HTTP_REQUEST_NODE_TYPE],
				isArchived: false,
				select: [...WORKFLOW_FIELDS, 'nodes'],
				options: { skip: 0, take: 6, sortBy: 'updatedAt:desc', includeScopes: false },
			});
			expect(items.map((item) => item.id)).toEqual(['w2', 'w1']);
			expect(items[0].icon).toEqual({
				component: NodeIcon,
				props: { nodeType: httpRequestNodeType, size: 16 },
			});
		});

		it('includes workflows with a tag matching the query', async () => {
			mockSearchResults({
				byName: [createTestWorkflow({ id: 'w1' })],
				byTag: [createTestWorkflow({ id: 'w2' })],
			});

			const { items } = await search({ query: 'marketing', limit: 5 });

			expect(workflowsListStore.searchWorkflows).toHaveBeenCalledWith({
				tags: ['Marketing'],
				isArchived: false,
				select: WORKFLOW_FIELDS,
				options: { skip: 0, take: 6, sortBy: 'updatedAt:desc', includeScopes: false },
			});
			expect(items.map((item) => item.id)).toEqual(['w2', 'w1']);
		});

		it('sorts the merged results by last update', async () => {
			mockSearchResults({
				byName: [createTestWorkflow({ id: 'w1', updatedAt: '2026-01-03T00:00:00.000Z' })],
				byNodeType: [
					createTestWorkflow({
						id: 'w2',
						updatedAt: '2026-01-01T00:00:00.000Z',
						nodes: [createTestNode({ type: HTTP_REQUEST_NODE_TYPE })],
					}),
				],
			});

			const { items } = await search({ query: 'http request', limit: 5 });

			expect(items.map((item) => item.id)).toEqual(['w1', 'w2']);
		});

		it('pages the node type and tag searches with the name search', async () => {
			await search({ query: 'http request', offset: 10, limit: 5 });
			await search({ query: 'marketing', offset: 10, limit: 5 });

			expect(workflowsListStore.searchWorkflows).toHaveBeenCalledWith(
				expect.objectContaining({
					nodeTypes: [HTTP_REQUEST_NODE_TYPE],
					options: expect.objectContaining({ skip: 10, take: 6 }),
				}),
			);
			expect(workflowsListStore.searchWorkflows).toHaveBeenCalledWith(
				expect.objectContaining({
					tags: ['Marketing'],
					options: expect.objectContaining({ skip: 10, take: 6 }),
				}),
			);
		});

		it('reports more results when only the node type search has the extra row', async () => {
			mockSearchResults({
				byName: createWorkflows(1),
				byNodeType: Array.from({ length: 3 }, (_, index) =>
					createTestWorkflow({
						id: `n${index}`,
						nodes: [createTestNode({ type: HTTP_REQUEST_NODE_TYPE })],
					}),
				),
			});

			const result = await search({ query: 'http request', limit: 2 });

			expect(result.items.map((item) => item.id)).toEqual(['n0', 'n1', 'w0']);
			expect(result.hasMore).toBe(true);
		});

		it('returns each workflow once when several searches match it', async () => {
			const matchingWorkflow = createTestWorkflow({
				id: 'w1',
				nodes: [createTestNode({ type: HTTP_REQUEST_NODE_TYPE })],
			});
			mockSearchResults({
				byName: [createTestWorkflow({ id: 'w2' }), matchingWorkflow],
				byNodeType: [matchingWorkflow],
			});

			const { items } = await search({ query: 'HTTP Request' });

			expect(items.map((item) => item.id)).toEqual(['w1', 'w2']);
			expect(items[0].icon).toEqual(expect.objectContaining({ component: NodeIcon }));
		});
	});

	describe('folder matches', () => {
		beforeEach(() => {
			settingsStore.isFoldersFeatureEnabled = true;
		});

		it('lists folders matching the query before workflows', async () => {
			vi.mocked(getWorkflowsAndFolders).mockResolvedValue({ count: 1, data: [createFolder()] });
			mockSearchResults({ byName: [createTestWorkflow({ id: 'w1' })] });

			const { items } = await search({ query: '  reports  ', limit: 5 });

			expect(getWorkflowsAndFolders).toHaveBeenCalledWith(
				useRootStore().restApiContext,
				{ query: 'reports', isArchived: false },
				{ skip: 0, take: 5, sortBy: 'updatedAt:desc' },
				true,
			);
			expect(items.map((item) => item.id)).toEqual(['folder-f1', 'w1']);
		});

		it('maps a folder to an item that opens the folder in its project', async () => {
			vi.mocked(getWorkflowsAndFolders).mockResolvedValue({
				count: 1,
				data: [
					createFolder({
						parentFolder: { id: 'f0', name: 'Archive', parentFolderId: null },
					}),
				],
			});

			const { items } = await search({ query: 'reports' });

			expect(items[0]).toEqual({
				id: 'folder-f1',
				title: 'Reports',
				description: 'Team A / Archive',
				descriptionIcon: { type: 'icon', value: 'rocket' },
				icon: { type: 'icon', value: 'folder' },
				timestamp: '2026-01-03T00:00:00.000Z',
				href: '/folders/f1',
				handler: expect.any(Function),
			});

			await items[0].handler?.();

			expect(pushMock).toHaveBeenCalledWith({
				name: VIEWS.PROJECTS_FOLDERS,
				params: { projectId: 'team-1', folderId: 'f1' },
			});
		});

		it('opens a folder without a home project through the folders view', async () => {
			vi.mocked(getWorkflowsAndFolders).mockResolvedValue({
				count: 1,
				data: [createFolder({ homeProject: undefined })],
			});

			const { items } = await search({ query: 'reports' });

			expect(items[0].description).toBe('');
			expect(items[0].descriptionIcon).toBeUndefined();

			await items[0].handler?.();

			expect(pushMock).toHaveBeenCalledWith({
				name: VIEWS.FOLDERS,
				params: { folderId: 'f1' },
			});
		});

		it('ignores workflow rows from the folder search response', async () => {
			const workflowRow: WorkflowListItem = {
				...createTestWorkflow({ id: 'w9' }),
				description: undefined,
				resource: 'workflow',
			};
			vi.mocked(getWorkflowsAndFolders).mockResolvedValue({
				count: 2,
				data: [createFolder(), workflowRow],
			});
			mockSearchResults({ byName: [createTestWorkflow({ id: 'w1' })] });

			const { items } = await search({ query: 'reports' });

			expect(items.map((item) => item.id)).toEqual(['folder-f1', 'w1']);
		});

		it('does not search folders when the folders feature is disabled', async () => {
			settingsStore.isFoldersFeatureEnabled = false;

			await search({ query: 'reports' });

			expect(getWorkflowsAndFolders).not.toHaveBeenCalled();
		});

		it('does not search folders when the query is empty', async () => {
			await search({ query: '   ' });

			expect(getWorkflowsAndFolders).not.toHaveBeenCalled();
		});

		it('does not search folders on later pages', async () => {
			await search({ query: 'reports', offset: 10 });

			expect(getWorkflowsAndFolders).not.toHaveBeenCalled();
		});
	});

	it('fetches tags on initialize', async () => {
		await createCommands().initialize?.();

		expect(tagsStore.fetchAll).toHaveBeenCalled();
	});
});
