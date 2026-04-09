import { BeanStub } from '../../context/beanStub';
import type { BeanName } from '../../context/context';
import type { AgEventType } from '../../eventTypes';
import type { CellFocusClearedEvent, CellFocusedEvent } from '../../events';
import type { EditMap, IEditModelService } from '../../interfaces/iEditModelService';
import type { EditPosition, EditRowPosition, EditSource, IEditService, StartEditWithPositionParams, _SetEditingCellsParams } from '../../interfaces/iEditService';
import type { CellCtrl } from '../../rendering/cell/cellCtrl';
export type EditValidationResult<T extends Required<EditPosition> = Required<EditPosition>> = {
    all: T[];
    pass: T[];
    fail: T[];
};
export type EditValidationAction<T extends Required<EditPosition> = Required<EditPosition>> = {
    destroy: T[];
    keep: T[];
};
export declare abstract class BaseEditStrategy extends BeanStub {
    beanName: BeanName | undefined;
    protected model: IEditModelService;
    protected editSvc: IEditService;
    postConstruct(): void;
    abstract midBatchInputsAllowed(position?: EditPosition): boolean;
    clearEdits(position: EditPosition): void;
    abstract start(params: StartEditWithPositionParams): void;
    onCellFocusChanged(event: CellFocusedEvent | CellFocusClearedEvent): void;
    abstract moveToNextEditingCell(previousCell: CellCtrl, backwards: boolean, event?: KeyboardEvent, source?: EditSource, preventNavigation?: boolean): boolean | null;
    stop(cancel?: boolean, event?: Event | null): boolean;
    protected abstract processValidationResults(results: EditValidationResult): EditValidationAction;
    cleanupEditors({ rowNode }?: EditRowPosition, includeEditing?: boolean): void;
    setFocusOutOnEditor(cellCtrl: CellCtrl): void;
    setFocusInOnEditor(cellCtrl: CellCtrl): void;
    setupEditors(params: StartEditWithPositionParams & {
        cells: Required<EditPosition>[];
    }): void;
    dispatchCellEvent<T extends AgEventType>(position: Required<EditPosition>, event?: Event | null, type?: T, payload?: any): void;
    dispatchRowEvent(position: Required<EditRowPosition>, type: 'rowEditingStarted' | 'rowEditingStopped' | 'rowValueChanged', silent?: boolean): void;
    shouldStop(_position?: EditPosition, event?: KeyboardEvent | MouseEvent | null | undefined, source?: EditSource): boolean | null;
    shouldCancel(_position?: EditPosition, event?: KeyboardEvent | MouseEvent | null | undefined, source?: 'api' | 'ui' | string): boolean | null;
    setEditMap(edits: EditMap, params?: _SetEditingCellsParams): void;
    destroy(): void;
}
