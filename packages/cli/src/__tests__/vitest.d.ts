import 'vitest';

interface CustomMatchers<R = unknown> {
	toBeEmptyArray(): R;
	toBeEmptySet(): R;
	toBeSetContaining(...items: string[]): R;
}

declare module 'vitest' {
	interface Matchers<R, T> extends CustomMatchers<R> {}
	interface AsymmetricMatchersContaining extends CustomMatchers {}
}
