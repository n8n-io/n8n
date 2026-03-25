import type { Toggleable } from '../series/cartesian/commonOptions';
import type { ToolbarButton } from './buttonOptions';
import type { Ratio } from './types';
export type AgZoomAnchorPoint = 'pointer' | 'start' | 'middle' | 'end';
export type AgZoomAxes = 'x' | 'y' | 'xy';
export type AgZoomPanKey = 'alt' | 'ctrl' | 'meta' | 'shift';
export type AgZoomDeceleration = 'off' | 'short' | 'long' | Ratio;
export type AgAutoScaledAxes = Array<'y'>;
export type AgZoomAxisDraggingMode = 'pan' | 'zoom';
export interface AgZoomRange {
    /** The start of the axis zoom range. */
    start?: Date | string | number;
    /** The end of the axis zoom range. */
    end?: Date | string | number;
}
export interface AgZoomRatio {
    /** The minimum value of the axis zoom ratio.
     *  Default: `0`
     */
    start?: Ratio;
    /** The maximum value of the axis zoom ratio.
     *  Default: `1`
     */
    end?: Ratio;
}
export interface AgZoomButtons extends Toggleable {
    /** The buttons to show. */
    buttons?: AgZoomButton[];
    /** When the buttons should be visible.
     *
     * Default: `'hover'`
     */
    visible?: AgZoomButtonsVisible;
}
export type AgZoomButtonsVisible = 'always' | 'zoomed' | 'hover';
export interface AgZoomButton extends ToolbarButton {
    value: AgZoomButtonValue;
    section: string;
}
export type AgZoomButtonValue = 'reset' | 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'pan-start' | 'pan-end';
export interface AgZoomAutoScaling {
    /**
     * Set to `false` to disable the auto scaling of the y-axis when zooming the x-axis.
     *
     * Default: `true`
     */
    enabled?: boolean;
    /**
     * Padding to apply between the zoomed data and the boundary of the series.
     */
    padding?: Ratio;
}
export interface AgZoomOptions {
    /**
     * The anchor point for the x-axis about which to zoom into when scrolling.
     *
     * Default: `end`
     */
    anchorPointX?: AgZoomAnchorPoint;
    /**
     * The anchor point for the y-axis about which to zoom into when scrolling.
     *
     * Default: `middle`
     */
    anchorPointY?: AgZoomAnchorPoint;
    /**
     * Zoom auto scaling options.
     */
    autoScaling?: AgZoomAutoScaling;
    /**
     * The axes on which to zoom when scrolling, one of `xy`, `x`, or `y`.
     *
     * Default: `x`
     */
    axes?: AgZoomAxes;
    /**
     * Whether dragging an axis pans or zooms, if `enableAxisDragging` is enabled.
     *
     * Default: `zoom`
     */
    axisDraggingMode?: AgZoomAxisDraggingMode;
    /** A set of buttons to perform common zoom actions. */
    buttons?: AgZoomButtons;
    /**
     * Rate of deceleration of panning when dragging and releasing a zoomed chart.
     *
     * Default: `short`
     */
    deceleration?: AgZoomDeceleration;
    /**
     * Set to `true` to enable the zoom module.
     *
     * Default: `false`
     */
    enabled?: boolean;
    /**
     * Set to `true` to enable dragging an axis to zoom series attached to that axis.
     *
     * Default: `true`
     */
    enableAxisDragging?: boolean;
    /**
     * Set to `true` to enable scrolling an axis to zoom series attached to that axis.
     *
     * Default: `false`
     */
    enableAxisScrolling?: boolean;
    /**
     * Set to `true` to enable double-clicking to reset the chart to fully zoomed out.
     *
     * Default: `true`
     */
    enableDoubleClickToReset?: boolean;
    /**
     * Set to `true` to enable panning while zoomed.
     *
     * Default: `true`
     */
    enablePanning?: boolean;
    /**
     * Set to `true` to enable zooming with the mouse wheel.
     *
     * Default: `true`
     */
    enableScrolling?: boolean;
    /**
     * Set to `true` to enable selecting an area of the chart to zoom into.
     *
     * Default: `false`
     */
    enableSelecting?: boolean;
    /**
     * Set to `true` to enable zoom-panning with two touch points.
     *
     * Default: `true`
     */
    enableTwoFingerZoom?: boolean;
    /**
     * Set to `true` to keep the selection area matching the chart's aspect ratio.
     *
     * Default: `false`
     */
    keepAspectRatio?: boolean;
    /**
     * The minimum number of items to be shown, beyond which zooming is stopped. Set to `0` to allow unlimited zooming.
     *
     * Default: `2`
     */
    minVisibleItems?: number;
    /**
     * The key that should be pressed to allow dragging to pan around while zoomed, one of `alt`, `ctrl`, `meta` or `shift`.
     *
     * Default: `alt`
     */
    panKey?: AgZoomPanKey;
    /**
     * The amount to zoom when scrolling with the mouse wheel, as a ratio of the full chart.
     *
     * Default: `0.1`
     */
    scrollingStep?: Ratio;
}
