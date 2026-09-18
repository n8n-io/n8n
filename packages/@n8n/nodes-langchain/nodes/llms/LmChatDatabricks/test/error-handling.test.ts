import type { INode } from 'n8n-workflow';
import { OperationalError } from 'n8n-workflow';
import { RateLimitError } from 'openai';

import { OAuth2SessionExpiredError } from '../../../../utils/oauth2-token-provider';
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
		const databricksText =
			'REQUEST_LIMIT_EXCEEDED: Exceeded workspace QPS rate limit for databricks-meta-llama-3-3-70b-instruct. Please use a provisioned throughput Foundation Model endpoint';
		const rateLimited = new RateLimitError(
			429,
			{ message: databricksText, code: 'REQUEST_LIMIT_EXCEEDED' },
			undefined,
			new Headers(),
		);

		expect(() => handle(rateLimited)).toThrow(OperationalError);
		expect(() => handle(rateLimited)).toThrow(
			expect.objectContaining({
				message: `Databricks rate limit reached for main.default.llama: ${databricksText}`,
				description: RATE_LIMIT_HINT,
				cause: rateLimited,
			}),
		);
		expect(() => handle(rateLimited)).not.toThrow(/OpenAI/);
	});

	it('should still explain a rate limit when the response has no body', () => {
		const rateLimited = apiError(429, '429 status code (no body)');

		expect(() => handle(rateLimited)).toThrow(
			expect.objectContaining({
				message: 'Databricks rate limit reached for main.default.llama',
				description: RATE_LIMIT_HINT,
			}),
		);
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
