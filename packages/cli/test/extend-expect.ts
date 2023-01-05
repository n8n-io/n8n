expect.extend({
	toBeEmptyArray(this: jest.MatcherContext, actual: object) {
		const pass = Array.isArray(actual) && actual.length === 0;

		return {
			pass,
			message: pass
				? () => `Expected ${actual} to be an empty array`
				: () => `Expected ${actual} not to be an empty array`,
		};
	},
});
