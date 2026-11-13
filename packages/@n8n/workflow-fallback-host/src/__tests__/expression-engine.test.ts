/**
 * The host keeps one expression isolate for each process. A step must not
 * change what a later step sees in it.
 */
import { disposeExpressionEngine, NodeStepRunner, parseNodeStepArgs } from '../node-step';

const runner = new NodeStepRunner({ credentials: { get: async () => ({}) } });

/** Runs a Set step with one string field from one expression, and returns the field. */
async function evaluate(expression: string, key: string): Promise<unknown> {
	const result = await runner.run(
		parseNodeStepArgs({
			name: 'Set',
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			parameters: {
				assignments: {
					assignments: [{ id: 'a', name: 'out', value: `={{ ${expression} }}`, type: 'string' }],
				},
				options: { ignoreConversionErrors: true },
			},
			items: [{ secret: 'token-4711' }],
		}),
		{ step: 'Set', key },
	);
	return result[0]?.out;
}

/** Runs a step that can fail, and ignores the failure. */
async function attempt(expression: string, key: string): Promise<void> {
	try {
		await evaluate(expression, key);
	} catch {}
}

describe('the shared expression isolate', () => {
	afterAll(async () => {
		await disposeExpressionEngine();
	});

	it('evaluates expressions inside and outside the native subset', async () => {
		expect(await evaluate('$json.secret.toUpperCase()', 'k1')).toBe('TOKEN-4711');
		expect(
			await evaluate('DateTime.fromISO("2024-01-01").plus({ days: 2 }).toISODate()', 'k2'),
		).toBe('2024-01-03');
		expect(await evaluate('[1, 2].map((x) => x * 2).join("-")', 'k3')).toBe('2-4');
	});

	it('keeps the globals of one step away from the next step', async () => {
		await attempt('(Math.random = () => 4, "x")', 's1');
		await attempt('(JSON.stringify = () => "J", "x")', 's2');
		await attempt('(DateTime.leak = 1, "x")', 's3');
		await attempt('(SafeError.leak = 1, "x")', 's4');
		await attempt('(Object.assign(Math, { leak: 1 }), "x")', 's5');
		await attempt('(Error.leak = 1, "x")', 's6');
		await attempt('(Object.leak = 1, "x")', 's7');
		await attempt('(delete Object.keys, "x")', 's8');
		await attempt('(delete TypeError.name, "x")', 's9');

		expect(await evaluate('String(Math.random() === 4)', 'r1')).toBe('false');
		expect(await evaluate('JSON.stringify(1)', 'r2')).toBe('1');
		expect(await evaluate('String(DateTime.leak)', 'r3')).toBe('undefined');
		expect(await evaluate('String(Error.leak)', 'r4')).toBe('undefined');
		expect(await evaluate('String(Math.leak)', 'r5')).toBe('undefined');
		expect(await evaluate('String(Object.leak)', 'r6')).toBe('undefined');
		expect(await evaluate('Object.keys($json).join()', 'r7')).toBe('secret');
		expect(await evaluate('TypeError.name', 'r8')).toBe('TypeError');
	});

	it('keeps the Object and error helpers working', async () => {
		expect(await evaluate('Object.entries($json).flat().join("=")', 'o1')).toBe(
			'secret=token-4711',
		);
		expect(await evaluate('new Error("boom").message', 'o2')).toBe('boom');
		expect(await evaluate('String(new TypeError("t") instanceof Error)', 'o3')).toBe('true');
	});

	it('keeps the last regular expression match away from the next step', async () => {
		expect(await evaluate('$json.secret.match(/(\\d+)/)[1]', 'm1')).toBe('4711');
		expect(await evaluate('typeof RegExp.$1 + typeof RegExp.lastMatch', 'm2')).toBe(
			'undefinedundefined',
		);
	});
});
