import { defineComponent } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { screen, within } from '@testing-library/vue';
import { vi } from 'vitest';
import { ROLE, type UsersList } from '@n8n/api-types';
import { type UserAction } from '@n8n/design-system';
import SettingsUsersTable from '@/components/SettingsUsers/SettingsUsersTable.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { useEmitters } from '@/__tests__/utils';
import type { IUser } from '@/Interface';

const { emitters, addEmitter } = useEmitters<
	'settingsUsersRoleCell' | 'settingsUsersActionsCell' | 'n8nDataTableServer'
>();

const hasPermission = vi.fn(() => true);
vi.mock('@/utils/rbac/permissions', () => ({
	hasPermission: () => hasPermission(),
}));

vi.mock('@/components/SettingsUsers/SettingsUsersRoleCell.vue', () => ({
	default: defineComponent({
		setup(_, { emit }) {
			addEmitter('settingsUsersRoleCell', emit);
		},
		template: '<div data-test-id="user-role" />',
	}),
}));

vi.mock('@/components/SettingsUsers/SettingsUsersActionsCell.vue', () => ({
	default: defineComponent({
		props: {
			data: { type: Object, required: true },
			actions: { type: Array, required: true },
		},
		setup(_, { emit }) {
			addEmitter('settingsUsersActionsCell', emit);
		},
		template:
			'<div :data-test-id="\'actions-cell-\' + data.id" :data-actions-count="actions.length" />',
	}),
}));

// Mock N8nDataTableServer to emit events
vi.mock('@n8n/design-system', async (importOriginal) => {
	const original = await importOriginal<object>();
	return {
		...original,
		N8nDataTableServer: defineComponent({
			props: {
				headers: { type: Array, required: true },
				items: { type: Array, required: true },
				itemsLength: { type: Number, required: true },
			},
			setup(_, { emit }) {
				addEmitter('n8nDataTableServer', emit);
			},
			template: `
				<ul>
					<li v-for="item in items" :key="item.id" :data-test-id="'user-row-' + item.id">
						<div v-for="header in headers" :key="header.key">
							<slot :name="'item.' + header.key" :item="item"
										:value="header.value ? header.value(item) : item[header.key]">
								<!-- Fallback content -->
								<span v-if="header.value">{{ header.value(item) }}</span>
								<span v-else>{{ item[header.key] }}</span>
							</slot>
						</div>
					</li>
				</ul>`,
		}),
	};
});

const mockUsersList: UsersList = {
	items: [
		{
			id: '1',
			email: 'owner@example.com',
			firstName: 'Owner',
			lastName: 'User',
			role: ROLE.Owner,
			isOwner: true,
			isPending: false,
			mfaEnabled: true,
			settings: {},
		},
		{
			id: '2',
			email: 'member@example.com',
			firstName: 'Member',
			lastName: 'User',
			role: ROLE.Member,
			isOwner: false,
			isPending: false,
			mfaEnabled: false,
			settings: {},
		},
		{
			id: '3',
			email: 'pending@example.com',
			firstName: '',
			lastName: '',
			role: ROLE.Member,
			isOwner: false,
			isPending: true,
			mfaEnabled: false,
			settings: {},
			inviteAcceptUrl: 'https://example.com/invite/123',
		},
	],
	count: 3,
};

const mockActions: Array<UserAction<IUser>> = [
	{
		value: 'delete',
		label: 'Delete',
	},
	{
		value: 'reinvite',
		label: 'Reinvite',
		guard: (user) => user.isPendingUser,
	},
];

let renderComponent: ReturnType<typeof createComponentRenderer>;

describe('SettingsUsersTable', () => {
	beforeEach(() => {
		renderComponent = createComponentRenderer(SettingsUsersTable, {
			pinia: createTestingPinia(),
			props: {
				data: mockUsersList,
				actions: mockActions,
				loading: false,
			},
		});
		hasPermission.mockReturnValue(true); // Default to having permission
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render user data correctly in the table', () => {
		renderComponent();

		// Check for owner user
		const ownerRow = screen.getByTestId('user-row-1');
		expect(within(ownerRow).getByText(/Owner User/)).toBeInTheDocument();
		expect(within(ownerRow).getByText('owner@example.com')).toBeInTheDocument();
		expect(within(ownerRow).getByText('Enabled')).toBeInTheDocument(); // 2FA

		// Check for member user
		const memberRow = screen.getByTestId('user-row-2');
		expect(within(memberRow).getByText(/Member User/)).toBeInTheDocument();
		expect(within(memberRow).getByText('member@example.com')).toBeInTheDocument();
		expect(within(memberRow).getByText('Disabled')).toBeInTheDocument(); // 2FA
	});

	it('should delegate update:options event from N8nDataTableServer', () => {
		const { emitted } = renderComponent();
		emitters.n8nDataTableServer.emit('update:options', { page: 1, itemsPerPage: 20 });

		expect(emitted()).toHaveProperty('update:options');
		expect(emitted()['update:options'][0]).toEqual([{ page: 1, itemsPerPage: 20 }]);
	});

	describe('role changing', () => {
		it('should render role update component when user has permission', () => {
			hasPermission.mockReturnValue(true);
			renderComponent();
			screen.getAllByTestId('user-role').forEach((roleCell) => {
				expect(roleCell).toBeVisible();
			});
		});

		it('should emit "update:role" when a new role is selected', () => {
			const { emitted } = renderComponent();
			emitters.settingsUsersRoleCell.emit('update:role', { role: 'global:admin', userId: '2' });

			expect(emitted()).toHaveProperty('update:role');
			expect(emitted()['update:role'][0]).toEqual([{ role: 'global:admin', userId: '2' }]);
		});

		it('should emit "action" with "delete" payload when delete is selected from role change', () => {
			const { emitted } = renderComponent();
			emitters.settingsUsersRoleCell.emit('update:role', { role: 'delete', userId: '2' });

			// It should not emit 'update:role'
			expect(emitted()).not.toHaveProperty('update:role');

			// It should emit 'action'
			expect(emitted()).toHaveProperty('action');
			expect(emitted().action[0]).toEqual([{ action: 'delete', userId: '2' }]);
		});

		it('should render role as plain text when user lacks permission', () => {
			hasPermission.mockReturnValue(false);
			renderComponent();

			const memberRow = screen.getByTestId('user-row-2');
			expect(within(memberRow).queryByTestId('user-role')).not.toBeInTheDocument();
			expect(within(memberRow).getByText('Member')).toBeInTheDocument();
		});
	});

	describe('user actions', () => {
		it('should filter actions for the owner user (should be none)', () => {
			renderComponent();
			const ownerActions = screen.getByTestId('actions-cell-1');
			expect(ownerActions.dataset.actionsCount).toBe('0');
		});

		it('should filter actions based on guard function', () => {
			renderComponent();

			// Member user is not pending, so 'reinvite' action should be filtered out
			const memberActions = screen.getByTestId('actions-cell-2');
			expect(memberActions.dataset.actionsCount).toBe('1'); // Only 'delete'

			// Pending user should have 'reinvite' action
			const pendingActions = screen.getByTestId('actions-cell-3');
			expect(pendingActions.dataset.actionsCount).toBe('2'); // 'delete' and 'reinvite'
		});

		it('should delegate action events from SettingsUsersActionsCell', async () => {
			const { emitted } = renderComponent();
			emitters.settingsUsersActionsCell.emit('action', { action: 'delete', userId: '2' });

			expect(emitted()).toHaveProperty('action');
			expect(emitted().action[0]).toEqual([{ action: 'delete', userId: '2' }]);
		});
	});
});
