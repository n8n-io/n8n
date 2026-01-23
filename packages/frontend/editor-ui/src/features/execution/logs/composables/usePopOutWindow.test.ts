/* eslint-disable vue/one-component-per-file */
import { computed, defineComponent, h, ref } from 'vue';
import { usePopOutWindow } from './usePopOutWindow';
import { waitFor } from '@testing-library/vue';
import { renderComponent } from '@/__tests__/render';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

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
});
