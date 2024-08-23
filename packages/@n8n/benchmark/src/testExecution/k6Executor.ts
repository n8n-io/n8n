import { $, which } from 'zx';
import type { Scenario } from '@/types/scenario';

/**
 * Executes test scenarios using k6
 */
export class K6Executor {
	constructor(
		private readonly k6ExecutablePath: string,
		private readonly n8nApiBaseUrl: string,
	) {}

	async executeTestScenario(scenario: Scenario) {
		// For 1 min with 5 virtual users
		const stage = '1m:5';

		const k6ExecutablePath = await this.resolveK6ExecutablePath();

		const processPromise = $({
			cwd: scenario.scenarioDirPath,
			env: {
				API_BASE_URL: this.n8nApiBaseUrl,
			},
		})`${k6ExecutablePath} run --quiet --stage ${stage} ${scenario.scriptPath}`;

		for await (const chunk of processPromise.stdout) {
			console.log((chunk as Buffer).toString());
		}
	}

	/**
	 * @returns Resolved path to the k6 executable
	 */
	private async resolveK6ExecutablePath(): Promise<string> {
		const k6ExecutablePath = await which(this.k6ExecutablePath, { nothrow: true });
		if (!k6ExecutablePath) {
			throw new Error(
				'Could not find k6 executable based on your `PATH`. Please ensure k6 is available in your system and add it to your `PATH` or specify the path to the k6 executable using the `K6_PATH` environment variable.',
			);
		}

		return k6ExecutablePath;
	}
}
