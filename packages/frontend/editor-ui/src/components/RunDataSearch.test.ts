import userEvent from '@testing-library/user-event';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import RunDataSearch from '@/components/RunDataSearch.vue';

const renderComponent = createComponentRenderer(RunDataSearch);
let pinia: ReturnType<typeof createPinia>;

describe('RunDataSearch', () => {
	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
	});

	it.each([
		{ prop: '/' as const, typed: '/' },
		{ prop: 'ctrl+f' as const, typed: '{Control>}f' },
	])(
		'should be focused on keyboard event $typed when shortcut prop is $prop',
		async ({ prop, typed }) => {
			const { emitted } = renderComponent({
				pinia,
				props: {
					modelValue: '',
					shortcut: prop,
				},
			});

			await userEvent.keyboard(typed);
			expect(emitted().focus).toBeDefined();
		},
	);

	it.each([
		{ prop: undefined, typed: '/', description: 'shortcut prop is undefined' },
		{
			prop: '/' as const,
			typed: '{Control>}f',
			description: 'shortcut prop is / but key event is Ctrl+F',
		},
		{
			prop: 'ctrl+f' as const,
			typed: '/',
			description: 'shortcut prop is ctrl+f but key event is /',
		},
	])('should not be focused on keyboard shortcut when $description', async ({ prop, typed }) => {
		const { emitted } = renderComponent({
			pinia,
			props: {
				modelValue: '',
				shortcut: prop,
			},
		});

		await userEvent.keyboard(typed);
		expect(emitted().focus).not.toBeDefined();
	});

	it('should be focused on click regardless of shortcut prop', async () => {
		const { getByRole, emitted } = renderComponent({
			pinia,
			props: {
				modelValue: '',
				shortcut: undefined,
			},
		});

		await userEvent.click(getByRole('textbox'));
		expect(emitted().focus).toHaveLength(1);
	});

	it('should be focused twice if area is already active', async () => {
		const { getByRole, emitted } = renderComponent({
			pinia,
			props: {
				modelValue: '',
				shortcut: '/',
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
						shortcut="/"
					/>
				</div>
			`,
			props: {
				modelValue: {
					type: String,
					default: '',
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

	it('should blur input when ESC key is pressed while search is focused', async () => {
		const { getByRole } = renderComponent({
			pinia,
			props: {
				modelValue: 'test search',
				shortcut: '/',
			},
		});

		const input = getByRole<HTMLInputElement>('textbox');

		await userEvent.click(input);
		expect(input).toHaveFocus();

		await userEvent.keyboard('{Escape}');

		expect(input).not.toHaveFocus();
	});

	it('should restore focus to previously focused element after ESC key', async () => {
		const { getByTestId } = createComponentRenderer({
			components: {
				RunDataSearch,
			},
			template: `
				<div>
					<button data-test-id="previous-button">Previous Element</button>
					<RunDataSearch
						v-model="modelValue"
						shortcut="/"
					/>
				</div>
			`,
		})({
			pinia,
		});

		const previousButton = getByTestId('previous-button');
		const searchInput = getByTestId('ndv-search');

		await userEvent.click(previousButton);
		expect(previousButton).toHaveFocus();

		await userEvent.keyboard('/');
		expect(searchInput).toHaveFocus();

		await userEvent.keyboard('{Escape}');

		expect(previousButton).toHaveFocus();
		expect(searchInput).not.toHaveFocus();
	});

	it('should remain open when text is cleared by typing to the input', async () => {
		const { getByRole, container } = renderComponent({
			pinia,
			props: { modelValue: 'test' },
		});

		const input = getByRole<HTMLInputElement>('textbox');

		await userEvent.click(input);
		expect(container.querySelector('.ioSearchOpened')).toBeInTheDocument();

		await userEvent.clear(input);
		await nextTick();
		expect(container.querySelector('.ioSearchOpened')).toBeInTheDocument();
	});

	it('should close itself when modelValue prop is updated to be an empty string', async () => {
		const { getByRole, container, rerender } = renderComponent({
			pinia,
			props: { modelValue: 'test' },
		});

		const input = getByRole<HTMLInputElement>('textbox');

		await userEvent.click(input);
		expect(container.querySelector('.ioSearchOpened')).toBeInTheDocument();

		await rerender({ modelValue: '' });
		expect(container.querySelector('.ioSearchOpened')).not.toBeInTheDocument();
	});
});
