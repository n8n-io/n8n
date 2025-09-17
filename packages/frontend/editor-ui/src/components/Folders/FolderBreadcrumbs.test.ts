import { createComponentRenderer } from '@/__tests__/render';
import type { FolderShortInfo, UserAction, IWorkflowDb } from '@/Interface';
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
import { VIEWS } from '@/constants';

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

const TEST_PERSONAL_PROJECT: Project = {
	id: 'personal-1',
	name: 'Personal Project',
	icon: { type: 'icon', value: 'user' },
	type: ProjectTypes.Personal,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	relations: [],
	scopes: [],
};

const TEST_SHARED_WORKFLOW: IWorkflowDb = {
	id: 'workflow-1',
	name: 'Shared Workflow',
	homeProject: {
		id: 'other-project',
		name: 'Other Project',
		icon: { type: 'icon', value: 'folder' },
		type: ProjectTypes.Team,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	sharedWithProjects: [
		{
			id: 'personal-1',
			name: 'Personal Project',
			icon: { type: 'icon', value: 'user' },
			type: ProjectTypes.Personal,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
	],
	active: false,
	isArchived: false,
	nodes: [],
	connections: {},
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	versionId: '1',
	scopes: [],
};

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

	describe('Shared Workflow Breadcrumbs', () => {
		beforeEach(() => {
			projectsStore.personalProject = TEST_PERSONAL_PROJECT;
		});

		it('should show "Shared with you" for shared workflows', () => {
			const { getByTestId } = renderComponent({
				props: {
					currentFolder: null,
					workflow: TEST_SHARED_WORKFLOW,
				},
			});

			expect(getByTestId('folder-breadcrumbs')).toBeVisible();
			expect(getByTestId('home-project')).toBeVisible();
			
			// Check that the project breadcrumb shows "Shared with you"
			const projectBreadcrumb = getByTestId('home-project');
			expect(projectBreadcrumb).toHaveTextContent('Shared with you');
		});

		it('should link to shared workflows page for shared workflows', () => {
			const { getByTestId } = renderComponent({
				props: {
					currentFolder: null,
					workflow: TEST_SHARED_WORKFLOW,
				},
			});

			const projectLink = getByTestId('home-project').querySelector('a');
			expect(projectLink).toHaveAttribute('href', `#${VIEWS.SHARED_WORKFLOWS}`);
		});

		it('should show normal project name for owned workflows', () => {
			const ownedWorkflow: IWorkflowDb = {
				...TEST_SHARED_WORKFLOW,
				homeProject: {
					id: 'personal-1',
					name: 'Personal Project',
					icon: { type: 'icon', value: 'user' },
					type: ProjectTypes.Personal,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
				sharedWithProjects: [],
			};

			const { getByTestId } = renderComponent({
				props: {
					currentFolder: null,
					workflow: ownedWorkflow,
				},
			});

			expect(getByTestId('folder-breadcrumbs')).toBeVisible();
			expect(getByTestId('home-project')).toBeVisible();
			
			// Check that the project breadcrumb shows "Personal" for owned workflows
			const projectBreadcrumb = getByTestId('home-project');
			expect(projectBreadcrumb).toHaveTextContent('Personal');
		});

		it('should show normal project name when no workflow is provided', () => {
			const { getByTestId } = renderComponent({
				props: {
					currentFolder: null,
					workflow: null,
				},
			});

			expect(getByTestId('folder-breadcrumbs')).toBeVisible();
			expect(getByTestId('home-project')).toBeVisible();
			
			// Check that the project breadcrumb shows "Personal" when no workflow is provided
			const projectBreadcrumb = getByTestId('home-project');
			expect(projectBreadcrumb).toHaveTextContent('Personal');
		});
	});
});
