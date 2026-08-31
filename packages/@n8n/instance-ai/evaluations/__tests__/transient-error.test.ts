import {
	extractErrorMessage,
	findProviderOutage,
	isRequestAbort,
	isServerBudgetStop,
	isTransientNetworkError,
	isTransientProviderError,
	MAX_EXEC_ATTEMPTS,
	providerRetryBackoffMs,
} from '../harness/transient-error';

describe('transient-error', () => {
	describe('extractErrorMessage', () => {
		it('folds an Error cause into the message when it adds detail', () => {
			// undici surfaces network failures as `TypeError: fetch failed` with the
			// real reason on `.cause`.
			const error = new TypeError('fetch failed', {
				cause: new Error('Headers Timeout Error'),
			});
			expect(extractErrorMessage(error)).toBe('fetch failed: Headers Timeout Error');
		});

		it('folds a string cause into the message', () => {
			const error = new Error('request failed', { cause: 'ECONNRESET' });
			expect(extractErrorMessage(error)).toBe('request failed: ECONNRESET');
		});

		it('returns the base message when there is no cause', () => {
			expect(extractErrorMessage(new Error('boom'))).toBe('boom');
		});

		it('does not duplicate when cause message equals base message', () => {
			const error = new Error('same', { cause: new Error('same') });
			expect(extractErrorMessage(error)).toBe('same');
		});

		it('stringifies non-Error throwables', () => {
			expect(extractErrorMessage('plain string')).toBe('plain string');
		});
	});

	describe('isTransientNetworkError', () => {
		it.each([
			'fetch failed',
			'fetch failed: Headers Timeout Error',
			'connect ECONNREFUSED 127.0.0.1:5678',
			'read ECONNRESET',
			'request to http://localhost timed out ETIMEDOUT',
			'getaddrinfo EAI_AGAIN localhost',
			'socket hang up',
		])('classifies %j as transient', (message) => {
			expect(isTransientNetworkError(message)).toBe(true);
		});

		it.each([
			'Sheet with ID __evalMockResource not found',
			'response.content.filter is not a function',
			'No trigger or start node found in the workflow',
		])('does not classify builder/mock failure %j as transient', (message) => {
			expect(isTransientNetworkError(message)).toBe(false);
		});
	});

	describe('isRequestAbort', () => {
		it('recognises the client abort message', () => {
			expect(isRequestAbort('The operation was aborted due to timeout')).toBe(true);
		});

		it.each([
			// The chat loop's own budget overrun — the agent was slow, the lane is fine.
			'Run timed out after 900000ms',
			// A node's timeout quoted in a build error must not evict the lane.
			'Tool errors: HTTP Request failed with TimeoutError',
		])('leaves %j to the lane health probe', (message) => {
			expect(isRequestAbort(message)).toBe(false);
		});
	});

	describe('isServerBudgetStop', () => {
		it('recognises the in-band error the server returns when it stops a run', () => {
			expect(isServerBudgetStop(['Execution exceeded its 895s eval budget and was stopped'])).toBe(
				true,
			);
		});

		it.each([[undefined], [[]], [['Sheet with ID __evalMockResource not found']]])(
			'leaves ordinary execution failures alone (%j)',
			(errors) => {
				expect(isServerBudgetStop(errors)).toBe(false);
			},
		);
	});

	it('caps retries at a small positive number', () => {
		expect(MAX_EXEC_ATTEMPTS).toBeGreaterThan(1);
		expect(MAX_EXEC_ATTEMPTS).toBeLessThanOrEqual(5);
	});

	describe('isTransientProviderError', () => {
		it.each([
			// The exact shape nightly sweep #57 recorded 124 times (TRUST-374).
			'Agent error: Internal server error; No output generated. Check the stream for errors.',
			'Agent error: Overloaded',
			'Agent error: provider returned status code 529',
			'AI_APICallError: Internal server error',
			'AI_RetryError: failed after 3 attempts',
			'{"type":"overloaded_error","message":"Overloaded"}',
		])('classifies %j as a provider outage', (message) => {
			expect(isTransientProviderError(message)).toBe(true);
		});

		it.each([
			// The built workflow's own (mocked) HTTP traffic — a product signal.
			'Tool errors: Stripe API returned HTTP 500',
			'Tool errors: Internal server error',
			// n8n's own API, not the model provider.
			'n8n API POST /rest/workflows failed (500): Internal error',
			'Agent response: I could not find a suitable node',
			'No workflow produced — no error details captured',
		])('does not classify %j as a provider outage', (message) => {
			expect(isTransientProviderError(message)).toBe(false);
		});
	});

	describe('findProviderOutage', () => {
		const errorEvent = (payload: Record<string, unknown>) => ({
			type: 'error',
			data: { type: 'error', payload },
		});

		it('reads the ai-sdk status code off a run-level error event', () => {
			expect(
				findProviderOutage({
					success: false,
					error: 'Agent error: something opaque',
					events: [errorEvent({ content: 'Internal server error', statusCode: 529 })],
				}),
			).toBe('provider HTTP 529: Internal server error');
		});

		it('ignores a tool-error carrying a provider-shaped status', () => {
			// The workflow calling a mocked API that 500s is the product failing.
			expect(
				findProviderOutage({
					success: false,
					error: 'Tool errors: upstream returned 503',
					events: [
						{ type: 'tool-error', data: { payload: { error: 'HTTP 503', statusCode: 503 } } },
					],
				}),
			).toBeUndefined();
		});

		it('ignores a non-transient status on a run-level error event', () => {
			expect(
				findProviderOutage({
					success: false,
					error: 'Agent error: quota exhausted',
					events: [errorEvent({ content: 'Have reached end of quota', statusCode: 403 })],
				}),
			).toBeUndefined();
		});

		it('falls back to the flattened error text when no events were captured', () => {
			const error =
				'Agent error: Internal server error; No output generated. Check the stream for errors.';
			expect(findProviderOutage({ success: false, error })).toBe(error);
		});

		it('never reports an outage for a successful build', () => {
			expect(
				findProviderOutage({
					success: true,
					events: [errorEvent({ content: 'Overloaded', statusCode: 529 })],
				}),
			).toBeUndefined();
		});
	});

	it('waits long enough between build retries for a provider blip to clear', () => {
		// A delay BETWEEN attempts, not a cap on build duration: instant retries
		// re-hit the same upstream and let the run queue drain.
		expect(providerRetryBackoffMs(1)).toBeGreaterThanOrEqual(30_000);
		expect(providerRetryBackoffMs(2)).toBeGreaterThan(providerRetryBackoffMs(1));
	});

	// TRUST-374: the MCP path composes its error as
	// `MCP build produced no workflow (<subtype>: <session result>)`. The provider
	// evidence is inside that string, so classification must survive the wrapper.
	describe('MCP build failures', () => {
		const mcpBuild = (reason: string) => ({
			success: false,
			error: `MCP build produced no workflow (${reason})`,
		});

		it('classifies a provider outage reported through the MCP wrapper', () => {
			expect(
				findProviderOutage(
					mcpBuild('error_during_execution: AI_APICallError: Overloaded (HTTP 529)'),
				),
			).toBeDefined();
		});

		it('leaves an ordinary MCP build failure attributed to the builder', () => {
			expect(
				findProviderOutage(mcpBuild('no-stdout: built something, forgot the id')),
			).toBeUndefined();
			expect(findProviderOutage(mcpBuild('timeout'))).toBeUndefined();
		});
	});
});
