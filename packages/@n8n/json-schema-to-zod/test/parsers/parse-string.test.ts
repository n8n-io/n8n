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

		expect(code).toMatchZod(z.string().datetime({ offset: true, message: 'hello' }));

		expect(run(code, datetime)).toEqual({ success: true, data: datetime });
	});

	test('email', () => {
		expect(
			parseString({
				type: 'string',
				format: 'email',
			}),
		).toMatchZod(z.string().email());
	});

	test('ip', () => {
		expect(
			parseString({
				type: 'string',
				format: 'ip',
			}),
		).toMatchZod(z.string().ip());

		expect(
			parseString({
				type: 'string',
				format: 'ipv6',
			}),
		).toMatchZod(z.string().ip({ version: 'v6' }));
	});

	test('uri', () => {
		expect(
			parseString({
				type: 'string',
				format: 'uri',
			}),
		).toMatchZod(z.string().url());
	});

	test('uuid', () => {
		expect(
			parseString({
				type: 'string',
				format: 'uuid',
			}),
		).toMatchZod(z.string().uuid());
	});

	test('time', () => {
		expect(
			parseString({
				type: 'string',
				format: 'time',
			}),
		).toMatchZod(z.string().time());
	});

	test('date', () => {
		expect(
			parseString({
				type: 'string',
				format: 'date',
			}),
		).toMatchZod(z.string().date());
	});

	test('duration', () => {
		expect(
			parseString({
				type: 'string',
				format: 'duration',
			}),
		).toMatchZod(z.string().duration());
	});

	test('base64', () => {
		expect(
			parseString({
				type: 'string',
				contentEncoding: 'base64',
			}),
		).toMatchZod(z.string().base64());

		expect(
			parseString({
				type: 'string',
				contentEncoding: 'base64',
				errorMessage: {
					contentEncoding: 'x',
				},
			}),
		).toMatchZod(z.string().base64('x'));

		expect(
			parseString({
				type: 'string',
				format: 'binary',
			}),
		).toMatchZod(z.string().base64());

		expect(
			parseString({
				type: 'string',
				format: 'binary',
				errorMessage: {
					format: 'x',
				},
			}),
		).toMatchZod(z.string().base64('x'));
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
		).toMatchZod(
			z
				.string()
				.ip({ version: 'v4', message: 'ayy' })
				.regex(new RegExp('x'), 'lmao')
				.min(1, 'deez')
				.max(2, 'nuts'),
		);
	});
});
