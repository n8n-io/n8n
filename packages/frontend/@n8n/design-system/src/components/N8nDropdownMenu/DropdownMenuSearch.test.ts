import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';
import { ref } from 'vue';

import DropdownMenuSearch from './DropdownMenuSearch.vue';

describe('N8nDropdownMenuSearch', () => {
	describe('rendering', () => {
		it('should render correctly', () => {
			const { container } = render(DropdownMenuSearch);

			expect(container.firstElementChild).toMatchSnapshot();
		});

		it('should render with custom placeholder', () => {
			const { container } = render(DropdownMenuSearch, {
				props: {
					placeholder: 'Type to filter...',
				},
			});

			expect(container.firstElementChild).toMatchSnapshot();
		});

		it('should render with value', () => {
			const { container } = render(DropdownMenuSearch, {
				props: {
					modelValue: 'search term',
				},
			});

			expect(container.firstElementChild).toMatchSnapshot();
		});
	});

	describe('input behavior', () => {
		it('should emit update:modelValue when typing', async () => {
			const wrapper = render(DropdownMenuSearch);

			const input = wrapper.container.querySelector('input')!;
			await userEvent.type(input, 'test');

			await waitFor(() => {
				const emits = wrapper.emitted('update:modelValue');
				expect(emits).toBeTruthy();
				// Each character typed emits an event
				expect(emits?.length).toBe(4);
				expect(emits?.[3]).toEqual(['test']);
			});
		});

		it('should display the modelValue in input', () => {
			const wrapper = render(DropdownMenuSearch, {
				props: {
					modelValue: 'initial value',
				},
			});

			const input = wrapper.container.querySelector('input')!;
			expect(input).toHaveValue('initial value');
		});
	});

	describe('keyboard events', () => {
		it('should emit keydown events', async () => {
			const wrapper = render(DropdownMenuSearch);

			const input = wrapper.container.querySelector('input')!;
			await userEvent.click(input);
			await userEvent.keyboard('{ArrowDown}');

			await waitFor(() => {
				const emits = wrapper.emitted('keydown') as Array<[KeyboardEvent]> | undefined;
				expect(emits).toBeTruthy();
				expect(emits?.[0]?.[0]).toBeInstanceOf(KeyboardEvent);
				expect(emits?.[0]?.[0].key).toBe('ArrowDown');
			});
		});

		it('should still allow printable characters to update the input', async () => {
			const wrapper = render(DropdownMenuSearch);

			const input = wrapper.container.querySelector('input')!;
			await userEvent.type(input, 'a');

			await waitFor(() => {
				const keydownEmits = wrapper.emitted('keydown') as Array<[KeyboardEvent]> | undefined;
				expect(input).toHaveValue('a');
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['a']);
				expect(keydownEmits?.[0]?.[0].key).toBe('a');
			});
		});
	});

	describe('exposed methods', () => {
		it('should expose focus method', async () => {
			const searchRef = ref<{ focus: () => void } | null>(null);

			render({
				components: { DropdownMenuSearch },
				setup() {
					return { searchRef };
				},
				template: '<DropdownMenuSearch ref="searchRef" />',
			});

			const input = document.querySelector('input')!;
			expect(document.activeElement).not.toBe(input);

			searchRef.value?.focus();

			await waitFor(() => {
				expect(document.activeElement).toBe(input);
			});
		});
	});
});
