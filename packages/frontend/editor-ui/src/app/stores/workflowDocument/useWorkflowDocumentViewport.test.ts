import { describe, it, expect, vi } from 'vitest';
import { useWorkflowDocumentViewport } from './useWorkflowDocumentViewport';

function createViewport() {
	return useWorkflowDocumentViewport();
}

describe('useWorkflowDocumentViewport', () => {
	describe('initial state', () => {
		it('should start with null', () => {
			const { viewport } = createViewport();
			expect(viewport.value).toBeNull();
		});
	});

	describe('setViewport', () => {
		it('should store the viewport transform', () => {
			const { viewport, setViewport } = createViewport();

			setViewport({ x: 100, y: 200, zoom: 1.5 });

			expect(viewport.value).toEqual({ x: 100, y: 200, zoom: 1.5 });
		});

		it('should clear the viewport when set to null', () => {
			const { viewport, setViewport } = createViewport();
			setViewport({ x: 100, y: 200, zoom: 1.5 });

			setViewport(null);

			expect(viewport.value).toBeNull();
		});

		it('should replace existing viewport', () => {
			const { viewport, setViewport } = createViewport();
			setViewport({ x: 100, y: 200, zoom: 1.5 });

			setViewport({ x: 300, y: 400, zoom: 0.5 });

			expect(viewport.value).toEqual({ x: 300, y: 400, zoom: 0.5 });
		});
	});

	describe('onViewportChange', () => {
		it('should fire when viewport is set', async () => {
			const { setViewport, onViewportChange } = createViewport();
			const handler = vi.fn();
			onViewportChange(handler);

			setViewport({ x: 100, y: 200, zoom: 1.5 });

			await vi.waitFor(() => {
				expect(handler).toHaveBeenCalledWith({
					action: 'update',
					payload: { viewport: { x: 100, y: 200, zoom: 1.5 } },
				});
			});
		});

		it('should fire when viewport is cleared', async () => {
			const { setViewport, onViewportChange } = createViewport();
			setViewport({ x: 100, y: 200, zoom: 1.5 });

			const handler = vi.fn();
			onViewportChange(handler);

			setViewport(null);

			await vi.waitFor(() => {
				expect(handler).toHaveBeenCalledWith({
					action: 'update',
					payload: { viewport: null },
				});
			});
		});
	});
});
