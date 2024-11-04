import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import ExpressionEditorModalInput from '@/components/ExpressionEditorModal/ExpressionEditorModalInput.vue';
import { type TestingPinia, createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { waitFor } from '@testing-library/vue';

describe('ExpressionParameterInput', () => {
	const renderComponent = createComponentRenderer(ExpressionEditorModalInput);
	let pinia: TestingPinia;

	beforeEach(() => {
		pinia = createTestingPinia();
		setActivePinia(pinia);
	});

	test.each([
		['not be editable', 'readonly', true, ''],
		['be editable', 'not readonly', false, 'test'],
	])('should %s when %s', async (_, __, isReadOnly, expected) => {
		const { getByRole } = renderComponent({
			props: {
				modelValue: '',
				path: '',
				isReadOnly,
			},
		});

		const textbox = await waitFor(() => getByRole('textbox'));
		await userEvent.type(textbox, 'test');
		expect(getByRole('textbox')).toHaveTextContent(expected);
	});
});
