import type { GridInputTextArea } from '../../widgets/gridWidgetTypes';
import { AgAbstractCellEditor } from './agAbstractCellEditor';
import type { ILargeTextEditorParams } from './iLargeTextCellEditor';
export declare class LargeTextCellEditor extends AgAbstractCellEditor<ILargeTextEditorParams> {
    protected readonly eEditor: GridInputTextArea;
    private focusAfterAttached;
    private highlightAllOnFocus;
    constructor();
    initialiseEditor(params: ILargeTextEditorParams): void;
    private getStartValue;
    private onKeyDown;
    afterGuiAttached(): void;
    getValue(): any;
    getValidationElement(): HTMLElement | HTMLInputElement;
    getValidationErrors(): string[] | null;
}
