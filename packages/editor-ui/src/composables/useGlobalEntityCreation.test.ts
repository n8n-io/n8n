import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useProjectsStore } from '@/stores/projects.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { mockedStore } from '@/__tests__/utils';
import { VIEWS } from '@/constants';
import type { Project, ProjectListItem } from '@/types/projects.types';

import { useGlobalEntityCreation } from './useGlobalEntityCreation';

beforeEach(() => {
	setActivePinia(createTestingPinia());
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
});
