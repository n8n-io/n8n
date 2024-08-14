import fs from 'fs';
import path from 'path';
import { TestScenario } from '@/types/testScenario';
import { Workflow } from '@/n8nApiClient/n8nApiClient.types';

/**
 * Loads test data files from FS
 */
export class TestDataFileLoader {
	async loadTestDataForScenario(testScenario: TestScenario): Promise<{
		workflows: Workflow[];
	}> {
		const workflows = await Promise.all(
			testScenario.testData.workflowFiles?.map((workflowFilePath) =>
				this.loadSingleWorkflowFromFile(path.join(testScenario.testScenarioPath, workflowFilePath)),
			) ?? [],
		);

		return {
			workflows,
		};
	}

	private loadSingleWorkflowFromFile(workflowFilePath: string): Workflow {
		const fileContent = fs.readFileSync(workflowFilePath, 'utf8');

		const workflow = JSON.parse(fileContent);

		return workflow;
	}
}
