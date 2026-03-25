import type { BeanCollection } from '../context/context';
import type { RefreshCellsParams } from '../interfaces/iCellsParams';
import type { GetCellRendererInstancesParams, ICellRenderer } from './cellRenderers/iCellRenderer';
export declare function setGridAriaProperty(beans: BeanCollection, property: string, value: string | null): void;
export declare function refreshCells<TData = any>(beans: BeanCollection, params?: RefreshCellsParams<TData>): void;
export declare function refreshHeader(beans: BeanCollection): void;
export declare function isAnimationFrameQueueEmpty(beans: BeanCollection): boolean;
export declare function flushAllAnimationFrames(beans: BeanCollection): void;
export declare function getSizesForCurrentTheme(beans: BeanCollection): {
    rowHeight: number;
    headerHeight: number;
};
export declare function getCellRendererInstances<TData = any>(beans: BeanCollection, params?: GetCellRendererInstancesParams<TData>): ICellRenderer[];
