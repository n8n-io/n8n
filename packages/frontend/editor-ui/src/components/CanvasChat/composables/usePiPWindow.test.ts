/* eslint-disable vue/one-component-per-file */
import { defineComponent, h, ref } from 'vue';
import { usePiPWindow } from './usePiPWindow';
import { fireEvent } from '@testing-library/vue';
import { renderComponent } from '@/__tests__/render';

describe(usePiPWindow, () => {
	const documentPictureInPicture: NonNullable<Window['documentPictureInPicture']> = {
		window: null,
		requestWindow: async () =>
			({
				document: { body: { append: vi.fn(), removeChild: vi.fn() } },
				addEventListener: vi.fn(),
			}) as unknown as Window,
	};

	describe('canPopOut', () => {
		it('should return false if window.documentPictureInPicture is not available', () => {
			const MyComponent = defineComponent({
				setup() {
					const container = ref<HTMLDivElement | null>(null);
					const content = ref<HTMLDivElement | null>(null);
					const pipWindow = usePiPWindow(container, content);

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
					const pipWindow = usePiPWindow(container, content);

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

	describe('onPopOut', () => {
		beforeEach(() => {
			Object.assign(window, { documentPictureInPicture });
		});

		it('should set isPoppedOut to true', async () => {
			const MyComponent = defineComponent({
				setup() {
					const container = ref<HTMLDivElement | null>(null);
					const content = ref<HTMLDivElement | null>(null);
					const pipWindow = usePiPWindow(container, content);

					return () =>
						h(
							'div',
							{ ref: container },
							h(
								'div',
								{ ref: content },
								h(
									'button',
									{
										onClick: pipWindow.onPopOut,
									},
									String(pipWindow.isPoppedOut.value),
								),
							),
						);
				},
			});

			const { getByRole, queryByText, rerender } = renderComponent(MyComponent);

			expect(queryByText('false')).toBeInTheDocument();
			await fireEvent.click(getByRole('button'));
			await rerender({});
			expect(queryByText('true')).toBeInTheDocument();
		});
	});
});
