import { createTestingPinia } from '@pinia/testing';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { BLOCK_ACCESS_ASSIGNMENT } from '@n8n/api-types';
import type { AllRolesMap } from '@n8n/permissions';
import type { RoleMappingRuleResponse } from '@n8n/rest-api-client/api/roleMappingRule';
import RuleRow from './RuleRow.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { hasPermission } from '@/app/utils/rbac/permissions';

// Expose the grouped instance-role dropdown's items as buttons. The project
// select is a plain N8nSelect (element-plus) and is unaffected by this mock.
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
				<div>
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

const makeGlobalRole = (
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
						makeGlobalRole({ slug: 'global:admin', displayName: 'Admin' }),
						makeGlobalRole({ slug: 'global:member', displayName: 'Member' }),
					],
					project: [
						{
							slug: 'project:editor',
							displayName: 'Project Editor',
							description: null,
							systemRole: true,
							licensed: true,
							roleType: 'project',
							scopes: [],
						},
					],
					credential: [],
					workflow: [],
					secretsProviderConnection: [],
				},
			},
		},
	});

const makeRule = (overrides: Partial<RoleMappingRuleResponse> = {}): RoleMappingRuleResponse => ({
	id: 'rule-1',
	expression: '',
	role: '',
	type: 'instance',
	order: 0,
	projectIds: [],
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	...overrides,
});

const renderRow = (props: Record<string, unknown>) =>
	createComponentRenderer(RuleRow, { pinia: pinia() })({
		props: { priority: 1, ...props },
	});

describe('RuleRow — assign dropdown', () => {
	beforeEach(() => {
		vi.mocked(hasPermission).mockReturnValue(true);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('offers Block access on an instance rule', () => {
		renderRow({ rule: makeRule({ type: 'instance' }), type: 'instance' });

		expect(screen.getByTestId(`role-${BLOCK_ACCESS_ASSIGNMENT}`)).toBeInTheDocument();
	});

	it('emits role update with the Block access sentinel when selected', async () => {
		const { emitted } = renderRow({ rule: makeRule({ type: 'instance' }), type: 'instance' });

		await userEvent.click(screen.getByTestId(`role-${BLOCK_ACCESS_ASSIGNMENT}`));

		expect(emitted().update[0]).toEqual(['rule-1', { role: BLOCK_ACCESS_ASSIGNMENT }]);
	});

	it('does not offer Block access on a project rule', () => {
		renderRow({
			rule: makeRule({ type: 'project' }),
			type: 'project',
			projects: [{ id: 'proj-1', name: 'Project One' }],
		});

		// Project rules use the project-role select, not the instance grouped dropdown.
		expect(screen.queryByTestId(`role-${BLOCK_ACCESS_ASSIGNMENT}`)).toBeNull();
	});
});
