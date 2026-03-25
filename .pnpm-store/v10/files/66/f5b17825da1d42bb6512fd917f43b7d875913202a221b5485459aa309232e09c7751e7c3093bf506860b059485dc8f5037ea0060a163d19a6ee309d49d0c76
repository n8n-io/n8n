import type { BeanCollection } from '../context/context';
import type { Column } from '../interfaces/iColumn';
import type { IRowNode } from '../interfaces/iRowNode';
export declare function getVerticalPixelRange(beans: BeanCollection): {
    top: number;
    bottom: number;
};
export declare function getHorizontalPixelRange(beans: BeanCollection): {
    left: number;
    right: number;
};
export declare function ensureColumnVisible(beans: BeanCollection, key: string | Column, position?: 'auto' | 'start' | 'middle' | 'end'): void;
export declare function ensureIndexVisible(beans: BeanCollection, index: number, position?: 'top' | 'bottom' | 'middle' | null): void;
export declare function ensureNodeVisible<TData = any>(beans: BeanCollection, nodeSelector: TData | IRowNode<TData> | ((row: IRowNode<TData>) => boolean), position?: 'top' | 'bottom' | 'middle' | null): void;
