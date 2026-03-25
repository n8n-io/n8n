import { AgAbstractCellEditor } from '../../widgets/agAbstractCellEditor';
import type { AgInputTextArea } from '../../widgets/agInputTextArea';
import type { ILargeTextEditorParams } from './iLargeTextCellEditor';
export declare class LargeTextCellEditor extends AgAbstractCellEditor<ILargeTextEditorParams> {
    protected readonly eEditor: AgInputTextArea;
    private focusAfterAttached;
    private highlightAllOnFocus;
    constructor();
    initialiseEditor(params: ILargeTextEditorParams): void;
    private onKeyDown;
    afterGuiAttached(): void;
    getValue(): any;
    getValidationElement(): HTMLElement | HTMLInputElement;
    getValidationErrors(): string[] | null;
}
