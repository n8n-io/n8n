import { APICallError } from 'ai';

import { classifyGatewayError } from '../gateway-error-classifier';

function apiError({
	statusCode,
	message,
	body,
}: {
	statusCode?: number;
	message?: string;
	body?: string;
}): APICallError {
	return new APICallError({
		message: message ?? 'Request failed',
		url: 'https://gateway.example/v1/responses',
		requestBodyValues: {},
		...(statusCode !== undefined ? { statusCode } : {}),
		...(body !== undefined ? { responseBody: body } : {}),
	});
}

describe('classifyGatewayError', () => {
	it('maps a 402 with the depleted signature in the body to budget.credits', () => {
		const error = apiError({
			statusCode: 402,
			body: '{"error":"Your Gateway credits have been depleted"}',
		});

		expect(classifyGatewayError(error)).toEqual({ code: 'budget.credits' });
	});

	it('maps a 402 with the depleted signature only in the message', () => {
		const error = apiError({ statusCode: 402, message: 'Your Gateway credits have been depleted' });

		expect(classifyGatewayError(error)).toEqual({ code: 'budget.credits' });
	});

	it('ignores a 402 without the depleted signature', () => {
		const error = apiError({ statusCode: 402, body: '{"error":"Payment required"}' });

		expect(classifyGatewayError(error)).toBeUndefined();
	});

	it.each([401, 429, 500])('ignores status %s even with a depleted message', (statusCode) => {
		const error = apiError({ statusCode, body: 'Your Gateway credits have been depleted' });

		expect(classifyGatewayError(error)).toBeUndefined();
	});

	it('ignores a 402 with no status code on the error', () => {
		const error = apiError({ body: 'Your Gateway credits have been depleted' });

		expect(classifyGatewayError(error)).toBeUndefined();
	});

	it('ignores non-API errors, even with a depleted message', () => {
		expect(
			classifyGatewayError(new Error('Your Gateway credits have been depleted')),
		).toBeUndefined();
		expect(classifyGatewayError('depleted')).toBeUndefined();
		expect(classifyGatewayError(undefined)).toBeUndefined();
	});
});
