import { OutputParserException } from '@langchain/core/output_parsers';
import { sanitizeErrorDetail } from '@n8n/utils/redaction/sanitize-error-detail';
import type { INode } from 'n8n-workflow';
import { BaseError, NodeOperationError } from 'n8n-workflow';

export const MODEL_OUTPUT_PARSER_ERROR_MESSAGE = "Model output doesn't fit required format";
export const MODEL_OUTPUT_PARSER_ERROR_DESCRIPTION =
	"To continue the execution when this happens, change the 'On Error' parameter in the root node's settings";

const LANGCHAIN_PARSER_ERROR_MESSAGES = ['Failed to parse. Text:', 'Unable to parse JSON response'];

const AGENT_FAILURE_FALLBACK_MESSAGE = 'Agent execution failed';

const MAX_CAUSE_DETAIL_LENGTH = 500;

function getErrorProperty(error: unknown, property: 'message' | 'name' | 'description') {
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
	const root = getRootCause(error);
	return resolveErrorName(root) ?? (root instanceof Error ? 'Error' : typeof root);
}

function getRootCause(error: unknown): unknown {
	let current: unknown = error;
	const seen = new Set<Error>();
	while (current instanceof Error && current.cause instanceof Error) {
		seen.add(current);
		if (seen.has(current.cause)) break;
		current = current.cause;
	}
	return current;
}

function isUselessMessage(message: string | undefined, className: string | undefined): boolean {
	if (!message) return true;
	if (className && message === className) return true;
	return message === 'Error';
}

/**
 * Names the original error class and, when there is one, the deepest error in the
 * `cause` chain, for example the socket or TLS error under an SDK "Connection error.".
 */
function describeOriginalError(error: unknown, className: string | undefined) {
	const original = className ? `Original error: ${className}` : undefined;
	const root = getRootCause(error);
	if (root === error || !(root instanceof Error)) return original;

	const code = 'code' in root && typeof root.code === 'string' ? root.code : undefined;
	const detail =
		code && !root.message.includes(code)
			? [code, root.message].filter(Boolean).join(': ')
			: root.message;
	if (!detail) return original;
	// The root message can come from any library, so remove secrets and URL queries.
	const cause = `Cause: ${sanitizeErrorDetail(detail, MAX_CAUSE_DETAIL_LENGTH)}`;
	return original ? `${original}. ${cause}` : cause;
}

function wrapAsNodeOperationError(
	error: unknown,
	node: INode,
	itemIndex: number | undefined,
	fallbackMessage: string,
): Error {
	const className = resolveErrorName(error);
	const messageProperty = getErrorProperty(error, 'message');
	const candidateMessage = messageProperty ?? (typeof error === 'string' ? error : undefined);
	const message = isUselessMessage(candidateMessage, className)
		? fallbackMessage
		: (candidateMessage as string);

	const options = {
		message,
		description: getErrorProperty(error, 'description') ?? describeOriginalError(error, className),
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
	options?: { enrichNonParserErrors?: boolean; fallbackMessage?: string },
): Error {
	if (!isLangChainParserError(error)) {
		// Default: callers that have not opted in keep the error exactly as it was thrown.
		if (!options?.enrichNonParserErrors) {
			return error instanceof Error
				? error
				: new Error(getErrorProperty(error, 'message') ?? String(error));
		}

		// Opt-in enrichment: wrap plain errors so a useless message like "Error"
		// never reaches the user, and the original error survives as `cause` for
		// failure-type telemetry. Errors that are already ours carry a meaningful
		// message, so leave them alone.
		if (error instanceof BaseError) return error;
		return wrapAsNodeOperationError(
			error,
			node,
			itemIndex,
			options.fallbackMessage ?? AGENT_FAILURE_FALLBACK_MESSAGE,
		);
	}

	const parserOptions = {
		description: MODEL_OUTPUT_PARSER_ERROR_DESCRIPTION,
		...(itemIndex !== undefined ? { itemIndex } : {}),
	};

	const nodeError = new NodeOperationError(node, MODEL_OUTPUT_PARSER_ERROR_MESSAGE, parserOptions);
	nodeError.context.outputParserFailReason = 'Model output does not match the expected schema';

	return nodeError;
}
