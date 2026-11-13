import { hasErrorCode } from '../error-code';

describe('hasErrorCode', () => {
	it('finds the code on the error itself', () => {
		expect(hasErrorCode(Object.assign(new Error('x'), { code: 'a_code' }), 'a_code')).toBe(true);
	});

	it('finds the code in the provider payload', () => {
		const error = Object.assign(new Error('x'), {
			data: { type: 'error', error: { code: 'a_code' } },
		});
		expect(hasErrorCode(error, 'a_code')).toBe(true);
	});

	it('finds the code on a wrapped cause', () => {
		const cause = Object.assign(new Error('inner'), { code: 'a_code' });
		expect(hasErrorCode(new Error('outer', { cause }), 'a_code')).toBe(true);
	});

	it.each([
		undefined,
		null,
		'a_code',
		new Error('a_code'),
		Object.assign(new Error('x'), { code: 'other' }),
	])('ignores %p', (error) => {
		expect(hasErrorCode(error, 'a_code')).toBe(false);
	});
});
