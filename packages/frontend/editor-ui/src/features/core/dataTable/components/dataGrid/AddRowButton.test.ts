import { createComponentRenderer } from '@/__tests__/render';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { ref } from 'vue';
import AddRowButton from './AddRowButton.vue';

describe('AddRowButton', () => {
	it('updates the button when the disabled callback changes', async () => {
		const locked = ref(true);
		const onClick = vi.fn();
		const { getByRole } = createComponentRenderer(AddRowButton, {
			props: { params: { onClick, disabled: () => locked.value } },
		})();
		const button = getByRole('button');
		const user = userEvent.setup();

		expect(button).toBeDisabled();
		await user.click(button);
		expect(onClick).not.toHaveBeenCalled();

		locked.value = false;
		await waitFor(() => expect(button).toBeEnabled());
		await user.click(button);
		expect(onClick).toHaveBeenCalledOnce();

		locked.value = true;
		await waitFor(() => expect(button).toBeDisabled());
	});
});
