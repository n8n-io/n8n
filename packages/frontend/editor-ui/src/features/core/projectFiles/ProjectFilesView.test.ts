import type { ProjectFileResponse } from '@n8n/api-types';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, screen, waitFor } from '@testing-library/vue';
import { createRouter, createWebHistory } from 'vue-router';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import ProjectFilesView from '@/features/core/projectFiles/ProjectFilesView.vue';
import { useProjectFilesStore } from '@/features/core/projectFiles/projectFiles.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import type { Project } from '@/features/collaboration/projects/projects.types';

vi.mock('@/features/collaboration/projects/composables/useProjectPages', () => ({
	useProjectPages: vi.fn().mockReturnValue({ isOverviewSubPage: false, isSharedSubPage: false }),
}));

const mockToast = { showError: vi.fn(), showMessage: vi.fn() };
vi.mock('@n8n/composables/useToast', () => ({ useToast: vi.fn(() => mockToast) }));

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: vi.fn(() => ({ set: vi.fn() })),
}));

vi.mock('@n8n/composables/useDebounce', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/composables/useDebounce')>()),
	useDebounce: vi.fn(() => ({ callDebounced: vi.fn(async (fn) => await fn()), debounce: vi.fn() })),
}));

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{ path: '/projects/:projectId/files', component: { template: '<div></div>' } },
		{ path: '/projects/:projectId', component: { template: '<div></div>' } },
	],
});

const renderComponent = createComponentRenderer(ProjectFilesView, {
	global: { plugins: [router] },
});

const TEST_FILE: ProjectFileResponse = {
	id: 'file-1',
	name: 'invoice-template.pdf',
	mimeType: 'application/pdf',
	fileSizeBytes: 1_258_291,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	createdBy: { id: 'u1', email: 'alex@example.com', firstName: 'Alex', lastName: 'Kim' },
	updatedBy: { id: 'u1', email: 'alex@example.com', firstName: 'Alex', lastName: 'Kim' },
};

let pinia: ReturnType<typeof createTestingPinia>;
let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;
let projectFilesStore: ReturnType<typeof mockedStore<typeof useProjectFilesStore>>;
let sourceControlStore: ReturnType<typeof mockedStore<typeof useSourceControlStore>>;

/** @param scopes project scopes the current user holds */
const setup = (scopes: string[], overrides: Partial<typeof projectFilesStore> = {}) => {
	pinia = createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: {
				settings: { enterprise: { sharing: false, projects: { team: { limit: 5 } } } },
			},
		},
	});

	projectsStore = mockedStore(useProjectsStore);
	projectFilesStore = mockedStore(useProjectFilesStore);
	sourceControlStore = mockedStore(useSourceControlStore);

	projectsStore.currentProjectId = 'project-1';
	projectsStore.currentProject = { id: 'project-1', name: 'Acme', scopes } as unknown as Project;
	sourceControlStore.preferences = { branchReadOnly: false } as never;

	projectFilesStore.files = [TEST_FILE];
	projectFilesStore.totalCount = 1;
	projectFilesStore.usage = { usedBytes: 1_258_291, quotaBytes: 10_000_000, scope: 'project' };
	projectFilesStore.isNearQuota = false;
	projectFilesStore.isAtQuota = false;
	projectFilesStore.fetchFiles.mockResolvedValue({
		count: 1,
		data: [TEST_FILE],
		usage: projectFilesStore.usage,
	});

	Object.assign(projectFilesStore, overrides);

	return renderComponent({ pinia });
};

