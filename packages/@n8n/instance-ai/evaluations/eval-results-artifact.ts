import path from 'node:path';

export type StoredScenarioRun<TEvalResult> = {
	workflowId?: string | null;
	evalResult?: TEvalResult;
};

export type StoredScenarioResult<TEvalResult> = {
	name: string;
	runs: Array<StoredScenarioRun<TEvalResult>>;
};

export type StoredTestCaseResult<TEvalResult> = {
	name?: string;
	testCaseFile?: string;
	scenarios: Array<StoredScenarioResult<TEvalResult>>;
};

export type StoredEvalResults<TEvalResult> = {
	testCases: Array<StoredTestCaseResult<TEvalResult>>;
};

export type StoredVerifierRun<TEvalResult> = {
	workflowId: string;
	evalResult: TEvalResult;
	runIndex: number;
};

export function getTestCaseSlug(testCasePath: string): string {
	return path.basename(testCasePath, path.extname(testCasePath));
}

export function findStoredTestCaseResult<TEvalResult>(
	evalResults: StoredEvalResults<TEvalResult>,
	testCasePath: string,
	serializedTestCaseName: string | undefined,
): StoredTestCaseResult<TEvalResult> | undefined {
	const slug = getTestCaseSlug(testCasePath);
	const bySlug = evalResults.testCases.filter(
		(testCaseResult) => testCaseResult.testCaseFile === slug,
	);
	if (bySlug.length === 1) return bySlug[0];
	if (bySlug.length > 1) {
		throw new Error(`Found multiple eval-results entries for test case slug "${slug}"`);
	}

	const byName = serializedTestCaseName
		? evalResults.testCases.filter(
				(testCaseResult) => testCaseResult.name === serializedTestCaseName,
			)
		: [];
	if (byName.length === 1) return byName[0];
	if (byName.length > 1) {
		throw new Error(
			`Found multiple eval-results entries for test case "${serializedTestCaseName}"`,
		);
	}

	return evalResults.testCases.length === 1 ? evalResults.testCases[0] : undefined;
}

export function findStoredVerifierRun<TEvalResult>(
	storedTestCase: StoredTestCaseResult<TEvalResult> | undefined,
	scenarioName: string,
): StoredVerifierRun<TEvalResult> | undefined {
	const storedScenario = storedTestCase?.scenarios.find(
		(scenarioResult) => scenarioResult.name === scenarioName,
	);
	if (!storedScenario) return undefined;

	for (let runIndex = 0; runIndex < storedScenario.runs.length; runIndex++) {
		const run = storedScenario.runs[runIndex];
		if (!run?.evalResult || typeof run.workflowId !== 'string' || run.workflowId.length === 0) {
			continue;
		}

		return {
			workflowId: run.workflowId,
			evalResult: run.evalResult,
			runIndex,
		};
	}

	return undefined;
}
