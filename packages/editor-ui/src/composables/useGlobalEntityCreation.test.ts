import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useProjectsStore } from '@/stores/projects.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { mockedStore } from '@/__tests__/utils';
import type router from 'vue-router';
import { flushPromises } from '@vue/test-utils';
import { useToast } from '@/composables/useToast';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';

import { VIEWS } from '@/constants';
import type { Project, ProjectListItem } from '@/types/projects.types';

import { useGlobalEntityCreation } from './useGlobalEntityCreation';

vi.mock('@/composables/usePageRedirectionHelper', () => {
	const goToUpgrade = vi.fn();
	return {
		usePageRedirectionHelper: () => ({
			goToUpgrade,
		}),
	};
});

vi.mock('@/composables/useToast', () => {
	const showMessage = vi.fn();
	const showError = vi.fn();
	return {
		useToast: () => {
			return {
				showMessage,
				showError,
			};
		},
	};
});

const routerPushMock = vi.fn();
vi.mock('vue-router', async (importOriginal) => {
	const { RouterLink, useRoute } = await importOriginal<typeof router>();
	return {
		RouterLink,
		useRoute,
		useRouter: () => ({
			push: routerPushMock,
		}),
	};
});

beforeEach(() => {
	setActivePinia(createTestingPinia());
	routerPushMock.mockReset();
});

describe('useGlobalEntityCreation', () => {
	it('should not contain projects for community', () => {
		const projectsStore = mockedStore(useProjectsStore);

		const personalProjectId = 'personal-project';
		projectsStore.canCreateProjects = false;
		projectsStore.personalProject = { id: personalProjectId } as Project;
		const { menu } = useGlobalEntityCreation();

		expect(menu.value[0]).toStrictEqual(
			expect.objectContaining({
				route: { name: VIEWS.NEW_WORKFLOW, query: { projectId: personalProjectId } },
			}),
		);

		expect(menu.value[1]).toStrictEqual(
			expect.objectContaining({
				route: {
					name: VIEWS.CREDENTIALS,
					params: { projectId: personalProjectId, credentialId: 'create' },
				},
			}),
		);
	});

	describe('single project', () => {
		const currentProjectId = 'current-project';

		it('should use currentProject', () => {
			const projectsStore = mockedStore(useProjectsStore);

			projectsStore.canCreateProjects = true;
			projectsStore.currentProject = { id: currentProjectId } as Project;

			const { menu } = useGlobalEntityCreation(false);

			expect(menu.value[0]).toStrictEqual(
				expect.objectContaining({
					route: { name: VIEWS.NEW_WORKFLOW, query: { projectId: currentProjectId } },
				}),
			);

			expect(menu.value[1]).toStrictEqual(
				expect.objectContaining({
					route: {
						name: VIEWS.PROJECTS_CREDENTIALS,
						params: { projectId: currentProjectId, credentialId: 'create' },
					},
				}),
			);
		});

		it('should be disabled in readOnly', () => {
			const projectsStore = mockedStore(useProjectsStore);

			projectsStore.canCreateProjects = true;
			projectsStore.currentProject = { id: currentProjectId } as Project;

			const sourceControl = mockedStore(useSourceControlStore);
			sourceControl.preferences.branchReadOnly = true;

			const { menu } = useGlobalEntityCreation(false);

			expect(menu.value[0]).toStrictEqual(
				expect.objectContaining({
					disabled: true,
				}),
			);

			expect(menu.value[1]).toStrictEqual(
				expect.objectContaining({
					disabled: true,
				}),
			);
		});

		it('should be disabled based in scopes', () => {
			const projectsStore = mockedStore(useProjectsStore);

			projectsStore.canCreateProjects = true;
			projectsStore.currentProject = { id: currentProjectId, scopes: [] } as unknown as Project;

			const { menu } = useGlobalEntityCreation(false);

			expect(menu.value[0]).toStrictEqual(
				expect.objectContaining({
					disabled: true,
				}),
			);

			expect(menu.value[1]).toStrictEqual(
				expect.objectContaining({
					disabled: true,
				}),
			);
		});
	});

	describe('global', () => {
		it('should show personal + all team projects', () => {
			const projectsStore = mockedStore(useProjectsStore);

			const personalProjectId = 'personal-project';
			projectsStore.canCreateProjects = true;
			projectsStore.personalProject = { id: personalProjectId } as Project;
			projectsStore.myProjects = [
				{ id: '1', name: '1', type: 'team' },
				{ id: '2', name: '2', type: 'public' },
				{ id: '3', name: '3', type: 'team' },
			] as ProjectListItem[];

			const { menu } = useGlobalEntityCreation(true);

			expect(menu.value[0].submenu?.length).toBe(4);
			expect(menu.value[1].submenu?.length).toBe(4);
		});
	});

	describe('handleSelect()', () => {
		it('should only handle create-project', () => {
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.canCreateProjects = true;
			const { handleSelect } = useGlobalEntityCreation(true);
			handleSelect('dummy');
			expect(projectsStore.createProject).not.toHaveBeenCalled();
		});

		it('creates a new project', async () => {
			const toast = useToast();
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.canCreateProjects = true;
			projectsStore.createProject.mockResolvedValueOnce({ name: 'test', id: '1' } as Project);

			const { handleSelect } = useGlobalEntityCreation(true);

			handleSelect('create-project');
			await flushPromises();

			expect(projectsStore.createProject).toHaveBeenCalled();
			expect(routerPushMock).toHaveBeenCalled();
			expect(toast.showMessage).toHaveBeenCalled();
		});

		it('handles create project error', async () => {
			const toast = useToast();
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.canCreateProjects = true;
			projectsStore.createProject.mockRejectedValueOnce(new Error('error'));

			const { handleSelect } = useGlobalEntityCreation(true);

			handleSelect('create-project');
			await flushPromises();
			expect(toast.showError).toHaveBeenCalled();
		});

		it('redirects when project limit has been reached', () => {
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.canCreateProjects = false;
			const redirect = usePageRedirectionHelper();

			const { handleSelect } = useGlobalEntityCreation(true);

			handleSelect('create-project');
			expect(redirect.goToUpgrade).toHaveBeenCalled();
		});
	});
});
