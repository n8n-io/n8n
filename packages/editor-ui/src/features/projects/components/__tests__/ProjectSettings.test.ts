import { createPinia, setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { useRoute, useRouter } from 'vue-router';
import ProjectSettings from '@/features/projects/components/ProjectSettings.vue';
import { useProjectsStore } from '@/features/projects/projects.store';
import { VIEWS } from '@/constants';
import { useUsersStore } from '@/stores/users.store';

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

let router: ReturnType<typeof useRouter>;
let route: ReturnType<typeof useRoute>;
let projectsStore: ReturnType<typeof useProjectsStore>;
let usersStore: ReturnType<typeof useUsersStore>;

describe('ProjectSettings', () => {
	beforeEach(() => {
		const pinia = createPinia();
		setActivePinia(pinia);
		route = useRoute();
		router = useRouter();
		projectsStore = useProjectsStore();
		usersStore = useUsersStore();

		vi.spyOn(usersStore, 'fetchUsers').mockImplementation(async () => await Promise.resolve());
	});

	it('should show confirmation modal before deleting project', async () => {
		projectsStore.setCurrentProject({
			id: '123',
			type: 'team',
			name: 'Test Project',
			relations: [],
		});
		const deleteProjectSpy = vi.spyOn(projectsStore, 'deleteProject').mockResolvedValue();

		const { getByTestId, getByRole, queryByRole } = renderComponent();
		const deleteButton = getByTestId('project-settings-delete-button');

		await userEvent.click(deleteButton);
		expect(deleteProjectSpy).not.toHaveBeenCalled();
		let modal = getByRole('dialog');
		expect(modal).toBeVisible();
		const cancelButton = modal.querySelector('.btn--cancel');
		expect(cancelButton).toBeVisible();

		if (cancelButton) {
			await userEvent.click(cancelButton);
			expect(queryByRole('dialog')).not.toBeInTheDocument();
			expect(deleteProjectSpy).not.toHaveBeenCalled();
		}

		await userEvent.click(deleteButton);
		modal = getByRole('dialog');
		expect(modal).toBeVisible();
		const confirmButton = modal.querySelector('.btn--confirm');
		expect(confirmButton).toBeVisible();

		if (confirmButton) {
			await userEvent.click(confirmButton);
			expect(queryByRole('dialog')).not.toBeInTheDocument();
			expect(deleteProjectSpy).toHaveBeenCalledWith('123');
			expect(router.push).toHaveBeenCalledWith({ name: VIEWS.HOMEPAGE });
		}
	});
});
