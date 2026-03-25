import type { BeanStub } from '../../context/beanStub';
import type { BeanCollection } from '../../context/context';
import type { AgColumn } from '../../entities/agColumn';
import type { Column } from '../../interfaces/iColumn';
import type { IRowNode, RowPinnedType } from '../../interfaces/iRowNode';
import type { CellCtrl } from '../../rendering/cell/cellCtrl';
import type { RowCtrl } from '../../rendering/row/rowCtrl';
type ResolveRowControllerType = {
    rowIndex?: number | null;
    rowId?: string | null;
    rowCtrl?: RowCtrl | null;
    rowNode?: IRowNode | null;
    rowPinned?: RowPinnedType;
};
type ResolveCellControllerType = {
    colId?: string | null;
    columnId?: string | null;
    column?: string | Column | AgColumn | null;
    cellCtrl?: CellCtrl | null;
    rowPinned?: RowPinnedType;
};
type ResolveControllerType = ResolveRowControllerType & ResolveCellControllerType;
export declare function _getRowCtrl(beans: BeanCollection, inputs?: ResolveRowControllerType): RowCtrl | undefined;
export declare function _getCellCtrl(beans: BeanCollection, inputs?: ResolveControllerType): CellCtrl | undefined;
export declare function _addStopEditingWhenGridLosesFocus(bean: BeanStub, beans: BeanCollection, viewports: HTMLElement[]): void;
export declare function _getColId(column?: Column | string | null): string | undefined;
export {};
