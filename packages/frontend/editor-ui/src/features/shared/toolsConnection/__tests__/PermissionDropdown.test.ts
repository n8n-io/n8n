import { fireEvent, screen } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import PermissionDropdown from '../PermissionDropdown.vue';

const renderComponent = createComponentRenderer(PermissionDropdown);

describe('PermissionDropdown', () => {
	it('shows the selected permission and emits a new selection', async () => {
		const { emitted, getByRole } = renderComponent({
			props: { modelValue: 'require_approval' },
		});

		await fireEvent.click(getByRole('button', { name: 'Ask first' }));
		await fireEvent.click(screen.getByRole('menuitem', { name: 'Block' }));

		expect(emitted()['update:modelValue']).toEqual([['blocked']]);
	});

	it('shows Custom without adding it as a menu item', async () => {
		const { getByRole, queryByRole } = renderComponent({
			props: { modelValue: 'always_allow', custom: true },
		});

		await fireEvent.click(getByRole('button', { name: 'Custom' }));

		expect(queryByRole('menuitem', { name: 'Custom' })).not.toBeInTheDocument();
	});

	it('disables the trigger', () => {
		const { getByRole } = renderComponent({
			props: { modelValue: 'blocked', disabled: true },
		});

		expect(getByRole('button', { name: 'Block' })).toBeDisabled();
	});
});
