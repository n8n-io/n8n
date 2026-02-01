import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import ProjectDeleteDialog from './ProjectDeleteDialog.vue';
import { createTestProject } from '../__tests__/utils';

const renderComponent = createComponentRenderer(ProjectDeleteDialog, {
	pinia: createTestingPinia(),
});

const currentProject = createTestProject({
	id: 'xyz123',
	name: 'Test',
});

describe('ProjectDeleteDialog', () => {
	let user: ReturnType<typeof userEvent.setup>;

	beforeEach(() => {
		user = userEvent.setup();
	});

	it('should render the dialog with correct title and content when project is empty', async () => {
		const { findByRole, getByRole, queryAllByRole } = renderComponent({
			props: {
				currentProject,
				projects: [],
				modelValue: true,
				resourceCounts: {
					credentials: 0,
					workflows: 0,
					dataTables: 0,
				},
			},
		});

		const dialog = await findByRole('dialog');
		expect(dialog).toBeInTheDocument();
		expect(getByRole('heading', { name: 'Delete "Test" Project?' })).toBeInTheDocument();
		expect(queryAllByRole('radio')).toHaveLength(0);
		expect(getByRole('button', { name: 'Delete this project' })).toBeEnabled();
	});

	it('should render the dialog with correct title and content when project is not empty', async () => {
		const { findByRole, getByRole, getAllByRole, getByTestId, queryByTestId, emitted } =
			renderComponent({
				props: {
					currentProject,
					projects: [],
					modelValue: true,
					resourceCounts: {
						credentials: 0,
						workflows: 1,
						dataTables: 0,
					},
				},
			});

		const dialog = await findByRole('dialog');
		expect(dialog).toBeInTheDocument();
		expect(getByRole('heading', { name: 'Delete "Test" Project?' })).toBeInTheDocument();
		expect(getByRole('button', { name: 'Delete this project' })).toBeDisabled();

		expect(getAllByRole('radio')).toHaveLength(2);

		await user.click(getAllByRole('radio')[0]);
		expect(getByTestId('project-sharing-select')).toBeVisible();
		expect(queryByTestId('project-delete-confirm-input')).not.toBeInTheDocument();
		expect(getByRole('button', { name: 'Delete this project' })).toBeDisabled();

		await user.click(getAllByRole('radio')[1]);
		expect(queryByTestId('project-sharing-select')).not.toBeInTheDocument();
		expect(getByTestId('project-delete-confirm-input')).toBeVisible();
		expect(getByRole('button', { name: 'Delete this project' })).toBeDisabled();

		await user.type(getByTestId('project-delete-confirm-input'), 'delete all data');
		expect(getByRole('button', { name: 'Delete this project' })).toBeEnabled();

		await user.click(getByRole('button', { name: 'Delete this project' }));
		expect(emitted()).toHaveProperty('confirmDelete');
	});
});
