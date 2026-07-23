import { createTestingPinia } from '@pinia/testing';
import { fireEvent, screen, waitFor } from '@testing-library/vue';
import SettingsUsersProjectsModal from './SettingsUsersProjectsModal.vue';
import { createComponentRenderer } from '@/__tests__/render';

const projectRelation = (id: string, name: string, role = 'project:admin') => ({ id, name, role });

const baseProps = {
	open: true,
	firstName: 'Member',
	lastName: 'User',
	email: 'member@example.com',
	projects: [
		projectRelation('a', 'Alpha'),
		projectRelation('b', 'Beta'),
		projectRelation('c', 'Gamma'),
	],
};

const getSearch = () => screen.getByTestId('user-projects-modal-search') as HTMLInputElement;

let renderComponent: ReturnType<typeof createComponentRenderer>;

describe('SettingsUsersProjectsModal', () => {
	beforeEach(() => {
		renderComponent = createComponentRenderer(SettingsUsersProjectsModal, {
			pinia: createTestingPinia({
				initialState: {
					roles: {
						roles: {
							global: [],
							project: [{ slug: 'project:admin', displayName: 'Admin' }],
							credential: [],
							workflow: [],
						},
					},
				},
			}),
		});
	});

	it('should show all projects when the query is empty', async () => {
		renderComponent({ props: baseProps });

		await waitFor(() => {
			expect(screen.getByText('Projects for Member User')).toBeInTheDocument();
		});
		expect(screen.getByText('Alpha')).toBeInTheDocument();
		expect(screen.getByText('Beta')).toBeInTheDocument();
		expect(screen.getByText('Gamma')).toBeInTheDocument();
	});

	it('should filter projects case-insensitively', async () => {
		renderComponent({ props: baseProps });

		await waitFor(() => {
			expect(screen.getByText('Alpha')).toBeInTheDocument();
		});

		await fireEvent.update(getSearch(), 'al');

		expect(screen.getByText('Alpha')).toBeInTheDocument();
		expect(screen.queryByText('Beta')).not.toBeInTheDocument();
		expect(screen.queryByText('Gamma')).not.toBeInTheDocument();
	});

	it('should show all projects when the query is whitespace only', async () => {
		renderComponent({ props: baseProps });

		await waitFor(() => {
			expect(screen.getByText('Alpha')).toBeInTheDocument();
		});

		await fireEvent.update(getSearch(), '   ');

		expect(screen.getByText('Alpha')).toBeInTheDocument();
		expect(screen.getByText('Beta')).toBeInTheDocument();
		expect(screen.getByText('Gamma')).toBeInTheDocument();
	});

	it('should show the empty state when no project matches', async () => {
		renderComponent({ props: baseProps });

		await waitFor(() => {
			expect(screen.getByText('Alpha')).toBeInTheDocument();
		});

		await fireEvent.update(getSearch(), 'zzz');

		expect(screen.getByText('No projects match your search')).toBeInTheDocument();
		expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
		expect(screen.queryByText('Beta')).not.toBeInTheDocument();
		expect(screen.queryByText('Gamma')).not.toBeInTheDocument();
	});

	it('should restore the full list when the query is cleared', async () => {
		renderComponent({ props: baseProps });

		await waitFor(() => {
			expect(screen.getByText('Alpha')).toBeInTheDocument();
		});

		await fireEvent.update(getSearch(), 'al');
		expect(screen.queryByText('Beta')).not.toBeInTheDocument();

		await fireEvent.update(getSearch(), '');

		expect(screen.getByText('Alpha')).toBeInTheDocument();
		expect(screen.getByText('Beta')).toBeInTheDocument();
		expect(screen.getByText('Gamma')).toBeInTheDocument();
	});
});
