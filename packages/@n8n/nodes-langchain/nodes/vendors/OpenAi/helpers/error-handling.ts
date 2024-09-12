const errorMap: Record<string, string> = {
	insufficient_quota: 'OpenAI: Insufficient quota',
	rate_limit_exceeded: 'OpenAI: Rate limit reached',
};

export function getCustomErrorMessage(errorCode: string): string | undefined {
	return errorMap[errorCode];
}
