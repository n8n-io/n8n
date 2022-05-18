import * as promClient from 'prom-client';

export class Metrics {
	constructor(private register: promClient.Registry) {}

	initCounter(name: string, help: string, labels: string[]): promClient.Counter<string> {
		return new promClient.Counter({
			name,
			help,
			labelNames: labels,
			registers: [this.register],
		});
	}

	initGauge(name: string, help: string, labels: string[]): promClient.Gauge<string> {
		return new promClient.Gauge({
			name,
			help,
			labelNames: labels,
			registers: [this.register],
		});
	}

	initHistogram(
		name: string,
		help: string,
		labels: string[],
		buckets: number[],
	): promClient.Histogram<string> {
		return new promClient.Histogram({
			name,
			help,
			labelNames: labels,
			buckets,
			registers: [this.register],
		});
	}
}
