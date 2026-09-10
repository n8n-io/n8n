import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shallowRef, defineComponent, h } from 'vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { render } from '@testing-library/vue';

import { useNewWorkflowDocument } from './useNewWorkflowDocument';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { useUIStore } from '@/app/stores/ui.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { Project } from '@/features/collaboration/projects/projects.types';
import { mockedStore } from '@/__tests__/utils';

const mockSetDocumentTitle = vi.hoisted(() => vi.fn());
vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: vi.fn(() => ({
		setDocumentTitle: mockSetDocumentTitle,
	})),
}));

const mockGetNewWorkflowData = vi.hoisted(() =>
	vi.fn().mockResolvedValue({ name: 'New Workflow', settings: {} }),
);
vi.mock('@/app/api/workflows', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/app/api/workflows')>()),
	getNewWorkflowData: mockGetNewWorkflowData,
}));

const mockFetchParentFolder = vi.hoisted(() => vi.fn().mockResolvedValue(null));
vi.mock('@/features/core/folders/composables/useParentFolder', () => ({
	useParentFolder: vi.fn(() => ({
		fetchParentFolder: mockFetchParentFolder,
	})),
}));

vi.mock('@/app/composables/useWorkflowId', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/app/composables/useWorkflowId')>()),
	useWorkflowId: vi.fn(() => shallowRef('wf-1')),
}));

const mockRoute = vi.hoisted(() => ({
	name: 'workflow' as string,
	params: {} as Record<string, unknown>,
	query: {} as Record<string, unknown>,
	meta: {} as Record<string, unknown>,
}));
vi.mock('vue-router', async (importOriginal) => {
	const actual = (await importOriginal()) as object;
	return {
		...actual,
		useRoute: vi.fn(() => mockRoute),
		useRouter: vi.fn(() => ({
			replace: vi.fn().mockResolvedValue(undefined),
			push: vi.fn().mockResolvedValue(undefined),
		})),
	};
});

const mockWorkflowDocumentStore = vi.hoisted(() => ({
	workflowId: 'wf-1',
	name: 'New Workflow',
	setName: vi.fn(),
	setHomeProject: vi.fn(),
	setScopes: vi.fn(),
	setParentFolder: vi.fn(),
	setHydrated: vi.fn(),
	onNameChange: vi.fn(),
}));
vi.mock('@/app/stores/workflowDocument.store', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/app/stores/workflowDocument.store')>()),
	useWorkflowDocumentStore: vi.fn(() => mockWorkflowDocumentStore),
	createWorkflowDocumentId: vi.fn((id: string) => id),
}));

function renderWithComposable(
	callback: (init: ReturnType<typeof useNewWorkflowDocument>) => void,
	workflowDocumentStoreRef = shallowRef<typeof mockWorkflowDocumentStore | null>(
		mockWorkflowDocumentStore,
	),
) {
	const TestComponent = defineComponent({
		setup() {
			callback(useNewWorkflowDocument());
			return () => h('div');
		},
	});

	return render(TestComponent, {
		global: {
			provide: {
				[WorkflowDocumentStoreKey as symbol]: workflowDocumentStoreRef,
			},
		},
	});
}

describe('useNewWorkflowDocument', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		vi.clearAllMocks();
		mockGetNewWorkflowData.mockResolvedValue({ name: 'New Workflow', settings: {} });
	});

	function initialize(options?: { name?: string; parentFolderId?: string }) {
		let initializeNewWorkflowDocument!: ReturnType<
			typeof useNewWorkflowDocument
		>['initializeNewWorkflowDocument'];
		renderWithComposable((composable) => {
			initializeNewWorkflowDocument = composable.initializeNewWorkflowDocument;
		});
		return initializeNewWorkflowDocument(options);
	}

	it('sets the name from getNewWorkflowData and passes the requested name through', async () => {
		mockGetNewWorkflowData.mockResolvedValue({ name: 'Template Name 2', settings: {} });

		await initialize({ name: 'Template Name' });

		expect(mockGetNewWorkflowData).toHaveBeenCalledWith(
			expect.anything(),
			'Template Name',
			undefined,
			undefined,
		);
		expect(mockWorkflowDocumentStore.setName).toHaveBeenCalledWith('Template Name 2');
		expect(mockSetDocumentTitle).toHaveBeenCalledWith('Template Name 2', 'IDLE');
	});

	it('populates scopes and home project from the personal project', async () => {
		const projectsStore = mockedStore(useProjectsStore);
		projectsStore.personalProject = {
			id: 'personal-project-id',
			scopes: ['workflow:update', 'workflow:publish'],
		} as Project;
		projectsStore.currentProject = null;

		await initialize();

		expect(mockWorkflowDocumentStore.setHomeProject).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'personal-project-id' }),
		);
		expect(mockWorkflowDocumentStore.setScopes).toHaveBeenCalledWith([
			'workflow:update',
			'workflow:publish',
		]);
		expect(mockWorkflowDocumentStore.setHydrated).toHaveBeenCalledWith(true);
	});

	it('prefers the project that refreshCurrentProject resolves', async () => {
		const projectsStore = mockedStore(useProjectsStore);
		projectsStore.personalProject = {
			id: 'personal-project-id',
			scopes: ['workflow:read'],
		} as Project;
		projectsStore.currentProject = null;
		projectsStore.refreshCurrentProject.mockImplementation(async () => {
			projectsStore.currentProject = {
				id: 'team-project-id',
				scopes: ['workflow:update'],
			} as Project;
		});

		await initialize();

		expect(mockWorkflowDocumentStore.setHomeProject).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'team-project-id' }),
		);
		expect(mockWorkflowDocumentStore.setScopes).toHaveBeenCalledWith(['workflow:update']);
	});

	it('falls back to the loaded projects when the project refresh fails', async () => {
		const projectsStore = mockedStore(useProjectsStore);
		projectsStore.personalProject = {
			id: 'personal-project-id',
			scopes: ['workflow:update'],
		} as Project;
		projectsStore.currentProject = null;
		projectsStore.refreshCurrentProject.mockRejectedValue(new Error('network error'));

		await initialize();

		expect(mockWorkflowDocumentStore.setScopes).toHaveBeenCalledWith(['workflow:update']);
	});

	it('does not populate a store that was replaced during the project refresh', async () => {
		const projectsStore = mockedStore(useProjectsStore);
		projectsStore.personalProject = {
			id: 'personal-project-id',
			scopes: ['workflow:update'],
		} as Project;
		const storeRef = shallowRef<typeof mockWorkflowDocumentStore | null>(mockWorkflowDocumentStore);
		projectsStore.refreshCurrentProject.mockImplementation(async () => {
			storeRef.value = null;
		});

		let initializeNewWorkflowDocument!: ReturnType<
			typeof useNewWorkflowDocument
		>['initializeNewWorkflowDocument'];
		renderWithComposable((composable) => {
			initializeNewWorkflowDocument = composable.initializeNewWorkflowDocument;
		}, storeRef);
		await initializeNewWorkflowDocument();

		expect(mockWorkflowDocumentStore.setHomeProject).not.toHaveBeenCalled();
		expect(mockWorkflowDocumentStore.setScopes).not.toHaveBeenCalled();
	});

	it('marks the node view initialized', async () => {
		const uiStore = mockedStore(useUIStore);
		uiStore.nodeViewInitialized = false;

		await initialize();

		expect(uiStore.nodeViewInitialized).toBe(true);
	});
});
