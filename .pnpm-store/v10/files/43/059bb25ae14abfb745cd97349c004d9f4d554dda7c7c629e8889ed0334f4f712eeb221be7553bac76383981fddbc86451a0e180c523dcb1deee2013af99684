import type { Chart, ChartType, ChartData, ChartDataset, ChartOptions, DefaultDataPoint } from 'chart.js';
export declare const compatProps: <I extends {}, T extends {}>(internals: I, props: T) => I & T;
export declare function toRawIfProxy<T>(obj: T): T;
export declare function cloneProxy<T extends object>(obj: T, src?: T): T;
export declare function setOptions<TType extends ChartType = ChartType, TData = DefaultDataPoint<TType>, TLabel = unknown>(chart: Chart<TType, TData, TLabel>, nextOptions: ChartOptions<TType>): void;
export declare function setLabels<TType extends ChartType = ChartType, TData = DefaultDataPoint<TType>, TLabel = unknown>(currentData: ChartData<TType, TData, TLabel>, nextLabels: TLabel[] | undefined): void;
export declare function setDatasets<TType extends ChartType = ChartType, TData = DefaultDataPoint<TType>, TLabel = unknown>(currentData: ChartData<TType, TData, TLabel>, nextDatasets: ChartDataset<TType, TData>[], datasetIdKey: string): void;
export declare function cloneData<TType extends ChartType = ChartType, TData = DefaultDataPoint<TType>, TLabel = unknown>(data: ChartData<TType, TData, TLabel>, datasetIdKey: string): ChartData<TType, TData, TLabel>;
/**
 * Get dataset from mouse click event
 * @param chart - Chart.js instance
 * @param event - Mouse click event
 * @returns Dataset
 */
export declare function getDatasetAtEvent(chart: Chart, event: MouseEvent): import("chart.js").InteractionItem[];
/**
 * Get single dataset element from mouse click event
 * @param chart - Chart.js instance
 * @param event - Mouse click event
 * @returns Dataset
 */
export declare function getElementAtEvent(chart: Chart, event: MouseEvent): import("chart.js").InteractionItem[];
/**
 * Get all dataset elements from mouse click event
 * @param chart - Chart.js instance
 * @param event - Mouse click event
 * @returns Dataset
 */
export declare function getElementsAtEvent(chart: Chart, event: MouseEvent): import("chart.js").InteractionItem[];
//# sourceMappingURL=utils.d.ts.map