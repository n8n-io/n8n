import type { LogsAPI, MetricsAPI, ObservabilityProvider, Span, TracesAPI } from '../types';

const noopSpan: Span = {
	setStatus() {},
	setAttribute() {},
	recordException() {},
	end() {},
};

const noopMetrics: MetricsAPI = {
	counter() {},
	gauge() {},
	histogram() {},
};

const noopTraces: TracesAPI = {
	startSpan: () => noopSpan,
};

const noopLogs: LogsAPI = {
	error() {},
	warn() {},
	info() {},
	debug() {},
};

export const NoOpProvider: ObservabilityProvider = {
	metrics: noopMetrics,
	traces: noopTraces,
	logs: noopLogs,
};
