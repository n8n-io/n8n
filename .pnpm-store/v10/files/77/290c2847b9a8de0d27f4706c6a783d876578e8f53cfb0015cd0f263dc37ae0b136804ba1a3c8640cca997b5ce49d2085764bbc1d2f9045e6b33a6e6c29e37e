import type { AgCartesianSeriesOptions } from '../series/cartesian/cartesianSeriesTypes';
import type { AgAnnotationsOptions } from './annotationsOptions';
import type { AgAxisBaseIntervalOptions, AgAxisBaseTickOptions, AgAxisCaptionOptions, AgAxisContinuousIntervalOptions, AgAxisLabelStylerParams, AgBaseAxisLabelOptions, AgBaseAxisLabelStyleOptions, AgBaseAxisOptions, AgBaseContinuousAxisOptions, AgContinuousAxisOptions, AgNumericAxisFormattableLabelOptions, AgTimeAxisFormattableLabelFormat, AgTimeAxisFormattableLabelOptions, AgTimeInterval, AgTimeIntervalUnit } from './axisOptions';
import type { AgBandHighlightOptions } from './bandHighlightOptions';
import type { Styler } from './callbackOptions';
import type { AgBaseThemeableChartOptions } from './chartOptions';
import type { AgBaseCrossLineLabelOptions, AgBaseCrossLineOptions, AgCrossLineLabelPosition, AgCrossLineThemeOptions } from './crossLineOptions';
import type { AgBaseCrosshairLabel, AgCrosshairLabel, AgCrosshairOptions } from './crosshairOptions';
import type { ContextDefault, DatumDefault, Degree, PixelSize, Ratio, TextWrap } from './types';
/** Configuration for axes in cartesian charts. */
export interface AgBaseCartesianAxisOptions<LabelType = AgCartesianAxisLabelOptions<ContextDefault>, CrosshairLabelType = AgCrosshairLabel<any, ContextDefault>, TContext = ContextDefault> extends AgBaseAxisOptions<LabelType, TContext> {
    /** An array of keys determining which series are charted on this axis. */
    keys?: string[];
    /** The position on the chart where the axis should be rendered. */
    position?: AgCartesianAxisPosition;
    /** Value on the first perpendicular axis' domain where this axis should intersect. */
    crossAt?: AgCartesianAxisCrossAt;
    /** Add cross-lines or regions corresponding to data values. */
    crossLines?: AgCartesianCrossLineOptions[];
    /** Sets the axis thickness regardless of its content. */
    thickness?: PixelSize;
    /**
     * The maximum thickness of the axis, as a ratio of the chart's width or height depending on axis direction.
     * Used to prevent the axis from growing too large when labels or content are oversized.
     *
     * Default: `0.3`
     */
    maxThicknessRatio?: Ratio;
    /** Configuration for the title shown next to the axis. */
    title?: AgAxisCaptionOptions;
    /** Configuration for the axis crosshair. */
    crosshair?: AgCrosshairOptions<CrosshairLabelType>;
}
export interface AgCartesianAxisCrossAt {
    /** The value on the perpendicular axis' domain where this axis should intersect. */
    value: number | Date | string | string[];
    /**
     * Whether the axis should remain visible when the cross position is outside the perpendicular axis domain.
     *
     * Default: `true`
     */
    sticky?: boolean;
}
export interface AgTimeAxisParentLevel<TContext = ContextDefault> {
    /** Enables parent level labels and ticks. */
    enabled?: boolean;
    /** Configuration for the axis labels, shown next to the ticks. */
    label?: AgCartesianTimeAxisLabelOptions<TContext>;
    /** Configuration for the axis ticks. */
    tick?: AgAxisBaseTickOptions;
}
export interface AgCartesianAxisLabelOptions<TContext = ContextDefault> extends AgBaseCartesianAxisLabelOptions<TContext>, AgNumericAxisFormattableLabelOptions<TContext> {
}
export interface AgCartesianTimeAxisLabelOptions<TContext = ContextDefault> extends AgBaseCartesianAxisLabelOptions<TContext>, AgTimeAxisFormattableLabelOptions<TContext> {
}
export interface AgBaseCartesianAxisLabelOptions<TContext = ContextDefault> extends AgBaseAxisLabelOptions<TContext> {
    /** If specified and axis labels may collide, they are rotated so that they are positioned at the supplied angle. This is enabled by default for category. If the `rotation` property is specified, it takes precedence. */
    autoRotate?: boolean;
    /** If autoRotate is enabled, specifies the rotation angle to use when autoRotate is activated. Defaults to an angle of 335 degrees if unspecified. */
    autoRotateAngle?: Degree;
    /**
     * Text wrapping strategy for long text.
     * - `'always'` will always wrap text to fit within the `maxWidth`.
     * - `'hyphenate'` is similar to `'always'`, but inserts a hyphen (`-`) if forced to wrap in the middle of a word.
     * - `'on-space'` will only wrap on white space. If there is no possibility to wrap a line on space and satisfy the `maxWidth`, the text will be truncated.
     * - `'never'` disables text wrapping.
     *
     * Default: `'on-space'`
     */
    wrapping?: TextWrap;
    /**
     * If truncate is enabled, the text will be truncated to fit available space and an ellipsis (`...`) will be added at the end of the text.
     */
    truncate?: boolean;
}
export interface AgGroupedCategoryAxisLabelOptions<TContext = ContextDefault> extends Omit<AgBaseAxisLabelOptions<TContext>, 'itemStyler'> {
    /** Function used to style axis labels. */
    itemStyler?: Styler<AgGroupedCategoryAxisLabelStylerParams<TContext>, AgBaseAxisLabelStyleOptions>;
}
export interface AgGroupedCategoryAxisLabelStylerParams<TContext = ContextDefault> extends AgAxisLabelStylerParams<TContext> {
    /** The depth of the label, used by `grouped-category` axes. */
    readonly depth: number;
}
export interface AgBaseCartesianChartOptions<TDatum = DatumDefault, TContext = ContextDefault> {
    /** Axis configurations. */
    axes?: AgCartesianAxisOptions<TContext>[];
    /** Series configurations. */
    series?: AgCartesianSeriesOptions<TDatum, TContext>[];
    /** Annotations configurations. */
    annotations?: AgAnnotationsOptions;
}
export interface AgGroupedCategoryDepthLabelOptions<TContext = ContextDefault> extends Pick<AgBaseAxisLabelOptions<TContext>, 'enabled' | 'avoidCollisions' | 'rotation' | 'spacing' | 'border' | 'color' | 'cornerRadius' | 'fill' | 'fontFamily' | 'fontSize' | 'fontStyle' | 'fontWeight' | 'padding'> {
    /**
     * Text wrapping strategy for long text.
     * - `'always'` will always wrap text to fit within the `maxWidth`.
     * - `'hyphenate'` is similar to `'always'`, but inserts a hyphen (`-`) if forced to wrap in the middle of a word.
     * - `'on-space'` will only wrap on white space. If there is no possibility to wrap a line on space and satisfy the `maxWidth`, the text will be truncated.
     * - `'never'` disables text wrapping.
     *
     * Default: `'on-space'`
     */
    wrapping?: TextWrap;
    /**
     * If truncate is enabled, the text will be truncated to fit available space and an ellipsis (`...`) will be added at the end of the text.
     */
    truncate?: boolean;
}
export type AgGroupedCategoryDepthTickOptions = Pick<AgAxisBaseTickOptions, 'enabled' | 'stroke' | 'width'>;
export interface AgGroupedCategoryDepthOptions<TContext = ContextDefault> {
    label?: AgGroupedCategoryDepthLabelOptions<TContext>;
    tick?: AgGroupedCategoryDepthTickOptions;
}
type AgAxisIntervalPlacement = 'on' | 'between';
export interface AgAxisCategoryIntervalOptions extends AgAxisBaseIntervalOptions {
    placement?: AgAxisIntervalPlacement;
}
export interface AgAxisDiscreteTimeIntervalOptions extends AgAxisContinuousIntervalOptions<AgTimeInterval | AgTimeIntervalUnit | number> {
    placement?: AgAxisIntervalPlacement;
}
export interface AgCategoryAxisOptions<TContext = ContextDefault> extends AgBaseCartesianAxisOptions<AgBaseCartesianAxisLabelOptions<TContext>, AgBaseCrosshairLabel<TContext>, TContext> {
    type: 'category';
    /** Configuration for the axis ticks interval. */
    interval?: AgAxisCategoryIntervalOptions;
    /** The size of the gap between the categories as a proportion, between 0 and 1. This value is a fraction of the “step”, which is the interval between the start of a band and the start of the next band. */
    paddingInner?: Ratio;
    /** The padding on the outside i.e. left and right of the first and last category. In association with `paddingInner`, this value can be between 0 and 1. */
    paddingOuter?: Ratio;
    /** This property is for grouped column/bar series plotted on a category axis. It is a proportion between 0 and 1 which determines the size of the gap between the bars or columns within a single group along the axis. */
    groupPaddingInner?: Ratio;
    /** Configuration for the axis band highlight. */
    bandHighlight?: AgBandHighlightOptions;
}
type AgGroupedCategoryAxisTickOptions = Omit<AgAxisBaseTickOptions, 'size'>;
export interface AgGroupedCategoryAxisOptions<TContext = ContextDefault> extends Omit<AgBaseCartesianAxisOptions<AgGroupedCategoryAxisLabelOptions<TContext>, AgBaseCrosshairLabel<TContext>, TContext>, 'tick'> {
    type: 'grouped-category';
    /** The size of the gap between the categories as a proportion, between 0 and 1. This value is a fraction of the “step”, which is the interval between the start of a band and the start of the next band. */
    paddingInner?: Ratio;
    /** This property is for grouped column/bar series plotted on a category axis. It is a proportion between 0 and 1 which determines the size of the gap between the bars or columns within a single group along the axis. */
    groupPaddingInner?: Ratio;
    /** An array of depth options, starting from the leafs. */
    depthOptions?: AgGroupedCategoryDepthOptions<TContext>[];
    /** Configuration for the axis ticks. */
    tick?: AgGroupedCategoryAxisTickOptions;
    /** Configuration for the axis band highlight. */
    bandHighlight?: AgBandHighlightOptions;
    /**
     * The maximum thickness of the axis, as a ratio of the chart's width or height depending on axis direction.
     * Used to prevent the axis from growing too large when labels or content are oversized.
     *
     * Default: `0.5`
     */
    maxThicknessRatio?: Ratio;
}
export interface AgTimeAxisOptions<TContext = ContextDefault> extends Omit<AgBaseCartesianAxisOptions<AgCartesianTimeAxisLabelOptions<TContext>, AgCrosshairLabel<AgTimeAxisFormattableLabelFormat, TContext>, TContext>, 'interval'>, AgContinuousAxisOptions<Date | number, AgTimeInterval | AgTimeIntervalUnit | number> {
    type: 'time';
    /** Options for labels and ticks for the parent level intervals. */
    parentLevel?: AgTimeAxisParentLevel<TContext>;
}
export interface AgUnitTimeAxisOptions<TContext = ContextDefault> extends Omit<AgBaseCartesianAxisOptions<AgCartesianTimeAxisLabelOptions<TContext>, AgCrosshairLabel<AgTimeAxisFormattableLabelFormat, TContext>, TContext>, 'interval'>, AgBaseContinuousAxisOptions<Date | number> {
    type: 'unit-time';
    /** Options for labels and ticks for the parent level intervals. */
    parentLevel?: AgTimeAxisParentLevel<TContext>;
    /** The size of each band. */
    unit?: AgTimeInterval | AgTimeIntervalUnit;
    /** Configuration for the axis ticks interval. */
    interval?: AgAxisDiscreteTimeIntervalOptions;
    /** The size of the gap between the categories as a proportion, between 0 and 1. This value is a fraction of the “step”, which is the interval between the start of a band and the start of the next band. */
    paddingInner?: Ratio;
    /** The padding on the outside i.e. left and right of the first and last category. In association with `paddingInner`, this value can be between 0 and 1. */
    paddingOuter?: Ratio;
    /** This property is for grouped column/bar series plotted on a category axis. It is a proportion between 0 and 1 which determines the size of the gap between the bars or columns within a single group along the axis. */
    groupPaddingInner?: Ratio;
    /** Configuration for the axis band highlight. */
    bandHighlight?: AgBandHighlightOptions;
}
export interface AgOrdinalTimeAxisOptions<TContext = ContextDefault> extends AgBaseCartesianAxisOptions<AgCartesianTimeAxisLabelOptions<TContext>, AgCrosshairLabel<AgTimeAxisFormattableLabelFormat, TContext>, TContext> {
    type: 'ordinal-time';
    /** Options for labels and ticks for the parent level intervals. */
    parentLevel?: AgTimeAxisParentLevel<TContext>;
    /** Configuration for the axis ticks interval. */
    interval?: AgAxisDiscreteTimeIntervalOptions;
    /** The size of the gap between the categories as a proportion, between 0 and 1. This value is a fraction of the “step”, which is the interval between the start of a band and the start of the next band. */
    paddingInner?: Ratio;
    /** The padding on the outside i.e. left and right of the first and last category. In association with `paddingInner`, this value can be between 0 and 1. */
    paddingOuter?: Ratio;
    /** This property is for grouped column/bar series plotted on a category axis. It is a proportion between 0 and 1 which determines the size of the gap between the bars or columns within a single group along the axis. */
    groupPaddingInner?: Ratio;
    /** Configuration for the axis band highlight. */
    bandHighlight?: AgBandHighlightOptions;
}
export interface AgNumberAxisOptions<TContext = ContextDefault> extends Omit<AgBaseCartesianAxisOptions<AgCartesianAxisLabelOptions<TContext>, AgCrosshairLabel<string, TContext>, TContext>, 'interval'>, AgContinuousAxisOptions<number, number> {
    type: 'number';
}
export interface AgLogAxisOptions<TContext = ContextDefault> extends Omit<AgBaseCartesianAxisOptions<AgCartesianAxisLabelOptions<TContext>, AgCrosshairLabel<string, TContext>, TContext>, 'interval'>, AgContinuousAxisOptions<number, number> {
    type: 'log';
    /** The base of the logarithm used. */
    base?: number;
}
export type AgCartesianAxisPosition = 'top' | 'right' | 'bottom' | 'left';
export type AgCartesianAxisOptions<TContext = ContextDefault> = AgNumberAxisOptions<TContext> | AgLogAxisOptions<TContext> | AgCategoryAxisOptions<TContext> | AgOrdinalTimeAxisOptions<TContext> | AgTimeAxisOptions<TContext> | AgUnitTimeAxisOptions<TContext> | AgGroupedCategoryAxisOptions<TContext>;
export type AgCartesianAxisType<TContext = ContextDefault> = AgCartesianAxisOptions<TContext>['type'];
type AgCartesianAxisThemeSpecialOptions = 'position' | 'type' | 'crossLines';
/** This is the configuration shared by all types of axis. */
export interface AgCartesianAxisThemeOptions<T> {
    /** An object with axis theme overrides for the `top` positioned axes. Same configs apply here as one level above. For example, to rotate labels by 45 degrees in 'top' positioned axes one can use `top: { label: { rotation: 45 } } }`. */
    top?: Omit<T, AgCartesianAxisThemeSpecialOptions>;
    /** An object with axis theme overrides for the `right` positioned axes. Same configs apply here as one level above. */
    right?: Omit<T, AgCartesianAxisThemeSpecialOptions>;
    /** An object with axis theme overrides for the `bottom` positioned axes. Same configs apply here as one level above. */
    bottom?: Omit<T, AgCartesianAxisThemeSpecialOptions>;
    /** An object with axis theme overrides for the `left` positioned axes. Same configs apply here as one level above. */
    left?: Omit<T, AgCartesianAxisThemeSpecialOptions>;
}
export interface AgBaseCartesianThemeOptions<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseThemeableChartOptions<TDatum, TContext> {
    /** Axis configurations. */
    axes?: AgCartesianAxesTheme<TContext>;
}
export interface AgCartesianAxesCrossLineThemeOptions<LabelType = AgBaseCrossLineLabelOptions> {
    crossLines?: AgCrossLineThemeOptions<LabelType>;
}
export interface AgCartesianAxesTheme<TContext = ContextDefault> {
    /** This extends the common axis configuration with options specific to number axes. */
    number?: AgNumberAxisThemeOptions<AgBaseCrossLineLabelOptions, TContext>;
    /** This extends the common axis configuration with options specific to number axes. */
    log?: AgLogAxisThemeOptions<AgBaseCrossLineLabelOptions, TContext>;
    /** This extends the common axis configuration with options specific to category axes. */
    category?: AgCategoryAxisThemeOptions<AgBaseCrossLineLabelOptions, TContext>;
    /** This extends the common axis configuration with options specific to time axes. */
    time?: AgContinuousTimeAxisThemeOptions<AgBaseCrossLineLabelOptions, TContext>;
    /** This extends the common axis configuration with options specific to ordinal-time axes. */
    'ordinal-time'?: AgOrdinalTimeAxisThemeOptions<AgBaseCrossLineLabelOptions, TContext>;
    /** This extends the common axis configuration with options specific to grouped-category axes. */
    'grouped-category'?: AgGroupedCategoryAxisThemeOptions<AgBaseCrossLineLabelOptions, TContext>;
    /** This extends the common axis configuration with options specific to unit-time axes. */
    'unit-time'?: AgUnitTimeAxisThemeOptions<AgBaseCrossLineLabelOptions, TContext>;
}
export type AgContinuousCartesianAxesTheme<TContext = ContextDefault> = Pick<AgCartesianAxesTheme<TContext>, 'number' | 'log' | 'time'>;
type ThemeOmittedAxisOptions = 'type' | 'crossLines';
export interface AgNumberAxisThemeOptions<LabelType = AgBaseCrossLineLabelOptions, TContext = ContextDefault> extends Omit<AgNumberAxisOptions<TContext>, ThemeOmittedAxisOptions>, AgCartesianAxisThemeOptions<AgNumberAxisOptions<TContext>>, AgCartesianAxesCrossLineThemeOptions<LabelType> {
}
export interface AgLogAxisThemeOptions<LabelType = AgBaseCrossLineLabelOptions, TContext = ContextDefault> extends Omit<AgLogAxisOptions<TContext>, ThemeOmittedAxisOptions>, AgCartesianAxisThemeOptions<AgLogAxisOptions<TContext>>, AgCartesianAxesCrossLineThemeOptions<LabelType> {
}
export interface AgCategoryAxisThemeOptions<LabelType = AgBaseCrossLineLabelOptions, TContext = ContextDefault> extends Omit<AgCategoryAxisOptions<TContext>, ThemeOmittedAxisOptions>, AgCartesianAxisThemeOptions<AgCategoryAxisOptions<TContext>>, AgCartesianAxesCrossLineThemeOptions<LabelType> {
}
export interface AgOrdinalTimeAxisThemeOptions<LabelType = AgBaseCrossLineLabelOptions, TContext = ContextDefault> extends Omit<AgOrdinalTimeAxisOptions<TContext>, ThemeOmittedAxisOptions>, AgCartesianAxisThemeOptions<AgOrdinalTimeAxisOptions<TContext>>, AgCartesianAxesCrossLineThemeOptions<LabelType> {
}
export interface AgGroupedCategoryAxisThemeOptions<LabelType = AgBaseCrossLineLabelOptions, TContext = ContextDefault> extends Omit<AgGroupedCategoryAxisOptions<TContext>, ThemeOmittedAxisOptions>, AgCartesianAxisThemeOptions<AgGroupedCategoryAxisOptions<TContext>>, AgCartesianAxesCrossLineThemeOptions<LabelType> {
}
export interface AgContinuousTimeAxisThemeOptions<LabelType = AgBaseCrossLineLabelOptions, TContext = ContextDefault> extends Omit<AgTimeAxisOptions<TContext>, ThemeOmittedAxisOptions>, AgCartesianAxisThemeOptions<AgTimeAxisOptions<TContext>>, AgCartesianAxesCrossLineThemeOptions<LabelType> {
}
export interface AgUnitTimeAxisThemeOptions<LabelType = AgBaseCrossLineLabelOptions, TContext = ContextDefault> extends Omit<AgUnitTimeAxisOptions<TContext>, ThemeOmittedAxisOptions>, AgCartesianAxisThemeOptions<AgUnitTimeAxisOptions<TContext>>, AgCartesianAxesCrossLineThemeOptions<LabelType> {
}
export interface AgCartesianCrossLineOptions extends AgBaseCrossLineOptions<AgCartesianCrossLineLabelOptions> {
}
export interface AgCartesianCrossLineLabelOptions extends AgBaseCrossLineLabelOptions {
    /** The position of the Cross Line label. */
    position?: AgCrossLineLabelPosition;
    /** The rotation of the Cross Line label in degrees. */
    rotation?: Degree;
}
export {};
