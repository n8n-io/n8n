import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'node:crypto';
import type { TestScenario, TestScenarioManifest } from '@/types/testScenario';

export class TestScenarioLoader {
	/**
	 * Loads all test scenarios from the given path
	 */
	loadAllTestScenarios(testScenariosPath: string): TestScenario[] {
		testScenariosPath = path.resolve(testScenariosPath);
		const testScenarioFolders = fs
			.readdirSync(testScenariosPath, { withFileTypes: true })
			.filter((dirent) => dirent.isDirectory())
			.map((dirent) => dirent.name);

		const scenarios: TestScenario[] = [];

		for (const folder of testScenarioFolders) {
			const scenarioPath = path.join(testScenariosPath, folder);
			const manifestFileName = `${folder}.manifest.json`;
			const scenarioManifestPath = path.join(testScenariosPath, folder, manifestFileName);
			if (!fs.existsSync(scenarioManifestPath)) {
				console.warn(`Test scenario at ${scenarioPath} is missing the ${manifestFileName} file`);
				continue;
			}

			// Load the scenario manifest file
			const [testCase, validationErrors] =
				this.loadAndValidateTestScenarioManifest(scenarioManifestPath);
			if (validationErrors) {
				console.warn(
					`Test case at ${scenarioPath} has the following validation errors: ${validationErrors.join(', ')}`,
				);
				continue;
			}

			scenarios.push({
				...testCase,
				id: this.formTestScenarioId(scenarioPath),
				testScenarioPath: scenarioPath,
			});
		}

		return scenarios;
	}

	private loadAndValidateTestScenarioManifest(
		testScenarioManifestPath: string,
	): [TestScenarioManifest, null] | [null, string[]] {
		const testCase = JSON.parse(fs.readFileSync(testScenarioManifestPath, 'utf8'));
		const validationErrors: string[] = [];

		if (!testCase.name) {
			validationErrors.push(`Test case at ${testScenarioManifestPath} is missing a name`);
		}
		if (!testCase.description) {
			validationErrors.push(`Test case at ${testScenarioManifestPath} is missing a description`);
		}

		return validationErrors.length === 0 ? [testCase, null] : [null, validationErrors];
	}

	private formTestScenarioId(testCasePath: string): string {
		return createHash('sha256').update(testCasePath).digest('hex');
	}
}
