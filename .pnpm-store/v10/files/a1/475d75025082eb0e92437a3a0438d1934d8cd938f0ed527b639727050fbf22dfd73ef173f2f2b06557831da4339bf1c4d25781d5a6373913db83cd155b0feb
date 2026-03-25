import type { ICellEditorComp, ICellEditorParams } from '../interfaces/iCellEditor';
import type { AgAbstractField } from './agAbstractField';
import { PopupComponent } from './popupComponent';
export declare abstract class AgAbstractCellEditor<P extends ICellEditorParams = any, TValue = any> extends PopupComponent implements ICellEditorComp {
    protected abstract eEditor: AgAbstractField<any, any, any>;
    protected params: P;
    protected abstract initialiseEditor(params: P): void;
    abstract getValidationElement(tooltip: boolean): HTMLElement | HTMLInputElement;
    abstract getValue(): TValue | null | undefined;
    abstract getValidationErrors(): string[] | null;
    errorMessages: string[] | null;
    init(params: P): void;
    destroy(): void;
}
