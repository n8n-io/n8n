import { DateTime, IANAZone } from 'luxon';

import { buildContext } from '../context';

function makeRef(impl: (args: unknown[]) => unknown) {
	return (...args: unknown[]) => impl(args);
}

describe('buildContext proxy', () => {
	it('resolves $credentials lazily via getValueAtPath', () => {
		const calls: string[][] = [];
		const host: Record<string, unknown> = {
			$credentials: { __isObject: true },
		};

		const getValueAtPath = makeRef((args) => {
			const path = args[0] as string[];
			calls.push(path);
			let cur: unknown = host;
			for (const seg of path) cur = (cur as Record<string, unknown>)?.[seg];
			return cur;
		});

		const ctx = buildContext({
			getValueAtPath,
			getArrayElement: makeRef(() => undefined),
			callHost: makeRef(() => undefined),
		});

		expect('$credentials' in ctx).toBe(true);
		expect(calls).toContainEqual(['$credentials']);
	});

	it('returns false from has trap for unknown keys', () => {
		const getValueAtPath = makeRef(() => undefined);
		const ctx = buildContext({
			getValueAtPath,
			getArrayElement: makeRef(() => undefined),
			callHost: makeRef(() => undefined),
		});

		expect('$doesNotExist' in ctx).toBe(false);
	});

	it('caches a primitive miss so undefined is probed at most once', () => {
		let calls = 0;
		const getValueAtPath = makeRef(() => {
			calls++;
			return undefined;
		});

		const ctx = buildContext({
			getValueAtPath,
			getArrayElement: makeRef(() => undefined),
			callHost: makeRef(() => undefined),
		});

		void ('$missing' in ctx);
		void ('$missing' in ctx);
		expect(calls).toBe(1);
	});

	describe('$()', () => {
		const buildContextWithCallHost = (callHost: (message: unknown) => unknown) =>
			buildContext({
				getValueAtPath: makeRef(() => undefined),
				getArrayElement: makeRef(() => undefined),
				callHost: makeRef((args) => callHost(args[0])),
			});
		const callTypes = (messages: unknown[]) =>
			messages.map((message) => (message as { type: string }).type);

		it('checks each node once per context and sends every typed RPC', () => {
			const messages: unknown[] = [];
			const ctx = buildContextWithCallHost((message) => messages.push(message));
			const $ = ctx.$ as (nodeSelector: unknown) => { first: () => unknown };

			$('A').first();
			$('A').first();
			$('B');

			expect(messages).toEqual([
				{ type: 'checkNode', nodeName: 'A' },
				expect.objectContaining({ type: 'getNodeFirst', nodeName: 'A' }),
				expect.objectContaining({ type: 'getNodeFirst', nodeName: 'A' }),
				{ type: 'checkNode', nodeName: 'B' },
			]);
		});

		it('checks the node again in a new context', () => {
			const messages: unknown[] = [];
			const callHost = (message: unknown) => messages.push(message);

			(buildContextWithCallHost(callHost).$ as (nodeSelector: unknown) => unknown)('A');
			(buildContextWithCallHost(callHost).$ as (nodeSelector: unknown) => unknown)('A');

			expect(callTypes(messages)).toEqual(['checkNode', 'checkNode']);
		});

		it('checks the node again after a failed check', () => {
			const messages: unknown[] = [];
			const ctx = buildContextWithCallHost((message) => {
				messages.push(message);
				throw new Error("Referenced node doesn't exist");
			});
			const $ = ctx.$ as (nodeSelector: unknown) => unknown;

			expect(() => $('Unknown')).toThrow();
			expect(() => $('Unknown')).toThrow();
			expect(callTypes(messages)).toEqual(['checkNode', 'checkNode']);
		});

		it.each([[[]], [[null]]])(
			'throws the legacy error for $(%j) without asking the host',
			(selector) => {
				const messages: unknown[] = [];
				const ctx = buildContext({
					getValueAtPath: makeRef((args) => ((args[0] as string[])[0] === '$runIndex' ? 2 : 3)),
					getArrayElement: makeRef(() => undefined),
					callHost: makeRef((args) => messages.push(args[0])),
				});
				const $ = ctx.$ as (nodeSelector: unknown) => unknown;

				expect(() => $(selector)).toThrow(
					expect.objectContaining({
						name: 'ExpressionError',
						message: "Referenced node doesn't exist",
						context: { runIndex: 2, itemIndex: 3, nodeCause: '', descriptionKey: 'nodeNotFound' },
					}),
				);
				expect(messages).toEqual([]);
			},
		);

		it('throws the host error when reading the indices of the legacy error fails', () => {
			const hostError = { __isError: true, name: 'Error', message: 'Host read failed' };
			const ctx = buildContext({
				getValueAtPath: makeRef(() => hostError),
				getArrayElement: makeRef(() => undefined),
				callHost: makeRef(() => undefined),
			});
			const $ = ctx.$ as (nodeSelector: unknown) => unknown;

			expect(() => $([])).toThrow(expect.objectContaining({ message: 'Host read failed' }));
		});
	});
});

describe('buildContext timezone', () => {
	const callbacks = {
		getValueAtPath: makeRef(() => undefined),
		getArrayElement: makeRef(() => undefined),
		callHost: makeRef(() => undefined),
	};

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('does not validate a known timezone again', () => {
		buildContext(callbacks, 'Asia/Tokyo');
		const isValidZone = vi.spyOn(IANAZone, 'isValidZone');

		buildContext(callbacks, 'Asia/Tokyo');

		expect(isValidZone).not.toHaveBeenCalled();
	});

	it('rejects an invalid timezone on every evaluation', () => {
		expect(() => buildContext(callbacks, 'Not/AZone')).toThrow('Invalid timezone');
		expect(() => buildContext(callbacks, 'Not/AZone')).toThrow('Invalid timezone');
	});
});

describe('buildContext $now and $today', () => {
	const callbacks = {
		getValueAtPath: makeRef(() => undefined),
		getArrayElement: makeRef(() => undefined),
		callHost: makeRef(() => undefined),
	};

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('does not create dates that the expression does not read', () => {
		const now = vi.spyOn(DateTime, 'now');

		buildContext(callbacks, 'Asia/Tokyo');

		expect(now).not.toHaveBeenCalled();
	});

	it('keeps the same $now across reads', () => {
		const ctx = buildContext(callbacks, 'Asia/Tokyo');

		expect(ctx.$now).toBe(ctx.$now);
	});

	it('uses the timezone of its own evaluation', () => {
		const ctx = buildContext(callbacks, 'Asia/Tokyo');
		buildContext(callbacks, 'UTC');

		expect((ctx.$now as DateTime).zoneName).toBe('Asia/Tokyo');
		expect((ctx.$today as DateTime).zoneName).toBe('Asia/Tokyo');
		expect((ctx.$today as DateTime).toFormat('HH:mm:ss.SSS')).toBe('00:00:00.000');
	});

	it('lets an expression replace $now', () => {
		const ctx = buildContext(callbacks, 'Asia/Tokyo');

		ctx.$now = 'replaced';

		expect(ctx.$now).toBe('replaced');
	});
});