describe('ProjectFilesView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('loads the project files on mount', async () => {
		setup(['projectFile:listProject', 'projectFile:read']);

		await waitFor(() =>
			expect(projectFilesStore.fetchFiles).toHaveBeenCalledWith('project-1', {
				take: 10,
				skip: 0,
				search: undefined,
			}),
		);
	});

	it('renders a row per file with a formatted size', async () => {
		const { getByText } = setup(['projectFile:listProject']);

		await waitFor(() => expect(getByText('invoice-template.pdf')).toBeVisible());
		expect(getByText('1 MB')).toBeVisible();
		expect(getByText('Alex Kim')).toBeVisible();
	});

	it('shows the storage usage line', async () => {
		const { getByTestId } = setup(['projectFile:listProject']);

		await waitFor(() => expect(getByTestId('project-files-usage')).toBeVisible());
	});

	it('enables uploading when the user has the create scope', async () => {
		const { getByTestId } = setup(['projectFile:listProject', 'projectFile:create']);

		await waitFor(() => expect(getByTestId('project-files-upload-button')).toBeEnabled());
	});

	it('disables uploading without the create scope', async () => {
		const { getByTestId } = setup(['projectFile:listProject']);

		await waitFor(() => expect(getByTestId('project-files-upload-button')).toBeDisabled());
	});

	it('disables uploading on a read-only instance even with the create scope', async () => {
		const { getByTestId } = setup(['projectFile:listProject', 'projectFile:create']);
		sourceControlStore.preferences = { branchReadOnly: true } as never;

		await waitFor(() => expect(getByTestId('project-files-upload-button')).toBeDisabled());
	});

	it('shows the empty state when the project has no files', async () => {
		const { getByTestId, queryByTestId } = setup(['projectFile:listProject'], {
			files: [],
			totalCount: 0,
		} as never);

		await waitFor(() => expect(getByTestId('project-files-empty-state')).toBeVisible());
		expect(queryByTestId('project-files-table')).toBeNull();
	});

	it('warns when the project is near its quota', async () => {
		const { getByTestId } = setup(['projectFile:listProject'], { isNearQuota: true } as never);

		await waitFor(() =>
			expect(getByTestId('project-files-quota-callout')).toHaveTextContent(/close to its/i),
		);
	});

	it('says the limit is reached, not merely close, when the quota is full', async () => {
		const { getByTestId } = setup(['projectFile:listProject'], {
			isNearQuota: false,
			isAtQuota: true,
		} as never);

		await waitFor(() =>
			expect(getByTestId('project-files-quota-callout')).toHaveTextContent(/reached its/i),
		);
	});

	it('attributes a personal-project limit to the shared instance-wide budget', async () => {
		const { getByTestId } = setup(['projectFile:listProject'], {
			usage: { usedBytes: 100, quotaBytes: 100, scope: 'personal' },
			isAtQuota: true,
		} as never);

		await waitFor(() =>
			expect(getByTestId('project-files-quota-callout')).toHaveTextContent(/Personal projects/i),
		);
	});

	describe('preview', () => {
		it('offers preview for a previewable type', async () => {
			const { getByTestId } = setup(['projectFile:listProject'], {
				files: [{ ...TEST_FILE, id: 'png-1', name: 'logo.png', mimeType: 'image/png' }],
			} as never);

			await waitFor(() => expect(getByTestId('project-file-preview-png-1')).toBeVisible());
		});

		it('does not offer preview for a PDF', async () => {
			// Excluded by ViewableMimeTypes, so the row must show no preview affordance.
			const { queryByTestId, getByText } = setup(['projectFile:listProject']);

			await waitFor(() => expect(getByText('invoice-template.pdf')).toBeVisible());
			expect(queryByTestId('project-file-preview-file-1')).toBeNull();
		});

		it('does not offer preview for an HTML file', async () => {
			const { queryByTestId, getByText } = setup(['projectFile:listProject'], {
				files: [{ ...TEST_FILE, id: 'html-1', name: 'page.html', mimeType: 'text/html' }],
			} as never);

			await waitFor(() => expect(getByText('page.html')).toBeVisible());
			expect(queryByTestId('project-file-preview-html-1')).toBeNull();
		});

		it('opens the dialog when preview is clicked', async () => {
			const { getByTestId } = setup(['projectFile:listProject'], {
				files: [{ ...TEST_FILE, id: 'png-1', name: 'logo.png', mimeType: 'image/png' }],
			} as never);

			const button = await waitFor(() => getByTestId('project-file-preview-png-1'));
			await fireEvent.click(button);

			// N8nDialog teleports to body, so query the whole document rather than the
			// render container. Scoped to the heading because the file name also
			// appears in the table row behind the dialog.
			await waitFor(() => expect(screen.getByTestId('project-file-preview')).toBeVisible());
			expect(screen.getByRole('heading', { name: 'logo.png' })).toBeVisible();
		});
	});

	it('surfaces a load failure as a toast', async () => {
		const error = new Error('nope');

		setup(['projectFile:listProject'], {
			fetchFiles: vi.fn().mockRejectedValue(error),
		} as never);

		await waitFor(() =>
			expect(mockToast.showError).toHaveBeenCalledWith(error, expect.any(String)),
		);
	});
});
