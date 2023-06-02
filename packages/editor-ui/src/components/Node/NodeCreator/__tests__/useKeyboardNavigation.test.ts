import { render } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { defineComponent, computed } from 'vue';
import { useKeyboardNavigation } from '../composables/useKeyboardNavigation';
import { PiniaVuePlugin, createPinia } from 'pinia';

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
		mounted() {
			this.attachKeydownEvent();
		},
	});

	const renderTestComponent = () => {
		return render(TestComponent, { pinia: createPinia() }, (vue) => {
			vue.use(PiniaVuePlugin);
		});
	};

	afterAll(() => {
		eventHookSpy.mockClear();
	});

	test('ArrowDown moves to the next item, cycling after last item', async () => {
		const { container } = renderTestComponent();

		expect(container.querySelector('[data-keyboard-nav-id="item1"]')).toHaveClass('active');
		await userEvent.keyboard('{arrowdown}');
		await userEvent.keyboard('{arrowdown}');
		expect(container.querySelector('[data-keyboard-nav-id="item3"]')).toHaveClass('active');
		await userEvent.keyboard('{arrowdown}');
		expect(container.querySelector('[data-keyboard-nav-id="item1"]')).toHaveClass('active');
	});

	test('ArrowUp moves to the previous item, cycling after firstitem', async () => {
		const { container } = renderTestComponent();

		expect(container.querySelector('[data-keyboard-nav-id="item1"]')).toHaveClass('active');
		await userEvent.keyboard('{arrowup}');
		expect(container.querySelector('[data-keyboard-nav-id="item3"]')).toHaveClass('active');
		await userEvent.keyboard('{arrowup}');
		expect(container.querySelector('[data-keyboard-nav-id="item2"]')).toHaveClass('active');
		await userEvent.keyboard('{arrowup}');
		expect(container.querySelector('[data-keyboard-nav-id="item1"]')).toHaveClass('active');
	});

	test('Key hooks are executed', async () => {
		renderTestComponent();

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
