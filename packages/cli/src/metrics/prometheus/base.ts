import type express from 'express';

/** Contract for a Prometheus metrics collector that can be conditionally initialized. */
export interface PrometheusMetricsCollector {
	get enabled(): boolean;
	init(app?: express.Application): void;
}
