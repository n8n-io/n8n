import { ref } from 'vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useDataTableNavigationCommands } from './useDataTableNavigationCommands';
import { fetchDataTablesApi } from '@/features/core/dataTable/dataTable.api';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { DATA_TABLE_DETAILS, PROJECT_DATA_TABLES } from '@/features/core/dataTable/constants';
import type { DataTable } from '@/features/core/dataTable/dataTable.types';
import {
	createProjectListItem,
	createTestProject,
} from '@/features/collaboration/projects/__tests__/utils';

const routerPushMock = vi.fn();
const routerResolveMock = vi.fn(() => ({ href: '/resolved-href' }));
const mockRoute: { params: Record<string, string> } = { params: {} };

vi.mock('vue-router', () => ({
	useRouter: () => ({
		push: routerPushMock,
		resolve: routerResolveMock,
	}),
	useRoute: () => mockRoute,
	RouterLink: vi.fn(),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			[key, ...Object.values(options?.interpolate ?? {})].join(' '),
	}),
}));

vi.mock('@/features/core/dataTable/dataTable.api', async (importOriginal) => ({
	...(await importOriginal()),
	fetchDataTablesApi: vi.fn(),
}));

const createDataTable = (overrides: Partial<DataTable> = {}): DataTable => ({
	id: 'dt-1',
	name: 'Customer Data',
	projectId: 'project-1',
	columns: [],
	sizeBytes: 0,
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-02T00:00:00.000Z',
	project: createTestProject({ id: 'project-1', name: 'Team Project', type: 'team' }),
	...overrides,
});

