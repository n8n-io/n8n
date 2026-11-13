import { APICallError } from 'ai';

import {
	PromptCacheParamsError,
	isPromptCacheParamsRejection,
	toPromptCacheParamsError,
} from '../prompt-cache-params-error';

function apiError(statusCode: number, body: unknown, data?: unknown) {
	return new APICallError({
		message: 'Bad Request',
		url: 'http://proxy.local/v1/responses',
		requestBodyValues: {},
		statusCode,
		responseBody: JSON.stringify(body),
		data,
	});
}

describe('isPromptCacheParamsRejection', () => {
	it.each([
		[
			'LiteLLM UnsupportedParamsError',
			400,
			{
				error: {
					message:
						"litellm.UnsupportedParamsError: bedrock does not support parameters: ['prompt_cache_key']",
					type: null,
					param: null,
					code: '400',
				},
			},
		],
		[
			'OpenAI-style unknown parameter',
			400,
			{
				error: {
					message: "Unknown parameter: 'prompt_cache_retention'.",
					type: 'invalid_request_error',
					param: 'prompt_cache_retention',
					code: 'unknown_parameter',
				},
			},
		],
		[
			'vLLM flat error object',
			400,
			{
				object: 'error',
				message: 'Unrecognized request argument supplied: prompt_cache_key',
				type: 'BadRequestError',
				code: 400,
			},
		],
		[
			'FastAPI validation error',
			422,
			{
				detail: [
					{
						type: 'extra_forbidden',
						loc: ['body', 'prompt_cache_key'],
						msg: 'Extra inputs are not permitted',
					},
				],
			},
		],
	])('detects the %s shape', (_name, status, body) => {
		expect(isPromptCacheParamsRejection(apiError(status, body))).toBe(true);
	});

	it('detects the shape from parsed `data` and through a wrapping error', () => {
		const data = { error: { message: 'unsupported', param: 'prompt_cache_key' } };
		const wrapped = new Error('wrapped', { cause: apiError(400, 'not json', data) });
		expect(isPromptCacheParamsRejection(wrapped)).toBe(true);
	});

	it.each([
		['another 400', 400, { error: { message: "Unsupported parameter: 'temperature'." } }],
		[
			'a cache field without a rejection signal',
			400,
			{ error: { message: 'prompt_cache_key ok' } },
		],
		['an auth error that names the field', 401, { error: { param: 'prompt_cache_key' } }],
	])('ignores %s', (_name, status, body) => {
		expect(isPromptCacheParamsRejection(apiError(status, body))).toBe(false);
	});

	it('ignores errors without a status code', () => {
		expect(isPromptCacheParamsRejection(new Error("unsupported: ['prompt_cache_key']"))).toBe(
			false,
		);
	});
});

describe('toPromptCacheParamsError', () => {
	it('wraps a rejection and keeps the provider error as cause', () => {
		const original = apiError(400, { error: { param: 'prompt_cache_key', message: 'unknown' } });
		const mapped = toPromptCacheParamsError(original);
		expect(mapped).toBeInstanceOf(PromptCacheParamsError);
		expect((mapped as Error).cause).toBe(original);
		expect(toPromptCacheParamsError(mapped)).toBe(mapped);
	});

	it('returns any other error unchanged', () => {
		const original = apiError(400, { error: { message: 'bad' } });
		expect(toPromptCacheParamsError(original)).toBe(original);
	});
});
