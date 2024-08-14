import { Command, Flags } from '@oclif/core';
import { loadConfig } from '@/config/config';
import { TestScenarioLoader } from '@/testScenario/testScenarioLoader';
import { TestScenarioRunner } from '@/testExecution/testScenarioRunner';
import { N8nApiClient } from '@/n8nApiClient/n8nApiClient';
import { TestDataFileLoader } from '@/testScenario/testDataLoader';
import { K6Executor } from '@/testExecution/k6Executor';

export default class RunCommand extends Command {
	static description = 'Run all (default) or specified test scenarios';

	// TODO: Add support for filtering scenarios
	static flags = {
		scenarios: Flags.string({
			char: 't',
			description: 'Comma-separated list of test scenarios to run',
			required: false,
		}),
	};

	async run() {
		const config = loadConfig();
		const testScenarioLoader = new TestScenarioLoader();

		const testScenarioRunner = new TestScenarioRunner(
			new N8nApiClient(config.get('n8n.baseUrl')),
			new TestDataFileLoader(),
			new K6Executor(config.get('k6ExecutablePath'), config.get('n8n.baseUrl')),
			{
				email: config.get('n8n.user.email'),
				password: config.get('n8n.user.password'),
			},
		);

		const allScenarios = testScenarioLoader.loadAllTestScenarios(config.get('testScenariosPath'));

		await testScenarioRunner.runManyTestScenarios(allScenarios);
	}
}
