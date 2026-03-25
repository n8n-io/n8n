import type { AgChartThemeOverrides, AgChartThemePalette } from 'ag-charts-types';
import type { IAggFunc } from '../entities/colDef';
import type { ChartRef } from '../entities/gridOptions';
import type { CellRangeParams } from './IRangeService';
import type { ChartToolPanelName, ChartType, CrossFilterChartType, SeriesChartType, SeriesGroupType } from './iChartOptions';
export interface GetChartImageDataUrlParams {
    /** The id of the created chart. */
    chartId: string;
    /**
     * A string indicating the image format.
     * The default format type is `image/png`.
     * Options: `image/png`, `image/jpeg`
     */
    fileFormat?: string;
}
export interface ChartDownloadParams {
    /** The id of the created chart. */
    chartId: string;
    /** Name of downloaded image file. The chart title will be used by default */
    fileName?: string;
    /**
     * A string indicating the image format.
     * The default format type is `image/png`.
     * Options: `image/png`, `image/jpeg`
     */
    fileFormat?: string;
    /**
     * Dimensions of downloaded chart image in pixels. The current chart dimensions will be used if not specified.
     */
    dimensions?: {
        width: number;
        height: number;
    };
}
export interface CloseChartToolPanelParams {
    /** The id of the created chart. */
    chartId: string;
}
export type ChartModelType = 'range' | 'pivot';
export interface OpenChartToolPanelParams {
    /** The id of the created chart. */
    chartId: string;
    /** Name of the Chart Tool Panel. The default 'Settings' Tool Panel will be used if not specified.*/
    panel?: ChartToolPanelName;
}
export interface ChartModel {
    version?: string;
    modelType: ChartModelType;
    chartId: string;
    chartType: ChartType;
    cellRange: CellRangeParams;
    chartThemeName?: string;
    chartOptions: AgChartThemeOverrides;
    chartPalette?: AgChartThemePalette;
    suppressChartRanges?: boolean;
    switchCategorySeries?: boolean;
    aggFunc?: string | IAggFunc;
    unlinkChart?: boolean;
    seriesChartTypes?: SeriesChartType[];
    seriesGroupType?: SeriesGroupType;
}
export interface IChartService {
    isEnterprise(): boolean;
    getChartModels(): ChartModel[];
    getChartRef(chartId: string): ChartRef | undefined;
    createRangeChart(params: CreateRangeChartParams, fromApi?: boolean): ChartRef | undefined;
    createCrossFilterChart(params: CreateCrossFilterChartParams, fromApi?: boolean): ChartRef | undefined;
    createChartFromCurrentRange(chartType: ChartType, fromApi?: boolean): ChartRef | undefined;
    createPivotChart(params: CreatePivotChartParams, fromApi?: boolean): ChartRef | undefined;
    restoreChart(model: ChartModel, chartContainer?: HTMLElement): ChartRef | undefined;
    getChartImageDataURL(params: GetChartImageDataUrlParams): string | undefined;
    downloadChart(params: ChartDownloadParams): void;
    openChartToolPanel(params: OpenChartToolPanelParams): void;
    closeChartToolPanel(chartId: string): void;
    updateChart(params: UpdateChartParams): void;
}
export interface BaseCreateChartParams {
    /** The type of chart to create. */
    chartType: ChartType;
    /** The default theme to use, either a default option or your own custom theme. */
    chartThemeName?: string;
    /** Provide to display the chart outside the grid in your own container. */
    chartContainer?: HTMLElement;
    /** Allows specific chart options in the current theme to be overridden. */
    chartThemeOverrides?: AgChartThemeOverrides;
    /** When enabled the chart will be unlinked from the grid after creation, any updates to the data will not be reflected in the chart. */
    unlinkChart?: boolean;
}
export type ChartParamsCellRange = Partial<Omit<CellRangeParams, 'rowStartPinned' | 'rowEndPinned'>>;
export interface CreateRangeChartParams extends BaseCreateChartParams {
    /** The range of cells to be charted. If no rows / rowIndexes are specified all rows will be included. */
    cellRange: ChartParamsCellRange;
    /** Suppress highlighting the selected range in the grid. */
    suppressChartRanges?: boolean;
    /** Switch Category / Series. */
    switchCategorySeries?: boolean;
    /** The aggregation function that should be applied to all series data. */
    aggFunc?: string | IAggFunc;
    /** The series chart type configurations used in combination charts. */
    seriesChartTypes?: SeriesChartType[];
    /** Group type for chart types that support grouped series. */
    seriesGroupType?: SeriesGroupType;
}
export interface CreateCrossFilterChartParams extends BaseCreateChartParams {
    /** The type of cross-filter chart to create. */
    chartType: CrossFilterChartType;
    /** The range of cells to be charted. If no rows / rowIndexes are specified all rows will be included. */
    cellRange: ChartParamsCellRange;
    /** Suppress highlighting the selected range in the grid. */
    suppressChartRanges?: boolean;
    /** The aggregation function that should be applied to all series data. */
    aggFunc?: string | IAggFunc;
}
export interface CreatePivotChartParams extends BaseCreateChartParams {
}
export type UpdateChartParams = UpdateRangeChartParams | UpdatePivotChartParams | UpdateCrossFilterChartParams;
interface BaseUpdateChartParams {
    /** The id of the chart to update. */
    chartId: string;
    /** The type of chart to update. */
    chartType?: ChartType;
    /** The default theme to use, either a default option or your own custom theme. */
    chartThemeName?: string;
    /** Allows specific chart options in the current theme to be overridden. */
    chartThemeOverrides?: AgChartThemeOverrides;
    /** When enabled the chart will be unlinked from the grid after creation, any updates to the data will not be reflected in the chart. */
    unlinkChart?: boolean;
}
export interface UpdateRangeChartParams extends BaseUpdateChartParams {
    type: 'rangeChartUpdate';
    /** The id of the chart to update. */
    /** The range of cells to be charted. If no rows / rowIndexes are specified all rows will be included. */
    cellRange?: ChartParamsCellRange;
    /** Suppress highlighting the selected range in the grid. */
    suppressChartRanges?: boolean;
    /** Switch Category / Series. */
    switchCategorySeries?: boolean;
    /** The aggregation function that should be applied to all series data. */
    aggFunc?: string | IAggFunc;
    /** The series chart type configurations used in combination charts. */
    seriesChartTypes?: SeriesChartType[];
    /** Group type for chart types that support grouped series. */
    seriesGroupType?: SeriesGroupType;
}
export interface UpdatePivotChartParams extends BaseUpdateChartParams {
    type: 'pivotChartUpdate';
}
export interface UpdateCrossFilterChartParams extends BaseUpdateChartParams {
    type: 'crossFilterChartUpdate';
    /** The range of cells to be charted. If no rows / rowIndexes are specified all rows will be included. */
    cellRange?: ChartParamsCellRange;
    /** Suppress highlighting the selected range in the grid. */
    suppressChartRanges?: boolean;
    /** The aggregation function that should be applied to all series data. */
    aggFunc?: string | IAggFunc;
}
export {};
