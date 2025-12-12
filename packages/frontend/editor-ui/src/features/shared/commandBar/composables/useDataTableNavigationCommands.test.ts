import { ref } from 'vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as permissionsModule from '@n8n/permissions';
import { useDataTableNavigationCommands } from './useDataTableNavigationCommands';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { DataTable } from '@/features/core/dataTable/dataTable.types';
import { VIEWS } from '@/app/constants';
import { createTestProject } from '@/features/collaboration/projects/__tests__/utils';

const routerPushMock = vi.fn();
vi.mock('vue-router', () => ({
	useRouter: () => ({
		push: routerPushMock,
	}),
	useRoute: () => ({
		name: VIEWS.WORKFLOWS,
		params: { projectId: 'project-1' },
	}),
	RouterLink: vi.fn(),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string, opts?: { interpolate?: Record<string, string> }) => {
			if (opts?.interpolate) {
				let result = key;
				for (const [k, v] of Object.entries(opts.interpolate)) {
					result = result.replace(`{${k}}`, v);
				}
				return result;
			}
			return key;
		},
	}),
}));

vi.mock('@n8n/permissions', async (importOriginal) => ({
	...(await importOriginal()),
	getResourcePermissions: vi.fn(() => ({
		dataTable: {
			create: true,
		},
	})),
}));

