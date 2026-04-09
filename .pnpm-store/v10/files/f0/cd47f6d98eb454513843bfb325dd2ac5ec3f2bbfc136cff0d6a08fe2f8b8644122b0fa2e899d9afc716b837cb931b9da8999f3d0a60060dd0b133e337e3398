import type { AgComponentSelector } from '../interfaces/agComponent';
import type { AgElementParams } from '../utils/dom';
import type { AgFieldParams } from './agFieldParams';
export interface AgPickerFieldParams<TComponentSelectorType extends string> extends AgFieldParams {
    pickerType: string;
    pickerGap?: number;
    /**
     * If true, will set min-width and max-width (if present), and will set width to wrapper element width.
     * If false, will set min-width, max-width and width to maxPickerWidth or wrapper element width.
     */
    variableWidth?: boolean;
    minPickerWidth?: number | string;
    maxPickerWidth?: number | string;
    maxPickerHeight?: number | string;
    pickerAriaLabelKey: string;
    pickerAriaLabelValue: string;
    template?: AgElementParams<TComponentSelectorType>;
    agComponents?: AgComponentSelector<TComponentSelectorType>[];
    className?: string;
    pickerIcon?: string;
    ariaRole?: string;
    modalPicker?: boolean;
    inputWidth?: number | 'flex';
}
