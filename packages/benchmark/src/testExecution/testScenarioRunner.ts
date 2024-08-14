import { TestScenario } from '@/types/testScenario';
import { N8nApiClient } from '@/n8nApiClient/n8nApiClient';
import { TestDataFileLoader } from '@/testScenario/testDataLoader';
import { K6Executor } from './k6Executor';
import { TestDataImporter } from '@/testExecution/testDataImporter';
import { AuthenticatedN8nApiClient } from '@/n8nApiClient/authenticatedN8nApiClient';

/**
 * Runs test scenarios
 */
export class TestScenarioRunner {
	constructor(
		private readonly n8nClient: N8nApiClient,
		private readonly testDataLoader: TestDataFileLoader,
		private readonly k6Executor: K6Executor,
		private readonly ownerConfig: {
			email: string;
			password: string;
		},
	) {}

	async runManyTestScenarios(testCases: TestScenario[]) {
		console.log(`Waiting for n8n ${this.n8nClient.apiBaseUrl} to become online`);
		await this.n8nClient.waitForInstanceToBecomeOnline();

		console.log('Setting up owner');
		await this.n8nClient.setupOwnerIfNeeded(this.ownerConfig);

		const authenticatedN8nClient = await AuthenticatedN8nApiClient.createUsingUsernameAndPassword(
			this.n8nClient,
			this.ownerConfig,
		);
		const testDataImporter = new TestDataImporter(authenticatedN8nClient);

		for (const testCase of testCases) {
			await this.runSingleTestScenario(testDataImporter, testCase);
		}
	}

	private async runSingleTestScenario(testDataImporter: TestDataImporter, scenario: TestScenario) {
		console.log('Running scenario:', scenario.name);

		console.log('Loading and importing test data');
		const testData = await this.testDataLoader.loadTestDataForScenario(scenario);
		await testDataImporter.importTestScenarioData(testData.workflows);

		console.log('Executing test script');
		await this.k6Executor.executeTestScenario(scenario);
	}
}
