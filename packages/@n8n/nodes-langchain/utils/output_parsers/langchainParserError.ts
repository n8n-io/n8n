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

function getErrorName(error: unknown) {
	const errorName = getErrorProperty(error, 'name');
	if (errorName) return errorName;

	return error instanceof Error ? error.constructor.name : undefined;
}

function hasLangChainParserMessage(error: unknown) {
	const errorMessage = getErrorProperty(error, 'message');
	if (!errorMessage) return false;

	return LANGCHAIN_PARSER_ERROR_MESSAGES.some((message) => errorMessage.includes(message));
}

export function isLangChainParserError(error: unknown) {
	return (
		error instanceof OutputParserException ||
		getErrorName(error) === 'OutputParserException' ||
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
	while (current instanceof Error && current.cause instanceof Error) {
		current = current.cause;
	}
	return (
		(current instanceof Error ? current.name || current.constructor.name : typeof current) ||
		'Error'
	);
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
	const className = getErrorName(error);
	const messageProperty = getErrorProperty(error, 'message');
	const candidateMessage = messageProperty ?? (error instanceof Error ? undefined : String(error));
	const message = isUselessMessage(candidateMessage, className)
		? AGENT_FAILURE_FALLBACK_MESSAGE
		: (candidateMessage as string);

	const options = {
		message,
		description: className ? `Original error: ${className}` : undefined,
		...(itemIndex !== undefined ? { itemIndex } : {}),
	};
	if (error instanceof Error) {
		return new NodeOperationError(node, error, options);
	}
	return new NodeOperationError(node, message, options);
}

export function wrapLangChainParserError(
	error: unknown,
	node: INode,
	itemIndex?: number,
	options?: { enrichNonParserErrors?: boolean },
): Error {
	if (!isLangChainParserError(error)) {
		// V1/V2 path (default): preserve existing behaviour.
		if (!options?.enrichNonParserErrors) {
			return error instanceof Error
				? error
				: new Error(getErrorProperty(error, 'message') ?? String(error));
		}

		// Agent V3 path
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
