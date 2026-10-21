import { createComponentRenderer } from '@/__tests__/render';
import { createPinia, setActivePinia } from 'pinia';
import { waitFor } from '@testing-library/vue';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import type { Role } from '@n8n/permissions';
import DeleteInstanceRoleModal from './DeleteInstanceRoleModal.vue';

const role: Role = {
	displayName: 'Support Agent',
	slug: 'global:support-agent',
	description: null,
	scopes: [],
	licensed: true,
	systemRole: false,
	roleType: 'global',
};

const availableRoles: Role[] = [
	{
		displayName: 'Admin',
		slug: 'global:admin',
		description: null,
		scopes: [],
		licensed: true,
		systemRole: true,
		roleType: 'global',
	},
	{
		displayName: 'Member',
		slug: 'global:member',
		description: null,
		scopes: [],
		licensed: true,
		systemRole: true,
		roleType: 'global',
	},
];

const renderComponent = createComponentRenderer(DeleteInstanceRoleModal, {
	props: { modelValue: true, role, userCount: 3, availableRoles },
});

describe('DeleteInstanceRoleModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createPinia());
	});

	it('should show the role name, user count and reassignment prompt', async () => {
		const { findByText } = renderComponent();

		expect(await findByText('Delete Support Agent role')).toBeInTheDocument();
		expect(await findByText('3 users')).toBeInTheDocument();
		expect(await findByText(/are currently assigned to this role/)).toBeInTheDocument();
	});

	it('should use the singular form for a single assigned user', async () => {
		const { findByText } = renderComponent({
			props: { modelValue: true, role, userCount: 1, availableRoles },
		});

		expect(await findByText('1 user')).toBeInTheDocument();
	});

	it('should disable confirm until a role is picked, with a neutral default label', async () => {
		const { findByTestId } = renderComponent();

		const confirmButton = await findByTestId('confirm-delete-reassign-role');
		expect(confirmButton).toBeDisabled();
		expect(confirmButton).toHaveTextContent('Delete and reassign users');
	});

	it('should reflect the chosen role in the confirm label and emit on confirm', async () => {
		const { findByTestId, getByTestId, getByText, emitted } = renderComponent();

		// N8nSelect (ElSelect): open the dropdown, then pick the option.
		await userEvent.click(await findByTestId('reassign-role-select'));
		await waitFor(() => expect(getByText('Admin')).toBeInTheDocument());
		// The option is teleported to body. jsdom does not apply the dialog's
		// .el-popper pointer-events rule, so the click check would reject it.
		await userEvent.click(getByText('Admin'), {
			pointerEventsCheck: PointerEventsCheckLevel.Never,
		});

		const confirmButton = getByTestId('confirm-delete-reassign-role');
		await waitFor(() =>
			expect(confirmButton).toHaveTextContent('Delete role and reassign users to Admin'),
		);
		expect(confirmButton).toBeEnabled();

		await userEvent.click(confirmButton);

		expect(emitted().confirm).toEqual([['global:admin']]);
	});

	it('should close without emitting confirm when cancelled', async () => {
		const { findByTestId, emitted } = renderComponent();

		await userEvent.click(await findByTestId('cancel-delete-role'));

		expect(emitted().confirm).toBeUndefined();
		expect(emitted()['update:modelValue']).toEqual([[false]]);
	});
});
