import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Scenario } from '@/types/scenario';
import type { Workflow } from '@/n8nApiClient/n8nApiClient.types';

/**
 * Loads scenario data files from FS
 */
export class ScenarioDataFileLoader {
	async loadDataForScenario(scenario: Scenario): Promise<{
		workflows: Workflow[];
	}> {
		const workflows = await Promise.all(
			scenario.scenarioData.workflowFiles?.map((workflowFilePath) =>
				this.loadSingleWorkflowFromFile(path.join(scenario.scenarioDirPath, workflowFilePath)),
			) ?? [],
		);

		return {
			workflows,
		};
	}

	private loadSingleWorkflowFromFile(workflowFilePath: string): Workflow {
		const fileContent = fs.readFileSync(workflowFilePath, 'utf8');

		try {
			return JSON.parse(fileContent) as Workflow;
		} catch (error) {
			const e = error as Error;
			throw new Error(`Failed to parse workflow file ${workflowFilePath}: ${e.message}`);
		}
	}
}
