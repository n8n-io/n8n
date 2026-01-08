/**
 * Regex pattern for models that can use the non-Responses API (chat/completions).
 * Models NOT matching this pattern require the Responses API.
 * Matches:
 * - GPT-5 (non-pro, non-codex): gpt-5, gpt-5.1 with optional -mini/-nano
 * - GPT-4.1 with optional -mini/-nano
 * - GPT-4o (chat variants only)
 * - GPT-4 legacy variants
 * - GPT-3.5 variants
 * - GPT-3 / Instruct era models
 */
export const MODELS_ALLOWING_NON_RESPONSES_API_PATTERN =
	/^(?:gpt-5(?:\.1)?(?:-mini|-nano)?|gpt-4\.1(?:-mini|-nano)?|gpt-4o(?:-mini)?|gpt-4(?:-turbo)?(?:-preview)?|gpt-4-32k|gpt-3\.5-turbo(?:-16k)?(?:-(?:0613|1106|latest))?|text-davinci-003|text-davinci-002|davinci-002|babbage-002)$/;

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
