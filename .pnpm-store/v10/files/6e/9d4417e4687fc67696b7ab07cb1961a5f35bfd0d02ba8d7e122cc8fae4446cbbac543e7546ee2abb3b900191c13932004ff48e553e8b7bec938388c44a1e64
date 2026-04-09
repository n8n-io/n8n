import type { CssColor, DatumKey, FontFamily, FontSize, FontStyle, FontWeight, Opacity, PixelSize, Ratio } from '../../chart/types';
/**
 * Represents configuration options for X and Y axes in a chart.
 */
export interface AxisOptions<TDatum> {
    /** The key used to retrieve x-values (categories) from the data. */
    xKey: DatumKey<TDatum>;
    /** The key used to retrieve y-values from the data. */
    yKey: DatumKey<TDatum>;
    /** A descriptive label for x-values. */
    xName?: string;
    /** A descriptive label for y-values. */
    yName?: string;
}
/**
 * Represents options for filling shapes in a chart.
 */
export interface FillOptions {
    /** The colour for filling shapes. */
    fill?: AgColorType;
    /** The opacity of the fill colour. */
    fillOpacity?: Opacity;
}
export type AgColorType = CssColor | AgGradientColor | AgPatternColor | AgImageFill;
export type AgColorTypeStrict = CssColor | AgGradientColorStrict;
export type AgGradientColorMode = 'continuous' | 'discrete';
export interface AgGradientColorStop {
    /** Colour of this category. */
    color?: CssColor;
    /** Stop value of this category. Defaults the maximum value if unset. */
    stop?: Ratio;
}
export interface AgGradientColor {
    type: 'gradient';
    /** Represents the position and color of stops in the gradient. */
    colorStops?: AgGradientColorStop[];
    /** The rotation angle of the line along which the gradient is rendered. */
    rotation?: number;
}
export interface AgGradientColorStrict extends AgGradientColor {
    colorStops: AgGradientColorStop[];
}
export type AgGradientType = 'linear' | 'radial' | 'conic';
export type AgGradientColorBounds = 'series' | 'item' | 'axis';
export interface AgPatternColor {
    type: 'pattern';
    /** The stock pattern to apply. */
    pattern?: AgPatternName;
    /** The svg path for a custom pattern */
    path?: string;
    /** Width of the pattern unit. */
    width?: number;
    /** Height of the pattern unit. */
    height?: number;
    /** The rotation angle of the pattern. */
    rotation?: number;
    /** The scaling of the pattern. */
    scale?: number;
    /** The colour for filling closed shapes in the pattern. */
    fill?: CssColor;
    /** The opacity of the shapes fill colour. */
    fillOpacity?: Opacity;
    /** The colour for filling the background in the pattern. */
    backgroundFill?: CssColor;
    /** The opacity of the background fill colour. */
    backgroundFillOpacity?: Opacity;
    /** The colour for the strokes of shapes in the pattern. */
    stroke?: CssColor;
    /** The opacity of the shapes stroke colour. */
    strokeOpacity?: Opacity;
    /** The width of the stroke of shapes in pixels. */
    strokeWidth?: PixelSize;
}
export interface AgImageFill {
    type: 'image';
    /** URL of the image. */
    url: string;
    /** The colour for filling the background in the pattern. */
    backgroundFill?: CssColor;
    /** The colour for filling the background in the pattern. */
    backgroundFillOpacity?: Opacity;
    /** Height of the image. */
    width?: number;
    /** Width of the image. */
    height?: number;
    /** A string indicating how to repeat the pattern's unit.*/
    repeat?: AgColorRepeat;
    /** The fit mode of the image. */
    fit?: AgImageFillFit;
    /** The rotation angle of the image. */
    rotation?: number;
}
export type AgColorRepeat = 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat';
export type AgImageFillFit = 'stretch' | 'cover' | 'contain' | 'none';
export type AgPatternName = 'vertical-lines' | 'horizontal-lines' | 'forward-slanted-lines' | 'backward-slanted-lines' | 'squares' | 'circles' | 'triangles' | 'diamonds' | 'stars' | 'hearts' | 'crosses';
/**
 * Represents options for the strokes in a chart.
 */
export interface StrokeOptions {
    /** The colour for the stroke. */
    stroke?: CssColor;
    /** The width of the stroke in pixels. */
    strokeWidth?: PixelSize;
    /** The opacity of the stroke colour. */
    strokeOpacity?: Opacity;
}
/**
 * Represents options for the boxing style on labels.
 */
export interface LabelBoxOptions extends FillOptions {
    /** Stroke options for the box border. */
    border?: BorderOptions;
    /** Apply rounded corners to the label box. */
    cornerRadius?: PixelSize;
    /** Distance between the label text and the border. */
    padding?: Padding;
}
/**
 * Represents options for defining dashed strokes in a chart.
 */
export interface LineDashOptions {
    /** An array specifying the length in pixels of alternating dashes and gaps. */
    lineDash?: PixelSize[];
    /** The initial offset of the dashed line in pixels. */
    lineDashOffset?: PixelSize;
}
/**
 * Represents font styling options for text elements in a chart.
 */
export interface FontOptions {
    /** The colour for text elements. */
    color?: CssColor;
    /** The style to use for text elements. */
    fontStyle?: FontStyle;
    /** The font weight to use for text elements. */
    fontWeight?: FontWeight;
    /** The size of the font in pixels for text elements. */
    fontSize?: FontSize;
    /** The font family for text elements. */
    fontFamily?: FontFamily;
}
export type Padding = PixelSize | PaddingOptions;
export interface PaddingOptions {
    /** The number of pixels of padding at the top. */
    top?: PixelSize;
    /** The number of pixels of padding at the right. */
    right?: PixelSize;
    /** The number of pixels of padding at the bottom. */
    bottom?: PixelSize;
    /** The number of pixels of padding at the left. */
    left?: PixelSize;
}
export interface BorderOptions extends Toggleable, StrokeOptions {
}
/**
 * Represents toggleable options for chart elements.
 */
export interface Toggleable {
    /** Whether the associated elements and properties should be used in the chart. */
    enabled?: boolean;
}
export interface Visible {
    /** Whether the element should be visible. */
    visible?: boolean;
}
export interface TextSegment extends FontOptions {
    /** A segment of text. */
    text: string;
}
export type TextOrSegments = string | TextSegment[];
