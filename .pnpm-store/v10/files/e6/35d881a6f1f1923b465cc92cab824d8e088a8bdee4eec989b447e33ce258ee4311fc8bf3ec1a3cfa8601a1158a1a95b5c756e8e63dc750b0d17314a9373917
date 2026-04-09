import type { BeanCollection } from '../../context/context';
import type { GetCellEditorInstancesParams, ICellEditor, ICellEditorValidationError } from '../../interfaces/iCellEditor';
import type { EditValue } from '../../interfaces/iEditModelService';
import type { EditPosition } from '../../interfaces/iEditService';
import type { CellCtrl } from '../../rendering/cell/cellCtrl';
export declare const UNEDITED: unique symbol;
export declare const getCellEditorInstances: <TData = any>(beans: BeanCollection, params?: GetCellEditorInstancesParams<TData>) => ICellEditor[];
export declare function _setupEditors(beans: BeanCollection, editingCells: Required<EditPosition>[], position?: Required<EditPosition>, key?: string | null, event?: Event | null, cellStartedEdit?: boolean | null): void;
export declare function _sourceAndPendingDiffer({ pendingValue, sourceValue, }: Pick<EditValue, 'pendingValue' | 'sourceValue'>): boolean;
export declare function _setupEditor(beans: BeanCollection, position: Required<EditPosition>, params?: {
    key?: string | null;
    event?: Event | null;
    cellStartedEdit?: boolean | null;
    silent?: boolean;
}): void;
export declare function _purgeUnchangedEdits(beans: BeanCollection, includeEditing?: boolean): void;
export declare function _refreshEditorOnColDefChanged(beans: BeanCollection, cellCtrl: CellCtrl): void;
export declare function _syncFromEditors(beans: BeanCollection, params: {
    persist: boolean;
    isCancelling?: boolean;
    isStopping?: boolean;
}): void;
export declare function _syncFromEditor(beans: BeanCollection, position: Required<EditPosition>, editorValue?: any, _source?: string, valueSameAsSource?: boolean, params?: {
    persist?: boolean;
    isCancelling?: boolean;
    isStopping?: boolean;
}): void;
export declare function _destroyEditors(beans: BeanCollection, edits?: Required<EditPosition>[], params?: {
    event?: Event;
    silent?: boolean;
    cancel?: boolean;
}): void;
type DestroyEditorParams = {
    event?: Event | null;
    silent?: boolean;
    cancel?: boolean;
};
export declare function _destroyEditor(beans: BeanCollection, position: Required<EditPosition>, params?: DestroyEditorParams): void;
export declare function _populateModelValidationErrors(beans: BeanCollection, force?: boolean): void;
export declare function _validateEdit(beans: BeanCollection): ICellEditorValidationError[] | null;
export {};
