import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import ProjectResourceListHeader from '@/components/Projects/ProjectResourceListHeader.vue';
import { useProjectsStore } from '@/stores/projects.store';
import type { Project } from '@/types/projects.types';
import { ProjectTypes } from '@/types/projects.types';

const renderComponent = createComponentRenderer(ProjectResourceListHeader);

let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;

describe('ProjectResourceListHeader', () => {
	beforeEach(() => {
		createTestingPinia();
		projectsStore = mockedStore(useProjectsStore);
	});

	it('should render the correct icon', async () => {
		const { container, rerender } = renderComponent();

		expect(container.querySelector('.fa-home')).toBeVisible();

		projectsStore.currentProject = { type: ProjectTypes.Personal } as Project;
		await rerender({});
		expect(container.querySelector('.fa-user')).toBeVisible();

		const projectName = 'My Project';
		projectsStore.currentProject = { name: projectName } as Project;
		await rerender({});
		expect(container.querySelector('.fa-layer-group')).toBeVisible();
	});

	it('should render the correct title', async () => {
		const { getByText, rerender } = renderComponent();

		expect(getByText('Home')).toBeVisible();

		projectsStore.currentProject = { type: ProjectTypes.Personal } as Project;
		await rerender({});
		expect(getByText('Personal')).toBeVisible();

		const projectName = 'My Project';
		projectsStore.currentProject = { name: projectName } as Project;
		await rerender({});
		expect(getByText(projectName)).toBeVisible();
	});
});
