import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import { getDropdownItems } from '@/__tests__/utils';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { defineComponent, ref } from 'vue';
import type { SlotProjectSelection } from '@n8n/frontend-module-sdk';

import { createProjectListItem } from '../__tests__/utils';
import { useProjectsStore } from '../projects.store';
import ProjectFilter from './ProjectFilter.vue';

const renderComponent = createComponentRenderer(ProjectFilter);

let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;

const teamProjects = Array.from({ length: 2 }, () => createProjectListItem('team'));
// A personal project's name is the owner's address in angle brackets.
const personalProject = { ...createProjectListItem('personal'), name: '<owner@example.com>' };
const projects = [personalProject, ...teamProjects];

describe('ProjectFilter', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());

		projectsStore = mockedStore(useProjectsStore);
		projectsStore.myProjects = projects;
		projectsStore.availableProjects = projects;
		projectsStore.getAvailableProjects.mockResolvedValue(projects);
		projectsStore.searchProjects.mockResolvedValue({ count: projects.length, data: projects });
		projectsStore.globalProjectPermissions = { list: true };
	});

	it('emits the selected project id', async () => {
		const { emitted, getByTestId } = renderComponent({ props: { modelValue: null } });

		const select = getByTestId('project-sharing-select');
		await userEvent.click(select);

		const items = await getDropdownItems(select);
		const match = [...items].find(
			(item) => item.querySelector('p')?.textContent?.trim() === teamProjects[0].name,
		);
		expect(match).toBeDefined();
		await userEvent.click(match as Element);

		await waitFor(() => {
			expect(emitted('update:modelValue')).toEqual([[{ id: teamProjects[0].id }]]);
		});
	});

	it('omits personal projects from the options', async () => {
		const { getByTestId } = renderComponent({ props: { modelValue: null } });

		const select = getByTestId('project-sharing-select');
		await userEvent.click(select);

		const items = await getDropdownItems(select);
		const names = [...items].map((item) => item.querySelector('p')?.textContent?.trim());
		expect(names).toContain(teamProjects[0].name);
		expect(names).not.toContain(personalProject.name);
	});

	it('preloads projects only when the caller cannot list them remotely', async () => {
		projectsStore.globalProjectPermissions = { list: false };

		renderComponent({ props: { modelValue: null } });

		await waitFor(() => {
			expect(projectsStore.getAvailableProjects).toHaveBeenCalled();
		});
	});

	it('does not preload projects when remote search is available', async () => {
		renderComponent({ props: { modelValue: null } });

		await waitFor(() => {
			expect(projectsStore.getAvailableProjects).not.toHaveBeenCalled();
		});
	});

	it('clears the shown selection when the caller resets the model to null', async () => {
		// Driven through a real `v-model` parent, because the clear path is what the
		// caller writes back: the insights dashboard nulls its ref after a forbidden
		// project response.
		const selected = ref<SlotProjectSelection>(null);
		const Host = defineComponent({
			components: { ProjectFilter },
			setup: () => ({ selected }),
			template: '<ProjectFilter v-model="selected" />',
		});

		const { getByTestId } = createComponentRenderer(Host)();

		const select = getByTestId('project-sharing-select');
		await userEvent.click(select);
		const items = await getDropdownItems(select);
		const match = [...items].find(
			(item) => item.querySelector('p')?.textContent?.trim() === teamProjects[0].name,
		);
		await userEvent.click(match as Element);

		await waitFor(() => expect(selected.value).toEqual({ id: teamProjects[0].id }));

		const input = () =>
			getByTestId('project-sharing-select').querySelector('input') as HTMLInputElement;
		await waitFor(() => expect(input().value).toBe(teamProjects[0].name));

		selected.value = null;

		await waitFor(() => expect(input().value).toBe(''));
	});
});
