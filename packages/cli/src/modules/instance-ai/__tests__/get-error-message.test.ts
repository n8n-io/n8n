import { UserError } from 'n8n-workflow';

import { getErrorMessage } from '../utils/get-error-message';

describe('getErrorMessage', () => {
	it('returns the message of an Error', () => {
		expect(getErrorMessage(new Error('boom'))).toBe('boom');
	});

	it('returns the message of an Error subclass', () => {
		expect(getErrorMessage(new UserError('bad input'))).toBe('bad input');
	});

	it.each([
		['a string', 'plain failure', 'plain failure'],
		['a number', 42, '42'],
		['null', null, 'null'],
		['undefined', undefined, 'undefined'],
		['an object', { code: 'ENOENT' }, '[object Object]'],
	])('stringifies %s', (_label, input, expected) => {
		expect(getErrorMessage(input)).toBe(expected);
	});
});
