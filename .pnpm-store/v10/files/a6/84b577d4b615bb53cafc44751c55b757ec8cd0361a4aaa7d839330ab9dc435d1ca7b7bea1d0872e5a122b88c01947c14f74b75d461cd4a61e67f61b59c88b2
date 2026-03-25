import type { ICellEditorParams } from '../../interfaces/iCellEditor';
export interface INumberCellEditorParams<TData = any, TContext = any> extends ICellEditorParams<TData, number, TContext> {
    /** Min allowed value. */
    min?: number;
    /** Max allowed value. */
    max?: number;
    /** Number of digits allowed after the decimal point. */
    precision?: number;
    /**
     * Size of the value change when stepping up/down, starting from `min` or the initial value if provided.
     * Step is also the difference between valid values.
     * If the user-provided value isn't a multiple of the step value from the starting value, it will be considered invalid.
     * Defaults to any value allowed.
     */
    step?: number;
    /**
     * Display stepper buttons in editor. Note: Does not work when `preventStepping` is `true`.
     * @default false
     */
    showStepperButtons?: boolean;
    /**
     * Set to `true` to prevent key up/down from stepping the field's value.
     * @default false
     */
    preventStepping?: boolean;
}
