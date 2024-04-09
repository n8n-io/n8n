import type { CanvasPlugin } from '@/types';

export const canvasPan: CanvasPlugin = (ctx) => {
	ctx.instance.bind('pan', (e) => {
		console.log('pan', e);
	});
};

export const canvasZoom: CanvasPlugin = () => {};
