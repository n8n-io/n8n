import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { ExpressionEvaluator } from '../evaluator/expression-evaluator';
import { toAscii } from '../extensions/to-ascii';
import { TO_ASCII_CHARMAP_HOST_FUNCTION } from '../runtime/host-function-names';
import { createBridge, engineName } from './test-bridge';

describe(`replaceSpecialChars with the host character map (${engineName})`, () => {
	let evaluator: ExpressionEvaluator;
	const caller = {};

	beforeAll(async () => {
		evaluator = new ExpressionEvaluator({ createBridge, maxCodeCacheSize: 64 });
		await evaluator.initialize();
		await evaluator.acquire(caller);
	});

	afterAll(async () => {
		await evaluator.release(caller);
		await evaluator.dispose();
	});

	it.each(['déjà vu', 'Ünïcödé ß Æ', '北京', 'Привет', 'snow ☃ man', 'plain ascii', ''])(
		'should give the host result for %j',
		(text) => {
			const result = evaluator.evaluate(
				'{{ extend($json.text, "replaceSpecialChars", []) }}',
				{ $json: { text } },
				caller,
			);

			expect(result).toBe(toAscii(text));
		},
	);

	it('should replace accented characters', () => {
		const result = evaluator.evaluate(
			'{{ extend("déjà", "replaceSpecialChars", []) }}',
			{},
			caller,
		);

		expect(result).toBe('deja');
	});

	it('should not leave the host function on the global object', async () => {
		const bridge = createBridge();
		await bridge.initialize();

		// Raw bridge code sees the guest global. An expression sees an empty `globalThis`.
		const result = bridge.execute(`return typeof ${TO_ASCII_CHARMAP_HOST_FUNCTION}`, {});

		expect(result).toBe('undefined');

		await bridge.dispose();
	});

	it('should work on a bridge that starts synchronously', async () => {
		const lazyEvaluator = new ExpressionEvaluator({
			createBridge,
			maxCodeCacheSize: 64,
			poolSize: 1,
			lazyAcquire: true,
		});
		await lazyEvaluator.initialize();
		const callerA = {};
		const callerB = {};
		await lazyEvaluator.acquire(callerA);
		await lazyEvaluator.acquire(callerB);

		// A takes the warm bridge, so B starts a bridge synchronously.
		const resultA = lazyEvaluator.evaluate(
			'{{ extend("é", "replaceSpecialChars", []) }}',
			{},
			callerA,
		);
		const resultB = lazyEvaluator.evaluate(
			'{{ extend("ü", "replaceSpecialChars", []) }}',
			{},
			callerB,
		);

		expect(resultA).toBe('e');
		expect(resultB).toBe('u');

		await lazyEvaluator.release(callerA);
		await lazyEvaluator.release(callerB);
		await lazyEvaluator.dispose();
	});
});
