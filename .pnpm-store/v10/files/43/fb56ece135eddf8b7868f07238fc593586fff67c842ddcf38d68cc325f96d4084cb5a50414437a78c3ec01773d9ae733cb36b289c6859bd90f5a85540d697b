import type { ICellEditorParams } from '../../interfaces/iCellEditor';
import type { GridCheckbox } from '../../widgets/gridWidgetTypes';
import { AgAbstractCellEditor } from './agAbstractCellEditor';
export declare class CheckboxCellEditor extends AgAbstractCellEditor<ICellEditorParams<any, boolean>, boolean> {
    constructor();
    protected readonly eEditor: GridCheckbox;
    initialiseEditor(params: ICellEditorParams<any, boolean>): void;
    getValue(): boolean | undefined;
    focusIn(): void;
    afterGuiAttached(): void;
    isPopup(): boolean;
    private setAriaLabel;
    getValidationElement(tooltip: boolean): HTMLElement | HTMLInputElement;
    getValidationErrors(): string[] | null;
}
