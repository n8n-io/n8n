import { createTestingPinia } from '@pinia/testing';
import { screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ROLE, type UsersList } from '@n8n/api-types';
import type { AllRolesMap } from '@n8n/permissions';
import SettingsUsersRoleCell from './SettingsUsersRoleCell.vue';
import { createComponentRenderer } from '@/__tests__/render';

// Feature flag is toggled per test via this hoisted state.
const { envFlagState } = vi.hoisted(() => ({ envFlagState: { customInstanceRoles: true } }));
vi.mock('@/features/shared/envFeatureFlag/useEnvFeatureFlag', () => ({
	useEnvFeatureFlag: () => ({
		check: {
			value: (flag: string) =>
				flag === 'CUSTOM_INSTANCE_ROLES' ? envFlagState.customInstanceRoles : false,
		},
	}),
}));

// Mock the dropdown primitives to expose items as buttons and the trigger slot for assertions.
vi.mock('@n8n/design-system', async (importOriginal) => {
	const original = await importOriginal<object>();
	return {
		...original,
		N8nSelect2: {
			name: 'N8nSelect2',
			props: {
				items: { type: Array, default: () => [] },
				modelValue: { type: [String, Number], default: undefined },
				disabled: { type: Boolean, default: false },
			},
			emits: ['update:modelValue', 'update:open'],
			template: `
				<div>
					<div data-test-id="select-trigger" :data-disabled="disabled"><slot /></div>
					<ul>
						<template v-for="item in items" :key="item.value || item.label">
							<li v-if="item.value">
								<button
									:data-test-id="'role-' + item.value"
									:disabled="item.disabled"
									@click="!item.disabled && $emit('update:modelValue', item.value)"
								>
									<slot name="item" :item="item" />
								</button>
							</li>
						</template>
					</ul>
					<slot name="footer" />
				</div>
			`,
		},
		N8nSelect2Item: {
			name: 'N8nSelect2Item',
			template: '<span><slot name="item-label" /><slot name="item-trailing" /></span>',
		},
		N8nActionDropdown: {
			name: 'N8nActionDropdown',
			props: { items: { type: Array, default: () => [] } },
			emits: ['select'],
			template: `
				<div>
					<div data-test-id="legacy-activator"><slot name="activator" /></div>
					<ul>
						<li v-for="item in items" :key="item.id">
							<button
								:data-test-id="'legacy-action-' + item.id"
								:disabled="item.disabled"
								@click="$emit('select', item.id)"
							>
								<slot name="menuItem" v-bind="item" />
							</button>
						</li>
					</ul>
				</div>
			`,
		},
	};
});

// Stub out heavy sub-components that rely on router / dialogs.
vi.mock('@/features/roles/components/RoleHoverPopover.vue', () => ({
	default: { name: 'RoleHoverPopover', template: '<div><slot /></div>' },
}));
vi.mock('@/features/roles/components/RoleContactAdminModal.vue', () => ({
	default: { name: 'RoleContactAdminModal', template: '<div />' },
}));
vi.mock('@/features/roles/components/CustomRolesUpgradeModal.vue', () => ({
	default: { name: 'CustomRolesUpgradeModal', template: '<div />' },
}));

const CUSTOM_ROLE_SLUG = 'custom:developer';
const UNLICENSED_ROLE_SLUG = 'custom:unlicensed';

const makeRole = (
	overrides: Partial<AllRolesMap['global'][number]>,
): AllRolesMap['global'][number] => ({
	slug: 'global:member',
	displayName: 'Member',
	description: null,
	systemRole: true,
	licensed: true,
	roleType: 'global',
	scopes: [],
	...overrides,
});

const globalRoles: AllRolesMap['global'] = [
	makeRole({ slug: ROLE.Owner, displayName: 'Owner' }),
	makeRole({ slug: ROLE.Admin, displayName: 'Admin' }),
	makeRole({ slug: ROLE.Member, displayName: 'Member' }),
	makeRole({
		slug: CUSTOM_ROLE_SLUG,
		displayName: 'Developer',
		systemRole: false,
		description: 'Developer role description',
	}),
	makeRole({
		slug: UNLICENSED_ROLE_SLUG,
		displayName: 'Unlicensed Role',
		systemRole: false,
		licensed: false,
	}),
];

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

