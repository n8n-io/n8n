import type { InjectionKey } from 'vue';
import type { UseCanvasGroupCollapseReturn } from './useCanvasGroupCollapse';

export const CanvasGroupCollapseKey: InjectionKey<UseCanvasGroupCollapseReturn> =
	Symbol('CanvasGroupCollapse');
