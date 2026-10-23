import { AsyncCaller } from '@langchain/core/utils/async_caller';
import { makeN8nLlmFailedAttemptHandler } from '@n8n/ai-utilities';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeApiError, OperationalError } from 'n8n-workflow';
import { RateLimitError } from 'openai';
import { mock } from 'vitest-mock-extended';

import { OAuth2SessionExpiredError } from '../../oauth2-token-provider';
import { makeDatabricksFailedAttemptHandler, wrapDatabricksErrorFetch } from '../error-handling';

const mockNode: INode = {
	id: '1',
	name: 'Databricks Chat Model',
	typeVersion: 1,
	type: '@n8n/n8n-nodes-langchain.lmChatDatabricks',
	position: [0, 0],
	parameters: {},
};

const handle = makeDatabricksFailedAttemptHandler(403, 'main.default.llama');

const RATE_LIMIT_HINT =
	"Databricks is throttling requests to this model service. Wait and retry, reduce concurrent requests, or ask your workspace admin to raise the endpoint's rate limit.";

/** Shaped like the OpenAI client's APIError for a rejected request. */
function apiError(status: number, message: string) {
	return Object.assign(new Error(message), { status });
}

const DATABRICKS_TEXT =
	'REQUEST_LIMIT_EXCEEDED: Exceeded workspace QPS rate limit for databricks-meta-llama-3-3-70b-instruct. Please use a provisioned throughput Foundation Model endpoint';

function databricksRateLimit(headers = new Headers()) {
	return new RateLimitError(
		429,
		{ message: DATABRICKS_TEXT, code: 'REQUEST_LIMIT_EXCEEDED' },
		undefined,
		headers,
	);
}

