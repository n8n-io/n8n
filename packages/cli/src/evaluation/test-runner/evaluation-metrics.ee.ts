import type { IDataObject } from 'n8n-workflow';

export class EvaluationMetrics {
	private readonly rawMetricsByName = new Map<string, number[]>();

	constructor(private readonly metricNames: Set<string>) {
		for (const metricName of metricNames) {
			this.rawMetricsByName.set(metricName, []);
		}
	}

	addResults(result: IDataObject) {
		for (const [metricName, metricValue] of Object.entries(result)) {
			if (typeof metricValue === 'number' && this.metricNames.has(metricName)) {
				this.rawMetricsByName.get(metricName)!.push(metricValue);
			}
		}
	}

	getAggregatedMetrics() {
		const aggregatedMetrics: Record<string, number> = {};

		for (const [metricName, metricValues] of this.rawMetricsByName.entries()) {
			if (metricValues.length > 0) {
				const metricSum = metricValues.reduce((acc, val) => acc + val, 0);
				aggregatedMetrics[metricName] = metricSum / metricValues.length;
			}
		}

		return aggregatedMetrics;
	}
}
