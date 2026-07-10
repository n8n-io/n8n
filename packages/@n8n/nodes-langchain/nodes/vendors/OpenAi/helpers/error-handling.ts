import { OperationalError } from 'n8n-workflow';
import { RateLimitError } from 'openai';
import { OpenAIError } from 'openai/error';

const errorMap: Record<string, string> = {
	insufficient_quota:
		'Insufficient quota detected. <a href="https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-langchain.openai/common-issues/#insufficient-quota" target="_blank">Learn more</a> about resolving this issue',
	rate_limit_exceeded: 'OpenAI: Rate limit reached',
};

export function getCustomErrorMessage(errorCode: string): string | undefined {
	return errorMap[errorCode];
}

export function isOpenAiError(error: any): error is OpenAIError {
	return error instanceof OpenAIError;
}

function isNonChatModelError(error: unknown): boolean {
	if (typeof error !== 'object' || error === null) {
		return false;
	}
	return (
		'status' in error &&
		error.status === 404 &&
		'type' in error &&
		error.type === 'invalid_request_error' &&
		'param' in error &&
		error.param === 'model' &&
		'message' in error &&
		typeof error.message === 'string' &&
		error.message.includes('not a chat model')
	);
}

export const openAiFailedAttemptHandler = (error: unknown) => {
	if (isNonChatModelError(error)) {
		throw new OperationalError(
			'This model requires the Responses API. Enable "Use Responses API" in the OpenAI Chat Model node options to use this model.',
			{ cause: error },
		);
	}

	if (error instanceof RateLimitError) {
		// If the error is a rate limit error, we want to handle it differently
		// because OpenAI has multiple different rate limit errors
		const errorCode = error?.code;
		const errorMessage =
			getCustomErrorMessage(errorCode ?? 'rate_limit_exceeded') ?? errorMap.rate_limit_exceeded;
		throw new OperationalError(errorMessage, { cause: error });
	}
};
