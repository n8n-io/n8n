import { z } from 'zod';

import { parseString } from '../../src/parsers/parse-string';

describe('parseString', () => {
	const run = (schema: z.ZodString, data: unknown) => schema.safeParse(data);

	test('DateTime format', () => {
		const datetime = '2018-11-13T20:20:39Z';

		const code = parseString({
			type: 'string',
			format: 'date-time',
			errorMessage: { format: 'hello' },
		});

		expect(code).toMatchZod(z.iso.datetime({ offset: true, error: 'hello' }));

		expect(run(code, datetime)).toEqual({ success: true, data: datetime });
	});

	test('email', () => {
		expect(
			parseString({
				type: 'string',
				format: 'email',
			}),
		).toMatchZod(z.email());
	});

	test('ip', () => {
		expect(
			parseString({
				type: 'string',
				format: 'ip',
			}),
		).toMatchZod(z.union([z.ipv4(), z.ipv6()]));

		expect(
			parseString({
				type: 'string',
				format: 'ipv6',
			}),
		).toMatchZod(z.ipv6());
	});

	test('uri', () => {
		expect(
			parseString({
				type: 'string',
				format: 'uri',
			}),
		).toMatchZod(z.url());
	});

	test('uuid', () => {
		expect(
			parseString({
				type: 'string',
				format: 'uuid',
			}),
		).toMatchZod(z.uuid());
	});

	test('time', () => {
		expect(
			parseString({
				type: 'string',
				format: 'time',
			}),
		).toMatchZod(z.iso.time());
	});

	test('date', () => {
		expect(
			parseString({
				type: 'string',
				format: 'date',
			}),
		).toMatchZod(z.iso.date());
	});

	test('duration', () => {
		expect(
			parseString({
				type: 'string',
				format: 'duration',
			}),
		).toMatchZod(z.iso.duration());
	});

	test('base64', () => {
		expect(
			parseString({
				type: 'string',
				contentEncoding: 'base64',
			}),
		).toMatchZod(z.base64());

		expect(
			parseString({
				type: 'string',
				contentEncoding: 'base64',
				errorMessage: {
					contentEncoding: 'x',
				},
			}),
		).toMatchZod(z.base64('x'));

		expect(
			parseString({
				type: 'string',
				format: 'binary',
			}),
		).toMatchZod(z.base64());

		expect(
			parseString({
				type: 'string',
				format: 'binary',
				errorMessage: {
					format: 'x',
				},
			}),
		).toMatchZod(z.base64('x'));
	});

	test('should accept errorMessage', () => {
		expect(
			parseString({
				type: 'string',
				format: 'ipv4',
				pattern: 'x',
				minLength: 1,
				maxLength: 2,
				errorMessage: {
					format: 'ayy',
					pattern: 'lmao',
					minLength: 'deez',
					maxLength: 'nuts',
				},
			}),
		).toMatchZod(z.ipv4().regex(new RegExp('x'), 'lmao').min(1, 'deez').max(2, 'nuts'));
	});
});
