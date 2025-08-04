expect.extend({
	toBeEmptyArray(actual) {
		const pass = Array.isArray(actual) && actual.length === 0;
		return {
			pass,
			message: pass
				? () => `Expected ${actual} to be an empty array`
				: () => `Expected ${actual} not to be an empty array`,
		};
	},
	toBeEmptySet(actual) {
		const pass = actual instanceof Set && actual.size === 0;
		return {
			pass,
			message: pass
				? () => `Expected ${[...actual]} to be an empty set`
				: () => `Expected ${actual} not to be an empty set`,
		};
	},
	toBeSetContaining(actual, ...expectedElements) {
		const pass = actual instanceof Set && expectedElements.every((e) => actual.has(e));
		return {
			pass,
			message: pass
				? () => `Expected ${[...actual]} to be a set containing ${expectedElements}`
				: () => `Expected ${actual} not to be a set containing ${expectedElements}`,
		};
	},
});
//# sourceMappingURL=extend-expect.js.map
