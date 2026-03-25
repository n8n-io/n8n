import type { ICellEditorParams } from '../../interfaces/iCellEditor';
export interface IDateCellEditorParams<TData = any, TContext = any> extends ICellEditorParams<TData, Date, TContext> {
    /** Min allowed value. Either `Date` object or string in format `'yyyy-mm-dd'`. */
    min?: string | Date;
    /** Max allowed value. Either `Date` object or string in format `'yyyy-mm-dd'`. */
    max?: string | Date;
    /**
     * Size of the value change when stepping up/down, starting from `min` or the initial value if provided.
     * Step is also the difference between valid values.
     * If the user-provided value isn't a multiple of the step value from the starting value, it will be considered invalid.
     * Defaults to any value allowed.
     */
    step?: number;
    /**
     * Defines whether time should be included when editing dates.
     *
     * - `true`: Date and time will be editable.
     * - `false`: Only date portion will be editable.
     *
     * @default false
     */
    includeTime?: boolean;
}