describe('useDataTableNavigationCommands', () => {
	let mockDataTableStore: ReturnType<typeof useDataTableStore>;
	let mockProjectsStore: ReturnType<typeof useProjectsStore>;
	let mockSourceControlStore: ReturnType<typeof useSourceControlStore>;

	const createMockDataTable = (
		id: string,
		name: string,
		projectId?: string,
		projectName?: string,
		projectType?: 'personal' | 'team',
	): DataTable => ({
		id,
		name,
		projectId: projectId ?? '',
		columns: [],
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		sizeBytes: 0,
		project: projectId
			? createTestProject({
					id: projectId,
					name: projectName ?? 'Project',
					type: projectType ?? 'team',
					icon: null,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				})
			: undefined,
	});

	beforeEach(() => {
		setActivePinia(createTestingPinia());

		mockDataTableStore = useDataTableStore();
		mockProjectsStore = useProjectsStore();
		mockSourceControlStore = useSourceControlStore();

		mockProjectsStore.myProjects = [
			{
				id: 'personal-1',
				name: 'Personal',
				type: 'personal',
				icon: null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				role: 'project:personalOwner',
			},
			{
				id: 'project-1',
				name: 'Team Project',
				type: 'team',
				icon: null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				role: 'project:admin',
			},
		];

		Object.defineProperty(mockDataTableStore, 'dataTables', {
			value: [],
			writable: true,
		});

		Object.defineProperty(mockDataTableStore, 'fetchDataTables', {
			value: vi.fn().mockResolvedValue(undefined),
		});

		mockSourceControlStore.preferences.branchReadOnly = false;

		vi.clearAllMocks();
		vi.mocked(permissionsModule).getResourcePermissions.mockRestore();
	});

	describe('create data table command', () => {
		beforeEach(() => {
			Object.defineProperty(mockDataTableStore, 'canViewDataTables', {
				value: true,
			});
		});

		it('should include create data table command when not in read-only mode', () => {
			const { commands } = useDataTableNavigationCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
				currentProjectName: ref('Team Project'),
			});

			const createCommand = commands.value.find((cmd) => cmd.id === 'create-data-table');
			expect(createCommand).toBeDefined();
		});

		it('should not include create data table command when in read-only mode', () => {
			mockSourceControlStore.preferences.branchReadOnly = true;

			const { commands } = useDataTableNavigationCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
				currentProjectName: ref('Team Project'),
			});

			const createCommand = commands.value.find((cmd) => cmd.id === 'create-data-table');
			expect(createCommand).toBeUndefined();
		});

		it('should not include create data table command when user has no permission', () => {
			vi.mocked(permissionsModule).getResourcePermissions.mockReturnValue({
				dataTable: {
					create: false,
				},
			} as unknown as permissionsModule.PermissionsRecord);

			const { commands } = useDataTableNavigationCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
				currentProjectName: ref('Team Project'),
			});
			const createCommand = commands.value.find((cmd) => cmd.id === 'create-data-table');
			expect(createCommand).toBeUndefined();
		});

		it('should not include any data table commands when user is chat user', () => {
			vi.mocked(permissionsModule).getResourcePermissions.mockReturnValue({
				dataTable: {
					create: false,
				},
			} as unknown as permissionsModule.PermissionsRecord);
			Object.defineProperty(mockDataTableStore, 'canViewDataTables', {
				value: false,
			});

			const { commands } = useDataTableNavigationCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
				currentProjectName: ref('Team Project'),
			});
			expect(commands.value.length).toBe(0);
		});
	});

	describe('open data table command', () => {
		beforeEach(() => {
			Object.defineProperty(mockDataTableStore, 'canViewDataTables', {
				value: true,
			});
		});

		it('should include open data table command', () => {
			const { commands } = useDataTableNavigationCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
				currentProjectName: ref('Team Project'),
			});

			const openCommand = commands.value.find((cmd) => cmd.id === 'open-data-table');
			expect(openCommand).toBeDefined();
		});

		it('should have empty children when not navigated into', () => {
			const { commands } = useDataTableNavigationCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
				currentProjectName: ref('Team Project'),
			});

			const openCommand = commands.value.find((cmd) => cmd.id === 'open-data-table');
			expect(openCommand?.children).toHaveLength(0);
		});

		it('should populate children after navigating to open-data-table', async () => {
			mockDataTableStore.dataTables = [
				createMockDataTable('dt-1', 'My Data Table', 'project-1', 'Team Project'),
			];

			const activeNodeId = ref<string | null>(null);
			const { commands, handlers } = useDataTableNavigationCommands({
				lastQuery: ref(''),
				activeNodeId,
				currentProjectName: ref('Team Project'),
			});

			handlers.onCommandBarNavigateTo('open-data-table');

			await vi.waitFor(() => {
				const openCommand = commands.value.find((cmd) => cmd.id === 'open-data-table');
				expect(openCommand?.children).toHaveLength(1);
			});
		});
	});

	describe('data table search and filtering', () => {
		beforeEach(() => {
			Object.defineProperty(mockDataTableStore, 'canViewDataTables', {
				value: true,
			});
			mockDataTableStore.dataTables = [
				createMockDataTable('dt-1', 'Customer Data', 'project-1', 'Team Project'),
				createMockDataTable('dt-2', 'Product Catalog', 'personal-1', 'Personal', 'personal'),
				createMockDataTable('dt-3', 'Order History', 'project-1', 'Team Project'),
			];
		});

		it('should filter data tables based on search query', async () => {
			const activeNodeId = ref<string | null>('open-data-table');
			const lastQuery = ref('');
			Object.defineProperty(mockDataTableStore, 'canViewDataTables', {
				value: true,
			});

			const { commands, handlers } = useDataTableNavigationCommands({
				lastQuery,
				activeNodeId,
				currentProjectName: ref('Team Project'),
			});

			handlers.onCommandBarNavigateTo('open-data-table');
			await vi.waitFor(() => {
				expect(commands.value.find((cmd) => cmd.id === 'open-data-table')?.children).toHaveLength(
					3,
				);
			});

			lastQuery.value = 'customer';
			handlers.onCommandBarChange('customer');

			await vi.waitFor(() => {
				const openCommand = commands.value.find((cmd) => cmd.id === 'open-data-table');
				expect(openCommand?.children).toHaveLength(1);
				expect(openCommand?.children?.[0].id).toBe('dt-1');
			});
		});

		it('should order results with current project data tables first', async () => {
			const activeNodeId = ref<string | null>('open-data-table');
			const { commands, handlers } = useDataTableNavigationCommands({
				lastQuery: ref(''),
				activeNodeId,
				currentProjectName: ref('Team Project'),
			});

			handlers.onCommandBarNavigateTo('open-data-table');

			await vi.waitFor(() => {
				const openCommand = commands.value.find((cmd) => cmd.id === 'open-data-table');
				const children = openCommand?.children ?? [];
				expect(children).toHaveLength(3);
				// Current project (project-1) data tables should come first, then personal
				const currentProjectDts = children.filter((c) => c.id === 'dt-1' || c.id === 'dt-3');
				const personalDts = children.filter((c) => c.id === 'dt-2');
				expect(currentProjectDts).toHaveLength(2);
				expect(personalDts).toHaveLength(1);
				// Verify that personal data table comes last
				expect(children[2].id).toBe('dt-2');
			});
		});
	});

	describe('root data table items', () => {
		beforeEach(() => {
			Object.defineProperty(mockDataTableStore, 'canViewDataTables', {
				value: true,
			});
			mockDataTableStore.dataTables = [
				createMockDataTable('dt-1', 'Customer Data', 'project-1', 'Team Project'),
			];
		});

		it('should not show root data table items when query is too short', () => {
			const { commands } = useDataTableNavigationCommands({
				lastQuery: ref('cu'),
				activeNodeId: ref(null),
				currentProjectName: ref('Team Project'),
			});

			const rootDataTables = commands.value.filter((cmd) => cmd.id === 'dt-1');
			expect(rootDataTables).toHaveLength(0);
		});

		it('should show root data table items when query is longer than 2 characters', async () => {
			const lastQuery = ref('cus');
			const { commands, handlers } = useDataTableNavigationCommands({
				lastQuery,
				activeNodeId: ref(null),
				currentProjectName: ref('Team Project'),
			});

			handlers.onCommandBarChange('cus');

			await vi.waitFor(() => {
				const rootDataTables = commands.value.filter((cmd) => cmd.id === 'dt-1');
				expect(rootDataTables).toHaveLength(1);
				expect(rootDataTables[0].section).toBe('commandBar.sections.dataTables');
				expect(rootDataTables[0].title).toEqual(
					expect.objectContaining({
						props: expect.objectContaining({
							title: 'generic.openResource',
						}),
					}),
				);
			});
		});
	});

	describe('data table command handler', () => {
		it('should navigate to data table details when clicked', async () => {
			Object.defineProperty(mockDataTableStore, 'canViewDataTables', {
				value: true,
			});
			mockDataTableStore.dataTables = [
				createMockDataTable('dt-1', 'Customer Data', 'project-1', 'Team Project'),
			];

			const activeNodeId = ref<string | null>('open-data-table');
			const { commands, handlers } = useDataTableNavigationCommands({
				lastQuery: ref(''),
				activeNodeId,
				currentProjectName: ref('Team Project'),
			});

			handlers.onCommandBarNavigateTo('open-data-table');

			await vi.waitFor(() => {
				const openCommand = commands.value.find((cmd) => cmd.id === 'open-data-table');
				expect(openCommand?.children).toHaveLength(1);
			});

			const openCommand = commands.value.find((cmd) => cmd.id === 'open-data-table');
			const handler = openCommand?.children?.[0].handler;
			if (handler) {
				await handler();
			}
			expect(routerPushMock).toHaveBeenCalled();
		});
	});

	describe('data table project suffix', () => {
		it('should show personal project suffix for personal data tables', async () => {
			Object.defineProperty(mockDataTableStore, 'canViewDataTables', {
				value: true,
			});
			mockDataTableStore.dataTables = [
				createMockDataTable('dt-1', 'Personal DataTbl', 'personal-1', 'Personal', 'personal'),
			];

			const activeNodeId = ref<string | null>('open-data-table');
			const { commands, handlers } = useDataTableNavigationCommands({
				lastQuery: ref(''),
				activeNodeId,
				currentProjectName: ref('Team Project'),
			});

			handlers.onCommandBarNavigateTo('open-data-table');

			await vi.waitFor(() => {
				const openCommand = commands.value.find((cmd) => cmd.id === 'open-data-table');
				const dataTable = openCommand?.children?.[0];
				expect(dataTable).toBeDefined();
				expect(dataTable?.title).toEqual({
					component: expect.any(Object),
					props: expect.objectContaining({
						suffix: 'projects.menu.personal',
					}),
				});
			});
		});

		it('should show project name for team project data tables', async () => {
			Object.defineProperty(mockDataTableStore, 'canViewDataTables', {
				value: true,
			});
			mockDataTableStore.dataTables = [
				createMockDataTable('dt-1', 'Team DataTbl', 'project-1', 'Team Project', 'team'),
			];

			const activeNodeId = ref<string | null>('open-data-table');
			const { commands, handlers } = useDataTableNavigationCommands({
				lastQuery: ref(''),
				activeNodeId,
				currentProjectName: ref('Team Project'),
			});

			handlers.onCommandBarNavigateTo('open-data-table');

			await vi.waitFor(() => {
				const openCommand = commands.value.find((cmd) => cmd.id === 'open-data-table');
				const dataTable = openCommand?.children?.[0];
				expect(dataTable).toBeDefined();
				expect(dataTable?.title).toEqual({
					component: expect.any(Object),
					props: expect.objectContaining({
						suffix: 'Team Project',
					}),
				});
			});
		});

		it('should show empty suffix when data table has no project', async () => {
			Object.defineProperty(mockDataTableStore, 'canViewDataTables', {
				value: true,
			});
			mockDataTableStore.dataTables = [createMockDataTable('dt-1', 'Orphan DataTbl')];

			const activeNodeId = ref<string | null>('open-data-table');
			const { commands, handlers } = useDataTableNavigationCommands({
				lastQuery: ref(''),
				activeNodeId,
				currentProjectName: ref('Team Project'),
			});

			handlers.onCommandBarNavigateTo('open-data-table');

			await vi.waitFor(() => {
				const openCommand = commands.value.find((cmd) => cmd.id === 'open-data-table');
				const dataTable = openCommand?.children?.[0];
				expect(dataTable).toBeDefined();
				expect(dataTable?.title).toEqual({
					component: expect.any(Object),
					props: expect.objectContaining({
						suffix: '',
					}),
				});
			});
		});
	});

	describe('onCommandBarNavigateTo handler', () => {
		beforeEach(() => {
			Object.defineProperty(mockDataTableStore, 'canViewDataTables', {
				value: true,
			});
		});

		it('should set loading state when navigating to open-data-table', () => {
			const { isLoading, handlers } = useDataTableNavigationCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
				currentProjectName: ref('Team Project'),
			});

			expect(isLoading.value).toBe(false);

			handlers.onCommandBarNavigateTo('open-data-table');

			expect(isLoading.value).toBe(true);
		});

		it('should clear data table results when navigating back to root', async () => {
			mockDataTableStore.dataTables = [
				createMockDataTable('dt-1', 'Customer Data', 'project-1', 'Team Project'),
			];

			const activeNodeId = ref<string | null>('open-data-table');
			const { commands, handlers } = useDataTableNavigationCommands({
				lastQuery: ref(''),
				activeNodeId,
				currentProjectName: ref('Team Project'),
			});

			handlers.onCommandBarNavigateTo('open-data-table');

			await vi.waitFor(() => {
				const openCommand = commands.value.find((cmd) => cmd.id === 'open-data-table');
				expect(openCommand?.children).toHaveLength(1);
			});

			handlers.onCommandBarNavigateTo(null);

			const openCommand = commands.value.find((cmd) => cmd.id === 'open-data-table');
			expect(openCommand?.children).toHaveLength(0);
		});
	});

	describe('onCommandBarChange handler', () => {
		beforeEach(() => {
			Object.defineProperty(mockDataTableStore, 'canViewDataTables', {
				value: true,
			});
			mockDataTableStore.dataTables = [
				createMockDataTable('dt-1', 'Customer Data', 'project-1', 'Team Project'),
			];
		});

		it('should set loading state when searching inside open-data-table', () => {
			const activeNodeId = ref<string | null>('open-data-table');
			const { isLoading, handlers } = useDataTableNavigationCommands({
				lastQuery: ref(''),
				activeNodeId,
				currentProjectName: ref('Team Project'),
			});

			handlers.onCommandBarChange('customer');

			expect(isLoading.value).toBe(true);
		});

		it('should not set loading state when searching from root with short query', () => {
			const activeNodeId = ref<string | null>(null);
			const lastQuery = ref('cu');
			const { isLoading, handlers } = useDataTableNavigationCommands({
				lastQuery,
				activeNodeId,
				currentProjectName: ref('Team Project'),
			});

			handlers.onCommandBarChange('cu');

			expect(isLoading.value).toBe(false);
		});

		it('should not set loading state when searching from root with query longer than 2 chars', () => {
			const activeNodeId = ref<string | null>(null);
			const lastQuery = ref('cus');
			const { isLoading, handlers } = useDataTableNavigationCommands({
				lastQuery,
				activeNodeId,
				currentProjectName: ref('Team Project'),
			});

			handlers.onCommandBarChange('cus');

			expect(isLoading.value).toBe(false); // Not in parent node, so shouldn't be loading
		});
	});

	describe('error handling', () => {
		it('should handle fetch errors gracefully', async () => {
			Object.defineProperty(mockDataTableStore, 'canViewDataTables', {
				value: true,
			});
			Object.defineProperty(mockDataTableStore, 'fetchDataTables', {
				value: vi.fn().mockRejectedValue(new Error('Network error')),
			});

			const activeNodeId = ref<string | null>('open-data-table');
			const { commands, handlers, isLoading } = useDataTableNavigationCommands({
				lastQuery: ref(''),
				activeNodeId,
				currentProjectName: ref('Team Project'),
			});

			handlers.onCommandBarNavigateTo('open-data-table');

			await vi.waitFor(() => {
				expect(isLoading.value).toBe(false);
			});

			const openCommand = commands.value.find((cmd) => cmd.id === 'open-data-table');
			expect(openCommand?.children).toHaveLength(0);
		});
	});
});