describe('useDataTableNavigationCommands', () => {
	let projectsStore: ReturnType<typeof useProjectsStore>;
	let sourceControlStore: ReturnType<typeof useSourceControlStore>;

	const setup = () => useDataTableNavigationCommands({ currentProjectName: ref('Team Project') });

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		vi.clearAllMocks();

		projectsStore = useProjectsStore();
		sourceControlStore = useSourceControlStore();

		mockRoute.params = { projectId: 'project-1' };

		projectsStore.myProjects = [
			{ ...createProjectListItem('personal'), id: 'personal-1' },
			{ ...createProjectListItem('team'), id: 'project-1' },
		];
		projectsStore.currentProject = createTestProject({
			id: 'project-1',
			scopes: ['dataTable:create'],
		});
		sourceControlStore.preferences.branchReadOnly = false;
	});

	describe('source', () => {
		it('exposes a remote data tables source', () => {
			expect(setup().source).toMatchObject({
				id: 'dataTables',
				title: 'commandBar.sections.dataTables',
				isRemote: true,
			});
		});

		it.each([true, false])(
			'reports source availability as %s from the data table view permission',
			(canViewDataTables) => {
				Object.defineProperty(useDataTableStore(), 'canViewDataTables', {
					value: canViewDataTables,
				});

				expect(setup().source?.isAvailable()).toBe(canViewDataTables);
			},
		);

		it('searches data tables across projects by trimmed name, newest first', async () => {
			vi.mocked(fetchDataTablesApi).mockResolvedValue({ count: 0, data: [] });

			await setup().source?.search({ query: '  customers ', offset: 10, limit: 5 });

			expect(fetchDataTablesApi).toHaveBeenCalledWith(
				useRootStore().restApiContext,
				'',
				{ skip: 10, take: 5 },
				{ name: 'customers' },
				'updatedAt:desc',
			);
		});

		it('omits the name filter when the query is empty', async () => {
			vi.mocked(fetchDataTablesApi).mockResolvedValue({ count: 0, data: [] });

			await setup().source?.search({ query: '  ', offset: 0, limit: 5 });

			expect(fetchDataTablesApi).toHaveBeenCalledWith(
				useRootStore().restApiContext,
				'',
				{ skip: 0, take: 5 },
				undefined,
				'updatedAt:desc',
			);
		});

		it.each([
			{ offset: 0, count: 3, hasMore: true },
			{ offset: 1, count: 3, hasMore: false },
		])(
			'reports hasMore as $hasMore for offset $offset and total count $count',
			async ({ offset, count, hasMore }) => {
				vi.mocked(fetchDataTablesApi).mockResolvedValue({
					count,
					data: [createDataTable({ id: 'dt-1' }), createDataTable({ id: 'dt-2' })],
				});

				const result = await setup().source?.search({ query: '', offset, limit: 2 });

				expect(result?.items).toHaveLength(2);
				expect(result?.hasMore).toBe(hasMore);
			},
		);

		it('maps a data table to a command bar item', async () => {
			vi.mocked(fetchDataTablesApi).mockResolvedValue({ count: 1, data: [createDataTable()] });

			const result = await setup().source?.search({ query: '', offset: 0, limit: 10 });

			expect(result?.items[0]).toMatchObject({
				id: 'dt-1',
				title: 'Customer Data',
				description: 'Team Project',
				icon: { type: 'icon', value: 'table' },
				timestamp: '2026-01-02T00:00:00.000Z',
				href: '/resolved-href',
			});
			expect(routerResolveMock).toHaveBeenCalledWith({
				name: DATA_TABLE_DETAILS,
				params: { projectId: 'project-1', id: 'dt-1' },
			});
		});

		it.each([
			{
				scenario: 'a personal project',
				project: createTestProject({ type: 'personal' }),
				description: 'projects.menu.personal',
			},
			{ scenario: 'no project', project: undefined, description: '' },
		])('describes a data table in $scenario', async ({ project, description }) => {
			vi.mocked(fetchDataTablesApi).mockResolvedValue({
				count: 1,
				data: [createDataTable({ project })],
			});

			const result = await setup().source?.search({ query: '', offset: 0, limit: 10 });

			expect(result?.items[0].description).toBe(description);
		});

		it('navigates to the data table details when the item handler runs', async () => {
			vi.mocked(fetchDataTablesApi).mockResolvedValue({ count: 1, data: [createDataTable()] });

			const result = await setup().source?.search({ query: '', offset: 0, limit: 10 });
			await result?.items[0].handler?.();

			expect(routerPushMock).toHaveBeenCalledWith({
				name: DATA_TABLE_DETAILS,
				params: { projectId: 'project-1', id: 'dt-1' },
			});
		});
	});

	describe('create data table command', () => {
		const findCreateCommand = () =>
			setup().commands.value.find((command) => command.id === 'create-data-table');

		it('shows the create command for the current project when the user can create data tables', () => {
			expect(findCreateCommand()).toMatchObject({
				title: 'commandBar.dataTables.create Team Project',
				section: 'commandBar.sections.dataTables',
			});
		});

		it('hides the create command in a read-only environment', () => {
			sourceControlStore.preferences.branchReadOnly = true;

			expect(findCreateCommand()).toBeUndefined();
		});

		it('hides the create command when the project does not allow data table creation', () => {
			projectsStore.currentProject = createTestProject({ id: 'project-1', scopes: [] });

			expect(findCreateCommand()).toBeUndefined();
		});

		it('opens the new data table form in the project from the route', async () => {
			await findCreateCommand()?.handler?.();

			expect(routerPushMock).toHaveBeenCalledWith({
				name: PROJECT_DATA_TABLES,
				params: { projectId: 'project-1', new: 'new' },
			});
		});

		it('opens the new data table form in the personal project when the route has no project', async () => {
			mockRoute.params = {};

			await findCreateCommand()?.handler?.();

			expect(routerPushMock).toHaveBeenCalledWith({
				name: PROJECT_DATA_TABLES,
				params: { projectId: 'personal-1', new: 'new' },
			});
		});

		it('does not navigate when no project is available', async () => {
			mockRoute.params = {};
			projectsStore.myProjects = [];

			await findCreateCommand()?.handler?.();

			expect(routerPushMock).not.toHaveBeenCalled();
		});
	});
});
