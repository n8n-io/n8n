import { toResourceMetrics } from './internal';
export function createExportMetricsServiceRequest(resourceMetrics, options) {
    return {
        resourceMetrics: resourceMetrics.map(function (metrics) {
            return toResourceMetrics(metrics, options);
        }),
    };
}
//# sourceMappingURL=index.js.map