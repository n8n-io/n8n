namespace jest {
	interface Matchers<R, T> {
		toMatchZod(expected: unknown): T;
	}
}
