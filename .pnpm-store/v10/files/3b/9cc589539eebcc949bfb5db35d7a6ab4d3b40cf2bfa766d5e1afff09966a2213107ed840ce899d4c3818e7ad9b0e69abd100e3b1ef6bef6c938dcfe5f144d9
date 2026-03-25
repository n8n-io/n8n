import type { BeanCollection } from '../../context/context';
import type { AgEventType } from '../../eventTypes';
import type { CellEvent } from '../../events';
import type { Column } from '../../interfaces/iColumn';
import type { IRowNode } from '../../interfaces/iRowNode';
type EventPosition = {
    rowNode: IRowNode;
    column: Column<any>;
};
export declare function _createCellEvent<T extends AgEventType>(beans: BeanCollection, domEvent: Event | null, eventType: T, { rowNode, column }: EventPosition, value: any): CellEvent<T>;
export {};
