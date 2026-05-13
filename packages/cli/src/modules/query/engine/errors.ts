// Error types thrown by the query engine.
//
// Engine errors carry a stable `code` so the service layer can map them to
// the right HTTP status (400 for parse/validation, 403 for permission,
// 501 for unsupported db, 500 for execution failures).

export type EngineErrorCode =
	// parse-stage
	| 'PARSE_ERROR'
	| 'JOINS_NOT_SUPPORTED'
	| 'ALIASES_NOT_SUPPORTED'
	// validation-stage
	| 'UNKNOWN_FIELD'
	| 'UNKNOWN_SOURCE'
	| 'UNKNOWN_WORKFLOW'
	| 'AGGREGATE_IN_WHERE'
	| 'FORBIDDEN_WORKFLOW'
	| 'INVALID_WINDOW'
	| 'DB_UNSUPPORTED'
	// execution-stage
	| 'EXECUTION_FAILED'
	| 'STATEMENT_TIMEOUT'
	| 'RESULT_TOO_LARGE';

export class EngineError extends Error {
	constructor(
		readonly code: EngineErrorCode,
		message: string,
		readonly position?: number,
	) {
		super(message);
		this.name = this.constructor.name;
	}
}

export class ParseError extends EngineError {
	constructor(message: string, position?: number, code: EngineErrorCode = 'PARSE_ERROR') {
		super(code, message, position);
	}
}

export class ValidationError extends EngineError {}

export class ExecutionError extends EngineError {}
