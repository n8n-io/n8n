import { createTestingPinia } from '@pinia/testing';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { BLOCK_ACCESS_ASSIGNMENT } from '@n8n/api-types';
import type { AllRolesMap } from '@n8n/permissions';
import InstanceRoleAssignmentSelect from './InstanceRoleAssignmentSelect.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { hasPermission } from '@/app/utils/rbac/permissions';

// Expose the grouped dropdown's items as buttons so we can assert/select them.
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
									@click="$emit('update:modelValue', item.value)"
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
	};
});

vi.mock('@/features/roles/components/RoleHoverPopover.vue', () => ({
	default: { name: 'RoleHoverPopover', template: '<div><slot /></div>' },
}));
vi.mock('@/features/roles/components/RoleContactAdminModal.vue', () => ({
	default: { name: 'RoleContactAdminModal', template: '<div />' },
}));
vi.mock('@/features/roles/components/CustomRolesUpgradeModal.vue', () => ({
	default: { name: 'CustomRolesUpgradeModal', template: '<div />' },
}));

vi.mock('@/app/utils/rbac/permissions', () => ({
	hasPermission: vi.fn(),
}));

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
	makeRole({ slug: 'global:owner', displayName: 'Owner' }),
	makeRole({ slug: 'global:admin', displayName: 'Admin' }),
	makeRole({ slug: 'global:member', displayName: 'Member' }),
	makeRole({ slug: 'global:custom-dev', displayName: 'Developer', systemRole: false }),
];

const renderSelect = (modelValue = 'global:member') =>
	createComponentRenderer(InstanceRoleAssignmentSelect, {
		pinia: createTestingPinia({
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
		}),
	})({ props: { modelValue } });

describe('InstanceRoleAssignmentSelect', () => {
	beforeEach(() => {
		vi.mocked(hasPermission).mockReturnValue(true);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('offers assignable system roles, custom roles and Block access', () => {
		renderSelect();

		expect(screen.getByTestId('role-global:admin')).toBeInTheDocument();
		expect(screen.getByTestId('role-global:member')).toBeInTheDocument();
		expect(screen.getByTestId('role-global:custom-dev')).toBeInTheDocument();
		expect(screen.getByTestId(`role-${BLOCK_ACCESS_ASSIGNMENT}`)).toBeInTheDocument();
		// Owner is never assignable.
		expect(screen.queryByTestId('role-global:owner')).toBeNull();
	});

	it('emits update:modelValue with the Block access sentinel when selected', async () => {
		const { emitted } = renderSelect();

		await userEvent.click(screen.getByTestId(`role-${BLOCK_ACCESS_ASSIGNMENT}`));

		expect(emitted()['update:modelValue'][0]).toEqual([BLOCK_ACCESS_ASSIGNMENT]);
	});

	it('emits update:modelValue with a role slug when a role is selected', async () => {
		const { emitted } = renderSelect();

		await userEvent.click(screen.getByTestId('role-global:admin'));

		expect(emitted()['update:modelValue'][0]).toEqual(['global:admin']);
	});
});
