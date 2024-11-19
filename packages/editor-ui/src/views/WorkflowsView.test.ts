import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import WorkflowsView from '@/views/WorkflowsView.vue';
import { useUsersStore } from '@/stores/users.store';
import { createComponentRenderer } from '@/__tests__/render';
import { useProjectsStore } from '@/stores/projects.store';
import { createTestingPinia } from '@pinia/testing';
import { STORES, MORE_ONBOARDING_OPTIONS_EXPERIMENT, VIEWS } from '@/constants';
import { mockedStore } from '@/__tests__/utils';
import { usePostHog } from '@/stores/posthog.store';
import type { Cloud, IUser, IWorkflowDb } from '@/Interface';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import type { Project } from '@/types/projects.types';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useTagsStore } from '@/stores/tags.store';
import { createRouter, createWebHistory } from 'vue-router';
import * as usersApi from '@/api/users';

vi.mock('@/api/projects.api');
vi.mock('@/api/users');
vi.mock('@/api/sourceControl');
vi.mock('@/composables/useGlobalEntityCreation', () => ({
	useGlobalEntityCreation: () => ({
		menu: [],
	}),
}));

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			path: '/:projectId?',
			component: { template: '<div></div>' },
		},
		{
			path: '/workflow',
			name: VIEWS.NEW_WORKFLOW,
			component: { template: '<div></div>' },
		},
	],
});

const renderComponent = createComponentRenderer(WorkflowsView, {
	global: {
		plugins: [router],
	},
});

const initialState = {
	[STORES.SETTINGS]: { settings: { enterprise: { sharing: false } } },
};

