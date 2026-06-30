import { assert, AssertionError } from 'chai';
import { AsyncFunc, Context, Func, Test, TestFunction } from 'mocha';

type XFailFunction = {
	it: TestFunction;
	unless: (condition: boolean | (() => boolean)) => { it: TestFunction };
};

const wrap = (fn: Func | AsyncFunc, condition: boolean | (() => boolean)): Func => {
	return function Wrapped(this: Context): PromiseLike<any> {
		if (typeof condition === 'function') {
			if (!condition()) {
				return Promise.resolve();
			}
		} else if (condition === false) {
			return Promise.resolve();
		}

		return new Promise<void>((ok, fail) => {
			if (fn.length > 1) {
				(fn as Func).call(context as unknown as Context, (err: any) => (err ? fail(err) : ok()));
			} else {
				ok((fn as AsyncFunc).call(context as unknown as Context));
			}
		}).then(
			(e: any) => assert.fail('Expected this test to fail'),
			(e: any) => {
				if (!(e instanceof AssertionError)) {
					throw e;
				}
			},
		);
	};
};

function unless(condition: boolean | (() => boolean)): { it: TestFunction } {
	const xfailIt: TestFunction = (
		fnOrTitle: Func | AsyncFunc | string,
		fn?: Func | AsyncFunc,
	): Test => {
		if (typeof fnOrTitle === 'string') {
			return it(fnOrTitle, wrap(fn!, condition));
		} else {
			return it(wrap(fnOrTitle, condition));
		}
	};

	xfailIt.only = (fnOrTitle: Func | AsyncFunc | string, fn?: Func | AsyncFunc): Test => {
		if (typeof fnOrTitle === 'string') {
			return it.skip(fnOrTitle, wrap(fn!, condition));
		} else {
			return it.skip(wrap(fnOrTitle, condition));
		}
	};

	xfailIt.skip = (fnOrTitle: Func | AsyncFunc | string, fn?: Func | AsyncFunc): Test => {
		if (typeof fnOrTitle === 'string') {
			return it.skip(fnOrTitle, wrap(fn!, condition));
		} else {
			return it.skip(wrap(fnOrTitle, condition));
		}
	};

	xfailIt.retries = (n: number): void => {
		it.retries(n);
	};

	return { it: xfailIt };
}

const xfail: XFailFunction = {
	...unless(true),
	unless,
};

export { xfail };
