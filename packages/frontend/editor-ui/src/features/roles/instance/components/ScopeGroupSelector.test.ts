import { renderComponent } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import ScopeGroupSelector from './ScopeGroupSelector.vue';
import { INSTANCE_SCOPE_GROUP_LIST, INSTANCE_SCOPE_GROUPS } from '../instanceRoleScopes';
import { CUSTOM_ROLES_DOCS_URL } from '@/app/constants';

const totalOptions = INSTANCE_SCOPE_GROUP_LIST.reduce((sum, g) => sum + g.options.length, 0);

describe('ScopeGroupSelector', () => {
	it('renders one checkbox per option and no leaf scopes', () => {
		const { container } = renderComponent(ScopeGroupSelector, { props: { modelValue: [] } });
		const checkboxes = container.querySelectorAll('[data-test-id^="scope-option-"]');
		expect(checkboxes).toHaveLength(totalOptions);
		// leaf scopes are never rendered as their own controls
		expect(container.querySelector('[data-test-id^="scope-checkbox-"]')).toBeNull();
	});

	it('renders an unchecked option for an empty scope list', () => {
		const { getByTestId } = renderComponent(ScopeGroupSelector, { props: { modelValue: [] } });
		expect(getByTestId('scope-option-tag-manage').getAttribute('aria-checked')).toBe('false');
	});

	it('renders a checked option when the full resolved set is present', () => {
		const { getByTestId } = renderComponent(ScopeGroupSelector, {
			props: {
				modelValue: ['tag:read', 'tag:list', 'tag:create', 'tag:update', 'tag:delete'],
			},
		});
		expect(getByTestId('scope-option-tag-manage').getAttribute('aria-checked')).toBe('true');
	});

	it('renders indeterminate for a partial subset of an option (round-trip)', () => {
		const { getByTestId } = renderComponent(ScopeGroupSelector, {
			props: { modelValue: ['tag:read'] },
		});
		expect(getByTestId('scope-option-tag-manage').getAttribute('aria-checked')).toBe('mixed');
	});

	it('emits the full resolved scope set when toggling an option on', async () => {
		const { getByTestId, emitted } = renderComponent(ScopeGroupSelector, {
			props: { modelValue: [] },
		});

		await userEvent.click(getByTestId('scope-option-tag-manage'));

		await waitFor(() => expect(emitted()['update:modelValue']).toBeTruthy());
		const [scopes] = emitted()['update:modelValue'][0] as [string[]];
		expect(scopes).toEqual(
			expect.arrayContaining(['tag:read', 'tag:list', 'tag:create', 'tag:update', 'tag:delete']),
		);
		expect(scopes).toHaveLength(5);
	});

	it('emits the option scopes removed when toggling a checked option off', async () => {
		const { getByTestId, emitted } = renderComponent(ScopeGroupSelector, {
			props: {
				modelValue: ['tag:read', 'tag:list', 'tag:create', 'tag:update', 'tag:delete', 'user:read'],
			},
		});

		await userEvent.click(getByTestId('scope-option-tag-manage'));

		await waitFor(() => expect(emitted()['update:modelValue']).toBeTruthy());
		const [scopes] = emitted()['update:modelValue'][0] as [string[]];
		expect(scopes).toEqual(['user:read']);
	});

	it('completes the full resolved set when toggling an indeterminate option', async () => {
		const { getByTestId, emitted } = renderComponent(ScopeGroupSelector, {
			props: { modelValue: ['tag:read'] },
		});

		await userEvent.click(getByTestId('scope-option-tag-manage'));

		await waitFor(() => expect(emitted()['update:modelValue']).toBeTruthy());
		const [scopes] = emitted()['update:modelValue'][0] as [string[]];
		expect(scopes).toEqual(
			expect.arrayContaining(['tag:read', 'tag:list', 'tag:create', 'tag:update', 'tag:delete']),
		);
		expect(scopes).toHaveLength(5);
	});

	it('does not emit when readonly', async () => {
		const { getByTestId, emitted } = renderComponent(ScopeGroupSelector, {
			props: { modelValue: [], readonly: true },
		});

		await userEvent.click(getByTestId('scope-option-tag-manage'));

		expect(emitted()['update:modelValue']).toBeFalsy();
	});

	it('renders the api key "Manage own" / "Manage all" options', () => {
		const { getByTestId } = renderComponent(ScopeGroupSelector, { props: { modelValue: [] } });
		expect(getByTestId('scope-option-apiKey-manage-own')).toBeTruthy();
		expect(getByTestId('scope-option-apiKey-manage-all')).toBeTruthy();
	});

	it('labels the roles "Manage" option as "Manage all roles (instance and project)"', () => {
		const { getByText } = renderComponent(ScopeGroupSelector, { props: { modelValue: [] } });
		expect(getByText('Manage all roles (instance and project)')).toBeTruthy();
	});

	describe('privilege-escalation warning', () => {
		it('renders the members warning when a user scope is selected', () => {
			const { getByTestId } = renderComponent(ScopeGroupSelector, {
				props: { modelValue: [...INSTANCE_SCOPE_GROUPS.user.Manage] },
			});
			expect(getByTestId('scope-escalation-warning-user')).toBeTruthy();
		});

		it('renders the roles warning when role:manage is selected', () => {
			const { getByTestId } = renderComponent(ScopeGroupSelector, {
				props: { modelValue: ['role:read', 'role:manage'] },
			});
			expect(getByTestId('scope-escalation-warning-role')).toBeTruthy();
		});

		it('does not render a warning for a non-escalating scope', () => {
			const { queryByTestId } = renderComponent(ScopeGroupSelector, {
				props: { modelValue: ['tag:read'] },
			});
			expect(queryByTestId('scope-escalation-warning-user')).toBeNull();
			expect(queryByTestId('scope-escalation-warning-role')).toBeNull();
		});

		it('does not render the warning when readonly', () => {
			const { queryByTestId } = renderComponent(ScopeGroupSelector, {
				props: { modelValue: [...INSTANCE_SCOPE_GROUPS.user.Manage], readonly: true },
			});
			expect(queryByTestId('scope-escalation-warning-user')).toBeNull();
		});

		it('links the docs to CUSTOM_ROLES_DOCS_URL', () => {
			const { getByTestId } = renderComponent(ScopeGroupSelector, {
				props: { modelValue: [...INSTANCE_SCOPE_GROUPS.user.Manage] },
			});
			const link = getByTestId('scope-escalation-warning-user').querySelector('a');
			expect(link?.getAttribute('href')).toBe(CUSTOM_ROLES_DOCS_URL);
		});
	});

	describe('apiKey implied-state behaviour', () => {
		const allScopes = [...INSTANCE_SCOPE_GROUPS.apiKey['Manage all']];
		const ownScopes = [...INSTANCE_SCOPE_GROUPS.apiKey['Manage own']];

		it('shows "Manage own" as checked and disabled when "Manage all" is selected', () => {
			const { getByTestId } = renderComponent(ScopeGroupSelector, {
				props: { modelValue: allScopes },
			});
			const manageOwn = getByTestId('scope-option-apiKey-manage-own');
			expect(manageOwn.getAttribute('aria-checked')).toBe('true');
			expect(manageOwn.hasAttribute('disabled')).toBe(true);
		});

		it('shows "Manage all" as checked and not disabled when "Manage all" is selected', () => {
			const { getByTestId } = renderComponent(ScopeGroupSelector, {
				props: { modelValue: allScopes },
			});
			const manageAll = getByTestId('scope-option-apiKey-manage-all');
			expect(manageAll.getAttribute('aria-checked')).toBe('true');
			expect(manageAll.hasAttribute('disabled')).toBe(false);
		});

		it('shows "Manage all" as unchecked (not indeterminate) when only "Manage own" is selected', () => {
			const { getByTestId } = renderComponent(ScopeGroupSelector, {
				props: { modelValue: ownScopes },
			});
			expect(getByTestId('scope-option-apiKey-manage-all').getAttribute('aria-checked')).toBe(
				'false',
			);
		});
	});
});
