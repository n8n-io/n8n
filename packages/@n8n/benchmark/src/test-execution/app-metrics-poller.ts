/**
 * Polls the /metrics endpoint from an n8n instance to collect application metrics
 * during benchmark test runs.
 */
export class AppMetricsPoller {
	private intervalId: NodeJS.Timeout | undefined = undefined;
	private metricsData: string[] = [];
	private isRunning = false;

	constructor(
		private readonly metricsUrl: string,
		private readonly pollIntervalMs: number = 5000,
	) {}

	/**
	 * Starts polling the metrics endpoint
	 */
	start() {
		if (this.isRunning) {
			console.warn('Metrics poller is already running');
			return;
		}

		// In case the old poller is somehow still running, make sure we stop it.
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = undefined;
		}

		this.isRunning = true;
		this.metricsData = [];

		// Immediately poll once to get initial metrics
		void this.pollMetrics();

		// Set up interval polling
		this.intervalId = setInterval(() => {
			void this.pollMetrics();
		}, this.pollIntervalMs);
	}

	/**
	 * Stops polling the metrics endpoint
	 */
	stop() {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = undefined;
		}
		this.isRunning = false;
	}

	/**
	 * Gets all collected metrics data
	 */
	getMetricsData(): string[] {
		return this.metricsData;
	}

	/**
	 * Polls the metrics endpoint once
	 */
	private async pollMetrics() {
		try {
			const response = await fetch(this.metricsUrl);

			if (!response.ok) {
				console.warn(`Failed to poll metrics: ${response.status} ${response.statusText}`);
				return;
			}

			const metricsText = await response.text();
			this.metricsData.push(metricsText);
		} catch (error) {
			console.warn(
				`Error polling metrics: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
}

/**
 * Parses Prometheus metrics text format and extracts time series data
 */
export class PrometheusMetricsParser {
	/**
	 * Extracts all values for a specific metric from collected metrics data
	 */
	static extractMetricValues(metricsData: string[], metricName: string): number[] {
		const values: number[] = [];

		for (const metricsText of metricsData) {
			const lines = metricsText.split('\n');

			for (const line of lines) {
				// Skip comments and empty lines
				if (line.startsWith('#') || line.trim() === '') {
					continue;
				}

				// Parse metric line: metric_name{labels} value timestamp
				// For simplicity, we'll just check if the line starts with the metric name
				if (line.startsWith(metricName)) {
					const parts = line.split(/\s+/);
					if (parts.length >= 2) {
						const value = parseFloat(parts[parts.length - 1]);
						if (!isNaN(value)) {
							values.push(value);
						}
					}
				}
			}
		}

		return values;
	}

	/**
	 * Calculates statistics for a metric from collected data
	 */
	static calculateMetricStats(
		metricsData: string[],
		metricName: string,
	): { max: number; avg: number; min: number; count: number } | null {
		const values = this.extractMetricValues(metricsData, metricName);

		if (values.length === 0) {
			return null;
		}

		const max = Math.max(...values);
		const min = Math.min(...values);
		const sum = values.reduce((a, b) => a + b, 0);
		const avg = sum / values.length;

		return {
			max,
			min,
			avg,
			count: values.length,
		};
	}
}
