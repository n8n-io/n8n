import { createComponentRenderer } from '@/__tests__/render';
import type { FolderShortInfo, UserAction } from '@/Interface';
import FolderBreadcrumbs from './FolderBreadcrumbs.vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useRoute } from 'vue-router';
import type { Mock } from 'vitest';
import { mockedStore } from '@/__tests__/utils';
import { useProjectsStore } from '@/stores/projects.store';
import { ProjectTypes, type Project } from '@/types/projects.types';
import { useFoldersStore } from '@/stores/folders.store';
import type { IUser } from 'n8n-workflow';

vi.mock('vue-router', async (importOriginal) => ({
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	...(await importOriginal<typeof import('vue-router')>()),
	useRoute: vi.fn().mockReturnValue({}),
	useRouter: vi.fn(() => ({
		replace: vi.fn(),
	})),
}));

const TEST_PROJECT: Project = {
	id: '1',
	name: 'Test Project',
	icon: { type: 'icon', value: 'folder' },
	type: ProjectTypes.Personal,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	relations: [],
	scopes: [],
};

const TEST_FOLDER: FolderShortInfo = {
	id: '1',
	name: 'Test Folder',
};

const TEST_FOLDER_CHILD: FolderShortInfo = {
	id: '2',
	name: 'Test Folder Child',
	parentFolder: TEST_FOLDER.id,
};

const TEST_ACTIONS: Array<UserAction<IUser>> = [
	{ label: 'Action 1', value: 'action1', disabled: false },
	{ label: 'Action 2', value: 'action2', disabled: true },
];

const renderComponent = createComponentRenderer(FolderBreadcrumbs, {});

describe('FolderBreadcrumbs', () => {
	let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;
	let foldersStore: ReturnType<typeof mockedStore<typeof useFoldersStore>>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		projectsStore = mockedStore(useProjectsStore);
		foldersStore = mockedStore(useFoldersStore);
		(useRoute as Mock).mockReturnValue({
			query: { projectId: TEST_PROJECT.id },
		});
		projectsStore.currentProject = TEST_PROJECT;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render folder breadcrumbs with actions', () => {
		const { getByTestId } = renderComponent({
			props: {
				currentFolder: TEST_FOLDER,
				actions: TEST_ACTIONS,
			},
		});
		expect(getByTestId('folder-breadcrumbs')).toBeVisible();
		expect(getByTestId('home-project')).toBeVisible();
		expect(getByTestId('breadcrumbs-item')).toBeVisible();
		expect(getByTestId('folder-breadcrumbs-actions')).toBeVisible();
	});

	it('should only render project breadcrumb if currentFolder is not provided', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				currentFolder: null,
			},
		});
		expect(getByTestId('folder-breadcrumbs')).toBeVisible();
		expect(getByTestId('home-project')).toBeVisible();
		expect(queryByTestId('breadcrumbs-item')).not.toBeInTheDocument();
		expect(queryByTestId('folder-breadcrumbs-actions')).not.toBeInTheDocument();
	});

	it('should render 1 level of breadcrumbs', () => {
		foldersStore.getCachedFolder.mockReturnValue(TEST_FOLDER);

		const { getByTestId, queryAllByTestId } = renderComponent({
			props: {
				currentFolder: TEST_FOLDER_CHILD,
				visibleLevels: 1,
			},
		});
		// In this case, breadcrumbs should contain home project and current folder
		// while parent is hidden by ellipsis
		expect(getByTestId('folder-breadcrumbs')).toBeVisible();
		expect(getByTestId('home-project')).toBeVisible();
		expect(queryAllByTestId('breadcrumbs-item')).toHaveLength(1);
		expect(getByTestId('ellipsis')).toBeVisible();
	});

	it('should render 2 levels of breadcrumbs', () => {
		foldersStore.getCachedFolder.mockReturnValue(TEST_FOLDER);

		const { getByTestId, queryAllByTestId, queryByTestId } = renderComponent({
			props: {
				currentFolder: TEST_FOLDER_CHILD,
				visibleLevels: 2,
			},
		});
		// Now, parent folder should also be visible
		expect(getByTestId('folder-breadcrumbs')).toBeVisible();
		expect(getByTestId('home-project')).toBeVisible();
		expect(queryAllByTestId('breadcrumbs-item')).toHaveLength(2);
		expect(queryByTestId('ellipsis')).not.toBeInTheDocument();
	});

	it('should render personal project as fallback', () => {
		foldersStore.getCachedFolder.mockReturnValue(TEST_FOLDER);
		projectsStore.currentProject = null;
		projectsStore.personalProject = TEST_PROJECT;

		const { getByTestId } = renderComponent({
			props: {
				currentFolder: TEST_FOLDER_CHILD,
			},
		});
		// Now, parent folder should also be visible
		expect(getByTestId('folder-breadcrumbs')).toBeVisible();
		expect(getByTestId('home-project')).toBeVisible();
	});
});
