import type { AgChartCallbackParams, Renderer } from './callbackOptions';
import type { ContextDefault, DatumDefault, DurationMs, InteractionRange, PixelSize, TextWrap } from './types';
export type AgTooltipMode = 'single' | 'shared' | 'compact';
export declare enum AgTooltipAnchorToType {
    POINTER = "pointer",
    NODE = "node",
    CHART = "chart"
}
export declare enum AgTooltipPlacementType {
    TOP = "top",
    RIGHT = "right",
    BOTTOM = "bottom",
    LEFT = "left",
    TOP_RIGHT = "top-right",
    BOTTOM_RIGHT = "bottom-right",
    BOTTOM_LEFT = "bottom-left",
    TOP_LEFT = "top-left",
    CENTER = "center"
}
export type AgTooltipAnchorTo = `${AgTooltipAnchorToType}`;
export type AgTooltipPlacement = `${AgTooltipPlacementType}`;
export interface AgChartTooltipOptions {
    /** Set to `false` to disable tooltips for all series in the chart. */
    enabled?: boolean;
    /** Group multiple series into the same tooltip */
    mode?: AgTooltipMode;
    /** The tooltip arrow is displayed by default, unless the container restricts it or a position offset is provided. To always display the arrow, set `showArrow` to `true`. To remove the arrow, set `showArrow` to `false`.  */
    showArrow?: boolean;
    /** Range from a point that triggers the tooltip to show. This will be used unless overridden by the series `tooltip.range` option. */
    range?: InteractionRange;
    /** The position of the tooltip. This will be used unless overridden by the series `tooltip.range` option. */
    position?: AgTooltipPositionOptions;
    /** The configuration for tooltip pagination. */
    pagination?: boolean;
    /** The time interval (in milliseconds) after which the tooltip is shown. */
    delay?: DurationMs;
    /**
     * Text wrapping strategy for tooltips.
     * - `'always'` will always wrap text to fit within the tooltip.
     * - `'hyphenate'` is similar to `'always'`, but inserts a hyphen (`-`) if forced to wrap in the middle of a word.
     * - `'on-space'` will only wrap on white space. If there is no possibility to wrap a line on space and satisfy the tooltip dimensions, the text will be truncated.
     * - `'never'` disables text wrapping.
     *
     * Default: `'hyphenate'`
     */
    wrapping?: TextWrap;
}
export interface AgTooltipPositionOptions {
    /** The element or point to position the tooltip relative to. */
    anchorTo?: AgTooltipAnchorTo;
    /**
     * The positioning of the tooltip in relation to the element it's anchored to.
     * Multiple values can be provided as a fallback mechanism for the case the tooltip does not fit inside the chart.
     */
    placement?: AgTooltipPlacement | AgTooltipPlacement[];
    /** The horizontal offset in pixels for the position of the tooltip. */
    xOffset?: PixelSize;
    /** The vertical offset in pixels for the position of the tooltip. */
    yOffset?: PixelSize;
}
export interface AgTooltipRendererDataRow {
    label: string;
    value: string;
}
export interface AgTooltipRendererResult {
    /** Text for the tooltip header. */
    heading?: string;
    /** Text for the tooltip title. */
    title?: string;
    /** An array of text for the tooltip body. */
    data?: AgTooltipRendererDataRow[];
}
export interface AgSeriesTooltipRendererParams<TDatum, TContext = ContextDefault> extends Omit<AgChartCallbackParams<TDatum, TContext>, 'itemId'> {
    /** Series title or yName depending on series configuration. */
    readonly title?: string;
}
export interface AgSeriesTooltip<TParams extends AgSeriesTooltipRendererParams<DatumDefault, ContextDefault>> {
    /** Whether to show tooltips when the series are hovered over. */
    enabled?: boolean;
    /** The tooltip arrow is displayed by default, unless the container restricts it or a position offset is provided. To always display the arrow, set `showArrow` to `true`. To remove the arrow, set `showArrow` to `false`.  */
    showArrow?: boolean;
    /** Range from a point that triggers the tooltip to show. Each series type uses its own default; typically this is `'nearest'` for marker-based series and `'exact'` for shape-based series. */
    range?: InteractionRange;
    /** The position of the tooltip. Each series type uses its own default; typically this is `'node'` for marker-based series and `'pointer'` for shape-based series. */
    position?: AgTooltipPositionOptions;
    /** Configuration for tooltip interaction. */
    interaction?: AgSeriesTooltipInteraction;
    /** Function used to create the content for tooltips. */
    renderer?: Renderer<TParams, AgTooltipRendererResult>;
}
export interface AgSeriesTooltipInteraction {
    /** Set to `true` to keep the tooltip open when the mouse is hovering over it, and enable clicking tooltip text */
    enabled: boolean;
}
