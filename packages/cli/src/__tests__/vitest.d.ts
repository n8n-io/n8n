import 'vitest';

interface CustomMatchers<R = unknown> {
	toBeEmptyArray(): R;
	toBeEmptySet(): R;
	toBeSetContaining(...items: string[]): R;
}

declare module 'vitest' {
	interface Matchers<T = unknown> extends CustomMatchers<T> {}
	interface AsymmetricMatchersContaining extends CustomMatchers {}
}
