import { within } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { getDropdownItems } from '@/__tests__/utils';
import { useRoute, useRouter } from 'vue-router';
import ProjectSettings from '@/features/projects/components/ProjectSettings.vue';
import { useProjectsStore } from '@/features/projects/projects.store';
import { VIEWS } from '@/constants';
import { useUsersStore } from '@/stores/users.store';
import { createProjectListItem } from '@/__tests__/data/projects';
import { useSettingsStore } from '@/stores/settings.store';
import type { IN8nUISettings } from 'n8n-workflow';

vi.mock('vue-router', () => {
	const params = {};
	const push = vi.fn();
	return {
		useRoute: () => ({
			params,
		}),
		useRouter: () => ({
			push,
		}),
		RouterLink: vi.fn(),
	};
});

const renderComponent = createComponentRenderer(ProjectSettings);

const teamProjects = Array.from({ length: 3 }, () => createProjectListItem('team'));

let router: ReturnType<typeof useRouter>;
let route: ReturnType<typeof useRoute>;
let projectsStore: ReturnType<typeof useProjectsStore>;
let usersStore: ReturnType<typeof useUsersStore>;
let settingsStore: ReturnType<typeof useSettingsStore>;

describe('ProjectSettings', () => {
	beforeEach(() => {
		const pinia = createPinia();
		setActivePinia(pinia);
		route = useRoute();
		router = useRouter();
		projectsStore = useProjectsStore();
		usersStore = useUsersStore();
		settingsStore = useSettingsStore();

		vi.spyOn(usersStore, 'fetchUsers').mockImplementation(async () => await Promise.resolve());
		vi.spyOn(projectsStore, 'getAllProjects').mockImplementation(
			async () => await Promise.resolve(),
		);
		vi.spyOn(projectsStore, 'teamProjects', 'get').mockReturnValue(teamProjects);
		vi.spyOn(settingsStore, 'settings', 'get').mockReturnValue({
			enterprise: {
				projects: {
					team: {
						limit: -1,
					},
				},
			},
		} as IN8nUISettings);
		projectsStore.setCurrentProject({
			id: '123',
			type: 'team',
			name: 'Test Project',
			relations: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			scopes: [],
		});
	});

	it('should show confirmation modal before deleting project and delete with transfer', async () => {
		const deleteProjectSpy = vi
			.spyOn(projectsStore, 'deleteProject')
			.mockImplementation(async () => {});

		const { getByTestId, getByRole } = renderComponent();
		const deleteButton = getByTestId('project-settings-delete-button');

		await userEvent.click(deleteButton);
		expect(deleteProjectSpy).not.toHaveBeenCalled();
		let modal = getByRole('dialog');
		expect(modal).toBeVisible();
		const confirmButton = getByTestId('project-settings-delete-confirm-button');
		expect(confirmButton).toBeDisabled();

		await userEvent.click(within(modal).getAllByRole('radio')[0]);
		const projectSelect = getByTestId('project-sharing-select');
		const projectSelectDropdownItems = await getDropdownItems(projectSelect);
		await userEvent.click(projectSelectDropdownItems[0]);
		expect(confirmButton).toBeEnabled();

		await userEvent.click(confirmButton);
		expect(deleteProjectSpy).toHaveBeenCalledWith('123', expect.any(String));
		expect(router.push).toHaveBeenCalledWith({ name: VIEWS.HOMEPAGE });
	});

	it('should show confirmation modal before deleting project and deleting without transfer', async () => {
		const deleteProjectSpy = vi
			.spyOn(projectsStore, 'deleteProject')
			.mockImplementation(async () => {});

		const { getByTestId, getByRole } = renderComponent();
		const deleteButton = getByTestId('project-settings-delete-button');

		await userEvent.click(deleteButton);
		expect(deleteProjectSpy).not.toHaveBeenCalled();
		let modal = getByRole('dialog');
		expect(modal).toBeVisible();
		const confirmButton = getByTestId('project-settings-delete-confirm-button');
		expect(confirmButton).toBeDisabled();

		await userEvent.click(within(modal).getAllByRole('radio')[1]);
		const input = within(modal).getByRole('textbox');

		await userEvent.type(input, 'delete all ');
		expect(confirmButton).toBeDisabled();

		await userEvent.type(input, 'data');
		expect(confirmButton).toBeEnabled();

		await userEvent.click(confirmButton);
		expect(deleteProjectSpy).toHaveBeenCalledWith('123', undefined);
		expect(router.push).toHaveBeenCalledWith({ name: VIEWS.HOMEPAGE });
	});
});
