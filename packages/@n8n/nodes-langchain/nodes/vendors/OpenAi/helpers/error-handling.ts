import { OpenAIError } from 'openai/error';

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
