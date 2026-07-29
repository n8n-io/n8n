import {
	buildHttpProviderErrorContext,
	buildFailureSummaryLogContext,
} from '../secrets-provider-errors';

describe('buildHttpProviderErrorContext', () => {
	it('extracts statusCode without duplicating it in errorCode', () => {
		const error = Object.assign(new Error('Request failed'), {
			response: { status: 403 },
		});

		expect(buildHttpProviderErrorContext(error)).toEqual({
			statusCode: 403,
		});
	});

	it('extracts transport and SDK codes', () => {
		const error = Object.assign(new Error('Forbidden'), {
			response: { status: 403 },
			code: 'FORBIDDEN',
		});

		expect(buildHttpProviderErrorContext(error)).toEqual({
			statusCode: 403,
			errorCode: 'FORBIDDEN',
		});
	});
});

describe('buildFailureSummaryLogContext', () => {
	it('returns null when there are no failures', () => {
		expect(buildFailureSummaryLogContext([])).toBeNull();
	});

	it('summarizes failures with capped sample names', () => {
		expect(
			buildFailureSummaryLogContext([
				{ name: 'secret-a', errorCode: 5 },
				{ name: 'secret-b', errorCode: 5 },
				{ name: 'secret-c', errorCode: 7 },
			]),
		).toEqual({
			failedCount: 3,
			errorCodes: { '5': 2, '7': 1 },
			sampleSecretNames: ['secret-a', 'secret-b', 'secret-c'],
		});
	});
});
