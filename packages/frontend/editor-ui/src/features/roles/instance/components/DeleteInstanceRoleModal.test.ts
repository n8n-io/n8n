import { createComponentRenderer } from '@/__tests__/render';
import { createPinia, setActivePinia } from 'pinia';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { Role } from '@n8n/permissions';
import DeleteInstanceRoleModal from './DeleteInstanceRoleModal.vue';

// The real ElDialog teleports to #app-modals; stub it so the modal content renders inline.
const ElDialogStub = {
	props: ['modelValue'],
	template: `
		<div v-if="modelValue" role="dialog">
			<slot name="header" />
			<slot />
			<slot name="footer" />
		</div>
	`,
};

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
	global: {
		stubs: {
			ElDialog: ElDialogStub,
		},
	},
});

describe('DeleteInstanceRoleModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createPinia());
	});

	it('should show the role name, user count and reassignment prompt', () => {
		const { getByText } = renderComponent();

		expect(getByText('Delete Support Agent role')).toBeInTheDocument();
		expect(getByText('3 users')).toBeInTheDocument();
		expect(getByText(/are currently assigned to this role/)).toBeInTheDocument();
	});

	it('should use the singular form for a single assigned user', () => {
		const { getByText } = renderComponent({
			props: { modelValue: true, role, userCount: 1, availableRoles },
		});

		expect(getByText('1 user')).toBeInTheDocument();
	});

	it('should disable confirm until a role is picked, with a neutral default label', () => {
		const { getByTestId } = renderComponent();

		const confirmButton = getByTestId('confirm-delete-reassign-role');
		expect(confirmButton).toBeDisabled();
		expect(confirmButton).toHaveTextContent('Delete and reassign users');
	});

	it('should reflect the chosen role in the confirm label and emit on confirm', async () => {
		const { getByTestId, getByText, emitted } = renderComponent();

		// N8nSelect (ElSelect): open the dropdown, then pick the option.
		await userEvent.click(getByTestId('reassign-role-select'));
		await waitFor(() => expect(getByText('Admin')).toBeInTheDocument());
		await userEvent.click(getByText('Admin'));

		const confirmButton = getByTestId('confirm-delete-reassign-role');
		await waitFor(() =>
			expect(confirmButton).toHaveTextContent('Delete role and reassign users to Admin'),
		);
		expect(confirmButton).toBeEnabled();

		await userEvent.click(confirmButton);

		expect(emitted().confirm).toEqual([['global:admin']]);
	});

	it('should close without emitting confirm when cancelled', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('cancel-delete-role'));

		expect(emitted().confirm).toBeUndefined();
		expect(emitted()['update:modelValue']).toEqual([[false]]);
	});
});
