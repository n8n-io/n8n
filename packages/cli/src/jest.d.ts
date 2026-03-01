namespace jest {
	interface Matchers<R, T> {
		toBeEmptyArray(): T;
		toBeEmptySet(): T;
		toBeSetContaining(...items: string[]): T;
	}
}
