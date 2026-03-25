import type { AgAxisBoundSeries, AgTimeIntervalUnit } from './axisOptions';
import type { Formatter, Renderer } from './callbackOptions';
import type { ContextDefault, CssColor, Opacity, PixelSize } from './types';
export interface AgCrosshairOptions<LabelType = AgCrosshairLabel<string, ContextDefault>> {
    /** Whether to show the crosshair. */
    enabled?: boolean;
    /** When true, the crosshair snaps to the highlighted data point. By default this property is true. */
    snap?: boolean;
    /** The colour of the stroke for the lines. */
    stroke?: CssColor;
    /** The width in pixels of the stroke for the lines. */
    strokeWidth?: PixelSize;
    /** The opacity of the stroke for the lines. */
    strokeOpacity?: Opacity;
    /** Defines how the line stroke is rendered. Every number in the array specifies the length in pixels of alternating dashes and gaps. For example, `[6, 3]` means dashes with a length of `6` pixels with gaps between of `3` pixels. */
    lineDash?: PixelSize[];
    /** The initial offset of the dashed line in pixels. */
    lineDashOffset?: PixelSize;
    /** The crosshair label configuration */
    label?: LabelType;
}
export interface AgCrosshairLabelFormatterParams<TContext> {
    readonly value: any;
    readonly fractionDigits?: number;
    readonly unit?: AgTimeIntervalUnit;
    readonly step?: number;
    readonly boundSeries: AgAxisBoundSeries[];
    readonly domain: any[];
    readonly context?: TContext;
}
export interface AgCrosshairLabel<TFormat, TContext = ContextDefault> extends AgBaseCrosshairLabel<TContext> {
    /** Format string used when rendering labels. */
    format?: TFormat;
}
export interface AgBaseCrosshairLabel<TContext = ContextDefault> {
    /** Whether to show label when the crosshair is visible. */
    enabled?: boolean;
    /** The horizontal offset in pixels for the label. */
    xOffset?: PixelSize;
    /** The vertical offset in pixels for the label. */
    yOffset?: PixelSize;
    /** Function used to render crosshair labels. If `value` is a number, `fractionDigits` will also be provided, which indicates the number of fractional digits used in the step between ticks; for example, a tick step of `0.0005` would have `fractionDigits` set to `4` */
    formatter?: Formatter<AgCrosshairLabelFormatterParams<TContext>>;
    /** Function used to create the content for the label. */
    renderer?: Renderer<AgCrosshairLabelRendererParams, AgCrosshairLabelRendererResult>;
}
export interface AgCrosshairLabelRendererParams {
    /** Axis value that the label is being rendered for. */
    readonly value: any;
    /** If the axis value is a number, the fractional digits used to format the value. */
    readonly fractionDigits?: number;
}
export interface AgCrosshairLabelRendererResult {
    /** Text for the label. */
    text?: string;
    /** Label text colour. */
    color?: CssColor;
    /** Label background colour. */
    backgroundColor?: CssColor;
    /** Opacity of the label. */
    opacity?: Opacity;
}
