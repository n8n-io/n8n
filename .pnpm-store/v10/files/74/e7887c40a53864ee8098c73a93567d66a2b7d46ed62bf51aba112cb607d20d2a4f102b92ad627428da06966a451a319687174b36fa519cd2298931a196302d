import type { FilterAction } from './iFilter';
/**
 * Parameters passed to the Advanced Filter Builder
 */
export interface IAdvancedFilterBuilderParams {
    /**
     * Minimum width in pixels of the Advanced Filter Builder popup.
     * @default 500
     */
    minWidth?: number;
    /**
     * Whether to show the move up and move down buttons in the Advanced Filter Builder.
     * @default false
     */
    showMoveButtons?: boolean;
    /**
     * Width in pixels of the Advanced Filter Builder add button select popup.
     * @default 120
     */
    addSelectWidth?: number;
    /**
     * Min width in pixels of the Advanced Filter Builder pill select popup.
     * @default 140
     */
    pillSelectMinWidth?: number;
    /**
     * Max width in pixels of the Advanced Filter Builder pill select popup.
     * @default 200
     */
    pillSelectMaxWidth?: number;
    /**
     * Specifies the buttons to be shown in the Advanced Filter Builder, in the order they should be displayed in.
     * The options are:
     *
     *  - `'apply'`: The Apply button will apply the filter and close the builder.
     *  - `'clear'`: The Clear button will clear the filter in the builder without removing the current active filter.
     *  - `'reset'`: The Reset button will clear the filter and apply an empty filter.
     *  - `'cancel'`: The Cancel button will discard any changes that have been made to the filter in the UI, and close the Builder without applying any changes.
     *
     * @default ['apply', 'cancel']
     */
    buttons?: FilterAction[];
    /**
     * Whether to hide the Full Screen button in the Advanced Filter Builder.
     * @default false
     */
    suppressFullScreenButton?: boolean;
}
