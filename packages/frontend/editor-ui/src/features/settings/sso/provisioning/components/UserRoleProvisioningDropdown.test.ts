import { createTestingPinia } from '@pinia/testing';
import { screen } from '@testing-library/vue';
import { vi } from 'vitest';
import type { AllRolesMap } from '@n8n/permissions';
import { createComponentRenderer } from '@/__tests__/render';
import UserRoleProvisioningDropdown from './UserRoleProvisioningDropdown.vue';

// The default-condition row embeds the grouped role dropdown, which pulls in a
// router-backed footer + hover popovers/modals. Expose items as buttons and
// stub the heavy sub-components so we can assert the row's presence per mode.
vi.mock('@n8n/design-system', async (importOriginal) => {
	const original = await importOriginal<object>();
	return {
		...original,
		N8nSelect2: {
			name: 'N8nSelect2',
			props: {
				items: { type: Array, default: () => [] },
				modelValue: { type: [String, Number], default: undefined },
			},
			emits: ['update:modelValue', 'update:open'],
			template: `
				<div :data-test-id="$attrs['data-test-id']">
					<div data-test-id="select-trigger"><slot /></div>
					<slot name="footer" />
				</div>
			`,
		},
		N8nSelect2Item: {
			name: 'N8nSelect2Item',
			template: '<span><slot name="item-label" /></span>',
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

const pinia = () =>
	createTestingPinia({
		initialState: {
			roles: {
				roles: {
					global: [
						makeRole({ slug: 'global:admin', displayName: 'Admin' }),
						makeRole({ slug: 'global:member', displayName: 'Member' }),
					],
					project: [],
					credential: [],
					workflow: [],
					secretsProviderConnection: [],
				},
			},
		},
	});

const renderDropdown = (props: Record<string, unknown>) =>
	createComponentRenderer(UserRoleProvisioningDropdown, { pinia: pinia() })({
		props: { authProtocol: 'oidc', ...props },
	});

describe('UserRoleProvisioningDropdown — Mode 2 default condition row', () => {
	it('renders the default condition row in IdP mode (Mode 2)', () => {
		renderDropdown({ roleAssignment: 'instance', mappingMethod: 'idp' });

		expect(screen.getByTestId('default-condition-row')).toBeInTheDocument();
		expect(screen.getByTestId('default-condition-role-select')).toBeInTheDocument();
	});

	it('does not render the default condition row when mapping rules inside n8n (Mode 1)', () => {
		renderDropdown({ roleAssignment: 'instance', mappingMethod: 'rules_in_n8n' });

		expect(screen.queryByTestId('default-condition-row')).toBeNull();
	});

	it('does not render the default condition row when role assignment is manual', () => {
		renderDropdown({ roleAssignment: 'manual', mappingMethod: 'idp' });

		expect(screen.queryByTestId('default-condition-row')).toBeNull();
	});
});
