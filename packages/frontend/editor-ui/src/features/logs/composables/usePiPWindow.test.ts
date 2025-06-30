/* eslint-disable vue/one-component-per-file */
import { computed, defineComponent, h, ref } from 'vue';
import { usePiPWindow } from './usePiPWindow';
import { waitFor } from '@testing-library/vue';
import { renderComponent } from '@/__tests__/render';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

describe(usePiPWindow, () => {
	const documentPictureInPicture: NonNullable<Window['documentPictureInPicture']> = {
		window: null,
		requestWindow: async () =>
			({
				document: { body: { append: vi.fn(), removeChild: vi.fn() } },
				addEventListener: vi.fn(),
				close: vi.fn(),
			}) as unknown as Window,
	};

	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
	});

	describe('canPopOut', () => {
		it('should return false if window.documentPictureInPicture is not available', () => {
			const MyComponent = defineComponent({
				setup() {
					const container = ref<HTMLDivElement | null>(null);
					const content = ref<HTMLDivElement | null>(null);
					const pipWindow = usePiPWindow({
						container,
						content,
						shouldPopOut: computed(() => true),
						onRequestClose: vi.fn(),
					});

					return () =>
						h(
							'div',
							{ ref: container },
							h('div', { ref: content }, String(pipWindow.canPopOut.value)),
						);
				},
			});

			const { queryByText } = renderComponent(MyComponent);

			expect(queryByText('false')).toBeInTheDocument();
		});

		it('should return true if window.documentPictureInPicture is available', () => {
			Object.assign(window, { documentPictureInPicture });

			const MyComponent = defineComponent({
				setup() {
					const container = ref<HTMLDivElement | null>(null);
					const content = ref<HTMLDivElement | null>(null);
					const pipWindow = usePiPWindow({
						container,
						content,
						shouldPopOut: computed(() => true),
						onRequestClose: vi.fn(),
					});

					return () =>
						h(
							'div',
							{ ref: container },
							h('div', { ref: content }, String(pipWindow.canPopOut.value)),
						);
				},
			});

			const { queryByText } = renderComponent(MyComponent);

			expect(queryByText('true')).toBeInTheDocument();
		});
	});

	describe('isPoppedOut', () => {
		beforeEach(() => {
			Object.assign(window, { documentPictureInPicture });
		});

		it('should be set to true when popped out', async () => {
			const shouldPopOut = ref(false);
			const MyComponent = defineComponent({
				setup() {
					const container = ref<HTMLDivElement | null>(null);
					const content = ref<HTMLDivElement | null>(null);
					const pipWindow = usePiPWindow({
						container,
						content,
						shouldPopOut: computed(() => shouldPopOut.value),
						onRequestClose: vi.fn(),
					});

					return () =>
						h(
							'div',
							{ ref: container },
							h('div', { ref: content }, String(pipWindow.isPoppedOut.value)),
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
