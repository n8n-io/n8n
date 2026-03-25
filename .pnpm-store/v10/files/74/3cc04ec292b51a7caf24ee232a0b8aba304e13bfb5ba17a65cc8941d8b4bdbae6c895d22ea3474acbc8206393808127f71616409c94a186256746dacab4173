import type { DefaultProvidedCellEditorParams, ICellEditorParams } from '../../interfaces/iCellEditor';
import { AgAbstractCellEditor } from '../../widgets/agAbstractCellEditor';
import type { AgInputTextField } from '../../widgets/agInputTextField';
import type { CellEditorInput } from './iCellEditorInput';
export declare class SimpleCellEditor<TValue, P extends ICellEditorParams & DefaultProvidedCellEditorParams, I extends AgInputTextField> extends AgAbstractCellEditor<ICellEditorParams, TValue> {
    protected cellEditorInput: CellEditorInput<TValue, P, I>;
    private highlightAllOnFocus;
    private focusAfterAttached;
    protected readonly eEditor: I;
    constructor(cellEditorInput: CellEditorInput<TValue, P, I>);
    initialiseEditor(params: P): void;
    afterGuiAttached(): void;
    focusIn(): void;
    getValue(): TValue | null | undefined;
    isPopup(): boolean;
    getValidationElement(): HTMLInputElement;
    getValidationErrors(): string[] | null;
}
