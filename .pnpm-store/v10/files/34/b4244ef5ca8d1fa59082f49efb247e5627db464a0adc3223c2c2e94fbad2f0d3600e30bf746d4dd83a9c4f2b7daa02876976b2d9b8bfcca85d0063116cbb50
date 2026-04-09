import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { EditMap, EditPositionValue, EditRow, EditRowValidationMap, EditState, EditValidation, EditValidationMap, EditValue, GetEditsParams, IEditCellValidationModel, IEditModelService, IEditRowValidationModel } from '../interfaces/iEditModelService';
import type { EditPosition, EditRowPosition } from '../interfaces/iEditService';
import type { IRowNode } from '../interfaces/iRowNode';
export declare class EditModelService extends BeanStub implements NamedBean, IEditModelService {
    beanName: "editModelSvc";
    private readonly edits;
    private cellValidations;
    private rowValidations;
    private suspendEdits;
    suspend(suspend: boolean): void;
    removeEdits({ rowNode, column }: EditPosition): void;
    getEditRow(rowNode: IRowNode, params?: GetEditsParams): EditRow | undefined;
    getEditRowDataValue(rowNode: IRowNode, { checkSiblings }?: GetEditsParams): any;
    getEdit(position: EditPosition, copy?: false): Readonly<EditValue> | undefined;
    private _getEdit;
    getEditMap(copy?: boolean): EditMap;
    setEditMap(newEdits: EditMap): void;
    setEdit(position: Required<EditPosition>, edit: Partial<EditValue>): Readonly<EditValue>;
    clearEditValue(position: EditPosition): void;
    getState(position: EditPosition): EditState | undefined;
    getEditPositions(editMap?: EditMap): EditPositionValue[];
    hasRowEdits(rowNode: IRowNode, params?: GetEditsParams): boolean;
    hasEdits(position?: EditPosition, params?: GetEditsParams): boolean;
    start(position: Required<EditPosition>): void;
    stop(position?: Required<EditPosition>): void;
    clear(): void;
    getCellValidationModel(): IEditCellValidationModel;
    getRowValidationModel(): IEditRowValidationModel;
    setCellValidationModel(model: IEditCellValidationModel): void;
    setRowValidationModel(model: IEditRowValidationModel): void;
    destroy(): void;
}
export declare class EditCellValidationModel implements IEditCellValidationModel {
    private cellValidations;
    getCellValidation(position?: EditPosition): EditValidation | undefined;
    hasCellValidation(position?: EditPosition): boolean;
    setCellValidation(position: Required<EditPosition>, validation: EditValidation): void;
    clearCellValidation(position: Required<EditPosition>): void;
    setCellValidationMap(validationMap: EditValidationMap): void;
    getCellValidationMap(): EditValidationMap;
    clearCellValidationMap(): void;
}
export declare class EditRowValidationModel implements IEditRowValidationModel {
    private rowValidations;
    getRowValidation(position?: EditRowPosition): EditValidation | undefined;
    hasRowValidation(position?: EditRowPosition): boolean;
    setRowValidation({ rowNode }: Required<EditRowPosition>, rowValidation: EditValidation): void;
    clearRowValidation({ rowNode }: Required<EditRowPosition>): void;
    setRowValidationMap(validationMap: EditRowValidationMap): void;
    getRowValidationMap(): EditRowValidationMap;
    clearRowValidationMap(): void;
}
