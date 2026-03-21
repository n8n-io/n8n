import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor } from '@testing-library/vue';
import { vi } from 'vitest';
import { ROLE, type UsersList } from '@n8n/api-types';
import SettingsUsersProjectsCell from './SettingsUsersProjectsCell.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { getTooltip, hoverTooltipTrigger } from '@/__tests__/utils';

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

let renderComponent: ReturnType<typeof createComponentRenderer>;

describe('SettingsUsersProjectsCell', () => {
	beforeEach(() => {
		renderComponent = createComponentRenderer(SettingsUsersProjectsCell, {
			pinia: createTestingPinia(),
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should display "All projects" for an Owner', () => {
		renderComponent({ props: { data: { ...baseUser, role: ROLE.Owner } } });
		expect(screen.getByText('All projects')).toBeInTheDocument();
	});

	it('should display "All projects" for an Admin', () => {
		renderComponent({ props: { data: { ...baseUser, role: ROLE.Admin } } });
		expect(screen.getByText('All projects')).toBeInTheDocument();
	});

	it('should display "Personal project" if user has no project relations', () => {
		renderComponent({ props: { data: { ...baseUser, projectRelations: [] } } });
		expect(screen.getByText('Personal project')).toBeInTheDocument();
	});

	it('should display a list of project names', () => {
		const props = {
			data: {
				...baseUser,
				projectRelations: [{ name: 'Project A' }, { name: 'Project B' }],
			},
		};
		renderComponent({ props });

		expect(screen.getByText('Project A')).toBeInTheDocument();
		expect(screen.getByText('Project B')).toBeInTheDocument();
	});

	it('should show a tooltip with additional projects when list is long', async () => {
		renderComponent({
			props: {
				data: {
					...baseUser,
					projectRelations: [
						{ name: 'Project A' },
						{ name: 'Project B' },
						{ name: 'Project C' },
						{ name: 'Project D' },
					],
				},
			},
		});

		// Visible projects
		expect(screen.getByText('Project A')).toBeInTheDocument();
		expect(screen.getByText('Project B')).toBeInTheDocument();

		// Additional count should have tooltip with hidden project names
		const additionalCount = screen.getByText('+ 2');
		expect(additionalCount).toBeInTheDocument();

		// Verify tooltip shows hidden project names on hover
		await hoverTooltipTrigger(additionalCount);
		await waitFor(() => {
			const tooltip = getTooltip();
			expect(tooltip).toHaveTextContent('Project C');
			expect(tooltip).toHaveTextContent('Project D');
		});
	});
});
