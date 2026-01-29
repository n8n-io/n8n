/**
 * Browser-compatible assert shim
 * Provides Node.js assert API for browser environments
 */

class AssertionError extends Error {
	constructor(options) {
		const message = options.message || 'Assertion failed';
		super(message);
		this.name = 'AssertionError';
		this.actual = options.actual;
		this.expected = options.expected;
		this.operator = options.operator;
	}
}

function assert(value, message) {
	if (!value) {
		throw new AssertionError({
			message: message || 'Assertion failed',
			actual: value,
			expected: true,
			operator: '==',
		});
	}
}

assert.ok = function (value, message) {
	assert(value, message);
};

assert.strictEqual = function (actual, expected, message) {
	if (actual !== expected) {
		throw new AssertionError({ message, actual, expected, operator: '===' });
	}
};

assert.notStrictEqual = function (actual, expected, message) {
	if (actual === expected) {
		throw new AssertionError({ message, actual, expected, operator: '!==' });
	}
};

assert.deepStrictEqual = function (actual, expected, message) {
	if (JSON.stringify(actual) !== JSON.stringify(expected)) {
		throw new AssertionError({ message, actual, expected, operator: 'deepStrictEqual' });
	}
};

assert.notDeepStrictEqual = function (actual, expected, message) {
	if (JSON.stringify(actual) === JSON.stringify(expected)) {
		throw new AssertionError({ message, actual, expected, operator: 'notDeepStrictEqual' });
	}
};

assert.equal = function (actual, expected, message) {
	if (actual != expected) {
		throw new AssertionError({ message, actual, expected, operator: '==' });
	}
};

assert.notEqual = function (actual, expected, message) {
	if (actual == expected) {
		throw new AssertionError({ message, actual, expected, operator: '!=' });
	}
};

assert.deepEqual = function (actual, expected, message) {
	if (JSON.stringify(actual) !== JSON.stringify(expected)) {
		throw new AssertionError({ message, actual, expected, operator: 'deepEqual' });
	}
};

assert.notDeepEqual = function (actual, expected, message) {
	if (JSON.stringify(actual) === JSON.stringify(expected)) {
		throw new AssertionError({ message, actual, expected, operator: 'notDeepEqual' });
	}
};

assert.throws = function (fn, expected, message) {
	let threw = false;
	try {
		fn();
	} catch (e) {
		threw = true;
		if (expected && !(e instanceof expected)) {
			throw new AssertionError({
				message: message || 'Wrong exception type',
				actual: e,
				expected,
				operator: 'throws',
			});
		}
	}
	if (!threw) {
		throw new AssertionError({
			message: message || 'Expected function to throw',
			operator: 'throws',
		});
	}
};

assert.doesNotThrow = function (fn, message) {
	try {
		fn();
	} catch (e) {
		throw new AssertionError({
			message: message || 'Function threw unexpectedly',
			actual: e,
			operator: 'doesNotThrow',
		});
	}
};

assert.fail = function (message) {
	throw new AssertionError({ message: message || 'Assertion failed', operator: 'fail' });
};

assert.AssertionError = AssertionError;

// Support both default and named exports
export default assert;
export { assert, AssertionError };
