import { Command } from '@oclif/core';
import { TestScenarioLoader } from '@/testScenario/testScenarioLoader';
import { loadConfig } from '@/config/config';

export default class ListCommand extends Command {
	static description = 'List all available test scenarios';

	async run() {
		const config = loadConfig();
		const testScenarioLoader = new TestScenarioLoader();

		const allScenarios = testScenarioLoader.loadAllTestScenarios(config.get('testScenariosPath'));

		console.log('Available test scenarios:');
		console.log('');

		for (const testCase of allScenarios) {
			console.log('\t', testCase.name, ':', testCase.description);
		}
	}
}
