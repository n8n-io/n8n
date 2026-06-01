import * as fs from 'node:fs';
import * as path from 'node:path';

import type { Workflow, Credential, DataTable } from '@/n8n-api-client/n8n-api-client.types';
import type { Scenario } from '@/types/scenario';

export type LoadableScenarioData = {
	workflows: Workflow[];
	credentials: Credential[];
	dataTable: DataTable | null;
};

/**
 * Loads scenario data files from FS
 */
export class ScenarioDataFileLoader {
	async loadDataForScenario(scenario: Scenario): Promise<LoadableScenarioData> {
		const workflows = await Promise.all(
			scenario.scenarioData.workflowFiles?.map((workflowFilePath) =>
				this.loadSingleWorkflowFromFile(path.join(scenario.scenarioDirPath, workflowFilePath)),
			) ?? [],
		);

		const credentials = await Promise.all(
			scenario.scenarioData.credentialFiles?.map((credentialFilePath) =>
				this.loadSingleCredentialFromFile(path.join(scenario.scenarioDirPath, credentialFilePath)),
			) ?? [],
		);

		const dataTable = scenario.scenarioData.dataTableFile
			? this.loadSingleDataTableFromFile(
					path.join(scenario.scenarioDirPath, scenario.scenarioData.dataTableFile),
				)
			: null;

		return {
			workflows,
			credentials,
			dataTable,
		};
	}

	private loadSingleCredentialFromFile(credentialFilePath: string): Credential {
		const fileContent = fs.readFileSync(credentialFilePath, 'utf8');

		try {
			return JSON.parse(fileContent) as Credential;
		} catch (error) {
			const e = error as Error;
			throw new Error(`Failed to parse credential file ${credentialFilePath}: ${e.message}`);
		}
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

	private loadSingleDataTableFromFile(dataTableFilePath: string): DataTable {
		const fileContent = fs.readFileSync(dataTableFilePath, 'utf8');

		try {
			return JSON.parse(fileContent) as DataTable;
		} catch (error) {
			const e = error as Error;
			throw new Error(`Failed to parse data table file ${dataTableFilePath}: ${e.message}`);
		}
	}
}
