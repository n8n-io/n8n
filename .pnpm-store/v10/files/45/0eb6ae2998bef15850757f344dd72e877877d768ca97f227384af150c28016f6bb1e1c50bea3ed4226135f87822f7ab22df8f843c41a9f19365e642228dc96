import type { RowNode } from '../entities/rowNode';
import type { IRowNode } from './iRowNode';
export type DropIndicatorPosition = 'above' | 'inside' | 'below' | 'none';
export interface RowDropPositionIndicator<TData = any> {
    row: IRowNode<TData> | null;
    dropIndicatorPosition: DropIndicatorPosition;
}
export interface SetRowDropPositionIndicatorParams<TData = any> {
    row: IRowNode<TData> | null | undefined;
    dropIndicatorPosition: DropIndicatorPosition | null | false;
}
export interface IRowDropHighlightService {
    readonly row: RowNode | null;
    readonly position: DropIndicatorPosition;
    clear(): void;
    set(row: RowNode, dropIndicatorPosition: Exclude<DropIndicatorPosition, 'none'>): void;
}
