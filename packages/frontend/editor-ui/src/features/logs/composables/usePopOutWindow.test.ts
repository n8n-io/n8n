/* eslint-disable vue/one-component-per-file */
import { computed, defineComponent, h, ref } from 'vue';
import { usePopOutWindow } from './usePopOutWindow';
import { waitFor } from '@testing-library/vue';
import { renderComponent } from '@/__tests__/render';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { mock } from 'vitest-mock-extended';
import { Mock } from 'vitest';

describe(usePopOutWindow, () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
	});

	describe('isPoppedOut', () => {
		beforeEach(() => {
			Object.assign(window, {
				open: () =>
					({
						document: { body: { append: vi.fn() } },
						addEventListener: vi.fn(),
						close: vi.fn(),
					}) as unknown as Window,
			});
		});

		it('should be set to true when popped out', async () => {
			const shouldPopOut = ref(false);
			const MyComponent = defineComponent({
				setup() {
					const container = ref<HTMLDivElement | null>(null);
					const content = ref<HTMLDivElement | null>(null);
					const popOutWindow = usePopOutWindow({
						title: computed(() => ''),
						container,
						content,
						shouldPopOut: computed(() => shouldPopOut.value),
						onRequestClose: vi.fn(),
					});

					return () =>
						h(
							'div',
							{ ref: container },
							h('div', { ref: content }, String(popOutWindow.isPoppedOut.value)),
						);
				},
			});

			const { queryByText } = renderComponent(MyComponent);

			expect(queryByText('false')).toBeInTheDocument();

			shouldPopOut.value = true;

			await waitFor(() => expect(queryByText('true')).toBeInTheDocument());
		});
	});

	describe('onPopOutResize', () => {
		it('should call onPopOutResize on initial pop out and on window resize', async () => {
			const mockWindow = mock<Window>({
				document: {
					body: { append: vi.fn() },
					head: { appendChild: vi.fn() },
				},
				addEventListener: vi.fn(),
				close: vi.fn(),
			});

			Object.assign(window, {
				open: () => mockWindow,
			});

			const shouldPopOut = ref(false);
			const onPopOutResize = vi.fn();

			const MyComponent = defineComponent({
				setup() {
					const container = ref<HTMLDivElement | null>(null);
					const content = ref<HTMLDivElement | null>(null);
					usePopOutWindow({
						title: computed(() => 'Test'),
						container,
						content,
						shouldPopOut: computed(() => shouldPopOut.value),
						onRequestClose: vi.fn(),
						onPopOutResize,
					});

					return () => h('div', { ref: container }, h('div', { ref: content }, 'content'));
				},
			});

			renderComponent(MyComponent);

			// Initially onPopOutResize should not be called
			expect(onPopOutResize).not.toHaveBeenCalled();

			// Trigger pop out
			shouldPopOut.value = true;

			await waitFor(() => {
				// Should be called once initially when popped out
				expect(onPopOutResize).toHaveBeenCalledTimes(1);
				expect(onPopOutResize).toHaveBeenCalledWith({ popOutWindow: mockWindow });
			});

			// Simulate window resize event
			const resizeCallback = (mockWindow.addEventListener as Mock).mock.calls.find(
				(call) => call[0] === 'resize',
			)?.[1] as () => void;

			expect(resizeCallback).toBeDefined();

			// Call the resize callback
			resizeCallback();

			// Should be called again on resize
			expect(onPopOutResize).toHaveBeenCalledTimes(2);
			expect(onPopOutResize).toHaveBeenLastCalledWith({ popOutWindow: mockWindow });
		});
	});
});
