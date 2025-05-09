import type { BaseTextKey } from '@/plugins/i18n';

export const TEST_CASE_EXECUTION_ERROR_CODE = {
	MOCKED_NODE_NOT_FOUND: 'MOCKED_NODE_NOT_FOUND',
	FAILED_TO_EXECUTE_WORKFLOW: 'FAILED_TO_EXECUTE_WORKFLOW',
	INVALID_METRICS: 'INVALID_METRICS',
	UNKNOWN_ERROR: 'UNKNOWN_ERROR',
	NO_METRICS_COLLECTED: 'NO_METRICS_COLLECTED',
} as const;

export type TestCaseExecutionErrorCodes =
	(typeof TEST_CASE_EXECUTION_ERROR_CODE)[keyof typeof TEST_CASE_EXECUTION_ERROR_CODE];

export const TEST_RUN_ERROR_CODES = {
	TEST_CASE_NOT_FOUND: 'TEST_CASES_NOT_FOUND',
	INTERRUPTED: 'INTERRUPTED',
	UNKNOWN_ERROR: 'UNKNOWN_ERROR',
	EVALUATION_TRIGGER_NOT_FOUND: 'EVALUATION_TRIGGER_NOT_FOUND',
	EVALUATION_TRIGGER_NOT_CONFIGURED: 'EVALUATION_TRIGGER_NOT_CONFIGURED',
	SET_OUTPUTS_NODE_NOT_FOUND: 'SET_OUTPUTS_NODE_NOT_FOUND',
	SET_OUTPUTS_NODE_NOT_CONFIGURED: 'SET_OUTPUTS_NODE_NOT_CONFIGURED',
	SET_METRICS_NODE_NOT_FOUND: 'SET_METRICS_NODE_NOT_FOUND',
	SET_METRICS_NODE_NOT_CONFIGURED: 'SET_METRICS_NODE_NOT_CONFIGURED',
	CANT_FETCH_TEST_CASES: 'CANT_FETCH_TEST_CASES',
} as const;

export type TestRunErrorCode = (typeof TEST_RUN_ERROR_CODES)[keyof typeof TEST_RUN_ERROR_CODES];
const testCaseErrorDictionary: Partial<Record<TestCaseExecutionErrorCodes, BaseTextKey>> = {
	MOCKED_NODE_NOT_FOUND: 'evaluation.runDetail.error.mockedNodeMissing',
	FAILED_TO_EXECUTE_WORKFLOW: 'evaluation.runDetail.error.executionFailed',
	INVALID_METRICS: 'evaluation.runDetail.error.invalidMetrics',
	UNKNOWN_ERROR: 'evaluation.runDetail.error.unknownError',
	NO_METRICS_COLLECTED: 'evaluation.runDetail.error.noMetricsCollected',
} as const;

const testRunErrorDictionary: Partial<Record<TestRunErrorCode, BaseTextKey>> = {
	TEST_CASES_NOT_FOUND: 'evaluation.listRuns.error.testCasesNotFound',
	INTERRUPTED: 'evaluation.listRuns.error.executionInterrupted',
	UNKNOWN_ERROR: 'evaluation.listRuns.error.unknownError',
	EVALUATION_TRIGGER_NOT_FOUND: 'evaluation.listRuns.error.evaluationTriggerNotFound',
	EVALUATION_TRIGGER_NOT_CONFIGURED: 'evaluation.listRuns.error.evaluationTriggerNotConfigured',
	SET_OUTPUTS_NODE_NOT_FOUND: 'evaluation.listRuns.error.setOutputsNodeNotFound',
	SET_OUTPUTS_NODE_NOT_CONFIGURED: 'evaluation.listRuns.error.setOutputsNodeNotConfigured',
	SET_METRICS_NODE_NOT_FOUND: 'evaluation.listRuns.error.setMetricsNodeNotFound',
	SET_METRICS_NODE_NOT_CONFIGURED: 'evaluation.listRuns.error.setMetricsNodeNotConfigured',
	CANT_FETCH_TEST_CASES: 'evaluation.listRuns.error.cantFetchTestCases',
} as const;

export const getErrorBaseKey = (errorCode?: string): string =>
	testCaseErrorDictionary[errorCode as TestCaseExecutionErrorCodes] ??
	testRunErrorDictionary[errorCode as TestRunErrorCode] ??
	'';
