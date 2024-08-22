import { Command } from '@oclif/core';
import { ScenarioLoader } from '@/scenario/scenarioLoader';
import { loadConfig } from '@/config/config';

export default class ListCommand extends Command {
	static description = 'List all available scenarios';

	async run() {
		const config = loadConfig();
		const scenarioLoader = new ScenarioLoader();

		const allScenarios = scenarioLoader.loadAll(config.get('testScenariosPath'));

		console.log('Available test scenarios:');
		console.log('');

		for (const scenario of allScenarios) {
			console.log('\t', scenario.name, ':', scenario.description);
		}
	}
}
