import { $ } from 'zx';
import { Scenario } from '@/types/scenario';

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

		const processPromise = $({
			cwd: scenario.scenarioDirPath,
			env: {
				API_BASE_URL: this.n8nApiBaseUrl,
			},
		})`${this.k6ExecutablePath} run --quiet --stage ${stage} ${scenario.scriptPath}`;

		for await (const chunk of processPromise.stdout) {
			console.log(chunk.toString());
		}
	}
}
