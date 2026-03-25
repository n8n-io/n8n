import { OnChangeFn, Updater, TableFeature } from '../types';
import { ColumnPinningPosition } from './ColumnPinning';
export interface ColumnSizingTableState {
    columnSizing: ColumnSizingState;
    columnSizingInfo: ColumnSizingInfoState;
}
export type ColumnSizingState = Record<string, number>;
export interface ColumnSizingInfoState {
    columnSizingStart: [string, number][];
    deltaOffset: null | number;
    deltaPercentage: null | number;
    isResizingColumn: false | string;
    startOffset: null | number;
    startSize: null | number;
}
export type ColumnResizeMode = 'onChange' | 'onEnd';
export type ColumnResizeDirection = 'ltr' | 'rtl';
export interface ColumnSizingOptions {
    /**
     * Determines when the columnSizing state is updated. `onChange` updates the state when the user is dragging the resize handle. `onEnd` updates the state when the user releases the resize handle.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#columnresizemode)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
     */
    columnResizeMode?: ColumnResizeMode;
    /**
     * Enables or disables column resizing for the column.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#enablecolumnresizing)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
     */
    enableColumnResizing?: boolean;
    /**
     * Enables or disables right-to-left support for resizing the column. defaults to 'ltr'.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#columnResizeDirection)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
     */
    columnResizeDirection?: ColumnResizeDirection;
    /**
     * If provided, this function will be called with an `updaterFn` when `state.columnSizing` changes. This overrides the default internal state management, so you will also need to supply `state.columnSizing` from your own managed state.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#oncolumnsizingchange)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
     */
    onColumnSizingChange?: OnChangeFn<ColumnSizingState>;
    /**
     * If provided, this function will be called with an `updaterFn` when `state.columnSizingInfo` changes. This overrides the default internal state management, so you will also need to supply `state.columnSizingInfo` from your own managed state.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#oncolumnsizinginfochange)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
     */
    onColumnSizingInfoChange?: OnChangeFn<ColumnSizingInfoState>;
}
export type ColumnSizingDefaultOptions = Pick<ColumnSizingOptions, 'columnResizeMode' | 'onColumnSizingChange' | 'onColumnSizingInfoChange' | 'columnResizeDirection'>;
export interface ColumnSizingInstance {
    /**
     * If pinning, returns the total size of the center portion of the table by calculating the sum of the sizes of all unpinned/center leaf-columns.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#getcentertotalsize)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
     */
    getCenterTotalSize: () => number;
    /**
     * Returns the total size of the left portion of the table by calculating the sum of the sizes of all left leaf-columns.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#getlefttotalsize)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
     */
    getLeftTotalSize: () => number;
    /**
     * Returns the total size of the right portion of the table by calculating the sum of the sizes of all right leaf-columns.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#getrighttotalsize)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
     */
    getRightTotalSize: () => number;
    /**
     * Returns the total size of the table by calculating the sum of the sizes of all leaf-columns.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#gettotalsize)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
     */
    getTotalSize: () => number;
    /**
     * Resets column sizing to its initial state. If `defaultState` is `true`, the default state for the table will be used instead of the initialValue provided to the table.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#resetcolumnsizing)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
     */
    resetColumnSizing: (defaultState?: boolean) => void;
    /**
     * Resets column sizing info to its initial state. If `defaultState` is `true`, the default state for the table will be used instead of the initialValue provided to the table.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#resetheadersizeinfo)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
     */
    resetHeaderSizeInfo: (defaultState?: boolean) => void;
    /**
     * Sets the column sizing state using an updater function or a value. This will trigger the underlying `onColumnSizingChange` function if one is passed to the table options, otherwise the state will be managed automatically by the table.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#setcolumnsizing)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
     */
    setColumnSizing: (updater: Updater<ColumnSizingState>) => void;
    /**
     * Sets the column sizing info state using an updater function or a value. This will trigger the underlying `onColumnSizingInfoChange` function if one is passed to the table options, otherwise the state will be managed automatically by the table.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#setcolumnsizinginfo)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
     */
    setColumnSizingInfo: (updater: Updater<ColumnSizingInfoState>) => void;
}
export interface ColumnSizingColumnDef {
    /**
     * Enables or disables column resizing for the column.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#enableresizing)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
     */
    enableResizing?: boolean;
    /**
     * The maximum allowed size for the column
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#maxsize)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
     */
    maxSize?: number;
    /**
     * The minimum allowed size for the column
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#minsize)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
     */
    minSize?: number;
    /**
     * The desired size for the column
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#size)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
     */
    size?: number;
}
export interface ColumnSizingColumn {
    /**
     * Returns `true` if the column can be resized.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#getcanresize)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
     */
    getCanResize: () => boolean;
    /**
     * Returns `true` if the column is currently being resized.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#getisresizing)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
     */
    getIsResizing: () => boolean;
    /**
     * Returns the current size of the column.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#getsize)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
     */
    getSize: () => number;
    /**
     * Returns the offset measurement along the row-axis (usually the x-axis for standard tables) for the header. This is effectively a sum of the offset measurements of all preceding (left) headers in relation to the current column.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#getstart)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
     */
    getStart: (position?: ColumnPinningPosition | 'center') => number;
    /**
     * Returns the offset measurement along the row-axis (usually the x-axis for standard tables) for the header. This is effectively a sum of the offset measurements of all succeeding (right) headers in relation to the current column.
     */
    getAfter: (position?: ColumnPinningPosition | 'center') => number;
    /**
     * Resets the column to its initial size.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#resetsize)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
     */
    resetSize: () => void;
}
export interface ColumnSizingHeader {
    /**
     * Returns an event handler function that can be used to resize the header. It can be used as an:
     * - `onMouseDown` handler
     * - `onTouchStart` handler
     *
     * The dragging and release events are automatically handled for you.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#getresizehandler)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
     */
    getResizeHandler: (context?: Document) => (event: unknown) => void;
    /**
     * Returns the current size of the header.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#getsize)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
     */
    getSize: () => number;
    /**
     * Returns the offset measurement along the row-axis (usually the x-axis for standard tables) for the header. This is effectively a sum of the offset measurements of all preceding headers.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#getstart)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
     */
    getStart: (position?: ColumnPinningPosition) => number;
}
export declare const defaultColumnSizing: {
    size: number;
    minSize: number;
    maxSize: number;
};
export declare const ColumnSizing: TableFeature;
export declare function passiveEventSupported(): boolean;
