import { Command, Flags } from '@oclif/core';
import { loadConfig } from '@/config/config';
import { ScenarioLoader } from '@/scenario/scenarioLoader';
import { ScenarioRunner } from '@/testExecution/scenarioRunner';
import { N8nApiClient } from '@/n8nApiClient/n8nApiClient';
import { ScenarioDataFileLoader } from '@/scenario/scenarioDataLoader';
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
		const scenarioLoader = new ScenarioLoader();

		const scenarioRunner = new ScenarioRunner(
			new N8nApiClient(config.get('n8n.baseUrl')),
			new ScenarioDataFileLoader(),
			new K6Executor({
				k6ExecutablePath: config.get('k6.executablePath'),
				k6ApiToken: config.get('k6.apiToken'),
				n8nApiBaseUrl: config.get('n8n.baseUrl'),
			}),
			{
				email: config.get('n8n.user.email'),
				password: config.get('n8n.user.password'),
			},
			config.get('scenarioNamePrefix'),
		);

		const allScenarios = scenarioLoader.loadAll(config.get('testScenariosPath'));

		await scenarioRunner.runManyScenarios(allScenarios);
	}
}
