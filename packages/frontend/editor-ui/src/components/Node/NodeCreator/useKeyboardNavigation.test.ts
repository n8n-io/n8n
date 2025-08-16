import userEvent from '@testing-library/user-event';
import { defineComponent, computed } from 'vue';
import { useKeyboardNavigation } from './composables/useKeyboardNavigation';
import { createComponentRenderer } from '@/__tests__/render';
import { createPinia } from 'pinia';

const eventHookSpy = vi.fn();
describe('useKeyboardNavigation', () => {
	const TestComponent = defineComponent({
		setup() {
			const { attachKeydownEvent, setActiveItemId, detachKeydownEvent, registerKeyHook } =
				useKeyboardNavigation();

			setActiveItemId('item1');
			const activeItemId = computed(() => useKeyboardNavigation().activeItemId);

			registerKeyHook('testKeys', {
				keyboardKeys: ['ArrowDown', 'ArrowUp', 'Enter', 'ArrowRight', 'ArrowLeft', 'Escape'],
				handler: eventHookSpy,
			});

			return { attachKeydownEvent, detachKeydownEvent, setActiveItemId, activeItemId };
		},
		mounted() {
			this.attachKeydownEvent();
		},
		template: `
			<span>
				<div
					v-for="item in 3"
					:class="{'active': activeItemId === 'item' + item}"
					:key="'item' + item"
					v-text="activeItemId"
					:data-keyboard-nav-id="'item' + item"
					data-keyboard-nav-type="node"
				/>
			</span>
		`,
	});

	const renderComponent = createComponentRenderer(TestComponent, {
		pinia: createPinia(),
	});

	afterAll(() => {
		eventHookSpy.mockClear();
	});

	test('ArrowDown moves to the next item, cycling after last item', async () => {
		const { container } = renderComponent();

		expect(container.querySelector('[data-keyboard-nav-id="item1"]')).toHaveClass('active');
		await userEvent.keyboard('{arrowdown}');
		await userEvent.keyboard('{arrowdown}');
		expect(container.querySelector('[data-keyboard-nav-id="item3"]')).toHaveClass('active');
		await userEvent.keyboard('{arrowdown}');
		expect(container.querySelector('[data-keyboard-nav-id="item1"]')).toHaveClass('active');
	});

	test('ArrowUp moves to the previous item, cycling after firstitem', async () => {
		const { container } = renderComponent();

		expect(container.querySelector('[data-keyboard-nav-id="item1"]')).toHaveClass('active');
		await userEvent.keyboard('{arrowup}');
		expect(container.querySelector('[data-keyboard-nav-id="item3"]')).toHaveClass('active');
		await userEvent.keyboard('{arrowup}');
		expect(container.querySelector('[data-keyboard-nav-id="item2"]')).toHaveClass('active');
		await userEvent.keyboard('{arrowup}');
		expect(container.querySelector('[data-keyboard-nav-id="item1"]')).toHaveClass('active');
	});

	test('Key hooks are executed', async () => {
		renderComponent();

		await userEvent.keyboard('{arrowup}');
		expect(eventHookSpy).toHaveBeenCalledWith('item3', 'ArrowUp');
		await userEvent.keyboard('{arrowdown}');
		expect(eventHookSpy).toHaveBeenCalledWith('item1', 'ArrowDown');
		await userEvent.keyboard('{arrowleft}');
		expect(eventHookSpy).toHaveBeenCalledWith('item1', 'ArrowLeft');
		await userEvent.keyboard('{arrowright}');
		expect(eventHookSpy).toHaveBeenCalledWith('item1', 'ArrowRight');
		await userEvent.keyboard('{enter}');
		expect(eventHookSpy).toHaveBeenCalledWith('item1', 'Enter');
		await userEvent.keyboard('{escape}');
		expect(eventHookSpy).toHaveBeenCalledWith('item1', 'Escape');
	});
});

describe('shouldAllowNativeInputBehavior', () => {
	const InputTestComponent = defineComponent({
		setup() {
			const { attachKeydownEvent, detachKeydownEvent } = useKeyboardNavigation();
			return { attachKeydownEvent, detachKeydownEvent };
		},
		mounted() {
			this.attachKeydownEvent();
		},
		template: `
			<div>
				<input
					id="search-input"
					type="text"
					placeholder="Search..."
					data-test-id="search-input"
				/>
				<textarea
					id="text-area"
					placeholder="Enter text..."
					data-test-id="text-area"
				></textarea>
				<div
					data-keyboard-nav-id="item1"
					data-keyboard-nav-type="node"
					data-test-id="nav-item"
				>
					Item 1
				</div>
			</div>
		`,
	});

	const renderInputComponent = createComponentRenderer(InputTestComponent, {
		pinia: createPinia(),
	});

	test('allows left/right arrows for cursor movement in non-empty input', async () => {
		const { container } = renderInputComponent();
		const input = container.querySelector('#search-input') as HTMLInputElement;

		// Type some text in the input
		await userEvent.click(input);
		await userEvent.type(input, 'hello');

		// Position cursor at the beginning
		input.setSelectionRange(0, 0);
		expect(input.selectionStart).toBe(0);

		// Right arrow should move cursor (native behavior)
		await userEvent.keyboard('{arrowright}');
		expect(input.selectionStart).toBe(1);

		// Left arrow should move cursor (native behavior)
		await userEvent.keyboard('{arrowleft}');
		expect(input.selectionStart).toBe(0);
	});

	test('allows left/right arrows for cursor movement in non-empty textarea', async () => {
		const { container } = renderInputComponent();
		const textarea = container.querySelector('#text-area') as HTMLTextAreaElement;

		// Type some text in the textarea
		await userEvent.click(textarea);
		await userEvent.type(textarea, 'hello world');

		// Position cursor at the beginning
		textarea.setSelectionRange(0, 0);
		expect(textarea.selectionStart).toBe(0);

		// Right arrow should move cursor (native behavior)
		await userEvent.keyboard('{arrowright}');
		expect(textarea.selectionStart).toBe(1);
	});

	test('prevents left/right arrows in empty input (allows navigation)', async () => {
		const { container } = renderInputComponent();
		const input = container.querySelector('#search-input') as HTMLInputElement;

		// Focus empty input
		await userEvent.click(input);
		expect(input.value).toBe('');

		// Store original cursor position (should be 0)
		const originalPosition = input.selectionStart;
		expect(originalPosition).toBe(0);

		// Try to move cursor with right arrow - should NOT move because navigation intercepts
		await userEvent.keyboard('{arrowright}');

		// Cursor position should remain the same because preventDefault was called
		expect(input.selectionStart).toBe(originalPosition);
	});

	test('allows up/down arrows for navigation even in non-empty input', async () => {
		const { container } = renderInputComponent();
		const input = container.querySelector('#search-input') as HTMLInputElement;

		// Type some text in the input
		await userEvent.click(input);
		await userEvent.type(input, 'hello');

		// Position cursor in the middle
		input.setSelectionRange(2, 2);
		const originalPosition = input.selectionStart;

		// Down arrow should trigger navigation (preventDefault), not move cursor
		await userEvent.keyboard('{arrowdown}');

		// Cursor position should remain the same because navigation took over
		expect(input.selectionStart).toBe(originalPosition);
	});
});
