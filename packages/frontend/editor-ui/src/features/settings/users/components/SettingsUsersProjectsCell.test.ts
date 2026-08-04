import { createTestingPinia } from '@pinia/testing';
import { fireEvent, screen, waitFor } from '@testing-library/vue';
import { vi } from 'vitest';
import { ROLE, type UsersList } from '@n8n/api-types';
import SettingsUsersProjectsCell from './SettingsUsersProjectsCell.vue';
import { createComponentRenderer } from '@/__tests__/render';

const baseUser: UsersList['items'][number] = {
	id: '1',
	email: 'member@example.com',
	firstName: 'Member',
	lastName: 'User',
	role: ROLE.Member,
	isOwner: false,
	isPending: false,
	mfaEnabled: false,
	settings: {},
	projectRelations: [],
};

const projectRelation = (id: string, name: string, role = 'project:admin') => ({ id, name, role });

let renderComponent: ReturnType<typeof createComponentRenderer>;

describe('SettingsUsersProjectsCell', () => {
	beforeEach(() => {
		renderComponent = createComponentRenderer(SettingsUsersProjectsCell, {
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

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should display "All projects" for an Owner and not be clickable', () => {
		renderComponent({ props: { data: { ...baseUser, role: ROLE.Owner } } });
		expect(screen.getByText('All projects')).toBeInTheDocument();
		expect(screen.queryByTestId('user-projects-cell-trigger')).not.toBeInTheDocument();
	});

	it('should display "All projects" for an Admin and not be clickable', () => {
		renderComponent({ props: { data: { ...baseUser, role: ROLE.Admin } } });
		expect(screen.getByText('All projects')).toBeInTheDocument();
		expect(screen.queryByTestId('user-projects-cell-trigger')).not.toBeInTheDocument();
	});

	it('should display "Personal project" (not clickable) if user has no project relations', () => {
		renderComponent({ props: { data: { ...baseUser, projectRelations: [] } } });
		expect(screen.getByText('Personal project')).toBeInTheDocument();
		expect(screen.queryByTestId('user-projects-cell-trigger')).not.toBeInTheDocument();
	});

	it('should render a clickable trigger with the first name and a +N overflow', () => {
		renderComponent({
			props: {
				data: {
					...baseUser,
					projectRelations: [
						projectRelation('a', 'Project A'),
						projectRelation('b', 'Project B'),
						projectRelation('c', 'Project C'),
						projectRelation('d', 'Project D'),
					],
				},
			},
		});

		expect(screen.getByTestId('user-projects-cell-trigger')).toBeInTheDocument();
		expect(screen.getByText('Project A')).toBeInTheDocument();
		expect(screen.getByText('+ 3')).toBeInTheDocument();
		// Only the first name shows inline; the rest fold into "+N" (dialog lists all)
		expect(screen.queryByText('Project B')).not.toBeInTheDocument();
		expect(screen.queryByText('Project C')).not.toBeInTheDocument();
	});

	it('should open a dialog listing all projects with name and role on click', async () => {
		renderComponent({
			props: {
				data: {
					...baseUser,
					projectRelations: [
						projectRelation('a', 'Project A'),
						projectRelation('b', 'Project B'),
						projectRelation('c', 'Project C'),
					],
				},
			},
		});

		await fireEvent.click(screen.getByTestId('user-projects-cell-trigger'));

		// N8nDialog teleports to body; screen still finds it once open.
		await waitFor(() => {
			expect(screen.getByText('Projects for Member User')).toBeInTheDocument();
		});
		expect(screen.getByText('Project C')).toBeInTheDocument();
		// Project role slug is mapped to its display name
		expect(screen.getAllByText('Admin').length).toBeGreaterThan(0);
	});
});
