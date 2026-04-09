import type { BeanCollection } from '../context/context';
import type { AgEventType } from '../eventTypes';
import type { RowEvent } from '../events';
import type { GridOptionsService } from '../gridOptionsService';
import type { IRowNode } from '../interfaces/iRowNode';
import { RowNode } from './rowNode';
export declare function _createGlobalRowEvent<T extends AgEventType>(rowNode: RowNode, gos: GridOptionsService, type: T): RowEvent<T>;
export declare const _createRowNodeSibling: (rowNode: RowNode, beans: BeanCollection) => RowNode;
export declare const _firstLeaf: (childrenAfterGroup: ReadonlyArray<IRowNode> | null | undefined) => RowNode | undefined;
