import type { AgElementParams } from '../utils/dom';
export type LabelAlignment = 'left' | 'right' | 'top';
export interface AgLabelParams {
    label?: HTMLElement | string;
    labelWidth?: number | 'flex';
    labelSeparator?: string;
    labelAlignment?: LabelAlignment;
    disabled?: boolean;
}
export interface AgFieldParams extends AgLabelParams {
    value?: any;
    width?: number;
    onValueChange?: (value?: any) => void;
}
export interface AgInputFieldParams<TComponentSelectorType extends string> extends AgFieldParams {
    inputName?: string;
    inputWidth?: number | 'flex';
    template?: AgElementParams<TComponentSelectorType>;
}
export interface AgCheckboxParams<TComponentSelectorType extends string> extends AgInputFieldParams<TComponentSelectorType> {
    readOnly?: boolean;
    passive?: boolean;
}
