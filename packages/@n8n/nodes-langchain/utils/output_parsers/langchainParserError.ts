import { OutputParserException } from '@langchain/core/output_parsers';
import type { INode } from 'n8n-workflow';
import { BaseError, NodeOperationError } from 'n8n-workflow';

export const MODEL_OUTPUT_PARSER_ERROR_MESSAGE = "Model output doesn't fit required format";
export const MODEL_OUTPUT_PARSER_ERROR_DESCRIPTION =
	"To continue the execution when this happens, change the 'On Error' parameter in the root node's settings";

const LANGCHAIN_PARSER_ERROR_MESSAGES = ['Failed to parse. Text:', 'Unable to parse JSON response'];

const AGENT_FAILURE_FALLBACK_MESSAGE = 'Agent execution failed';

function getErrorProperty(error: unknown, property: 'message' | 'name') {
	if (error instanceof Error) return error[property];
	if (typeof error !== 'object' || error === null || !(property in error)) return undefined;

	const value = (error as Record<string, unknown>)[property];
	return typeof value === 'string' ? value : undefined;
}

function resolveErrorName(error: unknown): string | undefined {
	if (error instanceof Error) {
		if (error.name && error.name !== 'Error') return error.name;
		return error.constructor.name || undefined;
	}
	return getErrorProperty(error, 'name');
}

function hasLangChainParserMessage(error: unknown) {
	const errorMessage = getErrorProperty(error, 'message');
	if (!errorMessage) return false;

	return LANGCHAIN_PARSER_ERROR_MESSAGES.some((message) => errorMessage.includes(message));
}

export function isLangChainParserError(error: unknown) {
	return (
		error instanceof OutputParserException ||
		resolveErrorName(error) === 'OutputParserException' ||
		hasLangChainParserMessage(error)
	);
}

/**
 * Walks the `root cause` chain to the deepest `Error` and returns its class name.
 * Used for `ai.agent.failure.type` telemetry so the value reflects the
 * underlying error class.
 */
export function getFailureType(error: unknown): string {
	let current: unknown = error;
	const seen = new Set<Error>();
	while (current instanceof Error && current.cause instanceof Error) {
		seen.add(current);
		if (seen.has(current.cause)) break;
		current = current.cause;
	}
	return resolveErrorName(current) ?? (current instanceof Error ? 'Error' : typeof current);
}

function isUselessMessage(message: string | undefined, className: string | undefined): boolean {
	if (!message) return true;
	if (className && message === className) return true;
	return message === 'Error';
}

function wrapAsNodeOperationError(
	error: unknown,
	node: INode,
	itemIndex: number | undefined,
): Error {
	const className = resolveErrorName(error);
	const messageProperty = getErrorProperty(error, 'message');
	const candidateMessage = messageProperty ?? (typeof error === 'string' ? error : undefined);
	const message = isUselessMessage(candidateMessage, className)
		? AGENT_FAILURE_FALLBACK_MESSAGE
		: (candidateMessage as string);

	const options = {
		message,
		description: className ? `Original error: ${className}` : undefined,
		level: 'error' as const,
		...(itemIndex !== undefined ? { itemIndex } : {}),
	};

	// Always pass an Error so NodeOperationError does not wrap a string in
	// OperationalError and lose the original name.
	let cause: Error;
	if (error instanceof Error) {
		cause = error;
	} else {
		cause = new Error(message);
		if (className) cause.name = className;
	}
	return new NodeOperationError(node, cause, options);
}

export function wrapLangChainParserError(
	error: unknown,
	node: INode,
	itemIndex?: number,
	options?: { enrichNonParserErrors?: boolean },
): Error {
	if (!isLangChainParserError(error)) {
		// Default: callers that have not opted in (the chain nodes, ReAct and
		// Conversational agents) keep the error exactly as it was thrown.
		if (!options?.enrichNonParserErrors) {
			return error instanceof Error
				? error
				: new Error(getErrorProperty(error, 'message') ?? String(error));
		}

		// Opt-in enrichment (Tools Agent, all versions): wrap plain errors so a
		// useless message like "Error" never reaches the user, and the original
		// error survives as `cause` for failure-type telemetry. Errors that are
		// already ours carry a meaningful message, so leave them alone.
		if (error instanceof BaseError) return error;
		return wrapAsNodeOperationError(error, node, itemIndex);
	}

	const parserOptions = {
		description: MODEL_OUTPUT_PARSER_ERROR_DESCRIPTION,
		...(itemIndex !== undefined ? { itemIndex } : {}),
	};

	const nodeError = new NodeOperationError(node, MODEL_OUTPUT_PARSER_ERROR_MESSAGE, parserOptions);
	nodeError.context.outputParserFailReason = 'Model output does not match the expected schema';

	return nodeError;
}
