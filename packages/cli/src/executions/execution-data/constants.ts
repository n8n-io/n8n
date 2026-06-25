import type { ExecutionRef } from './types';

/** Version of the JSON file bundling execution data, workflow data, and workflow version ID. */
export const EXECUTION_DATA_BUNDLE_VERSION = 1;

/** Filename of the JSON file bundling execution data, workflow data, and workflow version ID. */
export const EXECUTION_DATA_BUNDLE_FILENAME = 'bundle.json';

export const executionDataBundleKey = ({ workflowId, executionId }: ExecutionRef) =>
	[
		'workflows',
		workflowId,
		'executions',
		executionId,
		'execution_data',
		EXECUTION_DATA_BUNDLE_FILENAME,
	].join('/');
