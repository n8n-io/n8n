/**
 * Error types for script execution.
 *
 * These errors provide detailed information about script failures including
 * line numbers and partial results for error recovery.
 */

import { OperationalError, UnexpectedError } from 'n8n-workflow';
import type { OperationalErrorOptions, UnexpectedErrorOptions } from 'n8n-workflow';

import type { WorkflowOperation } from '../../types/workflow';

/**
 * Location information for script errors
 */
export interface ScriptErrorLocation {
	/** Line number in the script (1-indexed) */
	line?: number;
	/** Column number in the script (1-indexed) */
	column?: number;
	/** The source code around the error location */
	sourceContext?: string;
}

/**
 * Error thrown when script validation fails before execution.
 * This includes syntax errors and other pre-execution checks.
 */
export class ScriptValidationError extends OperationalError {
	readonly location?: ScriptErrorLocation;

	constructor(
		message: string,
		options?: OperationalErrorOptions & {
			location?: ScriptErrorLocation;
			script?: string;
		},
	) {
		const locationInfo = options?.location
			? ` at line ${options.location.line ?? '?'}:${options.location.column ?? '?'}`
			: '';

		super(`Script validation failed${locationInfo}: ${message}`, {
			...options,
			tags: {
				...options?.tags,
				line: options?.location?.line,
				column: options?.location?.column,
			},
			shouldReport: false,
		});

		this.location = options?.location;
	}
}

/**
 * Error thrown when script execution fails at runtime.
 * Includes partial results from operations that completed before the error.
 */
export class ScriptExecutionError extends UnexpectedError {
	readonly location?: ScriptErrorLocation;
	readonly partialOperations: WorkflowOperation[];
	readonly consoleOutput: string[];

	constructor(
		message: string,
		options?: UnexpectedErrorOptions & {
			location?: ScriptErrorLocation;
			partialOperations?: WorkflowOperation[];
			consoleOutput?: string[];
			originalError?: Error;
		},
	) {
		const locationInfo = options?.location
			? ` at line ${options.location.line ?? '?'}:${options.location.column ?? '?'}`
			: '';

		super(`Script execution failed${locationInfo}: ${message}`, {
			...options,
			cause: options?.originalError,
			shouldReport: true,
			tags: {
				...options?.tags,
				line: options?.location?.line,
				column: options?.location?.column,
				operationsCompleted: options?.partialOperations?.length ?? 0,
			},
		});

		this.location = options?.location;
		this.partialOperations = options?.partialOperations ?? [];
		this.consoleOutput = options?.consoleOutput ?? [];
	}

	/**
	 * Format the error for display to the LLM agent
	 */
	formatForAgent(): string {
		const parts: string[] = [];

		parts.push(`Error: ${this.message}`);

		if (this.location?.line) {
			parts.push(
				`Location: Line ${this.location.line}${this.location.column ? `, Column ${this.location.column}` : ''}`,
			);
		}

		if (this.location?.sourceContext) {
			parts.push(`Source:\n${this.location.sourceContext}`);
		}

		if (this.partialOperations.length > 0) {
			parts.push(
				`Partial results: ${this.partialOperations.length} operation(s) completed before error`,
			);
		}

		if (this.consoleOutput.length > 0) {
			parts.push(`Console output:\n${this.consoleOutput.join('\n')}`);
		}

		return parts.join('\n\n');
	}
}

/**
 * Error thrown when script execution times out
 */
export class ScriptTimeoutError extends OperationalError {
	readonly timeoutMs: number;
	readonly partialOperations: WorkflowOperation[];

	constructor(
		timeoutMs: number,
		options?: OperationalErrorOptions & {
			partialOperations?: WorkflowOperation[];
		},
	) {
		super(`Script execution timed out after ${timeoutMs}ms`, {
			...options,
			tags: {
				...options?.tags,
				timeoutMs,
				operationsCompleted: options?.partialOperations?.length ?? 0,
			},
			shouldReport: false,
		});

		this.timeoutMs = timeoutMs;
		this.partialOperations = options?.partialOperations ?? [];
	}
}

/**
 * Error thrown when a tool call within a script fails
 */
export class ScriptToolError extends OperationalError {
	readonly toolName: string;
	readonly toolInput: unknown;

	constructor(
		toolName: string,
		message: string,
		options?: OperationalErrorOptions & {
			toolInput?: unknown;
		},
	) {
		super(`Tool '${toolName}' failed: ${message}`, {
			...options,
			tags: {
				...options?.tags,
				toolName,
			},
			shouldReport: false,
		});

		this.toolName = toolName;
		this.toolInput = options?.toolInput;
	}
}

/**
 * Extract line/column information from a JavaScript error
 */
export function extractErrorLocation(
	error: Error,
	script: string,
): ScriptErrorLocation | undefined {
	// Try to extract from stack trace
	const stackMatch = error.stack?.match(/:(\d+):(\d+)/);
	if (stackMatch) {
		const line = parseInt(stackMatch[1], 10);
		const column = parseInt(stackMatch[2], 10);

		// Get source context (3 lines before and after)
		const lines = script.split('\n');
		const startLine = Math.max(0, line - 4);
		const endLine = Math.min(lines.length, line + 3);
		const contextLines = lines.slice(startLine, endLine).map((content, idx) => {
			const lineNum = startLine + idx + 1;
			const marker = lineNum === line ? '>>> ' : '    ';
			return `${marker}${lineNum}: ${content}`;
		});

		return {
			line,
			column,
			sourceContext: contextLines.join('\n'),
		};
	}

	return undefined;
}
