import userEvent from '@testing-library/user-event';
import { createPinia, setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import RunDataSearch from '@/components/RunDataSearch.vue';

const renderComponent = createComponentRenderer(RunDataSearch);
let pinia: ReturnType<typeof createPinia>;

describe('RunDataSearch', () => {
	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
	});

	it('should not be focused on keyboard shortcut when area is not active', async () => {
		const { emitted } = renderComponent({
			pinia,
			props: {
				modelValue: '',
			},
		});

		await userEvent.keyboard('/');
		expect(emitted().focus).not.toBeDefined();
	});

	it('should be focused on click regardless of active area and keyboard shortcut should work after', async () => {
		const { getByRole, emitted, rerender } = renderComponent({
			pinia,
			props: {
				modelValue: '',
			},
		});

		await userEvent.click(getByRole('textbox'));
		expect(emitted().focus).toHaveLength(1);
		await userEvent.click(document.body);

		await rerender({ isAreaActive: true });
		await userEvent.keyboard('/');
		expect(emitted().focus).toHaveLength(2);
	});

	it('should be focused twice if area is already active', async () => {
		const { getByRole, emitted } = renderComponent({
			pinia,
			props: {
				modelValue: '',
				isAreaActive: true,
			},
		});

		await userEvent.click(getByRole('textbox'));
		expect(emitted().focus).toHaveLength(1);
		await userEvent.click(document.body);

		await userEvent.keyboard('/');
		expect(emitted().focus).toHaveLength(2);
	});

	it('should select all text when focused', async () => {
		const { getByRole, emitted } = renderComponent({
			pinia,
			props: {
				modelValue: '',
				isAreaActive: true,
			},
		});

		const input = getByRole<HTMLInputElement>('textbox');

		await userEvent.click(input);
		expect(emitted().focus).toHaveLength(1);
		await userEvent.type(input, 'test');

		await userEvent.click(document.body);
		await userEvent.click(input);
		expect(emitted().focus).toHaveLength(2);

		const selectionStart = input.selectionStart;
		const selectionEnd = input.selectionEnd;
		const isSelected = selectionStart === 0 && selectionEnd === input.value.length;

		expect(isSelected).toBe(true);
	});

	it('should not be focused on keyboard shortcut when a contenetEditable element is active', async () => {
		const { getByTestId } = createComponentRenderer({
			components: {
				RunDataSearch,
			},
			template: `
				<div>
					<div data-test-id="mock-contenteditable" contenteditable="true"></div>
					<RunDataSearch
						v-model="modelValue"
						:isAreaActive="isAreaActive"
					/>
				</div>
			`,
			props: {
				modelValue: {
					type: String,
					default: '',
				},
				isAreaActive: {
					type: Boolean,
					default: true,
				},
			},
		})({
			pinia,
		});

		const user = userEvent.setup();
		const contentEditableElement = getByTestId('mock-contenteditable');
		await user.click(contentEditableElement);
		expect(document.activeElement).toBe(contentEditableElement);
		await user.type(contentEditableElement, '/');
		expect(contentEditableElement.textContent).toBe('/');
		expect(getByTestId('ndv-search')).not.toHaveFocus();
	});
});
