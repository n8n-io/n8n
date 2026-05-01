import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import ReadyToRunButton from './ReadyToRunButton.vue';
import { useReadyToRunStore } from '../stores/readyToRun.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useFoldersStore } from '@/features/core/folders/folders.store';
import type { Project } from '@/features/collaboration/projects/projects.types';

vi.mock('@/composables/useToast', () => ({
	useToast: () => ({
		showError: vi.fn(),
	}),
}));

vi.mock('@/features/collaboration/projects/composables/useProjectPages', () => ({
	useProjectPages: () => ({
		isOverviewSubPage: false,
	}),
}));

vi.mock('vue-router', async () => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
	return {
		...actual,
		useRoute: () => ({
			params: {
				projectId: 'test-project-123',
				folderId: 'test-folder-456',
			},
		}),
		useRouter: () => ({
			push: vi.fn(),
		}),
	};
});

const renderComponent = createComponentRenderer(ReadyToRunButton);

describe('ReadyToRunButton.vue', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		const pinia = createPinia();
		setActivePinia(pinia);
	});

	describe('button visibility', () => {
		it('should show button when all conditions are met', () => {
			const pinia = createPinia();
			setActivePinia(pinia);

			const readyToRunStore = useReadyToRunStore();
			const projectsStore = useProjectsStore();
			const sourceControlStore = useSourceControlStore();
			const foldersStore = useFoldersStore();

			vi.spyOn(readyToRunStore, 'getButtonVisibility').mockReturnValue(true);
			vi.spyOn(foldersStore, 'totalWorkflowCount', 'get').mockReturnValue(5);
			vi.spyOn(projectsStore, 'currentProject', 'get').mockReturnValue({
				scopes: ['workflow:create'],
			} as Partial<Project> as Project);
			vi.spyOn(sourceControlStore, 'preferences', 'get').mockReturnValue({
				branchReadOnly: false,
			} as never);

			const { getByTestId } = renderComponent({
				pinia,
			});

			expect(getByTestId('ready-to-run-button')).toBeInTheDocument();
		});

		it('should hide button when no workflows exist', () => {
			const pinia = createPinia();
			setActivePinia(pinia);

			const readyToRunStore = useReadyToRunStore();
			const foldersStore = useFoldersStore();

			vi.spyOn(readyToRunStore, 'getButtonVisibility').mockReturnValue(false);
			vi.spyOn(foldersStore, 'totalWorkflowCount', 'get').mockReturnValue(0);

			const { queryByTestId } = renderComponent({
				pinia,
			});

			expect(queryByTestId('ready-to-run-button')).not.toBeInTheDocument();
		});

		it('should hide button when branch is read-only', () => {
			const pinia = createPinia();
			setActivePinia(pinia);

			const readyToRunStore = useReadyToRunStore();
			const sourceControlStore = useSourceControlStore();
			const foldersStore = useFoldersStore();

			vi.spyOn(readyToRunStore, 'getButtonVisibility').mockReturnValue(false);
			vi.spyOn(foldersStore, 'totalWorkflowCount', 'get').mockReturnValue(5);
			vi.spyOn(sourceControlStore, 'preferences', 'get').mockReturnValue({
				branchReadOnly: true,
			} as never);

			const { queryByTestId } = renderComponent({
				pinia,
			});

			expect(queryByTestId('ready-to-run-button')).not.toBeInTheDocument();
		});

		it('should hide button when user cannot create workflows', () => {
			const pinia = createPinia();
			setActivePinia(pinia);

			const readyToRunStore = useReadyToRunStore();
			const projectsStore = useProjectsStore();
			const foldersStore = useFoldersStore();

			vi.spyOn(readyToRunStore, 'getButtonVisibility').mockReturnValue(false);
			vi.spyOn(foldersStore, 'totalWorkflowCount', 'get').mockReturnValue(5);
			vi.spyOn(projectsStore, 'currentProject', 'get').mockReturnValue({
				scopes: [],
			} as Partial<Project> as Project);

			const { queryByTestId } = renderComponent({
				pinia,
			});

			expect(queryByTestId('ready-to-run-button')).not.toBeInTheDocument();
		});

		it('should hide button when active callouts are present', () => {
			const pinia = createPinia();
			setActivePinia(pinia);

			const readyToRunStore = useReadyToRunStore();
			const foldersStore = useFoldersStore();

			vi.spyOn(readyToRunStore, 'getButtonVisibility').mockReturnValue(true);
			vi.spyOn(foldersStore, 'totalWorkflowCount', 'get').mockReturnValue(5);

			const { queryByTestId } = renderComponent({
				pinia,
				props: {
					hasActiveCallouts: true,
				},
			});

			expect(queryByTestId('ready-to-run-button')).not.toBeInTheDocument();
		});
	});

	describe('button state', () => {
		it('should disable button when claiming credits', () => {
			const pinia = createPinia();
			setActivePinia(pinia);

			const readyToRunStore = useReadyToRunStore();
			const foldersStore = useFoldersStore();

			vi.spyOn(readyToRunStore, 'getButtonVisibility').mockReturnValue(true);
			vi.spyOn(readyToRunStore, 'claimingCredits', 'get').mockReturnValue(true);
			vi.spyOn(foldersStore, 'totalWorkflowCount', 'get').mockReturnValue(5);

			const { getByTestId } = renderComponent({
				pinia,
			});

			const button = getByTestId('ready-to-run-button');
			expect(button).toBeDisabled();
		});

		it('should disable button when branch is read-only', () => {
			const pinia = createPinia();
			setActivePinia(pinia);

			const readyToRunStore = useReadyToRunStore();
			const sourceControlStore = useSourceControlStore();
			const foldersStore = useFoldersStore();

			vi.spyOn(readyToRunStore, 'getButtonVisibility').mockReturnValue(true);
			vi.spyOn(readyToRunStore, 'claimingCredits', 'get').mockReturnValue(false);
			vi.spyOn(foldersStore, 'totalWorkflowCount', 'get').mockReturnValue(5);
			vi.spyOn(sourceControlStore, 'preferences', 'get').mockReturnValue({
				branchReadOnly: true,
			} as never);

			const { getByTestId } = renderComponent({
				pinia,
			});

			const button = getByTestId('ready-to-run-button');
			expect(button).toBeDisabled();
		});
	});

	describe('button click', () => {
		it('should call claimCreditsAndOpenWorkflow on button click', async () => {
			const pinia = createPinia();
			setActivePinia(pinia);

			const readyToRunStore = useReadyToRunStore();
			const foldersStore = useFoldersStore();

			vi.spyOn(readyToRunStore, 'getButtonVisibility').mockReturnValue(true);
			vi.spyOn(foldersStore, 'totalWorkflowCount', 'get').mockReturnValue(5);
			const claimCreditsAndOpenWorkflow = vi
				.spyOn(readyToRunStore, 'claimCreditsAndOpenWorkflow')
				.mockResolvedValue(undefined);

			const { getByTestId } = renderComponent({
				pinia,
			});

			const button = getByTestId('ready-to-run-button');
			button.click();

			expect(claimCreditsAndOpenWorkflow).toHaveBeenCalled();
		});
	});
});
