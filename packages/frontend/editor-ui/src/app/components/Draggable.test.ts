import { describe, it, expect } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import Draggable from './Draggable.vue';

describe('Draggable', () => {
	const renderComponent = createComponentRenderer(Draggable, {
		props: {
			type: 'move' as const,
			targetDataKey: 'test',
		},
		slots: {
			default: '<div data-target="test" data-value="test-data">Drag me</div>',
			preview: '<div class="preview">Preview</div>',
		},
	});

	const simulateMouseDown = (element: HTMLElement, x: number, y: number) => {
		const event = new MouseEvent('mousedown', {
			bubbles: true,
			cancelable: true,
			clientX: x,
			clientY: y,
			buttons: 1,
		});
		element.dispatchEvent(event);
	};

	const simulateMouseMove = (x: number, y: number) => {
		const event = new MouseEvent('mousemove', {
			bubbles: true,
			cancelable: true,
			clientX: x,
			clientY: y,
		});
		window.dispatchEvent(event);
	};

	const simulateMouseUp = () => {
		const event = new MouseEvent('mouseup', {
			bubbles: true,
			cancelable: true,
		});
		window.dispatchEvent(event);
	};

	const waitForAnimationFrame = async () =>
		await new Promise((resolve) => requestAnimationFrame(resolve));

	describe('dragThreshold prop', () => {
		it('should have default threshold of 10px', () => {
			const { emitted } = renderComponent();

			// Distance below threshold
			const draggableEl = document.querySelector('[data-target="test"]') as HTMLElement;
			simulateMouseDown(draggableEl, 100, 100);
			simulateMouseMove(106, 106);
			expect(emitted().dragstart).toBeUndefined();

			// Move beyond threshold should trigger
			simulateMouseMove(108, 108);
			expect(emitted().dragstart).toHaveLength(1);

			simulateMouseUp();
		});

		it('should accept custom threshold value', () => {
			const { emitted } = renderComponent({ props: { dragThreshold: 15 } });

			const draggableEl = document.querySelector('[data-target="test"]') as HTMLElement;
			simulateMouseDown(draggableEl, 100, 100);

			// 12px movement should not trigger with 15px threshold
			simulateMouseMove(108, 108); // distance = 11.3px < 15px
			expect(emitted().dragstart).toBeUndefined();

			// 16px movement should trigger
			simulateMouseMove(112, 112); // distance = sqrt(144 + 144) = 16.97px > 15px
			expect(emitted().dragstart).toHaveLength(1);

			simulateMouseUp();
		});
	});

	describe('drag threshold behavior', () => {
		it('should not emit dragstart when mouse moves less than threshold', () => {
			// Set threshold to 10px
			const { emitted } = renderComponent({ props: { dragThreshold: 10 } });

			const draggableEl = document.querySelector('[data-target="test"]') as HTMLElement;
			simulateMouseDown(draggableEl, 100, 100);

			// Move mouse 5px
			simulateMouseMove(103, 104);

			expect(emitted().dragstart).toBeUndefined();

			simulateMouseUp();
		});

		it('should emit dragstart when mouse moves beyond threshold', () => {
			// Set threshold to 5px
			const { emitted } = renderComponent({ props: { dragThreshold: 5 } });

			const draggableEl = document.querySelector('[data-target="test"]') as HTMLElement;
			simulateMouseDown(draggableEl, 100, 100);

			// Move mouse 10px
			simulateMouseMove(106, 108);

			expect(emitted().dragstart).toHaveLength(1);

			simulateMouseUp();
		});

		it('should emit dragstart exactly when threshold is reached', () => {
			const { emitted } = renderComponent({ props: { dragThreshold: 5 } });

			const draggableEl = document.querySelector('[data-target="test"]') as HTMLElement;
			simulateMouseDown(draggableEl, 100, 100);

			// Move mouse just under threshold (should not trigger)
			simulateMouseMove(103, 103);
			expect(emitted().dragstart).toBeUndefined();

			// Move to exactly threshold (should trigger drag)
			simulateMouseMove(103, 104);
			expect(emitted().dragstart).toHaveLength(1);

			simulateMouseUp();
		});

		it('should immediately start drag when threshold is 0', () => {
			const { emitted } = renderComponent({ props: { dragThreshold: 0 } });

			const draggableEl = document.querySelector('[data-target="test"]') as HTMLElement;
			simulateMouseDown(draggableEl, 100, 100);

			simulateMouseMove(101, 100); // distance = 1px

			expect(emitted().dragstart).toHaveLength(1);

			simulateMouseUp();
		});

		it('should not emit dragstart on click without mouse movement', () => {
			const { emitted } = renderComponent({ props: { dragThreshold: 5 } });

			const draggableEl = document.querySelector('[data-target="test"]') as HTMLElement;
			simulateMouseDown(draggableEl, 100, 100);
			simulateMouseUp();

			expect(emitted().dragstart).toBeUndefined();
		});

		it('should not emit dragend if drag was never started (threshold not exceeded)', async () => {
			const { emitted } = renderComponent({ props: { dragThreshold: 10 } });

			const draggableEl = document.querySelector('[data-target="test"]') as HTMLElement;
			simulateMouseDown(draggableEl, 100, 100);

			// Move less than threshold
			simulateMouseMove(102, 102);
			simulateMouseUp();

			// Wait for setTimeout in onDragEnd
			await new Promise((resolve) => setTimeout(resolve, 10));

			// dragend should NOT be emitted since dragstart was never emitted
			// This ensures drag lifecycle events remain paired
			expect(emitted().dragend).toBeUndefined();
		});
	});

	describe('drag behavior after threshold exceeded', () => {
		it('should continue emitting drag events after threshold is exceeded', async () => {
			const { emitted } = renderComponent({ props: { dragThreshold: 5 } });

			const draggableEl = document.querySelector('[data-target="test"]') as HTMLElement;
			simulateMouseDown(draggableEl, 100, 100);

			// Exceed threshold
			simulateMouseMove(110, 110);
			expect(emitted().dragstart).toHaveLength(1);

			await waitForAnimationFrame();

			// Continue moving
			simulateMouseMove(120, 120);
			await waitForAnimationFrame();

			simulateMouseMove(130, 130);
			await waitForAnimationFrame();

			// drag events should be emitted
			expect(emitted().drag).toBeDefined();
			expect(emitted().drag!.length).toBeGreaterThanOrEqual(1);

			simulateMouseUp();
		});

		it('should only emit dragstart once regardless of continued movement', () => {
			const { emitted } = renderComponent({ props: { dragThreshold: 5 } });

			const draggableEl = document.querySelector('[data-target="test"]') as HTMLElement;
			simulateMouseDown(draggableEl, 100, 100);

			simulateMouseMove(110, 110);
			simulateMouseMove(120, 120);
			simulateMouseMove(130, 130);

			expect(emitted().dragstart).toHaveLength(1);

			simulateMouseUp();
		});
	});

	describe('disabled state', () => {
		it('should not start drag when disabled', () => {
			const { emitted } = renderComponent({
				props: { disabled: true, dragThreshold: 5 },
			});

			const draggableEl = document.querySelector('[data-target="test"]') as HTMLElement;
			simulateMouseDown(draggableEl, 100, 100);
			simulateMouseMove(120, 120);

			expect(emitted().dragstart).toBeUndefined();

			simulateMouseUp();
		});
	});
});