describe('makeDatabricksFailedAttemptHandler', () => {
	it('should ask the user to reconnect when the token was rejected', () => {
		expect(() => handle(apiError(403, '403 Invalid Token'))).toThrow(OperationalError);
		expect(() => handle(apiError(403, '403 Invalid Token'))).toThrow(/sign in again/i);
		expect(() => handle(apiError(403, '403 Invalid Token'))).not.toThrow(/rate limit/i);
	});

	it('should leave a permission failure alone', () => {
		// A Databricks 403 also covers "no access to this endpoint", which signing
		// in again would not fix
		expect(() =>
			handle(apiError(403, 'PERMISSION_DENIED: User lacks CAN QUERY on the endpoint')),
		).not.toThrow();
	});

	it('should not claim expiry for a rejection on a different status', () => {
		expect(() => handle(apiError(401, '401 Invalid Token'))).not.toThrow();
	});

	it('should recover a session error the model client wrapped as a connection failure', () => {
		const sessionExpired = new OAuth2SessionExpiredError(
			mockNode,
			'Databricks credential is not connected',
		);
		const wrapped = new Error('Connection error.', { cause: sessionExpired });

		expect(() => handle(wrapped)).toThrow(OAuth2SessionExpiredError);
	});

	it('should leave other errors alone', () => {
		expect(() => handle(new Error('socket hang up'))).not.toThrow();
		// The OpenAI handler's "Use Responses API" advice names an option this node
		// does not have, so its 404 branch must stay out of the Databricks path
		expect(() =>
			handle(
				Object.assign(new Error('x is not a chat model'), {
					status: 404,
					type: 'invalid_request_error',
					param: 'model',
				}),
			),
		).not.toThrow();
	});

	it('should honour a non-Databricks expiry status', () => {
		expect(() =>
			makeDatabricksFailedAttemptHandler(
				401,
				'main.default.llama',
			)(apiError(401, '401 Invalid Token')),
		).toThrow(OperationalError);
	});

	it('should name Databricks and keep its message when the endpoint is rate limited', () => {
		const rateLimited = databricksRateLimit();

		expect(() => handle(rateLimited)).not.toThrow();
		expect(rateLimited).toMatchObject({
			message: `Databricks rate limit reached for main.default.llama: ${DATABRICKS_TEXT}`,
			description: RATE_LIMIT_HINT,
		});
		expect(rateLimited.message).not.toMatch(/OpenAI/);
		expect(rateLimited).not.toHaveProperty('retryAfterMs');
	});

	it('should still explain a rate limit when the response has no body', () => {
		const rateLimited = apiError(429, '429 status code (no body)');

		expect(() => handle(rateLimited)).not.toThrow();
		expect(rateLimited).toMatchObject({
			message: 'Databricks rate limit reached for main.default.llama',
			description: RATE_LIMIT_HINT,
		});
		expect(rateLimited).not.toHaveProperty('retryAfterMs');
	});

	describe('through the n8n handler chain', () => {
		const ctx = mock<ISupplyDataFunctions>({ getNode: () => mockNode });
		const caller = () =>
			new AsyncCaller({
				maxRetries: 2,
				onFailedAttempt: makeN8nLlmFailedAttemptHandler(ctx, handle),
			});

		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should retry a rate limit and succeed', async () => {
			const callable = vi
				.fn()
				.mockRejectedValueOnce(databricksRateLimit())
				.mockRejectedValueOnce(databricksRateLimit())
				.mockResolvedValueOnce('ok');

			const pending = caller().call(callable);
			await vi.runAllTimersAsync();

			await expect(pending).resolves.toBe('ok');
			expect(callable).toHaveBeenCalledTimes(3);
		});

		it('should surface the decorated rate limit error once retries are spent', async () => {
			const rateLimited = databricksRateLimit();
			const callable = vi.fn().mockRejectedValue(rateLimited);

			const pending = caller().call(callable);
			const result = expect(pending).rejects.toBe(rateLimited);
			await vi.runAllTimersAsync();

			await result;
			expect(callable).toHaveBeenCalledTimes(3);
			expect(rateLimited).not.toBeInstanceOf(NodeApiError);
			expect(rateLimited.message).toBe(
				`Databricks rate limit reached for main.default.llama: ${DATABRICKS_TEXT}`,
			);
			expect(rateLimited).toHaveProperty('description', RATE_LIMIT_HINT);
		});

		it('should fail at once with the Databricks text when Retry-After is over a minute', async () => {
			const callable = vi
				.fn()
				.mockRejectedValue(databricksRateLimit(new Headers({ 'retry-after': '120' })));

			const pending = caller().call(callable);
			const result = expect(pending).rejects.toMatchObject({
				messages: [`Databricks rate limit reached for main.default.llama: ${DATABRICKS_TEXT}`],
				description: RATE_LIMIT_HINT,
				httpCode: '429',
			});
			await vi.runAllTimersAsync();

			await result;
			await expect(pending).rejects.toBeInstanceOf(NodeApiError);
			expect(callable).toHaveBeenCalledTimes(1);
		});
	});

	it('should not tell a service principal to sign in again', () => {
		// A service principal has no sign-in session to reconnect, so it keeps the
		// generic "check your credentials" advice
		const handleWithoutRefresh = makeDatabricksFailedAttemptHandler(
			undefined,
			'main.default.llama',
		);

		expect(() => handleWithoutRefresh(apiError(403, '403 Invalid Token'))).not.toThrow();
	});
});

describe('wrapDatabricksErrorFetch', () => {
	const url = 'https://example.databricks.net/ai-gateway/openai/v1/chat/completions';

	it('should reshape a Databricks error body into the OpenAI error shape', async () => {
		const message =
			'PERMISSION_DENIED: The endpoint is temporarily disabled due to a Databricks-set rate limit of 0.';
		const wrapped = wrapDatabricksErrorFetch(
			async () =>
				new Response(JSON.stringify({ error_code: 'PERMISSION_DENIED', message }), {
					status: 403,
				}),
		);

		const response = await wrapped(url);

		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({
			error: { message, code: 'PERMISSION_DENIED' },
		});
	});

	it('should pass a success response through untouched', async () => {
		const body = JSON.stringify({ choices: [] });
		const wrapped = wrapDatabricksErrorFetch(async () => new Response(body, { status: 200 }));

		const response = await wrapped(url);

		expect(await response.text()).toBe(body);
	});

	it('should leave an already OpenAI-shaped error and a non-JSON body alone', async () => {
		const openAiBody = JSON.stringify({ error: { message: 'Rate limit reached' } });
		const shaped = wrapDatabricksErrorFetch(async () => new Response(openAiBody, { status: 429 }));
		expect(await (await shaped(url)).text()).toBe(openAiBody);

		const html = wrapDatabricksErrorFetch(
			async () => new Response('<html>gateway timeout</html>', { status: 504 }),
		);
		expect(await (await html(url)).text()).toBe('<html>gateway timeout</html>');
	});
});
