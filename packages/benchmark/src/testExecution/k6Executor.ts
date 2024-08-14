import { $ } from 'zx';
import { TestScenario } from '@/types/testScenario';

/**
 * Executes test scenarios using k6
 */
export class K6Executor {
	constructor(
		private readonly k6ExecutablePath: string,
		private readonly n8nApiBaseUrl: string,
	) {}

	async executeTestScenario(testCase: TestScenario) {
		// For 1 min with 5 virtual users
		const stage = '1m:5';

		const processPromise = $({
			cwd: testCase.testScenarioPath,
			env: {
				API_BASE_URL: this.n8nApiBaseUrl,
			},
		})`${this.k6ExecutablePath} run --quiet --stage ${stage} ${testCase.testScriptPath}`;

		for await (const chunk of processPromise.stdout) {
			console.log(chunk.toString());
		}
	}
}
