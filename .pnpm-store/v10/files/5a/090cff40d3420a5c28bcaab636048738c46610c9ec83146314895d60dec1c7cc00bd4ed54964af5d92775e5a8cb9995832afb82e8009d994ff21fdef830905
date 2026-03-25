import type { BeanCollection } from '../../context/context';
import type { ICellEditorParams } from '../../interfaces/iCellEditor';
import { AgAbstractCellEditor } from '../../widgets/agAbstractCellEditor';
import type { AgSelect } from '../../widgets/agSelect';
import type { ISelectCellEditorParams } from './iSelectCellEditor';
interface SelectCellEditorParams<TData = any, TValue = any, TContext = any> extends ISelectCellEditorParams<TValue>, ICellEditorParams<TData, TValue, TContext> {
}
export declare class SelectCellEditor extends AgAbstractCellEditor<SelectCellEditorParams> {
    private focusAfterAttached;
    private valueSvc;
    wireBeans(beans: BeanCollection): void;
    protected readonly eEditor: AgSelect;
    private startedByEnter;
    constructor();
    initialiseEditor(params: SelectCellEditorParams): void;
    afterGuiAttached(): void;
    focusIn(): void;
    getValue(): any;
    isPopup(): boolean;
    getValidationElement(): HTMLElement | HTMLInputElement;
    getValidationErrors(): string[] | null;
}
export {};
