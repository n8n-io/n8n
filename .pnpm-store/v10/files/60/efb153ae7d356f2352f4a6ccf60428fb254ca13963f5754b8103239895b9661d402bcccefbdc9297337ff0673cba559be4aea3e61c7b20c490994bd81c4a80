import type { AgBaseAxisLabelOptions, AgBaseAxisOptions, AgContinuousAxisOptions, AgNumericAxisFormattableLabelOptions } from './axisOptions';
import type { AgBaseCrossLineLabelOptions, AgBaseCrossLineOptions, AgCrossLineThemeOptions } from './crossLineOptions';
import type { ContextDefault, Degree, Ratio } from './types';
export type AgPolarAxisShape = 'polygon' | 'circle';
export interface AgAngleCategoryAxisOptions<TContext = ContextDefault> extends AgBaseAxisOptions<AgAngleAxisLabelOptions<TContext>, TContext> {
    type: 'angle-category';
    /** Shape of axis. Default: `polygon` */
    shape?: AgPolarAxisShape;
    /** Angle in degrees to start ticks positioning from. */
    startAngle?: Degree;
    /** Angle in degrees to end ticks positioning at. */
    endAngle?: Degree;
    /** Add cross lines or regions corresponding to data values. */
    crossLines?: AgAngleCrossLineOptions[];
    /**
     * This property is for grouped polar series plotted on a angle category axis.
     * It is a proportion between 0 and 1 which determines the size of the gap between the items within a single group along the angle axis.
     */
    groupPaddingInner?: Ratio;
    /**
     * This property is for grouped polar series plotted on a angle category axis.
     * It is a proportion between 0 and 1 which determines the size of the gap between the groups of items along the angle axis.
     */
    paddingInner?: Ratio;
}
export interface AgAngleAxesCrossLineThemeOptions {
    crossLines?: AgAngleCrossLineThemeOptions;
}
export interface AgAngleNumberAxisOptions<TContext = ContextDefault> extends Omit<AgBaseAxisOptions<AgAngleAxisFormattableLabelOptions<TContext>, TContext>, 'interval'>, AgContinuousAxisOptions<number, number> {
    type: 'angle-number';
    /** Angle in degrees to start ticks positioning from. */
    startAngle?: Degree;
    /** Angle in degrees to end ticks positioning at. It should be greater than `startAngle`. */
    endAngle?: Degree;
    /** Add cross lines or regions corresponding to data values. */
    crossLines?: AgAngleCrossLineOptions[];
}
export type AgAngleAxisLabelOrientation = 'fixed' | 'parallel' | 'perpendicular';
interface OrientableLabel {
    /**
     * Label orientation.
     * `fixed` - all labels remain in a fixed orientation of horizontal text.
     * `parallel` - labels are in a circle around the axis.
     * `perpendicular` - labels are in the radial direction perpendicular to the axis.
     *
     * Default: `fixed`
     */
    orientation?: AgAngleAxisLabelOrientation;
}
export interface AgAngleAxisFormattableLabelOptions<TContext = ContextDefault> extends AgNumericAxisFormattableLabelOptions<TContext>, OrientableLabel {
}
export interface AgAngleAxisLabelOptions<TContext = ContextDefault> extends AgBaseAxisLabelOptions<TContext>, OrientableLabel {
}
export interface AgAngleCrossLineOptions extends AgBaseCrossLineOptions<AgBaseCrossLineLabelOptions> {
}
export interface AgAngleCrossLineThemeOptions extends AgCrossLineThemeOptions<AgBaseCrossLineLabelOptions> {
}
export {};
