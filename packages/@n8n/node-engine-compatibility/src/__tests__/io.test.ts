import type { INodeExecutionData } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { fromStepInputs, toStepOutputs } from '../io';

describe('fromStepInputs', () => {
	it('passes through well-formed items', () => {
		const inputs = [[{ json: { a: 1 } }, { json: { a: 2 } }], [{ json: { b: 1 } }]];
		const result = fromStepInputs(inputs);
		expect(result).toHaveLength(2);
		expect(result[0]).toHaveLength(2);
		expect(result[0][0].json).toEqual({ a: 1 });
		expect(result[1][0].json).toEqual({ b: 1 });
	});

	it('wraps bare objects as `{ json: ... }`', () => {
		const result = fromStepInputs([[{ a: 1 }]]);
		expect(result[0][0]).toEqual({ json: { a: 1 } });
	});

	it('wraps primitives as `{ json: { value: ... } }`', () => {
		const result = fromStepInputs([[42]]);
		expect(result[0][0]).toEqual({ json: { value: 42 } });
	});

	it.each([
		['null', null],
		['a string', 'str'],
		['an array', [1, 2]],
	])('re-wraps items whose `json` is %s', (_label, json) => {
		expect(fromStepInputs([[{ json }]])).toEqual([[{ json: { json } }]]);
	});

	it('yields an empty item list for a null (unfilled) slot', () => {
		// v1 coerces inputs that never received data to [] — same rule here
		expect(fromStepInputs([null])).toEqual([[]]);
	});

	it('wraps a bare object slot as a single item (trigger payload shape)', () => {
		expect(fromStepInputs([{ name: 'ada' }])).toEqual([[{ json: { name: 'ada' } }]]);
	});

	it('yields an empty item list for a slot not carrying items', () => {
		expect(fromStepInputs(['nope'])).toEqual([[]]);
	});
});

describe('toStepOutputs', () => {
	it('survives a JSON round-trip', () => {
		const outputs: INodeExecutionData[][] = [[{ json: { x: 1 } }], []];
		const payload = toStepOutputs(outputs);
		expect(payload).toEqual(outputs);

		// eslint-disable-next-line n8n-local-rules/no-json-parse-json-stringify
		expect(JSON.parse(JSON.stringify(payload))).toEqual(outputs);
	});
});