describe('WorkflowsView', () => {
	beforeEach(async () => {
		await router.push('/');
		await router.isReady();
	});

	describe('should show empty state', () => {
		it('for non setup user', () => {
			const { getByText } = renderComponent({ pinia: createTestingPinia({ initialState }) });
			expect(getByText('👋 Welcome!')).toBeVisible();
		});

		it('for currentUser user', () => {
			const pinia = createTestingPinia({ initialState });
			const userStore = mockedStore(useUsersStore);
			userStore.currentUser = { firstName: 'John' } as IUser;
			const { getByText } = renderComponent({ pinia });

			expect(getByText('👋 Welcome John!')).toBeVisible();
		});

		describe('when onboardingExperiment -> False', () => {
			const pinia = createTestingPinia({ initialState });
			const posthog = mockedStore(usePostHog);
			const sourceControl = mockedStore(useSourceControlStore);
			posthog.getVariant.mockReturnValue(MORE_ONBOARDING_OPTIONS_EXPERIMENT.control);

			const projectsStore = mockedStore(useProjectsStore);

			it('for readOnlyEnvironment', () => {
				sourceControl.preferences.branchReadOnly = true;

				const { getByText } = renderComponent({ pinia });
				expect(getByText('No workflows here yet')).toBeInTheDocument();
				sourceControl.preferences.branchReadOnly = false;
			});

			it('for noPermission', () => {
				const { getByText } = renderComponent({ pinia });
				expect(getByText('There are currently no workflows to view')).toBeInTheDocument();
			});

			it('for user with create scope', () => {
				projectsStore.currentProject = { scopes: ['workflow:create'] } as Project;
				const { getByText } = renderComponent({ pinia });
				expect(getByText('Create your first workflow')).toBeInTheDocument();
			});
		});

		it('should allow workflow creation', async () => {
			const pinia = createTestingPinia({ initialState });
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.currentProject = { scopes: ['workflow:create'] } as Project;
			const { getByTestId } = renderComponent({ pinia });

			expect(getByTestId('new-workflow-card')).toBeInTheDocument();

			await userEvent.click(getByTestId('new-workflow-card'));

			expect(router.currentRoute.value.name).toBe(VIEWS.NEW_WORKFLOW);
		});

		describe('should show courses and templates link for sales users', () => {
			it('for cloudUser', () => {
				const pinia = createTestingPinia({ initialState });
				const userStore = mockedStore(useUsersStore);
				userStore.currentUserCloudInfo = { role: 'Sales' } as Cloud.UserAccount;
				const projectsStore = mockedStore(useProjectsStore);
				projectsStore.currentProject = { scopes: ['workflow:create'] } as Project;
				const { getAllByTestId } = renderComponent({ pinia });

				expect(getAllByTestId('browse-sales-templates-card').length).toBe(2);
			});

			it('for personalizationAnswers', () => {
				const pinia = createTestingPinia({ initialState });
				const userStore = mockedStore(useUsersStore);
				userStore.currentUser = { personalizationAnswers: { role: 'Sales' } } as IUser;
				const projectsStore = mockedStore(useProjectsStore);
				projectsStore.currentProject = { scopes: ['workflow:create'] } as Project;
				const { getAllByTestId } = renderComponent({ pinia });

				expect(getAllByTestId('browse-sales-templates-card').length).toBe(2);
			});
		});

		it('should show courses and templates link for onboardingExperiment', () => {
			const pinia = createTestingPinia({ initialState });

			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.currentProject = { scopes: ['workflow:create'] } as Project;

			const posthog = mockedStore(usePostHog);
			posthog.getVariant.mockReturnValue(MORE_ONBOARDING_OPTIONS_EXPERIMENT.variant);

			const { getAllByTestId } = renderComponent({ pinia });

			expect(getAllByTestId('browse-sales-templates-card').length).toBe(2);
		});
	});

	describe('filters', () => {
		it('should set tag filter based on query parameters', async () => {
			await router.replace({ query: { tags: 'test-tag' } });

			const pinia = createTestingPinia({ initialState });
			const tagStore = mockedStore(useTagsStore);
			tagStore.allTags = [{ id: 'test-tag', name: 'tag' }];
			const workflowsStore = mockedStore(useWorkflowsStore);
			workflowsStore.allWorkflows = [
				{ id: '1' },
				{ id: '2', tags: [{ id: 'test-tag', name: 'tag' }] },
			] as IWorkflowDb[];

			const { getAllByTestId } = renderComponent({ pinia });

			expect(tagStore.fetchAll).toHaveBeenCalled();
			await waitFor(() => expect(getAllByTestId('resources-list-item').length).toBe(1));
		});

		it('should set search filter based on query parameters', async () => {
			await router.replace({ query: { search: 'one' } });

			const pinia = createTestingPinia({ initialState });
			const workflowsStore = mockedStore(useWorkflowsStore);
			workflowsStore.allWorkflows = [
				{ id: '1', name: 'one' },
				{ id: '2', name: 'two' },
			] as IWorkflowDb[];

			const { getAllByTestId } = renderComponent({ pinia });

			await waitFor(() => expect(getAllByTestId('resources-list-item').length).toBe(1));
		});

		it('should set status filter based on query parameters', async () => {
			await router.replace({ query: { status: 'true' } });

			const pinia = createTestingPinia({ initialState });
			const workflowsStore = mockedStore(useWorkflowsStore);
			workflowsStore.allWorkflows = [
				{ id: '1', active: true },
				{ id: '2', active: false },
			] as IWorkflowDb[];

			const { getAllByTestId } = renderComponent({ pinia });

			await waitFor(() => expect(getAllByTestId('resources-list-item').length).toBe(1));
		});

		it('should reset filters', async () => {
			await router.replace({ query: { status: 'true' } });

			const pinia = createTestingPinia({ initialState });
			const workflowsStore = mockedStore(useWorkflowsStore);
			workflowsStore.allWorkflows = [
				{ id: '1', active: true },
				{ id: '2', active: false },
			] as IWorkflowDb[];

			const { getAllByTestId, getByTestId } = renderComponent({ pinia });

			await waitFor(() => expect(getAllByTestId('resources-list-item').length).toBe(1));
			await waitFor(() => expect(getByTestId('workflows-filter-reset')).toBeInTheDocument());

			await userEvent.click(getByTestId('workflows-filter-reset'));
			await waitFor(() => expect(getAllByTestId('resources-list-item').length).toBe(2));
		});

		it('should remove incomplete properties', async () => {
			await router.replace({ query: { tags: '' } });
			const pinia = createTestingPinia({ initialState });
			renderComponent({ pinia });
			await waitFor(() => expect(router.currentRoute.value.query).toStrictEqual({}));
		});

		it('should remove invalid tabs', async () => {
			await router.replace({ query: { tags: 'non-existing-tag' } });
			const tagStore = mockedStore(useTagsStore);
			tagStore.allTags = [{ id: 'test-tag', name: 'tag' }];
			const pinia = createTestingPinia({ initialState });
			renderComponent({ pinia });
			await waitFor(() => expect(router.currentRoute.value.query).toStrictEqual({}));
		});
	});

	it('should reinitialize on source control pullWorkfolder', async () => {
		vi.spyOn(usersApi, 'getUsers').mockResolvedValue([]);
		const pinia = createTestingPinia({ initialState, stubActions: false });
		const userStore = mockedStore(useUsersStore);
		const workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.fetchAllWorkflows.mockResolvedValue([]);
		workflowsStore.fetchActiveWorkflows.mockResolvedValue([]);

		const sourceControl = useSourceControlStore();

		renderComponent({ pinia });

		expect(userStore.fetchUsers).toHaveBeenCalledTimes(1);
		await sourceControl.pullWorkfolder(true);
		expect(userStore.fetchUsers).toHaveBeenCalledTimes(2);
	});
});
