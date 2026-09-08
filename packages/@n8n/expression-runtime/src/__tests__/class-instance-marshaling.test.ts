import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { IsolatedVmBridge } from '../bridge/isolated-vm-bridge';
import { ExpressionEvaluator } from '../evaluator/expression-evaluator';

/**
 * Only `Object.keys` crosses the isolate boundary, so a class instance in
 * workflow data used to arrive as a plain shape and lose the `toString` that
 * carried its meaning. `Date` was already passed through whole for the same
 * reason; these cover the classes the runtime cannot know by name, such as a
 * BSON `ObjectId` in a MongoDB node's `_id`.
 */
describe('class instances in workflow data', () => {
	let evaluator: ExpressionEvaluator;
	const caller = {};

	beforeAll(async () => {
		evaluator = new ExpressionEvaluator({
			createBridge: () => new IsolatedVmBridge({ timeout: 5000 }),
			maxCodeCacheSize: 1024,
		});
		await evaluator.initialize();
		await evaluator.acquire(caller);
	});

	afterAll(async () => {
		await evaluator.release(caller);
		await evaluator.dispose();
	});

	/** Shaped like a BSON ObjectId: the hex lives behind `toString`. */
	class ObjectIdLike {
		constructor(private readonly hex: string) {}
		toString() {
			return this.hex;
		}
	}

	const HEX = '507f1f77bcf86cd799439011';

	it('keeps an overridden toString at the top level', () => {
		const data = { $json: { _id: new ObjectIdLike(HEX) } };

		expect(evaluator.evaluate('{{ $json._id.toString() }}', data, caller)).toBe(HEX);
	});

	it('keeps it under string coercion', () => {
		const data = { $json: { _id: new ObjectIdLike(HEX) } };

		expect(evaluator.evaluate('{{ "id=" + $json._id }}', data, caller)).toBe(`id=${HEX}`);
	});

	it('keeps it when nested', () => {
		const data = { $json: { row: { _id: new ObjectIdLike(HEX) } } };

		expect(evaluator.evaluate('{{ $json.row._id.toString() }}', data, caller)).toBe(HEX);
	});

	it('keeps it inside an array', () => {
		const data = { $json: { ids: [new ObjectIdLike(HEX)] } };

		expect(evaluator.evaluate('{{ $json.ids[0].toString() }}', data, caller)).toBe(HEX);
	});

	it('leaves a plain object on native Object.prototype.toString', () => {
		const data = { $json: { o: { a: 1 } } };

		expect(evaluator.evaluate('{{ $json.o.toString() }}', data, caller)).toBe('[object Object]');
	});

	it('leaves an array on Array.prototype.toString', () => {
		const data = { $json: { a: [1, 2, 3] } };

		expect(evaluator.evaluate('{{ $json.a.toString() }}', data, caller)).toBe('1,2,3');
	});

	it('leaves Date marshaling alone', () => {
		const data = { $json: { d: new Date('2026-06-30T20:34:04.498Z') } };

		expect(evaluator.evaluate('{{ $json.d.toISOString() }}', data, caller)).toBe(
			'2026-06-30T20:34:04.498Z',
		);
	});

	it('treats a throwing toString as absent instead of failing the expression', () => {
		class Unstringable {
			toString(): string {
				throw new Error('boom');
			}
		}
		const data = { $json: { b: new Unstringable() } };

		// Asserting on `toString()` rather than a sibling field is deliberate: a
		// sibling read yields `undefined` whether or not the host swallows the
		// throw, so it cannot fail if the guard is removed. Here the two outcomes
		// differ — with the guard the string form is absent and the proxy falls
		// back to `Object.prototype.toString`; without it the marshaled value
		// errors and the expression yields `undefined`.
		expect(evaluator.evaluate('{{ $json.b.toString() }}', data, caller)).toBe('[object Object]');
	});

	it('keeps it when the value is a top-level context key', () => {
		const data = { $json: new ObjectIdLike(HEX) as unknown as Record<string, unknown> };

		expect(evaluator.evaluate('{{ $json.toString() }}', data, caller)).toBe(HEX);
		expect(evaluator.evaluate('{{ "v=" + $json }}', data, caller)).toBe(`v=${HEX}`);
	});
});
