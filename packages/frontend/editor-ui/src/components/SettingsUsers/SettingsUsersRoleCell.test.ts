import { createTestingPinia } from '@pinia/testing';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ROLE, type Role, type UsersList } from '@n8n/api-types';
import { type ActionDropdownItem } from '@n8n/design-system';
import SettingsUsersRoleCell from '@/components/SettingsUsers/SettingsUsersRoleCell.vue';
import { createComponentRenderer } from '@/__tests__/render';

// Mock N8nActionDropdown to simplify testing
vi.mock('@n8n/design-system', async (importOriginal) => {
	const original = await importOriginal<object>();
	return {
		...original,
		N8nActionDropdown: {
			name: 'N8nActionDropdown',
			props: {
				items: { type: Array, required: true },
			},
			emits: ['select'],
			template: `
        <div>
          <div data-test-id="activator">
            <slot name="activator" />
          </div>
          <ul>
            <li v-for="item in items" :key="item.id">
              <button :data-test-id="'action-' + item.id" @click="$emit('select', item.id)">
                <slot name="menuItem" v-bind="item" />
              </button>
            </li>
          </ul>
        </div>
      `,
		},
	};
});

const mockUser: UsersList['items'][number] = {
	id: '1',
	email: 'member@example.com',
	firstName: 'Member',
	lastName: 'User',
	role: ROLE.Member,
	isOwner: false,
	isPending: false,
	mfaEnabled: false,
	settings: {},
};

const mockRoles = {
	[ROLE.Owner]: { label: 'Owner', desc: '' },
	[ROLE.Admin]: { label: 'Admin', desc: 'Admin Description' },
	[ROLE.Member]: { label: 'Member', desc: 'Member Description' },
	[ROLE.Default]: { label: 'Default', desc: '' },
};

const mockActions: Array<ActionDropdownItem<Role>> = [
	{ id: ROLE.Member, label: 'Member' },
	{ id: ROLE.Admin, label: 'Admin' },
];

let renderComponent: ReturnType<typeof createComponentRenderer>;

describe('SettingsUsersRoleCell', () => {
	beforeEach(() => {
		renderComponent = createComponentRenderer(SettingsUsersRoleCell, {
			pinia: createTestingPinia(),
			props: {
				data: mockUser,
				roles: mockRoles,
				actions: mockActions,
			},
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should display the current role of the user', () => {
		renderComponent();
		expect(screen.getByRole('button', { name: 'Member' })).toBeInTheDocument();
	});

	it('should not be editable for an owner', () => {
		renderComponent({
			props: {
				data: { ...mockUser, role: ROLE.Owner, isOwner: true },
			},
		});

		// The dropdown activator should not be present
		expect(screen.queryByTestId('activator')).not.toBeInTheDocument();
		// The role label should be a simple span
		expect(screen.getByText('Owner')).toBeInTheDocument();
	});

	it('should emit "update:role" when a new role is selected', async () => {
		const { emitted } = renderComponent();
		const user = userEvent.setup();

		await user.click(screen.getByTestId('action-global:admin'));

		expect(emitted()).toHaveProperty('update:role');
		expect(emitted()['update:role'][0]).toEqual([{ role: ROLE.Admin, userId: '1' }]);
	});
});
