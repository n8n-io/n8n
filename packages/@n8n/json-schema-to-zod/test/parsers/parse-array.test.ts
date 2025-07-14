import { z } from 'zod';

import { parseArray } from '../../src/parsers/parse-array';

describe('parseArray', () => {
	test('should create tuple with items array', () => {
		expect(
			parseArray(
				{
					type: 'array',
					items: [
						{
							type: 'string',
						},
						{
							type: 'number',
						},
					],
				},
				{ path: [], seen: new Map() },
			),
		).toMatchZod(z.tuple([z.string(), z.number()]));
	});

	test('should create array with items object', () => {
		expect(
			parseArray(
				{
					type: 'array',
					items: {
						type: 'string',
					},
				},
				{ path: [], seen: new Map() },
			),
		).toMatchZod(z.array(z.string()));
	});

	test('should create min for minItems', () => {
		expect(
			parseArray(
				{
					type: 'array',
					minItems: 2,
					items: {
						type: 'string',
					},
				},
				{ path: [], seen: new Map() },
			),
		).toMatchZod(z.array(z.string()).min(2));
	});

	test('should create max for maxItems', () => {
		expect(
			parseArray(
				{
					type: 'array',
					maxItems: 2,
					items: {
						type: 'string',
					},
				},
				{ path: [], seen: new Map() },
			),
		).toMatchZod(z.array(z.string()).max(2));
	});
});
