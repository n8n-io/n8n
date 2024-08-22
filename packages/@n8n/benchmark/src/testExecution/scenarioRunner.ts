import { Scenario } from '@/types/scenario';
import { N8nApiClient } from '@/n8nApiClient/n8nApiClient';
import { ScenarioDataFileLoader } from '@/scenario/scenarioDataLoader';
import { K6Executor } from './k6Executor';
import { ScenarioDataImporter } from '@/testExecution/scenarioDataImporter';
import { AuthenticatedN8nApiClient } from '@/n8nApiClient/authenticatedN8nApiClient';

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
		console.log('Running scenario:', scenario.name);

		console.log('Loading and importing data');
		const testData = await this.dataLoader.loadDataForScenario(scenario);
		await testDataImporter.importTestScenarioData(testData.workflows);

		console.log('Executing scenario script');
		await this.k6Executor.executeTestScenario(scenario);
	}
}
