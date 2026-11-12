import { errorChain } from '@n8n/utils/errors/error-chain';
import { isRecord } from '@n8n/utils/is-record';

const PROMPT_CACHE_PARAMS = ['prompt_cache_key', 'prompt_cache_retention'];
const REJECTED_REQUEST_STATUSES = new Set([400, 422]);
const UNSUPPORTED_SIGNAL =
	/not support|unsupported|unknown|unrecognized|not permitted|not allowed|extra (?:inputs|fields)|invalid/i;

export const PROMPT_CACHE_PARAMS_ERROR_MESSAGE =
	"This model endpoint doesn't accept prompt caching parameters. Turn off Prompt caching in the agent's settings.";

/** A provider rejected the OpenAI prompt cache fields. The provider error stays on `cause`. */
export class PromptCacheParamsError extends Error {
	constructor(cause: unknown) {
		super(PROMPT_CACHE_PARAMS_ERROR_MESSAGE, { cause });
		this.name = 'PromptCacheParamsError';
	}
}

function parseBody(body: unknown): unknown {
	if (typeof body !== 'string') return undefined;
	try {
		return JSON.parse(body) as unknown;
	} catch {
		return undefined;
	}
}

/** The error bodies in the chain: OpenAI `{ error: {...} }`, flat `{ message }`, and FastAPI `{ detail: [...] }`. */
function errorBodies(error: unknown): Array<Record<string, unknown>> {
	return errorChain(error)
		.flatMap((entry) => [entry.data, parseBody(entry.responseBody)])
		.filter(isRecord)
		.flatMap((body) => [
			body,
			...(isRecord(body.error) ? [body.error] : []),
			...(Array.isArray(body.detail) ? body.detail.filter(isRecord) : []),
		]);
}

function namesCacheParam(body: Record<string, unknown>): boolean {
	if (typeof body.param === 'string' && PROMPT_CACHE_PARAMS.includes(body.param)) return true;
	// FastAPI and vLLM validation errors name the field in `loc`.
	if (Array.isArray(body.loc)) {
		return body.loc.some((part) => PROMPT_CACHE_PARAMS.includes(String(part)));
	}
	const message = [body.message, body.msg].find((value) => typeof value === 'string');
	return (
		message !== undefined &&
		PROMPT_CACHE_PARAMS.some((param) => message.includes(param)) &&
		UNSUPPORTED_SIGNAL.test(message)
	);
}

/** True for a 400/422 whose payload names `prompt_cache_key` or `prompt_cache_retention` as unsupported. */
export function isPromptCacheParamsRejection(error: unknown): boolean {
	const rejected = errorChain(error).some(
		(entry) =>
			typeof entry.statusCode === 'number' && REJECTED_REQUEST_STATUSES.has(entry.statusCode),
	);
	return rejected && errorBodies(error).some(namesCacheParam);
}

/** Replace a prompt cache rejection with a readable error. Return any other error unchanged. */
export function toPromptCacheParamsError(error: unknown): unknown {
	if (error instanceof PromptCacheParamsError) return error;
	return isPromptCacheParamsRejection(error) ? new PromptCacheParamsError(error) : error;
}
