import { sleep } from 'zx';

import { AuthenticatedN8nApiClient } from '@/n8n-api-client/authenticated-n8n-api-client';
import type { N8nApiClient } from '@/n8n-api-client/n8n-api-client';
import type { ScenarioDataFileLoader } from '@/scenario/scenario-data-loader';
import { ScenarioDataImporter } from '@/test-execution/scenario-data-importer';
import type { Scenario } from '@/types/scenario';

import type { K6Executor } from './k6-executor';

/**
 * Runs scenarios
 */
export class ScenarioRunner {
	constructor(
		private readonly n8nClient: N8nApiClient,
		private readonly dataLoader: ScenarioDataFileLoader,
		private readonly k6Executor: K6Executor,
		private readonly ownerConfig: {
			email: string;
			password: string;
		},
		private readonly scenarioPrefix: string,
	) {}

	async runManyScenarios(scenarios: Scenario[]) {
		console.log(`Waiting for n8n ${this.n8nClient.apiBaseUrl} to become online`);
		await this.n8nClient.waitForInstanceToBecomeOnline();

		console.log('Setting up owner');
		await this.n8nClient.setupOwnerIfNeeded(this.ownerConfig);

		const authenticatedN8nClient = await AuthenticatedN8nApiClient.createUsingUsernameAndPassword(
			this.n8nClient,
			this.ownerConfig,
		);
		const testDataImporter = new ScenarioDataImporter(authenticatedN8nClient);

		for (const scenario of scenarios) {
			await this.runSingleTestScenario(testDataImporter, scenario);
		}
	}

	private async runSingleTestScenario(testDataImporter: ScenarioDataImporter, scenario: Scenario) {
		const scenarioRunName = this.formTestScenarioRunName(scenario);
		console.log('Running scenario:', scenarioRunName);

		console.log('Loading and importing data');
		const testData = await this.dataLoader.loadDataForScenario(scenario);
		await testDataImporter.importTestScenarioData(testData);

		// Wait for 1s before executing the scenario to ensure that the workflows are activated.
		// In multi-main mode it can take some time before the workflow becomes active.
		await sleep(1000);

		console.log('Executing scenario script');
		await this.k6Executor.executeTestScenario(scenario, {
			scenarioRunName,
		});
	}

	/**
	 * Forms a name for the scenario by combining prefix and scenario name.
	 * The benchmarks are ran against different n8n setups, so we use the
	 * prefix to differentiate between them.
	 */
	private formTestScenarioRunName(scenario: Scenario) {
		return `${this.scenarioPrefix}-${scenario.name}`;
	}
}
