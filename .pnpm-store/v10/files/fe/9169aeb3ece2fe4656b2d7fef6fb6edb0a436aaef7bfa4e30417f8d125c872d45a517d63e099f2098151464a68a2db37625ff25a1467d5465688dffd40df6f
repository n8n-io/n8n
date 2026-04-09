import type { AgStateSerializableDate } from '../api/stateTypes';
import type { FillOptions, FontOptions, LineDashOptions, StrokeOptions, Toggleable, Visible } from '../series/cartesian/commonOptions';
import type { ToolbarButton, ToolbarSwitch } from './buttonOptions';
import type { Formatter } from './callbackOptions';
import type { CssColor, PixelSize } from './types';
export interface AgAnnotationsThemeableOptions extends AgAnnotationsOptions {
    line?: AgLineAnnotationStyles;
    'horizontal-line'?: AgCrossLineAnnotationStyles;
    'vertical-line'?: AgCrossLineAnnotationStyles;
    'disjoint-channel'?: AgDisjointChannelAnnotationStyles;
    'parallel-channel'?: AgParallelChannelAnnotationStyles;
    'fibonacci-retracement'?: AgFibonacciAnnotationStyles;
    'fibonacci-retracement-trend-based'?: AgFibonacciAnnotationStyles;
    callout?: AgCalloutAnnotationStyles;
    comment?: AgCommentAnnotationStyles;
    note?: AgNoteAnnotationStyles;
    text?: AgTextAnnotationStyles;
    arrow?: AgLineAnnotationStyles;
    'arrow-up'?: AgShapeAnnotationStyles;
    'arrow-down'?: AgShapeAnnotationStyles;
    'date-range'?: AgMeasurerAnnotationStyles;
    'price-range'?: AgMeasurerAnnotationStyles;
    'date-price-range'?: AgMeasurerAnnotationStyles;
    'quick-date-price-range'?: AgQuickMeasurerAnnotationStyles;
}
export interface AgAnnotationAxesButtons extends Toggleable {
    /** Which axis should display the annotation buttons. */
    axes?: 'x' | 'y' | 'xy';
}
export interface AgAnnotationHandleStyles extends FillOptions, StrokeOptions, LineDashOptions {
}
export interface AgLineAnnotationStyles extends Extendable, Writeable, Visible, StrokeOptions, LineOptions {
    handle?: AgAnnotationHandleStyles;
    text?: AgLineAnnotationTextStyles;
}
export interface AgCrossLineAnnotationStyles extends Writeable, Visible, StrokeOptions, LineOptions {
    axisLabel?: AgAnnotationAxisLabel;
    handle?: AgAnnotationHandleStyles;
    text?: AgLineAnnotationTextStyles;
}
export interface AgDisjointChannelAnnotationStyles extends AgChannelAnnotationStyles {
}
export interface AgParallelChannelAnnotationStyles extends AgChannelAnnotationStyles {
    middle?: AgChannelAnnotationMiddle;
}
export interface AgFibonacciAnnotationStyles extends AgLineAnnotationStyles {
    /** Configuration for the fibonacci ratio labels. */
    label?: FontOptions;
    /** Whether to show the fills between the Fibonacci range lines. */
    showFill?: boolean;
    /** Whether the Fibonacci range lines are multicolored. */
    isMultiColor?: boolean;
    /** The colors to cycle through for the strokes of the Fibonacci lines. */
    strokes?: CssColor[];
    /** The color for the strokes of the Fibonacci lines if isMultiColor is `false`. */
    rangeStroke?: CssColor;
    /** The number of fibonacci range bands. */
    bands?: 10 | 6 | 4;
}
export interface AgTextAnnotationStyles extends FontOptions, Writeable, Visible {
    handle?: AgAnnotationHandleStyles;
}
export interface AgCalloutAnnotationStyles extends AgTextAnnotationStyles, StrokeOptions, FillOptions {
}
export interface AgCommentAnnotationStyles extends AgTextAnnotationStyles, StrokeOptions, FillOptions {
}
export interface AgNoteAnnotationStyles extends AgTextAnnotationStyles, StrokeOptions, FillOptions {
    /** The fill and stroke for note icon. */
    background?: AgNoteAnnotationBackground;
}
export interface AgShapeAnnotationStyles extends Writeable, Visible, FillOptions {
    handle?: AgAnnotationHandleStyles;
}
export interface AgMeasurerAnnotationStyles extends StrokeOptions, LineOptions, Extendable, Writeable, Visible {
    background?: FillOptions;
    handle?: AgAnnotationHandleStyles;
    statistics?: AgMeasurerAnnotationStatistics;
    text?: AgLineAnnotationTextStyles;
}
export interface AgQuickMeasurerAnnotationStyles extends Visible {
    up?: AgQuickMeasurerAnnotationDirectionStyles;
    down?: AgQuickMeasurerAnnotationDirectionStyles;
}
export interface AgQuickMeasurerAnnotationDirectionStyles extends FillOptions, StrokeOptions, LineOptions {
    handle?: AgAnnotationHandleStyles;
    statistics?: AgMeasurerAnnotationStatistics;
}
export interface AgAnnotationsOptions extends Toggleable {
    /** The options for the axes buttons */
    axesButtons?: AgAnnotationAxesButtons;
    /** Configuration for the toolbar for creating annotations. */
    toolbar?: AgAnnotationsToolbar;
    /** Configuration for the options toolbar for editing an annotation. */
    optionsToolbar?: AgAnnotationOptionsToolbar;
}
export type AgAnnotation = AgLineAnnotation | AgHorizontalLineAnnotation | AgVerticalLineAnnotation | AgDisjointChannelAnnotation | AgParallelChannelAnnotation | AgFibonacciRetracementAnnotation | AgFibonacciRetracementTrendBasedAnnotation | AgCalloutAnnotation | AgCommentAnnotation | AgNoteAnnotation | AgTextAnnotation | AgArrowAnnotation | AgArrowUpAnnotation | AgArrowDownAnnotation | AgDateRangeAnnotation | AgPriceRangeAnnotation | AgDatePriceRangeAnnotation | AgQuickDatePriceRangeAnnotation;
export interface AgLineAnnotation extends AnnotationLinePoints, Extendable, Writeable, Visible, StrokeOptions, LineOptions {
    /** Configuration for the trend line annotation.*/
    type: 'line';
    /** Configuration for the drag handles. */
    handle?: AgAnnotationHandle;
    /** Configuration for the line text. */
    text?: AgLineAnnotationText;
}
export interface AgHorizontalLineAnnotation extends AgCrossLineAnnotation {
    /** Configuration for the horizontal-line annotation.*/
    type: 'horizontal-line';
    /** Configuration for the line text. */
    text?: AgLineAnnotationText;
}
export interface AgVerticalLineAnnotation extends AgCrossLineAnnotation {
    /** Configuration for the vertical-line annotation.*/
    type: 'vertical-line';
    /** Configuration for the line text. */
    text?: AgLineAnnotationText;
}
export interface AgCrossLineAnnotation extends Writeable, Visible, StrokeOptions, LineOptions {
    /** Position of the annotation specified in terms of the axis values. */
    value: AgAnnotationValue;
    /** Configuration for the annotation axis label. */
    axisLabel?: AgAnnotationAxisLabel;
    /** Configuration for the drag handle. */
    handle?: AgAnnotationHandle;
}
export interface AgFibonacciAnnotation extends AnnotationLinePoints, Extendable, Writeable, Visible, StrokeOptions, LineOptions, AgFibonacciAnnotationStyles {
    /** Configuration for the drag handles. */
    handle?: AgAnnotationHandle;
    /** Configuration for the one line text. */
    text?: AgLineAnnotationText;
    /** Reverse the lines if `true`. */
    reverse?: boolean;
}
export interface AgFibonacciRetracementAnnotation extends AgFibonacciAnnotation {
    type: 'fibonacci-retracement';
}
export interface AgFibonacciRetracementTrendBasedAnnotation extends AgFibonacciAnnotation {
    type: 'fibonacci-retracement-trend-based';
    /** The retracmeent end point of the fibonacci annotation. */
    endRetracement: AgAnnotationPoint;
}
export interface AgChannelAnnotationStyles extends Extendable, Writeable, Visible, StrokeOptions, LineOptions {
    /** Configuration for the drag handles. */
    handle?: AgAnnotationHandle;
    /** Configuration for the channel text. */
    text?: AgChannelAnnotationTextStyles;
    /** The fill color for the middle of the channel. */
    background?: AgChannelAnnotationBackground;
}
export interface AgParallelChannelAnnotation extends AgChannelAnnotationStyles, AnnotationLinePoints {
    /** Configuration for the parallel-channel annotation.*/
    type: 'parallel-channel';
    /** The height of the annotation along the y-axis. */
    height: number;
    /** Configuration for the channel text. */
    text?: AgChannelAnnotationText;
    /** Configuration for the line in the middle of the channel. */
    middle?: AgChannelAnnotationMiddle;
}
export interface AgDisjointChannelAnnotation extends AgChannelAnnotationStyles, AnnotationLinePoints {
    /** Configuration for the disjoint-channel annotation.*/
    type: 'disjoint-channel';
    /** The height of the annotation along the y-axis at the start. */
    startHeight: number;
    /** The height of the annotation along the y-axis at the end. */
    endHeight: number;
    /** Configuration for the channel text. */
    text?: AgChannelAnnotationText;
}
export interface AgCalloutAnnotation extends AgCalloutAnnotationStyles {
    /** Configuration for the callout annotation. */
    type: 'callout';
    /** The starting point of the annotation. */
    start: AgAnnotationPoint;
    /** The end point of the annotation. */
    end: AgAnnotationPoint;
    /** The text content. */
    text: string;
}
export interface AgCommentAnnotation extends AgCommentAnnotationStyles, AgAnnotationPoint {
    /** Configuration for the comment annotation. */
    type: 'comment';
    /** The text content. */
    text: string;
}
export interface AgNoteAnnotation extends AgNoteAnnotationStyles, AgAnnotationPoint {
    /** Configuration for the note annotation. */
    type: 'note';
    /** The text content. */
    text: string;
}
export interface AgTextAnnotation extends AgTextAnnotationStyles, AgAnnotationPoint {
    /** Configuration for the text annotation. */
    type: 'text';
    /** The text content. */
    text: string;
}
export interface AgArrowAnnotation extends AnnotationLinePoints, Extendable, Writeable, Visible, StrokeOptions, LineOptions {
    /** Configuration for the arrow annotation.*/
    type: 'arrow';
    handle?: AgAnnotationHandle;
    /** Configuration for the line text. */
    text?: AgLineAnnotationText;
}
export interface AgArrowMarkAnnotation extends AgAnnotationPoint, Writeable, Visible, FillOptions {
    /** Configuration for the arrow mark annotation.*/
    handle?: AgAnnotationHandle;
}
export interface AgArrowUpAnnotation extends AgArrowMarkAnnotation {
    /** Configuration for the arrow up annotation.*/
    type: 'arrow-up';
}
export interface AgArrowDownAnnotation extends AgArrowMarkAnnotation {
    /** Configuration for the arrow down annotation.*/
    type: 'arrow-down';
}
export interface AgDateRangeAnnotation extends AgMeasurerAnnotation {
    /** Configuration for the date range annotation.*/
    type: 'date-range';
    /**
     * Whether the annotation should be extended up above.
     *
     * Default: `false`
     */
    extendAbove?: boolean;
    /**
     * Whether the annotation should be extended down below.
     *
     * Default: `false`
     */
    extendBelow?: boolean;
}
export interface AgPriceRangeAnnotation extends AgMeasurerAnnotation {
    /** Configuration for the price range annotation.*/
    type: 'price-range';
    /**
     * Whether the annotation should be extended to the left.
     *
     * Default: `false`
     */
    extendLeft?: boolean;
    /**
     * Whether the annotation should be extended to the right.
     *
     * Default: `false`
     */
    extendRight?: boolean;
}
export interface AgDatePriceRangeAnnotation extends AgMeasurerAnnotation {
    /** Configuration for the date/price range annotation.*/
    type: 'date-price-range';
}
export interface AgQuickDatePriceRangeAnnotation extends AgMeasurerAnnotation {
    /** Configuration for the quick date/range annotation.*/
    type: 'quick-date-price-range';
    /** Configuration for the annotation when measuring up the y-axis.  */
    up?: AgMeasurerAnnotationDirection;
    /** Configuration for the annotation when measuring down the y-axis.  */
    down?: AgMeasurerAnnotationDirection;
}
export interface AgMeasurerAnnotation extends AnnotationLinePoints, Writeable, Visible, StrokeOptions, LineOptions {
    /** Configuration for the drag handles. */
    handle?: AgAnnotationHandle;
    /** Configuration for the line text. */
    text?: AgLineAnnotationText;
    /** Configuration for the statistics. */
    statistics?: AgMeasurerAnnotationStatistics;
}
export interface AgMeasurerAnnotationDirection extends FillOptions, StrokeOptions {
    statistics?: AgMeasurerAnnotationStatistics;
}
export interface AgMeasurerAnnotationStatistics extends FontOptions, FillOptions, StrokeOptions {
    divider?: StrokeOptions;
}
export type AgAnnotationLineStyleType = 'solid' | 'dashed' | 'dotted';
export interface LineOptions extends LineDashOptions {
    /** Defines how the line stroke is rendered. If `lineDash` is configured, this takes priority over the `lineStyle` property. */
    lineStyle?: AgAnnotationLineStyleType;
}
export interface AgAnnotationHandle extends AgAnnotationHandleStyles {
}
export interface AgChannelAnnotationMiddle extends Visible, StrokeOptions, LineOptions {
}
export interface AgChannelAnnotationBackground extends FillOptions {
}
export interface AgNoteAnnotationBackground extends StrokeOptions, FillOptions {
}
export interface AgAnnotationAxisLabel extends Toggleable, FillOptions, StrokeOptions, LineDashOptions, LabelOptions<AgAnnotationLabelFormatterParams> {
    /** Apply rounded corners to the axis label container. */
    cornerRadius?: PixelSize;
}
export interface AgAnnotationLabelFormatterParams {
    /** The default label value that would have been used without a formatter. */
    value: any;
}
export interface AgLineAnnotationText extends AgLineAnnotationTextStyles {
    label?: string;
}
export interface AgChannelAnnotationText extends AgChannelAnnotationTextStyles {
    label?: string;
}
export interface AgLineAnnotationTextStyles extends FontOptions {
    position?: 'top' | 'center' | 'bottom';
    alignment?: 'left' | 'center' | 'right';
}
export interface AgChannelAnnotationTextStyles extends FontOptions {
    position?: 'top' | 'inside' | 'bottom';
    alignment?: 'left' | 'center' | 'right';
}
interface AnnotationLinePoints {
    /** The starting point of a linear annotation. */
    start: AgAnnotationPoint;
    /** The end point of a linear annotation. */
    end: AgAnnotationPoint;
}
export interface AgAnnotationPoint {
    /** The x-value of the point. */
    x: AgAnnotationValue;
    /** The y-value of the point. */
    y: number;
}
interface LabelOptions<T> extends FontOptions {
    /** A custom formatting function used to convert values into text for display by labels. */
    formatter?: Formatter<T>;
}
interface Writeable {
    /**
     * Whether the annotation should be locked to prevent editing.
     *
     * Default: `false`
     */
    locked?: boolean;
    /**
     * Whether the annotation should be read-only to prevent selection, editing and deletion.
     *
     * Default: `false`
     */
    readOnly?: boolean;
}
interface Extendable {
    /**
     * Whether the annotation should be extended away from the start.
     *
     * Default: `false`
     */
    extendStart?: boolean;
    /**
     * Whether the annotation should be extended away from the end.
     *
     * Default: `false`
     */
    extendEnd?: boolean;
}
export type ValueType = string | number | AgStateSerializableDate;
export type AgAnnotationValue = ValueType | AgGroupingValueType;
export interface AgGroupingValueType {
    value: ValueType;
    groupPercentage: number;
}
export interface AgAnnotationsToolbar extends Toggleable {
    buttons?: AgAnnotationsToolbarButton[];
    padding?: number;
}
export interface AgAnnotationsToolbarButton extends ToolbarButton {
    value: AgAnnotationsToolbarButtonValue;
}
export type AgAnnotationsToolbarButtonValue = 'line-menu' | 'fibonacci-menu' | 'text-menu' | 'shape-menu' | 'measurer-menu' | 'line' | 'horizontal-line' | 'vertical-line' | 'parallel-channel' | 'disjoint-channel' | 'fibonacci-retracement' | 'fibonacci-retracement-trend-based' | 'text' | 'comment' | 'callout' | 'note' | 'clear';
type AgAnnotationToolbarButton = AgAnnotationOptionsToolbarButton | AgAnnotationOptionsToolbarSwitch;
export interface AgAnnotationOptionsToolbar extends Toggleable {
    buttons?: AgAnnotationToolbarButton[];
}
export interface AgAnnotationOptionsToolbarButton extends ToolbarButton {
    value: AgAnnotationOptionsToolbarButtonValue;
}
export interface AgAnnotationOptionsToolbarSwitch extends ToolbarSwitch {
    value: AgAnnotationOptionsToolbarSwitchValue;
}
export type AgAnnotationOptionsToolbarButtonValue = 'line-stroke-width' | 'line-style-type' | 'line-color' | 'fill-color' | 'text-color' | 'text-size' | 'delete' | 'settings';
export type AgAnnotationOptionsToolbarSwitchValue = 'lock';
export {};
