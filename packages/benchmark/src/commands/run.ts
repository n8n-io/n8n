import { Command } from '@oclif/core';
import { loadConfig } from '@/config/config';
import { TestScenarioLoader } from '@/testScenario/testScenarioLoader';
import { TestScenarioRunner } from '@/testExecution/testScenarioRunner';
import { N8nApiClient } from '@/n8nApiClient/n8nApiClient';
import { TestDataFileLoader } from '@/testScenario/testDataLoader';
import { K6Executor } from '@/testExecution/k6Executor';

export default class RunCommand extends Command {
	static description = 'Run all (default) or specified test scenarios';

	static strict = false;

	async run() {
		const { argv: scenarioFilters } = await this.parse(RunCommand);

		const config = loadConfig();
		const testScenarioLoader = new TestScenarioLoader();

		const testScenarioRunner = new TestScenarioRunner(
			new N8nApiClient(config.get('n8n.baseUrl')),
			new TestDataFileLoader(),
			new K6Executor({
				k6ApiToken: config.get('k6.apiToken'),
				k6ExecutablePath: config.get('k6.executablePath'),
				n8nApiBaseUrl: config.get('n8n.baseUrl'),
			}),
			{
				email: config.get('n8n.user.email'),
				password: config.get('n8n.user.password'),
			},
		);

		const allScenarios = testScenarioLoader.loadTestScenarios(
			config.get('testScenariosPath'),
			scenarioFilters as string[],
		);

		await testScenarioRunner.runManyTestScenarios(allScenarios);
	}
}
