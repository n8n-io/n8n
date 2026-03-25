'use strict';

const OtelApi = require('@opentelemetry/api');
const Counter = require('../counter');

const PROCESS_CPU_USER_SECONDS = 'process_cpu_user_seconds_total';
const PROCESS_CPU_SYSTEM_SECONDS = 'process_cpu_system_seconds_total';
const PROCESS_CPU_SECONDS = 'process_cpu_seconds_total';

module.exports = (registry, config = {}) => {
	const registers = registry ? [registry] : undefined;
	const namePrefix = config.prefix ? config.prefix : '';
	const labels = config.labels ? config.labels : {};
	const exemplars = config.enableExemplars ? config.enableExemplars : false;
	const labelNames = Object.keys(labels);

	let lastCpuUsage = process.cpuUsage();

	const cpuUserUsageCounter = new Counter({
		name: namePrefix + PROCESS_CPU_USER_SECONDS,
		help: 'Total user CPU time spent in seconds.',
		enableExemplars: exemplars,
		registers,
		labelNames,
		// Use this one metric's `collect` to set all metrics' values.
		collect() {
			const cpuUsage = process.cpuUsage();

			const userUsageMicros = cpuUsage.user - lastCpuUsage.user;
			const systemUsageMicros = cpuUsage.system - lastCpuUsage.system;

			lastCpuUsage = cpuUsage;

			if (this.enableExemplars) {
				let exemplarLabels = {};
				const currentSpan = OtelApi.trace.getSpan(OtelApi.context.active());
				if (currentSpan) {
					exemplarLabels = {
						traceId: currentSpan.spanContext().traceId,
						spanId: currentSpan.spanContext().spanId,
					};
				}
				cpuUserUsageCounter.inc({
					labels,
					value: userUsageMicros / 1e6,
					exemplarLabels,
				});
				cpuSystemUsageCounter.inc({
					labels,
					value: systemUsageMicros / 1e6,
					exemplarLabels,
				});
				cpuUsageCounter.inc({
					labels,
					value: (userUsageMicros + systemUsageMicros) / 1e6,
					exemplarLabels,
				});
			} else {
				cpuUserUsageCounter.inc(labels, userUsageMicros / 1e6);
				cpuSystemUsageCounter.inc(labels, systemUsageMicros / 1e6);
				cpuUsageCounter.inc(
					labels,
					(userUsageMicros + systemUsageMicros) / 1e6,
				);
			}
		},
	});
	const cpuSystemUsageCounter = new Counter({
		name: namePrefix + PROCESS_CPU_SYSTEM_SECONDS,
		help: 'Total system CPU time spent in seconds.',
		enableExemplars: exemplars,
		registers,
		labelNames,
	});
	const cpuUsageCounter = new Counter({
		name: namePrefix + PROCESS_CPU_SECONDS,
		help: 'Total user and system CPU time spent in seconds.',
		enableExemplars: exemplars,
		registers,
		labelNames,
	});
};

module.exports.metricNames = [
	PROCESS_CPU_USER_SECONDS,
	PROCESS_CPU_SYSTEM_SECONDS,
	PROCESS_CPU_SECONDS,
];
