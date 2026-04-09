import type { ICellEditor } from './iCellEditor';
import type { Column } from './iColumn';
import type { EditPosition, EditRowPosition } from './iEditService';
import type { IRowNode } from './iRowNode';
export type EditState = 'editing' | 'changed';
export type EditValidation = {
    errorMessages: string[];
};
export type EditValue = {
    editorValue: any;
    pendingValue: any;
    sourceValue: any;
    state: EditState;
    editorState: {
        cellStartedEditing?: boolean;
        cellStoppedEditing?: boolean;
        isCancelAfterEnd?: ReturnType<NonNullable<ICellEditor['isCancelAfterEnd']>>;
        isCancelBeforeStart?: ReturnType<NonNullable<ICellEditor['isCancelBeforeStart']>>;
    };
};
export type EditPositionValue = Required<EditPosition> & EditValue;
export type EditRow<C = Column, V = EditValue> = Map<C, V>;
export type EditMap = Map<IRowNode, Map<Column, EditValue>>;
export type EditValidationMap = Map<IRowNode, Map<Column, EditValidation>>;
export type EditRowValidationMap = Map<IRowNode, EditValidation>;
export type GetEditsParams = {
    checkSiblings?: boolean;
    includeParents?: boolean;
    withOpenEditor?: boolean;
};
export interface IEditModelService {
    suspend(suspend: boolean): void;
    removeEdits({ rowNode, column }: EditPosition): void;
    getEdit(position: EditPosition, copy?: boolean): Readonly<EditValue> | undefined;
    getEditPositions(editMap?: EditMap): EditPositionValue[];
    getEditRow(rowNode: IRowNode, params?: GetEditsParams): EditRow | undefined;
    getEditRowDataValue(rowNode: IRowNode, params?: GetEditsParams): any;
    getEditMap(copy?: boolean): EditMap;
    setEdit(position: Required<EditPosition>, edit: Partial<EditValue>): Readonly<EditValue>;
    setEditMap(edits: EditMap): void;
    clearEditValue(position: EditPosition): void;
    clear(): void;
    getState(position: EditPosition): EditState | undefined;
    hasRowEdits(rowNode: IRowNode, params?: GetEditsParams): boolean;
    hasEdits(position?: EditPosition, params?: GetEditsParams): boolean;
    start(position: Required<EditPosition>): void;
    stop(position?: Required<EditPosition>): void;
    getCellValidationModel(): IEditCellValidationModel;
    getRowValidationModel(): IEditRowValidationModel;
    setCellValidationModel(model: IEditCellValidationModel): void;
    setRowValidationModel(model: IEditRowValidationModel): void;
}
export interface IEditCellValidationModel {
    getCellValidation(position: EditPosition): EditValidation | undefined;
    hasCellValidation(position: EditPosition): boolean;
    setCellValidation(position: Required<EditPosition>, validation: EditValidation): void;
    clearCellValidation(position: Required<EditPosition>): void;
    setCellValidationMap(validationMap: EditValidationMap): void;
    getCellValidationMap(): EditValidationMap;
    clearCellValidationMap(): void;
}
export interface IEditRowValidationModel {
    getRowValidation(position: Required<EditRowPosition>): EditValidation | undefined;
    hasRowValidation(position: Required<EditRowPosition>): boolean;
    setRowValidation(position: Required<EditRowPosition>, rowValidation: EditValidation): void;
    clearRowValidation(position: Required<EditRowPosition>): void;
    setRowValidationMap(validationMap: EditRowValidationMap): void;
    getRowValidationMap(): EditRowValidationMap;
    clearRowValidationMap(): void;
}
