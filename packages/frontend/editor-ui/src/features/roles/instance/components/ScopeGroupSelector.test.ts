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

		it('renders the project-roles warning when only role:manageProject is selected', () => {
			const { getByTestId } = renderComponent(ScopeGroupSelector, {
				props: { modelValue: ['role:read', 'role:manageProject'] },
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

	describe('settings "Manage all settings" select-all behaviour', () => {
		it('checks MCP and AI Assistant use/manage when "Manage all settings" is toggled on', async () => {
			const { getByTestId, emitted } = renderComponent(ScopeGroupSelector, {
				props: { modelValue: [] },
			});

			await userEvent.click(getByTestId('scope-option-settings-manage'));

			await waitFor(() => expect(emitted()['update:modelValue']).toBeTruthy());
			const [scopes] = emitted()['update:modelValue'][0] as [string[]];
			expect(scopes).toEqual(
				expect.arrayContaining([
					'mcp:manage',
					'mcp:oauth',
					'mcpApiKey:create',
					'mcpApiKey:rotate',
					'aiAssistant:manage',
					'instanceAi:manage',
					'instanceAi:message',
				]),
			);
		});

		it('keeps all four MCP/AI Assistant checkboxes enabled (not implied) when "Manage all settings" is checked', () => {
			const { getByTestId } = renderComponent(ScopeGroupSelector, {
				props: { modelValue: [...INSTANCE_SCOPE_GROUPS.settings.Manage] },
			});
			for (const testId of [
				'scope-option-settings-mcp-use',
				'scope-option-settings-mcp-manage',
				'scope-option-settings-aiassistant-use',
				'scope-option-settings-aiassistant-manage',
			]) {
				const checkbox = getByTestId(testId);
				expect(checkbox.getAttribute('aria-checked')).toBe('true');
				expect(checkbox.hasAttribute('disabled')).toBe(false);
			}
		});

		it('unchecking "Mcp use" (not just "Mcp manage") turns "Manage all settings" off', async () => {
			const { getByTestId, emitted, rerender } = renderComponent(ScopeGroupSelector, {
				props: { modelValue: [...INSTANCE_SCOPE_GROUPS.settings.Manage] },
			});

			await userEvent.click(getByTestId('scope-option-settings-mcp-use'));

			await waitFor(() => expect(emitted()['update:modelValue']).toBeTruthy());
			const [scopes] = emitted()['update:modelValue'][0] as [string[]];
			expect(scopes).not.toContain('mcp:oauth');
			expect(scopes).toContain('securitySettings:manage');

			// v-model doesn't auto-sync in tests — re-render with the emitted value to
			// prove the effect the title claims: the checkbox itself loses its checked state.
			await rerender({ modelValue: scopes });
			expect(getByTestId('scope-option-settings-manage').getAttribute('aria-checked')).not.toBe(
				'true',
			);
		});

		it('unchecking "Mcp manage" turns "Manage all settings" off while "Manage all settings" was checked', async () => {
			const { getByTestId, emitted, rerender } = renderComponent(ScopeGroupSelector, {
				props: { modelValue: [...INSTANCE_SCOPE_GROUPS.settings.Manage] },
			});

			await userEvent.click(getByTestId('scope-option-settings-mcp-manage'));

			await waitFor(() => expect(emitted()['update:modelValue']).toBeTruthy());
			const [scopes] = emitted()['update:modelValue'][0] as [string[]];
			expect(scopes).not.toContain('mcp:manage');
			expect(scopes).toContain('securitySettings:manage');

			await rerender({ modelValue: scopes });
			expect(getByTestId('scope-option-settings-manage').getAttribute('aria-checked')).not.toBe(
				'true',
			);
		});
	});

	describe('mandatory "Users: View" option', () => {
		// The caller (InstanceRoleView's `withMandatoryInstanceScopes`) is what
		// guarantees these scopes are always in `modelValue` — the selector itself
		// stays a pure function of its props, same as every other option.
		const withUserView = [...INSTANCE_SCOPE_GROUPS.user.View];

		it('renders checked and disabled', () => {
			const { getByTestId } = renderComponent(ScopeGroupSelector, {
				props: { modelValue: withUserView },
			});
			const userView = getByTestId('scope-option-user-view');
			expect(userView.getAttribute('aria-checked')).toBe('true');
			expect(userView.hasAttribute('disabled')).toBe(true);
		});

		it('does not emit an update when clicked', async () => {
			const { getByTestId, emitted } = renderComponent(ScopeGroupSelector, {
				props: { modelValue: withUserView },
			});

			await userEvent.click(getByTestId('scope-option-user-view'));

			expect(emitted()['update:modelValue']).toBeFalsy();
		});
	});
});
