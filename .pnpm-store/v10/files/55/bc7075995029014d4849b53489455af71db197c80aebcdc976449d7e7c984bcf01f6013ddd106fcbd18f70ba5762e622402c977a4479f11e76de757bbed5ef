import type { IComponent } from '../agStack/interfaces/iComponent';
import type { AgGridCommon } from './iCommon';
export interface ICellEditorRendererParams<TValue = any, TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    /** The value to be rendered by the renderer */
    value: TValue[] | TValue | null;
    /** The value to be renderer by the renderer formatted by the editor */
    valueFormatted: string;
    /** Gets the current value of the editor */
    getValue: () => TValue[] | TValue | null | undefined;
    /** Sets the value of the editor */
    setValue: (value: TValue[] | TValue | null) => void;
    /** Used to set a tooltip to the renderer */
    setTooltip: (value: string, shouldDisplayTooltip: () => boolean) => void;
}
export interface ICellEditorRendererComp<TValue> extends IComponent<ICellEditorRendererParams<TValue>> {
}
