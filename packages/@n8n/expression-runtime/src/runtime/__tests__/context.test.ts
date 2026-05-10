import { buildContext } from '../context';

function makeRef(impl: (args: unknown[]) => unknown) {
	return {
		applySync: (_thisArg: unknown, args: unknown[]) => impl(args),
	};
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

		const ctx = buildContext(
			getValueAtPath,
			makeRef(() => undefined),
			makeRef(() => undefined),
		);

		expect('$credentials' in ctx).toBe(true);
		expect(calls).toContainEqual(['$credentials']);
	});

	it('returns false from has trap for unknown keys', () => {
		const getValueAtPath = makeRef(() => undefined);
		const ctx = buildContext(
			getValueAtPath,
			makeRef(() => undefined),
			makeRef(() => undefined),
		);

		expect('$doesNotExist' in ctx).toBe(false);
	});

	it('caches a primitive miss so undefined is probed at most once', () => {
		let calls = 0;
		const getValueAtPath = makeRef(() => {
			calls++;
			return undefined;
		});

		const ctx = buildContext(
			getValueAtPath,
			makeRef(() => undefined),
			makeRef(() => undefined),
		);

		void ('$missing' in ctx);
		void ('$missing' in ctx);
		expect(calls).toBe(1);
	});
});
