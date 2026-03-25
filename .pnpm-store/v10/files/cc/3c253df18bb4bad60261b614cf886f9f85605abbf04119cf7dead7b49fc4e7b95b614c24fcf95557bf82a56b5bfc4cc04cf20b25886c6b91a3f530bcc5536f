import type { ICellEditorParams } from '../../interfaces/iCellEditor';
import { AgAbstractCellEditor } from '../../widgets/agAbstractCellEditor';
import type { AgCheckbox } from '../../widgets/agCheckbox';
export declare class CheckboxCellEditor extends AgAbstractCellEditor<ICellEditorParams<any, boolean>, boolean> {
    constructor();
    protected readonly eEditor: AgCheckbox;
    initialiseEditor(params: ICellEditorParams<any, boolean>): void;
    getValue(): boolean | undefined;
    focusIn(): void;
    afterGuiAttached(): void;
    isPopup(): boolean;
    private setAriaLabel;
    getValidationElement(tooltip: boolean): HTMLElement | HTMLInputElement;
    getValidationErrors(): string[] | null;
}
