import { OpenAIError } from 'openai/error';
import { RateLimitError } from 'openai';

const errorMap: Record<string, string> = {
	insufficient_quota: 'OpenAI: Insufficient quota',
	rate_limit_exceeded: 'OpenAI: Rate limit reached',
};

export function getCustomErrorMessage(errorCode: string): string | undefined {
	return errorMap[errorCode];
}

export function isOpenAiError(error: any): error is OpenAIError {
	return error instanceof OpenAIError;
}

export const openAiFailedAttemptHandler = (error: any) => {
	if (error instanceof RateLimitError) {
		// If the error is a rate limit error, we want to handle it differently
		// because OpenAI has multiple different rate limit errors
		const errorCode = error?.code;
		if (errorCode) {
			const customErrorMessage = getCustomErrorMessage(errorCode);

			if (customErrorMessage) {
				error.message = customErrorMessage;
			}
		}

		throw error;
	}
};
