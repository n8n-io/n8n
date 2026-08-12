import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, waitAllPromises } from '@/__tests__/utils';
import { fireEvent } from '@testing-library/vue';
import { useProjectPages } from '@/features/collaboration/projects/composables/useProjectPages';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import FilesView from '@/features/core/files/FilesView.vue';
import { PROJECT_FILES, PROJECT_FILES_PREVIEW } from '@/features/core/files/constants';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';
import { createRouter, createWebHistory } from 'vue-router';
import type { FileResource } from '@/features/core/files/files.types';
import { useFilesStore } from '@/features/core/files/files.store';
import type { Mock } from 'vitest';
import { type Project } from '@/features/collaboration/projects/projects.types';

vi.mock('@/features/collaboration/projects/composables/useProjectPages', () => ({
	useProjectPages: vi.fn().mockReturnValue({
		isOverviewSubPage: false,
		isSharedSubPage: false,
	}),
}));

vi.mock('@/app/api/workflow-dependencies', () => ({
	getResourceDependencyCounts: vi.fn().mockResolvedValue({}),
	getResourceDependencies: vi.fn().mockResolvedValue({}),
}));

vi.mock('@n8n/i18n', async (importOriginal) => {
	const actual = await importOriginal();
	const actualObj = typeof actual === 'object' && actual !== null ? actual : {};
	return {
		...actualObj,
		useI18n: vi.fn(() => ({
			baseText: vi.fn((key: string) => {
				if (key === 'files.tab.label') return 'Files';
				if (key === 'projects.menu.personal') return 'Personal';
				if (key === 'files.empty.heading') return 'Store files for your workflows';
				if (key === 'files.empty.description')
					return 'Store files in this project and read or write them from any of its workflows';
				if (key === 'files.add.button.label') return 'Add file';
				if (key === 'files.fetch.error') return 'Error loading files';
				if (key === 'generic.rename') return 'Rename';
				if (key === 'generic.delete') return 'Delete';
				if (key === 'generic.cancel') return 'Cancel';
				return key;
			}),
		})),
		i18n: {
			baseText: vi.fn((key: string) => key),
		},
	};
});

const mockToast = {
	showError: vi.fn(),
	showMessage: vi.fn(),
};
vi.mock('@n8n/composables/useToast', () => ({
	useToast: vi.fn(() => mockToast),
}));

const mockDocumentTitle = {
	set: vi.fn(),
};
vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: vi.fn(() => mockDocumentTitle),
}));

const mockDebounce = {
	callDebounced: vi.fn(async (fn: () => Promise<void> | void) => await fn()),
	debounce: vi.fn(),
};
vi.mock('@n8n/composables/useDebounce', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/composables/useDebounce')>()),
	useDebounce: vi.fn(() => mockDebounce),
}));

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			path: '/projects/:projectId/files/:new(new)?',
			name: PROJECT_FILES,
			component: { template: '<div></div>' },
		},
		{
			path: '/projects/:projectId/files/:id',
			name: PROJECT_FILES_PREVIEW,
			component: { template: '<div></div>' },
		},
		{
			path: '/projects/:projectId',
			component: { template: '<div></div>' },
		},
	],
});

let pinia: ReturnType<typeof createTestingPinia>;
let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;
let sourceControlStore: ReturnType<typeof mockedStore<typeof useSourceControlStore>>;
let filesStore: ReturnType<typeof mockedStore<typeof useFilesStore>>;

const renderComponent = createComponentRenderer(FilesView, {
	global: {
		plugins: [router],
		stubs: {
			FilePreviewPanel: {
				template: '<div data-test-id="file-preview-panel" />',
			},
			FileActions: {
				template: '<div data-test-id="file-card-actions" />',
			},
			UploadConflictModal: {
				template: '<div />',
			},
		},
	},
});

const initialState = {
	[STORES.SETTINGS]: {
		settings: {
			enterprise: { sharing: false, projects: { team: { limit: 5 } } },
		},
	},
};

const TEST_FILE: FileResource = {
	id: 'file-1',
	name: 'pricing.csv',
	mimeType: 'text/csv',
	sizeBytes: 18432,
	projectId: '1',
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	resourceType: 'file',
};

