import { ResponseError } from '@n8n/rest-api-client';
import type { IUser } from '@n8n/rest-api-client/api/users';
import { useRolesStore } from '@n8n/stores/roles.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { mock } from 'vitest-mock-extended';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import type * as ProjectsApi from '@/features/collaboration/projects/projects.api';

import PromotionMissingProjectsDialog from './PromotionMissingProjectsDialog.vue';

const projectsApi = vi.hoisted(() => ({
	createPublicProject: vi.fn<typeof ProjectsApi.createPublicProject>(),
	addProjectMembers: vi.fn<typeof ProjectsApi.addProjectMembers>(),
}));

vi.mock('@/features/collaboration/projects/projects.api', async (importOriginal) => ({
	...(await importOriginal()),
	...projectsApi,
}));

const billing = { id: 'p-billing', name: 'Billing' };
const marketing = { id: 'p-marketing', name: 'Marketing' };
const support = { id: 'p-support', name: 'Support' };

const renderDialog = createComponentRenderer(PromotionMissingProjectsDialog);

const row = (projectId: string) => screen.getByTestId(`promotion-missing-project-${projectId}`);

describe('PromotionMissingProjectsDialog', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		createTestingPinia();
	});

	it('keeps the dialog open when a project fails, and retries only that project', async () => {
		projectsApi.createPublicProject.mockImplementation(async (_context, { id }) => {
			if (id === marketing.id) throw new ResponseError('Conflict', { httpStatusCode: 409 });
			if (id === support.id) {
				throw new ResponseError('The project limit is reached', { httpStatusCode: 400 });
			}
			return mock();
		});
		const { emitted } = renderDialog({
			props: {
				open: true,
				environmentName: 'Development',
				projects: [billing, marketing, support],
			},
		});

		await userEvent.click(await screen.findByRole('checkbox', { name: 'Select all projects' }));
		await userEvent.click(screen.getByRole('button', { name: 'Add 3 missing projects' }));

		expect(await within(row(billing.id)).findByText('Created')).toBeInTheDocument();
		expect(within(row(marketing.id)).getByText('Already exists')).toBeInTheDocument();
		expect(within(row(support.id)).getByText('The project limit is reached')).toBeInTheDocument();
		expect(emitted('update:open')).toBeUndefined();

		projectsApi.createPublicProject.mockResolvedValue(mock());
		await userEvent.click(screen.getByRole('button', { name: 'Retry 1 project' }));

		await waitFor(() => expect(emitted('update:open')).toEqual([[false]]));
		expect(emitted('changed')).toHaveLength(1);
		expect(projectsApi.createPublicProject).toHaveBeenCalledTimes(4);
		expect(projectsApi.createPublicProject).toHaveBeenLastCalledWith(expect.anything(), support);
	});

	it('assigns only the admin on retry when the project was created but the admin was not', async () => {
		mockedStore(useRolesStore).processedProjectRoles = [
			{
				slug: 'project:admin',
				displayName: 'Admin',
				description: null,
				systemRole: false,
				roleType: 'project',
				scopes: [],
				licensed: true,
			},
		];
		const alice = mock<IUser>({
			id: 'u-alice',
			firstName: 'Alice',
			lastName: 'Smith',
			fullName: 'Alice Smith',
			email: 'alice@example.com',
			role: 'global:member',
		});
		mockedStore(useUsersStore).fetchUsers.mockResolvedValue([alice]);
		projectsApi.createPublicProject.mockResolvedValue(mock());
		projectsApi.addProjectMembers
			.mockRejectedValueOnce(new Error('Project roles are managed automatically'))
			.mockResolvedValueOnce();
		const { emitted } = renderDialog({
			props: { open: true, environmentName: 'Development', projects: [billing] },
		});

		await userEvent.click(await screen.findByRole('checkbox', { name: 'Billing' }));
		await userEvent.click(within(row(billing.id)).getByRole('combobox'));
		await userEvent.click(await screen.findByText('Alice Smith'));
		await userEvent.click(screen.getByRole('button', { name: 'Add 1 missing project' }));

		expect(
			await within(row(billing.id)).findByText(
				"Created, but couldn't assign the project admin: Project roles are managed automatically",
			),
		).toBeInTheDocument();

		await userEvent.click(screen.getByRole('button', { name: 'Retry 1 project' }));

		await waitFor(() => expect(emitted('update:open')).toEqual([[false]]));
		expect(projectsApi.createPublicProject).toHaveBeenCalledTimes(1);
		expect(projectsApi.addProjectMembers).toHaveBeenCalledTimes(2);
		expect(projectsApi.addProjectMembers).toHaveBeenLastCalledWith(expect.anything(), billing.id, [
			{ userId: alice.id, role: 'project:admin' },
		]);
	});
});
