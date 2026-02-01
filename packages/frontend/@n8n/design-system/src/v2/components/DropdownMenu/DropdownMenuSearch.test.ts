import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';
import { ref } from 'vue';

import DropdownMenuSearch from './DropdownMenuSearch.vue';

describe('v2/components/DropdownMenuSearch', () => {
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
		it('should emit key:escape on Escape key', async () => {
			const wrapper = render(DropdownMenuSearch);

			const input = wrapper.container.querySelector('input')!;
			await userEvent.click(input);
			await userEvent.keyboard('{Escape}');

			await waitFor(() => {
				expect(wrapper.emitted('key:escape')).toBeTruthy();
			});
		});

		it('should emit key:navigate down on Tab key', async () => {
			const wrapper = render(DropdownMenuSearch);

			const input = wrapper.container.querySelector('input')!;
			await userEvent.click(input);
			await userEvent.keyboard('{Tab}');

			await waitFor(() => {
				expect(wrapper.emitted('key:navigate')).toBeTruthy();
				expect(wrapper.emitted('key:navigate')?.[0]).toEqual(['down']);
			});
		});

		it('should emit key:navigate down on ArrowDown key', async () => {
			const wrapper = render(DropdownMenuSearch);

			const input = wrapper.container.querySelector('input')!;
			await userEvent.click(input);
			await userEvent.keyboard('{ArrowDown}');

			await waitFor(() => {
				expect(wrapper.emitted('key:navigate')).toBeTruthy();
				expect(wrapper.emitted('key:navigate')?.[0]).toEqual(['down']);
			});
		});

		it('should emit key:navigate up on ArrowUp key', async () => {
			const wrapper = render(DropdownMenuSearch);

			const input = wrapper.container.querySelector('input')!;
			await userEvent.click(input);
			await userEvent.keyboard('{ArrowUp}');

			await waitFor(() => {
				expect(wrapper.emitted('key:navigate')).toBeTruthy();
				expect(wrapper.emitted('key:navigate')?.[0]).toEqual(['up']);
			});
		});

		it('should emit key:enter on Enter key', async () => {
			const wrapper = render(DropdownMenuSearch);

			const input = wrapper.container.querySelector('input')!;
			await userEvent.click(input);
			await userEvent.keyboard('{Enter}');

			await waitFor(() => {
				expect(wrapper.emitted('key:enter')).toBeTruthy();
			});
		});

		it('should emit key:arrow-right when cursor is at end of input', async () => {
			const wrapper = render(DropdownMenuSearch, {
				props: {
					modelValue: 'text',
				},
			});

			const input = wrapper.container.querySelector('input')!;
			await userEvent.click(input);
			// Move cursor to end
			input.setSelectionRange(4, 4);
			await userEvent.keyboard('{ArrowRight}');

			await waitFor(() => {
				expect(wrapper.emitted('key:arrow-right')).toBeTruthy();
			});
		});

		it('should not emit key:arrow-right when cursor is not at end', async () => {
			const wrapper = render(DropdownMenuSearch, {
				props: {
					modelValue: 'text',
				},
			});

			const input = wrapper.container.querySelector('input')!;
			await userEvent.click(input);
			// Move cursor to beginning
			input.setSelectionRange(0, 0);
			await userEvent.keyboard('{ArrowRight}');

			await waitFor(() => {
				expect(wrapper.emitted('key:arrow-right')).toBeFalsy();
			});
		});

		it('should emit key:arrow-left when cursor is at start of input', async () => {
			const wrapper = render(DropdownMenuSearch, {
				props: {
					modelValue: 'text',
				},
			});

			const input = wrapper.container.querySelector('input')!;
			await userEvent.click(input);
			// Move cursor to start
			input.setSelectionRange(0, 0);
			await userEvent.keyboard('{ArrowLeft}');

			await waitFor(() => {
				expect(wrapper.emitted('key:arrow-left')).toBeTruthy();
			});
		});

		it('should not emit key:arrow-left when cursor is not at start', async () => {
			const wrapper = render(DropdownMenuSearch, {
				props: {
					modelValue: 'text',
				},
			});

			const input = wrapper.container.querySelector('input')!;
			await userEvent.click(input);
			// Move cursor to end
			input.setSelectionRange(4, 4);
			await userEvent.keyboard('{ArrowLeft}');

			await waitFor(() => {
				expect(wrapper.emitted('key:arrow-left')).toBeFalsy();
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
