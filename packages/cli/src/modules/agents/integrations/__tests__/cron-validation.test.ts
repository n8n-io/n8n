import { isValidCronExpression } from '../cron-validation';

describe('isValidCronExpression', () => {
	it.each(['0 9 * * *', '30 8 * * 1', '*/5 * * * *', '0 9 * * 1-5'])(
		'accepts %s, which both schedulers can run',
		(expression) => {
			expect(isValidCronExpression(expression)).toBe(true);
		},
	);

	it.each([
		['a nickname the durable scheduler cannot plan', '@daily'],
		['an impossible date', '0 9 30 2 *'],
		['a malformed expression', 'not a cron'],
		['an empty string', ''],
	])('rejects %s', (_name, expression) => {
		expect(isValidCronExpression(expression)).toBe(false);
	});
});
