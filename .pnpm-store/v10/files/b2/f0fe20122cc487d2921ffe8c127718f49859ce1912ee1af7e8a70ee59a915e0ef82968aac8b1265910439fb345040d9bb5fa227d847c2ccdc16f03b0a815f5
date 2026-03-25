import type { AgDonutSeriesOptions } from '../series/polar/donutOptions';
import type { AgNightingaleSeriesOptions } from '../series/polar/nightingaleOptions';
import type { AgPieSeriesOptions } from '../series/polar/pieOptions';
import type { AgRadarAreaSeriesOptions } from '../series/polar/radarAreaOptions';
import type { AgRadarLineSeriesOptions } from '../series/polar/radarLineOptions';
import type { AgRadialBarSeriesOptions } from '../series/polar/radialBarOptions';
import type { AgRadialColumnSeriesOptions } from '../series/polar/radialColumnOptions';
import type { AgBaseThemeableChartOptions } from './chartOptions';
import type { AgAngleAxesCrossLineThemeOptions, AgAngleCategoryAxisOptions, AgAngleNumberAxisOptions } from './polarAxisOptions';
import type { AgRadiusAxesCrossLineThemeOptions, AgRadiusCategoryAxisOptions, AgRadiusNumberAxisOptions } from './radiusAxisOptions';
import type { ContextDefault, DatumDefault } from './types';
export type AgPolarSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> = AgDonutSeriesOptions<TDatum, TContext> | AgPieSeriesOptions<TDatum, TContext> | AgRadarLineSeriesOptions<TDatum, TContext> | AgRadarAreaSeriesOptions<TDatum, TContext> | AgRadialBarSeriesOptions<TDatum, TContext> | AgRadialColumnSeriesOptions<TDatum, TContext> | AgNightingaleSeriesOptions<TDatum, TContext>;
export type AgPolarAxisOptions<TContext = ContextDefault> = AgAngleCategoryAxisOptions<TContext> | AgAngleNumberAxisOptions<TContext> | AgRadiusCategoryAxisOptions<TContext> | AgRadiusNumberAxisOptions<TContext>;
export type AgPolarAxisType<TContext = ContextDefault> = AgPolarAxisOptions<TContext>['type'];
export interface AgBasePolarChartOptions<TDatum = DatumDefault, TContext = ContextDefault> {
    /** Series configurations. */
    series?: AgPolarSeriesOptions<TDatum, TContext>[];
    /** Axis configurations. */
    axes?: AgPolarAxisOptions<TContext>[];
}
type ThemeOmittedAxisOptions = 'type' | 'crossLines';
export interface AgAngleCategoryAxisThemeOptions<TContext = ContextDefault> extends Omit<AgAngleCategoryAxisOptions<TContext>, ThemeOmittedAxisOptions>, AgAngleAxesCrossLineThemeOptions {
}
export interface AgAngleNumberAxisThemeOptions<TContext = ContextDefault> extends Omit<AgAngleNumberAxisOptions<TContext>, ThemeOmittedAxisOptions>, AgAngleAxesCrossLineThemeOptions {
}
export interface AgRadiusCategoryAxisThemeOptions<TContext = ContextDefault> extends Omit<AgRadiusCategoryAxisOptions<TContext>, ThemeOmittedAxisOptions>, AgRadiusAxesCrossLineThemeOptions {
}
export interface AgRadiusNumberAxisThemeOptions<TContext = ContextDefault> extends Omit<AgRadiusNumberAxisOptions<TContext>, ThemeOmittedAxisOptions>, AgRadiusAxesCrossLineThemeOptions {
}
export interface AgPolarAxesTheme<TContext = ContextDefault> {
    'angle-category'?: AgAngleCategoryAxisThemeOptions<TContext>;
    'angle-number'?: AgAngleNumberAxisThemeOptions<TContext>;
    'radius-category'?: AgRadiusCategoryAxisThemeOptions<TContext>;
    'radius-number'?: AgRadiusNumberAxisThemeOptions<TContext>;
}
export interface AgBasePolarThemeOptions<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseThemeableChartOptions<TDatum, TContext> {
    /** Axis configurations. */
    axes?: AgPolarAxesTheme<TContext>;
}
export {};
