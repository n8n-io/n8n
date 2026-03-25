import type { AgChartInstance, AgChartOptions, AgFinancialChartOptions, AgGaugeOptions, AgTypedChartInstance } from '../chartBuilderOptions';
export interface AgChartsApi {
    /** Create a new `AgChartInstance` based upon the given configuration options. */
    create<TDatum, TContext, TOptions extends AgChartOptions<TDatum, TContext>>(options: TOptions): AgTypedChartInstance<TDatum, TContext, TOptions>;
    /** Create a new `AgChartInstance` based upon the given configuration options. */
    createFinancialChart<TDatum>(options: AgFinancialChartOptions<TDatum>): AgTypedChartInstance<TDatum, never, AgFinancialChartOptions<TDatum>>;
    /** Create a new `AgChartInstance` based upon the given configuration options. */
    createGauge<TDatum, TContext>(options: AgGaugeOptions<TDatum, TContext>): AgTypedChartInstance<TDatum, TContext, AgGaugeOptions<TDatum, TContext>>;
    /** @private Internal to AG Grid, returns the `AgChartInstance` for a DOM node, if there is one. */
    getInstance(element: HTMLElement): AgChartInstance<AgChartOptions<unknown, unknown>> | undefined;
}
