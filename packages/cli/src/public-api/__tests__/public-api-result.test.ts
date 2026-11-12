import { toPublicApiResult } from '@/public-api/public-api-result';

describe('toPublicApiResult', () => {
	it.each([
		[200, '2xx'],
		[201, '2xx'],
		[204, '2xx'],
		[304, '2xx'],
		[400, '4xx'],
		[401, '4xx'],
		[403, '4xx'],
		[404, '4xx'],
		[429, '4xx'],
		[500, '5xx'],
		[503, '5xx'],
	])('classifies status %i as %s', (statusCode, expectedResult) => {
		expect(toPublicApiResult(statusCode)).toBe(expectedResult);
	});
});
