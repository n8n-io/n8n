import { describe, expect, it } from 'vitest';

import {
	coalesce,
	compileExpression,
	compileParameterTree,
	expr,
	field,
	input,
	literal,
	referencedStepsInTree,
	template,
} from '../expressions/expression';

const names: Record<string, string> = { webhook: 'Webhook', hubspot: 'Upsert Contact' };
const resolve = (id: string) => names[id];

describe('compileExpression', () => {
	it('returns literals unchanged', () => {
		expect(compileExpression(literal(42), resolve)).toBe(42);
		expect(compileExpression(literal('text'), resolve)).toBe('text');
	});

	it('compiles field references to node lookups', () => {
		expect(compileExpression(field('webhook', 'body', 'email'), resolve)).toBe(
			'={{ $("Webhook").item.json.body.email }}',
		);
	});

	it('uses bracket notation for unsafe path segments', () => {
		expect(compileExpression(field('webhook', 'body', 'first-name'), resolve)).toBe(
			'={{ $("Webhook").item.json.body["first-name"] }}',
		);
	});

	it('compiles input references and coalesce', () => {
		expect(compileExpression(input('email'), resolve)).toBe('={{ $json.email }}');
		expect(compileExpression(coalesce(input('a'), literal('b')), resolve)).toBe(
			'={{ ($json.a) ?? ("b") }}',
		);
	});

	it('compiles templates to inline interpolation', () => {
		expect(compileExpression(template('New lead: ', field('hubspot', 'vid'), '!'), resolve)).toBe(
			'=New lead: {{ $("Upsert Contact").item.json.vid }}!',
		);
	});

	it('throws on unknown step references', () => {
		expect(() => compileExpression(field('missing', 'x'), resolve)).toThrow(
			/unknown step "missing"/,
		);
	});
});

describe('compileParameterTree', () => {
	it('compiles nested expression wrappers and leaves plain JSON alone', () => {
		const tree = {
			text: expr(template('Hi ', input('name'))),
			nested: { list: [expr(field('webhook', 'body')), 'plain', 3] },
			options: {},
		};
		expect(compileParameterTree(tree, resolve)).toEqual({
			text: '=Hi {{ $json.name }}',
			nested: { list: ['={{ $("Webhook").item.json.body }}', 'plain', 3] },
			options: {},
		});
	});

	it('collects referenced steps', () => {
		expect([
			...referencedStepsInTree({ a: expr(field('webhook', 'x')), b: [expr(field('hubspot'))] }),
		]).toEqual(['webhook', 'hubspot']);
	});
});
