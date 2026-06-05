import { createComponentRenderer } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';

import ApiKeyScopes from './ApiKeyScopes.vue';

const availableScopes = ['user:create', 'user:list'];

const renderComponent = createComponentRenderer(ApiKeyScopes, {
	props: {
		modelValue: ['user:create'],
		availableScopes,
	},
});

describe('ApiKeyScopes', () => {
	it('renders select-all as a standalone checkbox outside the scopes select', async () => {
		const { emitted, getByRole, getByTestId } = renderComponent();

		const selectAllCheckbox = getByRole('checkbox', { name: /select all scopes/i });
		const scopesSelect = getByTestId('scopes-select');

		expect(selectAllCheckbox).toBeInTheDocument();
		expect(scopesSelect).not.toContainElement(selectAllCheckbox);

		await userEvent.click(selectAllCheckbox);

		expect(emitted('update:modelValue')).toContainEqual([availableScopes]);
	});

	it('clears all scopes when the standalone select-all checkbox is unchecked', async () => {
		const { emitted, getByRole } = renderComponent({
			props: {
				modelValue: availableScopes,
			},
		});

		const selectAllCheckbox = getByRole('checkbox', { name: /select all scopes/i });

		expect(selectAllCheckbox).toBeChecked();

		await userEvent.click(selectAllCheckbox);

		expect(emitted('update:modelValue')).toContainEqual([[]]);
	});
});
