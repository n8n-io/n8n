import { createTestingPinia } from '@pinia/testing';
import { screen, within } from '@testing-library/vue';
import { vi } from 'vitest';
import { ROLE, type UsersList } from '@n8n/api-types';
import SettingsUsersProjectsCell from '@/components/SettingsUsers/SettingsUsersProjectsCell.vue';
import { createComponentRenderer } from '@/__tests__/render';

// Mock N8nTooltip
vi.mock('@n8n/design-system', async (importOriginal) => {
	const original = await importOriginal<object>();
	return {
		...original,
		N8nTooltip: {
			name: 'N8nTooltip',
			template: `
        <div>
          <slot name="content" />
          <slot />
        </div>
      `,
		},
	};
});

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

	it('should show a tooltip with additional projects when list is long', () => {
		const props = {
			data: {
				...baseUser,
				projectRelations: [
					{ name: 'Project A' },
					{ name: 'Project B' },
					{ name: 'Project C' },
					{ name: 'Project D' },
				],
			},
		};
		renderComponent({ props });

		// Visible projects
		expect(screen.getByText('Project A')).toBeInTheDocument();
		expect(screen.getByText('Project B')).toBeInTheDocument();

		// Additional count
		expect(screen.getByText('+ 2')).toBeInTheDocument();

		// Projects inside the tooltip content
		const list = screen.getByRole('list');
		expect(within(list).getByText('Project C')).toBeInTheDocument();
		expect(within(list).getByText('Project D')).toBeInTheDocument();
	});
});