const pinia = () =>
	createTestingPinia({
		initialState: {
			roles: {
				roles: {
					global: globalRoles,
					project: [],
					credential: [],
					workflow: [],
					secretsProviderConnection: [],
				},
			},
		},
	});

let renderComponent: ReturnType<typeof createComponentRenderer>;

describe('SettingsUsersRoleCell', () => {
	beforeEach(() => {
		envFlagState.customInstanceRoles = true;
		renderComponent = createComponentRenderer(SettingsUsersRoleCell, {
			pinia: pinia(),
			props: { data: mockUser },
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should display the current role of the user in the trigger', () => {
		renderComponent();
		expect(within(screen.getByTestId('select-trigger')).getByText('Member')).toBeInTheDocument();
	});

	it('should not be editable for an owner', () => {
		renderComponent({
			props: { data: { ...mockUser, role: ROLE.Owner, isOwner: true } },
		});

		expect(screen.queryByTestId('select-trigger')).not.toBeInTheDocument();
		expect(screen.getByText('Owner')).toBeInTheDocument();
	});

	it('should emit "update:role" when a new role is selected', async () => {
		const { emitted } = renderComponent();
		const user = userEvent.setup();

		await user.click(screen.getByTestId(`role-${ROLE.Admin}`));

		expect(emitted()).toHaveProperty('update:role');
		expect(emitted()['update:role'][0]).toEqual([{ role: ROLE.Admin, userId: '1' }]);
	});

	it('should disable the select when loading', () => {
		renderComponent({ props: { loading: true } });

		expect(screen.getByTestId('select-trigger')).toHaveAttribute('data-disabled', 'true');
	});

	describe('custom instance roles', () => {
		it('should display the label of a custom role assigned to the user', () => {
			renderComponent({ props: { data: { ...mockUser, role: CUSTOM_ROLE_SLUG } } });

			expect(
				within(screen.getByTestId('select-trigger')).getByText('Developer'),
			).toBeInTheDocument();
		});

		it('should emit "update:role" with the custom role slug when selected', async () => {
			const { emitted } = renderComponent();
			const user = userEvent.setup();

			await user.click(screen.getByTestId(`role-${CUSTOM_ROLE_SLUG}`));

			expect(emitted()).toHaveProperty('update:role');
			expect(emitted()['update:role'][0]).toEqual([{ role: CUSTOM_ROLE_SLUG, userId: '1' }]);
		});

		it('should not render an unlicensed custom role as disabled', () => {
			renderComponent();

			expect(screen.getByTestId(`role-${UNLICENSED_ROLE_SLUG}`)).not.toBeDisabled();
		});

		it('should not emit "update:role" when clicking an unlicensed custom role', async () => {
			const { emitted } = renderComponent();
			const user = userEvent.setup();

			await user.click(screen.getByTestId(`role-${UNLICENSED_ROLE_SLUG}`));

			expect(emitted()['update:role']).toBeUndefined();
		});
	});

	describe('when the CUSTOM_INSTANCE_ROLES feature flag is off', () => {
		beforeEach(() => {
			envFlagState.customInstanceRoles = false;
		});

		it('should render the legacy dropdown without custom roles', () => {
			renderComponent();

			expect(
				within(screen.getByTestId('legacy-activator')).getByText('Member'),
			).toBeInTheDocument();
			expect(screen.queryByTestId('select-trigger')).not.toBeInTheDocument();
			// Custom roles are not offered in the legacy dropdown.
			expect(screen.queryByTestId(`legacy-action-${CUSTOM_ROLE_SLUG}`)).not.toBeInTheDocument();
		});

		it('should emit "update:role" from the legacy dropdown', async () => {
			const { emitted } = renderComponent();
			const user = userEvent.setup();

			await user.click(screen.getByTestId(`legacy-action-${ROLE.Admin}`));

			expect(emitted()['update:role'][0]).toEqual([{ role: ROLE.Admin, userId: '1' }]);
		});
	});
});
