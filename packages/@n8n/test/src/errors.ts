import type { WorkflowTestResult } from './result';

export type WorkflowTestErrorCode =
	| 'NODE_FAILED'
	| 'EXECUTION_IN_PROGRESS'
	| 'NODE_NOT_FOUND'
	| 'WORKFLOW_NOT_FOUND'
	| 'WORKFLOW_AMBIGUOUS'
	| 'TRIGGER_NOT_FOUND'
	| 'MOCK_INVALID_OUTPUT'
	| 'NODE_RUN_COUNT'
	| 'MULTIPLE_END_NODES'
	| 'CREDENTIAL_NOT_SUPPLIED'
	| 'CREDENTIAL_NOT_FOUND'
	| 'CREDENTIAL_TYPE_UNKNOWN'
	| 'CREDENTIAL_TYPE_MISMATCH'
	| 'VARIABLE_NOT_SUPPLIED'
	| 'SECRET_NOT_SUPPLIED'
	| 'INVALID_OPTION'
	| 'SUB_WORKFLOW_NOT_IN_SET'
	| 'SUB_WORKFLOW_SOURCE_NOT_SUPPORTED'
	| 'CONTRACT_MISMATCH'
	| 'CODE_NODE_NOT_MOCKED'
	| 'INVALID_WORKFLOW'
	| 'WAIT_NOT_MOCKED'
	| 'DATA_TABLE_NOT_MOCKED'
	| 'BINARY_NOT_SUPPORTED'
	| 'HTTP_NOT_MOCKED'
	| 'NODE_TYPE_NOT_INSTALLED'
	| 'INVALID_PACKAGE';

interface WorkflowTestErrorDetails {
	workflow?: string;
	node?: string;
	result?: WorkflowTestResult;
}

export class WorkflowTestError extends Error {
	readonly code: WorkflowTestErrorCode;

	readonly workflow?: string;

	readonly node?: string;

	result?: WorkflowTestResult;

	constructor(
		code: WorkflowTestErrorCode,
		message: string,
		details: WorkflowTestErrorDetails = {},
	) {
		super(message);
		this.name = 'WorkflowTestError';
		this.code = code;
		this.workflow = details.workflow;
		this.node = details.node;
		this.result = details.result;
	}
}
