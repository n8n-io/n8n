import { z } from 'zod';
import * as z4 from 'zod/v4';

import { JSON_SCHEMA_DRAFT_2020_12, zodToDraft202012 } from './index';

/** Keywords draft-07 defines that 2020-12 either renamed or dropped. */
const DRAFT_07_ONLY_KEYWORDS = ['additionalItems', 'definitions', 'dependencies'];

function keywordsIn(node: unknown, found = new Set<string>()): Set<string> {
	if (Array.isArray(node)) {
		for (const entry of node) keywordsIn(entry, found);
	} else if (typeof node === 'object' && node !== null) {
		for (const [key, value] of Object.entries(node)) {
			found.add(key);
			keywordsIn(value, found);
		}
	}
	return found;
}

describe('zodToDraft202012', () => {
	it('declares 2020-12 rather than draft-07', () => {
		const result = zodToDraft202012(z.object({ a: z.string() }));

		expect(result.$schema).toBe(JSON_SCHEMA_DRAFT_2020_12);
	});

	it('spells a tuple with a rest element as prefixItems plus items', () => {
		const result = zodToDraft202012(z.tuple([z.string(), z.number()]).rest(z.boolean()));

		expect(result).toMatchObject({
			type: 'array',
			prefixItems: [{ type: 'string' }, { type: 'number' }],
			items: { type: 'boolean' },
		});
		expect(result).not.toHaveProperty('additionalItems');
	});

	// `strict` inverts which objects are closed: it reads `unknownKeys !== 'strict'`,
	// so a plain `z.object` stays open. The MCP Server Trigger relies on that.
	it('forwards conversion options', () => {
		const shape = z.object({ a: z.string() });

		expect(zodToDraft202012(shape).additionalProperties).toBe(false);
		expect(
			zodToDraft202012(shape, { removeAdditionalStrategy: 'strict' }).additionalProperties,
		).toBe(true);
	});

	it('points a named schema at $defs', () => {
		const result = zodToDraft202012(z.object({ a: z.string() }), { name: 'Tool' });

		expect(result.$ref).toBe('#/$defs/Tool');
		expect(result.$defs).toHaveProperty('Tool');
	});

	it('repoints refs to a reused subschema', () => {
		const shared = z.object({ id: z.string() });
		const result = zodToDraft202012(z.object({ a: shared, b: shared }), {
			definitions: { Shared: shared },
		});

		expect(JSON.stringify(result)).not.toContain('#/definitions/');
		expect(result.$defs).toHaveProperty('Shared');
	});

	// Locks the output to the dialect zod v4 emits natively, so replacing this
	// function with `z.toJSONSchema(schema, { target: 'draft-2020-12' })` after the
	// zod v4 migration cannot change the dialect clients see.
	describe('parity with zod v4', () => {
		const ours = zodToDraft202012(
			z.object({
				text: z.string().describe('some text'),
				count: z.number().int().min(1),
				pair: z.tuple([z.string(), z.number()]).rest(z.boolean()),
				choice: z.union([z.literal('a'), z.literal('b')]),
				nested: z.object({ deep: z.tuple([z.string()]) }),
			}),
		);
		const native = z4.toJSONSchema(
			z4.object({
				text: z4.string().describe('some text'),
				count: z4.number().int().min(1),
				pair: z4.tuple([z4.string(), z4.number()]).rest(z4.boolean()),
				choice: z4.union([z4.literal('a'), z4.literal('b')]),
				nested: z4.object({ deep: z4.tuple([z4.string()]) }),
			}),
			{ target: 'draft-2020-12' },
		);

		it('declares the same dialect', () => {
			expect(ours.$schema).toBe(native.$schema);
		});

		it('declares the dialect first', () => {
			expect(Object.keys(ours)[0]).toBe('$schema');
			expect(Object.keys(native)[0]).toBe('$schema');
		});

		it.each([
			['ours', () => ours],
			['zod v4', () => native],
		])('uses no draft-07-only keyword (%s)', (_label, document) => {
			const used = keywordsIn(document());

			expect(DRAFT_07_ONLY_KEYWORDS.filter((keyword) => used.has(keyword))).toEqual([]);
		});

		it.each(['pair', 'nested'])('spells the %s tuple the same way', (property) => {
			const pick = (document: Record<string, unknown>) => {
				const properties = document.properties as Record<string, unknown>;
				return keywordsIn(properties[property]);
			};

			expect(pick(ours).has('prefixItems')).toBe(pick(native).has('prefixItems'));
		});
	});
});