describe('FilesView', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		await router.push('/projects/test-project/files');
		await router.isReady();

		pinia = createTestingPinia({ initialState });
		projectsStore = mockedStore(useProjectsStore);
		sourceControlStore = mockedStore(useSourceControlStore);
		filesStore = mockedStore(useFilesStore);

		filesStore.files = [TEST_FILE];
		filesStore.totalCount = 1;
		filesStore.uploadQueue = [];
		filesStore.conflictedUploads = [];
		filesStore.uploadsCompletedCount = 0;
		filesStore.quotaStatus = 'ok';
		filesStore.usedBytes = 0;
		filesStore.maxBytes = 0;
		filesStore.fetchFiles = vi.fn().mockResolvedValue(undefined);
		filesStore.fetchLimits = vi.fn().mockResolvedValue({
			totalBytes: 0,
			maxBytes: 0,
			quotaStatus: 'ok',
		});
		filesStore.fetchFileById = vi.fn().mockResolvedValue(TEST_FILE);
		// @ts-expect-error partial permissions object
		filesStore.projectPermissions = {
			file: { create: true, update: true, delete: true },
		};

		projectsStore.currentProjectId = '';
		sourceControlStore.isProjectShared = vi.fn(() => false);
		sourceControlStore.preferences = {
			branchReadOnly: false,
		} as typeof sourceControlStore.preferences;
	});

	describe('initialization', () => {
		it('should load files and limits from the store', async () => {
			const { getByTestId } = renderComponent({ pinia });
			await waitAllPromises();

			expect(filesStore.fetchFiles).toHaveBeenCalledWith(
				'',
				1,
				25,
				{ name: undefined, projectId: undefined },
				'updatedAt:desc',
			);
			expect(filesStore.fetchLimits).toHaveBeenCalled();
			expect(getByTestId('resources-list-wrapper')).toBeInTheDocument();
		});

		it('should filter by project when not on the overview sub page', async () => {
			(useProjectPages as Mock).mockReturnValue({
				isOverviewSubPage: false,
			});
			projectsStore.currentProjectId = 'test-project';
			projectsStore.currentProject = {
				id: 'test-project',
			} as Project;

			renderComponent({ pinia });
			await waitAllPromises();

			expect(filesStore.fetchFiles).toHaveBeenCalledWith(
				'test-project',
				1,
				25,
				{ name: undefined, projectId: undefined },
				'updatedAt:desc',
			);
		});

		it('should set document title on mount', async () => {
			renderComponent({ pinia });
			await waitAllPromises();

			expect(mockDocumentTitle.set).toHaveBeenCalledWith('Files');
		});

		it('should handle initialization errors', async () => {
			const error = new Error('Store Error');
			filesStore.fetchFiles = vi.fn().mockRejectedValue(error);

			renderComponent({ pinia });
			await waitAllPromises();

			expect(mockToast.showError).toHaveBeenCalledWith(error, 'Error loading files');
		});
	});

	describe('empty state', () => {
		beforeEach(() => {
			filesStore.files = [];
			filesStore.totalCount = 0;
		});

		it('should show the empty state when there are no files', async () => {
			const { getByTestId } = renderComponent({ pinia });
			await waitAllPromises();

			const emptyBox = getByTestId('empty-resources-list');
			expect(emptyBox).toBeInTheDocument();
			expect(emptyBox).toHaveTextContent('Store files for your workflows');
			expect(emptyBox).toHaveTextContent('Add file');
		});

		it('should enable the add button when the user can upload', async () => {
			const { getByTestId } = renderComponent({ pinia });
			await waitAllPromises();

			const button = getByTestId('empty-resources-list').querySelector('button');
			expect(button).not.toBeDisabled();
		});

		it('should disable the add button on a read-only environment', async () => {
			sourceControlStore.preferences = {
				branchReadOnly: true,
			} as typeof sourceControlStore.preferences;

			const { getByTestId } = renderComponent({ pinia });
			await waitAllPromises();

			expect(getByTestId('empty-resources-list').querySelector('button')).toBeDisabled();
		});

		it('should disable the add button when the storage quota is exceeded', async () => {
			filesStore.quotaStatus = 'error';

			const { getByTestId } = renderComponent({ pinia });
			await waitAllPromises();

			expect(getByTestId('empty-resources-list').querySelector('button')).toBeDisabled();
		});
	});

	describe('file cards', () => {
		it('should render file cards', async () => {
			const { getAllByTestId } = renderComponent({ pinia });
			await waitAllPromises();

			expect(getAllByTestId('file-card').length).toBeGreaterThan(0);
		});
	});

	describe('search', () => {
		it('should fetch with the search term when search is updated', async () => {
			const { getByTestId } = renderComponent({ pinia });
			await waitAllPromises();

			filesStore.fetchFiles = vi.fn().mockResolvedValue(undefined);

			const searchInput = getByTestId('resources-list-search');
			await fireEvent.input(searchInput, { target: { value: 'pricing' } });
			await waitAllPromises();

			expect(filesStore.fetchFiles).toHaveBeenCalledWith(
				'',
				1,
				25,
				{ name: 'pricing', projectId: undefined },
				'updatedAt:desc',
			);
		});
	});

	describe('upload', () => {
		it('should render the hidden upload input', async () => {
			const { getByTestId } = renderComponent({ pinia });
			await waitAllPromises();

			expect(getByTestId('files-upload-input')).toBeInTheDocument();
		});

		it('should open the file picker when navigated to with the new route param', async () => {
			const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click');
			await router.push('/projects/test-project/files/new');

			renderComponent({ pinia });
			await waitAllPromises();

			expect(clickSpy).toHaveBeenCalled();
			clickSpy.mockRestore();
		});

		it('should enqueue uploads when files are picked', async () => {
			projectsStore.currentProject = { id: 'test-project' } as Project;

			const { getByTestId } = renderComponent({ pinia });
			await waitAllPromises();

			const input = getByTestId('files-upload-input');
			const file = new File(['content'], 'upload.csv', { type: 'text/csv' });
			await fireEvent.change(input, { target: { files: [file] } });

			expect(filesStore.enqueueUploads).toHaveBeenCalledWith([file], 'test-project', 'button');
		});

		it('should show the drop overlay while dragging files over the view', async () => {
			const { container, queryByTestId } = renderComponent({ pinia });
			await waitAllPromises();

			expect(queryByTestId('files-drop-overlay')).not.toBeInTheDocument();

			const root = container.firstElementChild;
			if (!root) throw new Error('missing view root');
			await fireEvent.dragEnter(root, { dataTransfer: { types: ['Files'] } });

			expect(queryByTestId('files-drop-overlay')).toBeInTheDocument();

			await fireEvent.dragLeave(root, { dataTransfer: { types: ['Files'] } });
			expect(queryByTestId('files-drop-overlay')).not.toBeInTheDocument();
		});
	});

	describe('preview', () => {
		it('should open the preview panel for the id route param', async () => {
			await router.push('/projects/test-project/files/file-1');

			const { getByTestId } = renderComponent({ pinia });
			await waitAllPromises();

			expect(filesStore.fetchFileById).toHaveBeenCalledWith('test-project', 'file-1');
			expect(getByTestId('file-preview-panel')).toBeInTheDocument();
		});

		it('should not show the preview panel without the id route param', async () => {
			const { queryByTestId } = renderComponent({ pinia });
			await waitAllPromises();

			expect(queryByTestId('file-preview-panel')).not.toBeInTheDocument();
		});
	});

	describe('bulk delete', () => {
		it('should show the bulk delete button once files are selected', async () => {
			const { getByTestId, queryByTestId } = renderComponent({ pinia });
			await waitAllPromises();

			expect(queryByTestId('files-bulk-delete')).not.toBeInTheDocument();

			const checkbox = getByTestId('file-card-checkbox');
			await fireEvent.click(checkbox.querySelector('input') ?? checkbox);

			expect(queryByTestId('files-bulk-delete')).toBeInTheDocument();
		});
	});
});
