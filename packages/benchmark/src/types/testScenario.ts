export type TestData = {
	/** Relative paths to the workflow files */
	workflowFiles?: string[];
};

/**
 * Configuration that defines the test scenario
 */
export type TestScenarioManifest = {
	/** The name of the test scenario */
	name: string;
	/** A longer description of the test scenario */
	description: string;
	/** Relative path to the k6 test script */
	testScriptPath: string;
	/** Test data to import before running the scenario */
	testData: TestData;
};

/**
 * A test scenario with additional metadata
 */
export type TestScenario = TestScenarioManifest & {
	id: string;
	testScenarioPath: string;
};
