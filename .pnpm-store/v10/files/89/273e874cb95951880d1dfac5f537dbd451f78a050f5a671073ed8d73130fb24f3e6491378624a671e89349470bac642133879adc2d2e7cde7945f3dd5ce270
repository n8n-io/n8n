import type { NamedBean } from '../context/bean';
import type { BeanCollection } from '../context/context';
import type { PopupEditorWrapper } from '../edit/cellEditors/popupEditorWrapper';
import type { AgEventType } from '../eventTypes';
import type { CellFocusedEvent } from '../events';
import type { CellCtrl } from '../rendering/cell/cellCtrl';
import type { RowCtrl } from '../rendering/row/rowCtrl';
import type { CellRange } from './IRangeService';
import type { EditingCellPosition, ICellEditorParams, ICellEditorValidationError } from './iCellEditor';
import type { ICellStyleFeature } from './iCellStyleFeature';
import type { Column } from './iColumn';
import type { EditMap } from './iEditModelService';
import type { IRowNode } from './iRowNode';
import type { IRowStyleFeature } from './iRowStyleFeature';
import type { UserCompDetails } from './iUserCompDetails';
export type EditInputEvents = KeyboardEvent | MouseEvent | null | undefined;
export type EditNavOnValidationResult = 'block-stop' | 'revert-continue' | 'continue';
export type EditSource = 'api' | 'ui' | 'paste' | 'rangeSvc' | 'fillHandle' | 'cellClear' | 'edit' | 'bulk';
export interface StartEditWithPositionParams extends StartEditParams {
    position: Required<EditPosition>;
}
export type StartEditParams = {
    startedEdit?: boolean | null;
    event?: EditInputEvents;
    source?: EditSource;
    ignoreEventKey?: boolean;
    silent?: boolean;
    continueEditing?: boolean;
};
export type StopEditParams = {
    event?: EditInputEvents;
    cancel?: boolean;
    source?: EditSource;
    forceStop?: boolean;
    forceCancel?: boolean;
    suppressNavigateAfterEdit?: boolean;
};
export type IsEditingParams = {
    checkSiblings?: boolean;
    withOpenEditor?: boolean;
};
export type EditRowPosition = {
    rowNode?: IRowNode;
};
export interface EditPosition extends EditRowPosition {
    column?: Column;
}
export interface _SetEditingCellsParams {
    /** Update existing cells, omit or set `false` to replace currently editing cells. */
    update?: boolean;
    /** Force the cells that are being marked as edited to be refreshed and only these cells not others */
    forceRefreshOfEditCellsOnly?: boolean;
}
export interface IEditService extends NamedBean {
    shouldStartEditing(position: Required<EditPosition>, event?: KeyboardEvent | MouseEvent | null, cellStartedEdit?: boolean | null, source?: EditSource): boolean | null;
    shouldStopEditing(position?: EditPosition, event?: KeyboardEvent | MouseEvent | null | undefined, source?: EditSource): boolean | null;
    shouldCancelEditing(position?: EditPosition, event?: KeyboardEvent | MouseEvent | null | undefined, source?: EditSource): boolean | null;
    setBatchEditing(enabled: boolean): void;
    isBatchEditing(): boolean;
    isEditing(position?: EditPosition | null, params?: IsEditingParams | null): boolean;
    isRowEditing(rowNode?: IRowNode | null, params?: IsEditingParams | null): boolean;
    startEditing(position: Required<EditPosition>, params: StartEditParams): void;
    stopEditing(position?: EditPosition, params?: StopEditParams): boolean;
    setEditMap(updates: EditMap, params?: _SetEditingCellsParams): void;
    isCellEditable(position: Required<EditPosition>, source?: EditSource): boolean;
    moveToNextCell(previous: CellCtrl | RowCtrl, backwards: boolean, event?: KeyboardEvent, source?: EditSource): boolean | null;
    getCellDataValue(position: Required<EditPosition>, preferEditor: boolean): any;
    addStopEditingWhenGridLosesFocus(viewports: HTMLElement[]): void;
    createPopupEditorWrapper(params: ICellEditorParams): PopupEditorWrapper;
    setDataValue(position: Required<EditPosition>, newValue: any, eventSource?: string): boolean | undefined;
    handleColDefChanged(cellCtrl: CellCtrl): void;
    prepDetailsDuringBatch(position: Required<EditPosition>, params: {
        compDetails?: UserCompDetails<any>;
        valueToDisplay: any;
    }): {
        compDetails?: UserCompDetails<any>;
        valueToDisplay?: any;
    } | undefined;
    cleanupEditors(): void;
    dispatchCellEvent<T extends AgEventType>(position: Required<EditPosition>, event?: Event | null, type?: T, payload?: any): void;
    applyBulkEdit(position: Required<EditPosition>, cellRanges: CellRange[]): void;
    validateEdit(): ICellEditorValidationError[] | null;
    createCellStyleFeature(cellCtrl: CellCtrl, beans: BeanCollection): ICellStyleFeature;
    createRowStyleFeature(rowCtrl: RowCtrl, beans: BeanCollection): IRowStyleFeature;
    setEditingCells(cells: EditingCellPosition[], params?: _SetEditingCellsParams): void;
    hasValidationErrors(position?: EditPosition): boolean;
    cellEditingInvalidCommitBlocks(): boolean;
    checkNavWithValidation(position?: EditPosition, event?: Event | CellFocusedEvent): EditNavOnValidationResult;
    revertSingleCellEdit(cellPosition: Required<EditPosition>, focus?: boolean): void;
    allowedFocusTargetOnValidation(cellPosition: EditPosition): CellCtrl | undefined;
    commitNextEdit(): void;
    committing: boolean;
}
