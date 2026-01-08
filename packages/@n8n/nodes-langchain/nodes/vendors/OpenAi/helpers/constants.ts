/**
 * Regex pattern for models that require the Responses API.
 * These models are not supported in the /v1/chat/completions endpoint.
 * Matches:
 * - gpt-5.2-pro (only pro variant of 5.2)
 * - gpt-5.3+ (all variants of 5.3 and higher)
 * - codex-*-max models
 * - computer-use models
 */
export const MODELS_REQUIRING_RESPONSES_API_PATTERN =
	/^(gpt-5\.(2-pro|[3-9]|[1-9]\d)|codex-.+-max|computer-use)/;

export const MODELS_NOT_SUPPORT_FUNCTION_CALLS = [
	'gpt-3.5-turbo-16k-0613',
	'dall-e-3',
	'text-embedding-3-large',
	'dall-e-2',
	'whisper-1',
	'tts-1-hd-1106',
	'tts-1-hd',
	'gpt-4-0314',
	'text-embedding-3-small',
	'gpt-4-32k-0314',
	'gpt-3.5-turbo-0301',
	'gpt-4-vision-preview',
	'gpt-3.5-turbo-16k',
	'gpt-3.5-turbo-instruct-0914',
	'tts-1',
	'davinci-002',
	'gpt-3.5-turbo-instruct',
	'babbage-002',
	'tts-1-1106',
	'text-embedding-ada-002',
];
