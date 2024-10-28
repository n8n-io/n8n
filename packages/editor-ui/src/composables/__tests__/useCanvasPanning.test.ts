import type { Ref } from 'vue';
import { ref } from 'vue';
import { useCanvasPanning } from '@/composables/useCanvasPanning';
import { getMousePosition } from '@/utils/nodeViewUtils';
import { useUIStore } from '@/stores/ui.store';

vi.mock('@/stores/ui.store', () => ({
	useUIStore: vi.fn(() => ({
		nodeViewOffsetPosition: [0, 0],
		nodeViewMoveInProgress: false,
		isActionActive: vi.fn().mockReturnValue(() => true),
	})),
}));

vi.mock('@/utils/nodeViewUtils', () => ({
	getMousePosition: vi.fn(() => [0, 0]),
}));

describe('useCanvasPanning()', () => {
	let element: HTMLElement;
	let elementRef: Ref<null | HTMLElement>;

	beforeEach(() => {
		element = document.createElement('div');
		element.id = 'node-view';
		elementRef = ref(element);
		document.body.appendChild(element);
	});

	afterEach(() => {
		document.body.removeChild(element);
	});

	describe('onMouseDown()', () => {
		it('should attach mousemove event listener on mousedown', () => {
			const addEventListenerSpy = vi.spyOn(element, 'addEventListener');
			const { onMouseDown, onMouseMove } = useCanvasPanning(elementRef);
			const mouseEvent = new MouseEvent('mousedown', { button: 1 });

			onMouseDown(mouseEvent, true);

			expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', onMouseMove);
		});
	});

	describe('onMouseMove()', () => {
		it('should update node view position on mousemove', () => {
			vi.mocked(getMousePosition).mockReturnValueOnce([0, 0]).mockReturnValueOnce([100, 100]);
			const { onMouseDown, onMouseMove, moveLastPosition } = useCanvasPanning(elementRef);

			expect(moveLastPosition.value).toEqual([0, 0]);

			onMouseDown(new MouseEvent('mousedown', { button: 1 }), true);
			onMouseMove(new MouseEvent('mousemove', { buttons: 4 }));

			expect(moveLastPosition.value).toEqual([100, 100]);
		});
	});

	describe('onMouseUp()', () => {
		it('should remove mousemove event listener on mouseup', () => {
			vi.mocked(useUIStore).mockReturnValueOnce({
				nodeViewOffsetPosition: [0, 0],
				nodeViewMoveInProgress: true,
				isActionActive: vi.fn().mockReturnValue(() => true),
			} as unknown as ReturnType<typeof useUIStore>);

			const removeEventListenerSpy = vi.spyOn(element, 'removeEventListener');
			const { onMouseDown, onMouseMove, onMouseUp } = useCanvasPanning(elementRef);

			onMouseDown(new MouseEvent('mousedown', { button: 1 }), true);
			onMouseUp();

			expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', onMouseMove);
		});
	});

	describe('panCanvas()', () => {
		it('should update node view offset position correctly', () => {
			vi.mocked(getMousePosition).mockReturnValueOnce([100, 100]);

			const { panCanvas } = useCanvasPanning(elementRef);
			const [x, y] = panCanvas(new MouseEvent('mousemove'));

			expect(x).toEqual(100);
			expect(y).toEqual(100);
		});

		it('should not update offset position if mouse is not moved', () => {
			const { panCanvas } = useCanvasPanning(elementRef);
			const [x, y] = panCanvas(new MouseEvent('mousemove'));

			expect(x).toEqual(0);
			expect(y).toEqual(0);
		});
	});
});
