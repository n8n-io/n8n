import { createTestingPinia } from '@pinia/testing';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { BLOCK_ACCESS_ASSIGNMENT } from '@n8n/api-types';
import type { AllRolesMap } from '@n8n/permissions';
import ProjectRoleAssignmentSelect from './ProjectRoleAssignmentSelect.vue';
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
								<button :data-test-id="'role-' + item.value" @click="$emit('update:modelValue', item.value)">
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
	overrides: Partial<AllRolesMap['project'][number]>,
): AllRolesMap['project'][number] => ({
	slug: 'project:editor',
	displayName: 'Project Editor',
	description: null,
	systemRole: true,
	licensed: true,
	roleType: 'project',
	scopes: [],
	...overrides,
});

const projectRoles: AllRolesMap['project'] = [
	makeRole({ slug: 'project:personalOwner', displayName: 'Project Owner' }),
	makeRole({ slug: 'project:admin', displayName: 'Project Admin' }),
	makeRole({ slug: 'project:editor', displayName: 'Project Editor' }),
	makeRole({ slug: 'project:custom-qa', displayName: 'QA', systemRole: false }),
];

const renderSelect = (props: { modelValue?: string } = {}) =>
	createComponentRenderer(ProjectRoleAssignmentSelect, {
		pinia: createTestingPinia({
			initialState: {
				roles: {
					roles: {
						global: [],
						project: projectRoles,
						credential: [],
						workflow: [],
						secretsProviderConnection: [],
					},
				},
			},
		}),
	})({ props: { modelValue: 'project:editor', ...props } });

describe('ProjectRoleAssignmentSelect', () => {
	beforeEach(() => {
		vi.mocked(hasPermission).mockReturnValue(true);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('offers assignable system and custom project roles', () => {
		renderSelect();

		expect(screen.getByTestId('role-project:admin')).toBeInTheDocument();
		expect(screen.getByTestId('role-project:editor')).toBeInTheDocument();
		expect(screen.getByTestId('role-project:custom-qa')).toBeInTheDocument();
		// Project owner is never assignable.
		expect(screen.queryByTestId('role-project:personalOwner')).toBeNull();
	});

	it('does not offer Block access (project rules have no block outcome)', () => {
		renderSelect();

		expect(screen.queryByTestId(`role-${BLOCK_ACCESS_ASSIGNMENT}`)).toBeNull();
	});

	it('emits update:modelValue with the selected project role slug', async () => {
		const { emitted } = renderSelect();

		await userEvent.click(screen.getByTestId('role-project:admin'));

		expect(emitted()['update:modelValue'][0]).toEqual(['project:admin']);
	});
});
