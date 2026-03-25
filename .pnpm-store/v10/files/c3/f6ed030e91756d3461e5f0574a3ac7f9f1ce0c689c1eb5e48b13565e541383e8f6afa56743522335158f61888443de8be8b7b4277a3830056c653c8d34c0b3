import type { AgAnnotation } from './annotationsOptions';
import type { Listener } from './callbackOptions';
import type { ContextDefault, DatumDefault, DatumKey, Ratio } from './types';
import type { AgAutoScaledAxes } from './zoomOptions';
interface AgChartEvent<T extends string, TContext = ContextDefault> {
    type: T;
    event: Event;
    /** Callback context for this event. */
    context?: TContext;
}
export interface AgPreventableEvent {
    /** Prevent the AG Charts built-in default event handlers from running. */
    preventDefault(): void;
}
export interface AgNodeClickEvent<TEvent extends string, TDatum, TContext = ContextDefault> extends AgChartEvent<TEvent, TContext> {
    /** Event type. */
    type: TEvent;
    /** Series ID, as specified in `series.id` (or generated if not specified) */
    seriesId: string;
    /** Datum from the chart or series data array. */
    datum: TDatum;
    /** xKey as specified on series options */
    xKey?: DatumKey<TDatum>;
    /** yKey as specified on series options */
    yKey?: DatumKey<TDatum>;
    /** sizeKey as specified on series options */
    sizeKey?: DatumKey<TDatum>;
    /** labelKey as specified on series options */
    labelKey?: DatumKey<TDatum>;
    /** colorKey as specified on series options */
    colorKey?: DatumKey<TDatum>;
    /** angleKey as specified on series options */
    angleKey?: DatumKey<TDatum>;
    /** calloutLabelKey as specified on series options */
    calloutLabelKey?: DatumKey<TDatum>;
    /** sectorLabelKey as specified on series options */
    sectorLabelKey?: DatumKey<TDatum>;
    /** radiusKey as specified on series options */
    radiusKey?: DatumKey<TDatum>;
}
export interface AgSeriesVisibilityChange<TContext = ContextDefault> {
    /** Event type. */
    type: 'seriesVisibilityChange';
    /** Callback context for this event. */
    context?: TContext;
    /** Series id */
    seriesId: string;
    /** Legend item id - usually yKey value for cartesian series. */
    itemId?: string | number;
    /** Human-readable description of the y-values. If supplied, matching items with the same value will be toggled together. */
    legendItemName?: string;
    /** The new visibility status that the series is changing to. */
    visible: boolean;
}
export interface AgAnnotationsEvent<TContext = ContextDefault> {
    type: 'annotations';
    annotations?: AgAnnotation[];
    context?: TContext;
}
export interface AgZoomEvent<TContext = ContextDefault> {
    type: 'zoom';
    rangeX?: AgZoomEventRange;
    rangeY?: AgZoomEventRange;
    ratioX: AgZoomEventRatio;
    ratioY: AgZoomEventRatio;
    autoScaledAxes?: AgAutoScaledAxes;
    context?: TContext;
}
export interface AgZoomEventRange {
    start?: Date | string | number;
    end?: Date | string | number;
}
export interface AgZoomEventRatio {
    start: Ratio;
    end: Ratio;
}
export type AgChartClickEvent<TContext = ContextDefault> = AgChartEvent<'click', TContext>;
export type AgChartDoubleClickEvent<TContext = ContextDefault> = AgChartEvent<'doubleClick', TContext>;
export type AgChartContextMenuEvent<TContext = ContextDefault> = AgChartEvent<'contextMenuEvent', TContext>;
export type AgSeriesAreaContextMenuActionEvent<TContext = ContextDefault> = AgChartEvent<'seriesContextMenuAction', TContext>;
export type AgNodeContextMenuActionEvent<TDatum = DatumDefault, TContext = ContextDefault> = AgNodeClickEvent<'nodeContextMenuAction', TDatum, TContext>;
export interface AgBaseChartListeners<TDatum, TContext = ContextDefault> {
    /** The listener to call when a node (marker, column, bar, tile or a pie sector) in any series is clicked.
     *  Useful for a chart containing multiple series.
     */
    seriesNodeClick?: Listener<AgNodeClickEvent<'seriesNodeClick', TDatum, TContext>>;
    /** The listener to call when a node (marker, column, bar, tile or a pie sector) in any series is double-clicked.
     * Useful for a chart containing multiple series.*/
    seriesNodeDoubleClick?: Listener<AgNodeClickEvent<'seriesNodeDoubleClick', TDatum, TContext>>;
    /** The listener to call when a series visibility is changed. */
    seriesVisibilityChange?: Listener<AgSeriesVisibilityChange<TContext>>;
    /** The listener to call when the chart is clicked. */
    click?: Listener<AgChartClickEvent<TContext>>;
    /** The listener to call when the chart is double-clicked. */
    doubleClick?: Listener<AgChartDoubleClickEvent<TContext>>;
    /** The listener to call when the annotations are changed. */
    annotations?: Listener<AgAnnotationsEvent<TContext>>;
    /** The listener to call when the zoom is changed. */
    zoom?: Listener<AgZoomEvent<TContext>>;
}
export interface AgSeriesListeners<TDatum, TContext = ContextDefault> {
    /** The listener to call when a node (marker, column, bar, tile or a pie sector) in the series is clicked. */
    seriesNodeClick?: Listener<AgNodeClickEvent<'seriesNodeClick', TDatum, TContext>>;
    /** The listener to call when a node (marker, column, bar, tile or a pie sector) in the series is double-clicked. */
    seriesNodeDoubleClick?: Listener<AgNodeClickEvent<'seriesNodeDoubleClick', TDatum, TContext>>;
}
export {};
