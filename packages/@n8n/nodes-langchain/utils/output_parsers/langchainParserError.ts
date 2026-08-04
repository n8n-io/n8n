import { OutputParserException } from '@langchain/core/output_parsers';
import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export const MODEL_OUTPUT_PARSER_ERROR_MESSAGE = "Model output doesn't fit required format";
export const MODEL_OUTPUT_PARSER_ERROR_DESCRIPTION =
	"To continue the execution when this happens, change the 'On Error' parameter in the root node's settings";

const LANGCHAIN_PARSER_ERROR_MESSAGES = ['Failed to parse. Text:', 'Unable to parse JSON response'];

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

export function wrapLangChainParserError(error: unknown, node: INode, itemIndex?: number): Error {
	if (!isLangChainParserError(error)) {
		return error instanceof Error
			? error
			: new Error(getErrorProperty(error, 'message') ?? String(error));
	}

	const options = {
		description: MODEL_OUTPUT_PARSER_ERROR_DESCRIPTION,
		...(itemIndex !== undefined ? { itemIndex } : {}),
	};

	const nodeError = new NodeOperationError(node, MODEL_OUTPUT_PARSER_ERROR_MESSAGE, options);
	nodeError.context.outputParserFailReason = 'Model output does not match the expected schema';

	return nodeError;
}
