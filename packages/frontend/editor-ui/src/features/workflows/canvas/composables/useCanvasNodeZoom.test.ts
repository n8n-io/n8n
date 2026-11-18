import { nextTick, ref } from 'vue';

import { NODE_ZOOM_VIEW, useCanvasNodeZoom } from './useCanvasNodeZoom';

function setup({ isReady = true, hasSizedNodes = true } = {}) {
	const isCanvasReady = ref(isReady);
	const fitView = vi.fn().mockResolvedValue(hasSizedNodes);
	const selectNodes = vi.fn();
	const listeners: Array<() => void> = [];
	const { zoomToNodes } = useCanvasNodeZoom({
		isCanvasReady,
		fitView,
		selectNodes,
		onNodesInitialized: (listener) => listeners.push(listener),
	});
	const initializeNodes = () => listeners.forEach((listener) => listener());
	return { isCanvasReady, fitView, selectNodes, zoomToNodes, initializeNodes };
}

describe('useCanvasNodeZoom', () => {
	it('should select the nodes and move the view to them', async () => {
		const { zoomToNodes, fitView, selectNodes } = setup();

		await zoomToNodes(['n1', 'n2']);

		expect(selectNodes).toHaveBeenCalledWith(['n1', 'n2']);
		expect(fitView).toHaveBeenCalledWith({ nodes: ['n1', 'n2'], ...NODE_ZOOM_VIEW });
	});

	it('should wait until the canvas is ready', async () => {
		const { zoomToNodes, fitView, selectNodes, isCanvasReady } = setup({ isReady: false });

		await zoomToNodes(['n1']);
		expect(fitView).not.toHaveBeenCalled();
		expect(selectNodes).not.toHaveBeenCalled();

		isCanvasReady.value = true;
		await nextTick();

		expect(selectNodes).toHaveBeenCalledWith(['n1']);
		expect(fitView).toHaveBeenCalledTimes(1);
	});

	it('should keep only the newest request that waits', async () => {
		const { zoomToNodes, fitView, isCanvasReady } = setup({ isReady: false });

		await zoomToNodes(['n1']);
		await zoomToNodes(['n2']);
		isCanvasReady.value = true;
		await nextTick();

		expect(fitView).toHaveBeenCalledTimes(1);
		expect(fitView).toHaveBeenCalledWith(expect.objectContaining({ nodes: ['n2'] }));
	});

	it('should try one last time when the nodes get their size', async () => {
		const { zoomToNodes, fitView, initializeNodes } = setup({ hasSizedNodes: false });

		await zoomToNodes(['n1']);
		initializeNodes();
		initializeNodes();

		expect(fitView).toHaveBeenCalledTimes(2);
	});

	it('should not move the view again when the nodes get their size after a zoom', async () => {
		const { zoomToNodes, fitView, initializeNodes } = setup();

		await zoomToNodes(['n1']);
		initializeNodes();

		expect(fitView).toHaveBeenCalledTimes(1);
	});
});
