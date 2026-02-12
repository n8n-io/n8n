import { fireEvent, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import CanvasNodeStickyColorSelector from './CanvasNodeStickyColorSelector.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createCanvasNodeProvide } from '@/features/workflows/canvas/__tests__/utils';
import { CanvasNodeRenderType } from '@/features/workflows/canvas/canvas.types';

const renderComponent = createComponentRenderer(CanvasNodeStickyColorSelector);

describe('CanvasNodeStickyColorSelector', () => {
	it('should render trigger correctly', () => {
		const { getByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide(),
				},
			},
		});
		const colorSelector = getByTestId('change-sticky-color');
		expect(colorSelector).toBeVisible();
	});

	it('should render all colors and apply selected color correctly', async () => {
		const { getByTestId, emitted } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide(),
				},
			},
		});

		await userEvent.click(getByTestId('change-sticky-color'));

		// Use screen queries for teleported popover content
		await waitFor(() => {
			expect(screen.getAllByTestId('color')).toHaveLength(7);
		});

		await userEvent.click(screen.getAllByTestId('color')[2]);

		expect(emitted()).toHaveProperty('update');
		expect(emitted().update[0]).toEqual([3]);
	});

	describe('custom color picker', () => {
		it('should render custom color button (8th option)', async () => {
			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide(),
					},
				},
			});

			await userEvent.click(getByTestId('change-sticky-color'));

			await waitFor(() => {
				expect(screen.getByTestId('custom-color')).toBeVisible();
			});
		});

		it('should render 7 preset colors + 1 custom color button', async () => {
			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide(),
					},
				},
			});

			await userEvent.click(getByTestId('change-sticky-color'));

			await waitFor(() => {
				expect(screen.getAllByTestId('color')).toHaveLength(7);
				expect(screen.getByTestId('custom-color')).toBeVisible();
			});
		});

		it('should show selected state for custom hex color', async () => {
			const customColor = '#FF5733';
			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide({
							data: {
								render: {
									type: CanvasNodeRenderType.StickyNote,
									options: {
										color: customColor,
									},
								},
							},
						}),
					},
				},
			});

			await userEvent.click(getByTestId('change-sticky-color'));

			await waitFor(() => {
				const customColorButton = screen.getByTestId('custom-color');
				expect(customColorButton.classList.contains('selected')).toBe(true);
			});
		});

		it('should show no selected state on presets when custom color is active', async () => {
			const customColor = '#FF5733';
			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide({
							data: {
								render: {
									type: CanvasNodeRenderType.StickyNote,
									options: {
										color: customColor,
									},
								},
							},
						}),
					},
				},
			});

			await userEvent.click(getByTestId('change-sticky-color'));

			await waitFor(() => {
				const colorCircles = screen.getAllByTestId('color');
				colorCircles.forEach((circle) => {
					expect(circle.classList.contains('selected')).toBe(false);
				});
			});
		});

		it('should emit uppercase hex string when native color input changes', async () => {
			const { getByTestId, emitted } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide(),
					},
				},
			});

			const nativeInput = getByTestId('native-color-input') as HTMLInputElement;
			await fireEvent.update(nativeInput, '#ff5733');
			await fireEvent.change(nativeInput);

			expect(emitted()).toHaveProperty('update');
			expect(emitted().update[0]).toEqual(['#FF5733']);
		});

		it('should show preset selected state for number colors', async () => {
			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide({
							data: {
								render: {
									type: CanvasNodeRenderType.StickyNote,
									options: {
										color: 3,
									},
								},
							},
						}),
					},
				},
			});

			await userEvent.click(getByTestId('change-sticky-color'));

			await waitFor(() => {
				const colorCircles = screen.getAllByTestId('color');
				expect(colorCircles[2].classList.contains('selected')).toBe(true);
			});
		});
	});
});
