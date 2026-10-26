import fc from 'fast-check';

import { sanitizeErrorDetail } from './sanitize-error-detail';

const chars = (alphabet: string, minLength: number, maxLength: number) =>
	fc.stringOf(fc.constantFrom(...alphabet), { minLength, maxLength });

const pathArb = chars('abcdefghijklmnopqrstuvwxyz0123456789/._-', 1, 20);
// Query text may contain either quote character, `&`, `=`, `%`, `:` and `/`.
const queryArb = chars('abcdefghijklmnopqrstuvwxyz0123456789=&%+-_.:/\'"', 0, 30);
const wrapperArb = fc.constantFrom(['', ''], ['"', '"'], ["'", "'"], ['<', '>'], ['(', ')']);

describe('sanitizeErrorDetail properties', () => {
	it('strips the whole query wherever the URL sits and keeps the text after it', () => {
		fc.assert(
			fc.property(pathArb, queryArb, wrapperArb, (path, query, [open, close]) => {
				// A quoted URL cannot contain its own delimiter unescaped.
				fc.pre(open === '' || !query.includes(open));
				const url = `https://api.example.com/${path}`;
				const input = `request to ${open}${url}?sig=ZSECRET7&${query}${close} failed ZTAIL`;
				const out = sanitizeErrorDetail(input, Infinity);
				return (
					!out.includes('ZSECRET7') &&
					!out.includes(`${url}?`) &&
					out.includes(url) &&
					out.includes('ZTAIL')
				);
			}),
		);
	});
});
