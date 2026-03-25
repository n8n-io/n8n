import { processError } from '@vitest/utils/error';
import { isObject, createDefer, assertTypes, toArray, isNegativeNaN, objectAttr, shuffle } from '@vitest/utils/helpers';
import { getSafeTimers } from '@vitest/utils/timers';
import { format, formatRegExp, objDisplay } from '@vitest/utils/display';
import { c as createChainable, e as createTaskName, f as findTestFileStackTrace, b as createFileTask, a as calculateSuiteHash, s as someTasksAreOnly, i as interpretTaskModes, l as limitConcurrency, p as partitionSuiteChildren, r as hasTests, q as hasFailed } from './chunk-tasks.js';
import '@vitest/utils/source-map';
import 'pathe';

class PendingError extends Error {
	code = "VITEST_PENDING";
	taskId;
	constructor(message, task, note) {
		super(message);
		this.message = message;
		this.note = note;
		this.taskId = task.id;
	}
}
class TestRunAbortError extends Error {
	name = "TestRunAbortError";
	reason;
	constructor(message, reason) {
		super(message);
		this.reason = reason;
	}
}

// use WeakMap here to make the Test and Suite object serializable
const fnMap = new WeakMap();
const testFixtureMap = new WeakMap();
const hooksMap = new WeakMap();
function setFn(key, fn) {
	fnMap.set(key, fn);
}
function getFn(key) {
	return fnMap.get(key);
}
function setTestFixture(key, fixture) {
	testFixtureMap.set(key, fixture);
}
function getTestFixture(key) {
	return testFixtureMap.get(key);
}
function setHooks(key, hooks) {
	hooksMap.set(key, hooks);
}
function getHooks(key) {
	return hooksMap.get(key);
}

function mergeScopedFixtures(testFixtures, scopedFixtures) {
	const scopedFixturesMap = scopedFixtures.reduce((map, fixture) => {
		map[fixture.prop] = fixture;
		return map;
	}, {});
	const newFixtures = {};
	testFixtures.forEach((fixture) => {
		const useFixture = scopedFixturesMap[fixture.prop] || { ...fixture };
		newFixtures[useFixture.prop] = useFixture;
	});
	for (const fixtureKep in newFixtures) {
		var _fixture$deps;
		const fixture = newFixtures[fixtureKep];
		// if the fixture was define before the scope, then its dep
		// will reference the original fixture instead of the scope
		fixture.deps = (_fixture$deps = fixture.deps) === null || _fixture$deps === void 0 ? void 0 : _fixture$deps.map((dep) => newFixtures[dep.prop]);
	}
	return Object.values(newFixtures);
}
function mergeContextFixtures(fixtures, context, runner) {
	const fixtureOptionKeys = [
		"auto",
		"injected",
		"scope"
	];
	const fixtureArray = Object.entries(fixtures).map(([prop, value]) => {
		const fixtureItem = { value };
		if (Array.isArray(value) && value.length >= 2 && isObject(value[1]) && Object.keys(value[1]).some((key) => fixtureOptionKeys.includes(key))) {
			var _runner$injectValue;
			// fixture with options
			Object.assign(fixtureItem, value[1]);
			const userValue = value[0];
			fixtureItem.value = fixtureItem.injected ? ((_runner$injectValue = runner.injectValue) === null || _runner$injectValue === void 0 ? void 0 : _runner$injectValue.call(runner, prop)) ?? userValue : userValue;
		}
		fixtureItem.scope = fixtureItem.scope || "test";
		if (fixtureItem.scope === "worker" && !runner.getWorkerContext) {
			fixtureItem.scope = "file";
		}
		fixtureItem.prop = prop;
		fixtureItem.isFn = typeof fixtureItem.value === "function";
		return fixtureItem;
	});
	if (Array.isArray(context.fixtures)) {
		context.fixtures = context.fixtures.concat(fixtureArray);
	} else {
		context.fixtures = fixtureArray;
	}
	// Update dependencies of fixture functions
	fixtureArray.forEach((fixture) => {
		if (fixture.isFn) {
			const usedProps = getUsedProps(fixture.value);
			if (usedProps.length) {
				fixture.deps = context.fixtures.filter(({ prop }) => prop !== fixture.prop && usedProps.includes(prop));
			}
			// test can access anything, so we ignore it
			if (fixture.scope !== "test") {
				var _fixture$deps2;
				(_fixture$deps2 = fixture.deps) === null || _fixture$deps2 === void 0 ? void 0 : _fixture$deps2.forEach((dep) => {
					if (!dep.isFn) {
						// non fn fixtures are always resolved and available to anyone
						return;
					}
					// worker scope can only import from worker scope
					if (fixture.scope === "worker" && dep.scope === "worker") {
						return;
					}
					// file scope an import from file and worker scopes
					if (fixture.scope === "file" && dep.scope !== "test") {
						return;
					}
					throw new SyntaxError(`cannot use the ${dep.scope} fixture "${dep.prop}" inside the ${fixture.scope} fixture "${fixture.prop}"`);
				});
			}
		}
	});
	return context;
}
const fixtureValueMaps = new Map();
const cleanupFnArrayMap = new Map();
async function callFixtureCleanup(context) {
	const cleanupFnArray = cleanupFnArrayMap.get(context) ?? [];
	for (const cleanup of cleanupFnArray.reverse()) {
		await cleanup();
	}
	cleanupFnArrayMap.delete(context);
}
function withFixtures(runner, fn, testContext) {
	return (hookContext) => {
		const context = hookContext || testContext;
		if (!context) {
			return fn({});
		}
		const fixtures = getTestFixture(context);
		if (!(fixtures === null || fixtures === void 0 ? void 0 : fixtures.length)) {
			return fn(context);
		}
		const usedProps = getUsedProps(fn);
		const hasAutoFixture = fixtures.some(({ auto }) => auto);
		if (!usedProps.length && !hasAutoFixture) {
			return fn(context);
		}
		if (!fixtureValueMaps.get(context)) {
			fixtureValueMaps.set(context, new Map());
		}
		const fixtureValueMap = fixtureValueMaps.get(context);
		if (!cleanupFnArrayMap.has(context)) {
			cleanupFnArrayMap.set(context, []);
		}
		const cleanupFnArray = cleanupFnArrayMap.get(context);
		const usedFixtures = fixtures.filter(({ prop, auto }) => auto || usedProps.includes(prop));
		const pendingFixtures = resolveDeps(usedFixtures);
		if (!pendingFixtures.length) {
			return fn(context);
		}
		async function resolveFixtures() {
			for (const fixture of pendingFixtures) {
				// fixture could be already initialized during "before" hook
				if (fixtureValueMap.has(fixture)) {
					continue;
				}
				const resolvedValue = await resolveFixtureValue(runner, fixture, context, cleanupFnArray);
				context[fixture.prop] = resolvedValue;
				fixtureValueMap.set(fixture, resolvedValue);
				if (fixture.scope === "test") {
					cleanupFnArray.unshift(() => {
						fixtureValueMap.delete(fixture);
					});
				}
			}
		}
		return resolveFixtures().then(() => fn(context));
	};
}
const globalFixturePromise = new WeakMap();
function resolveFixtureValue(runner, fixture, context, cleanupFnArray) {
	var _runner$getWorkerCont;
	const fileContext = getFileContext(context.task.file);
	const workerContext = (_runner$getWorkerCont = runner.getWorkerContext) === null || _runner$getWorkerCont === void 0 ? void 0 : _runner$getWorkerCont.call(runner);
	if (!fixture.isFn) {
		var _fixture$prop;
		fileContext[_fixture$prop = fixture.prop] ?? (fileContext[_fixture$prop] = fixture.value);
		if (workerContext) {
			var _fixture$prop2;
			workerContext[_fixture$prop2 = fixture.prop] ?? (workerContext[_fixture$prop2] = fixture.value);
		}
		return fixture.value;
	}
	if (fixture.scope === "test") {
		return resolveFixtureFunction(fixture.value, context, cleanupFnArray);
	}
	// in case the test runs in parallel
	if (globalFixturePromise.has(fixture)) {
		return globalFixturePromise.get(fixture);
	}
	let fixtureContext;
	if (fixture.scope === "worker") {
		if (!workerContext) {
			throw new TypeError("[@vitest/runner] The worker context is not available in the current test runner. Please, provide the `getWorkerContext` method when initiating the runner.");
		}
		fixtureContext = workerContext;
	} else {
		fixtureContext = fileContext;
	}
	if (fixture.prop in fixtureContext) {
		return fixtureContext[fixture.prop];
	}
	if (!cleanupFnArrayMap.has(fixtureContext)) {
		cleanupFnArrayMap.set(fixtureContext, []);
	}
	const cleanupFnFileArray = cleanupFnArrayMap.get(fixtureContext);
	const promise = resolveFixtureFunction(fixture.value, fixtureContext, cleanupFnFileArray).then((value) => {
		fixtureContext[fixture.prop] = value;
		globalFixturePromise.delete(fixture);
		return value;
	});
	globalFixturePromise.set(fixture, promise);
	return promise;
}
async function resolveFixtureFunction(fixtureFn, context, cleanupFnArray) {
	// wait for `use` call to extract fixture value
	const useFnArgPromise = createDefer();
	let isUseFnArgResolved = false;
	const fixtureReturn = fixtureFn(context, async (useFnArg) => {
		// extract `use` argument
		isUseFnArgResolved = true;
		useFnArgPromise.resolve(useFnArg);
		// suspend fixture teardown by holding off `useReturnPromise` resolution until cleanup
		const useReturnPromise = createDefer();
		cleanupFnArray.push(async () => {
			// start teardown by resolving `use` Promise
			useReturnPromise.resolve();
			// wait for finishing teardown
			await fixtureReturn;
		});
		await useReturnPromise;
	}).catch((e) => {
		// treat fixture setup error as test failure
		if (!isUseFnArgResolved) {
			useFnArgPromise.reject(e);
			return;
		}
		// otherwise re-throw to avoid silencing error during cleanup
		throw e;
	});
	return useFnArgPromise;
}
function resolveDeps(fixtures, depSet = new Set(), pendingFixtures = []) {
	fixtures.forEach((fixture) => {
		if (pendingFixtures.includes(fixture)) {
			return;
		}
		if (!fixture.isFn || !fixture.deps) {
			pendingFixtures.push(fixture);
			return;
		}
		if (depSet.has(fixture)) {
			throw new Error(`Circular fixture dependency detected: ${fixture.prop} <- ${[...depSet].reverse().map((d) => d.prop).join(" <- ")}`);
		}
		depSet.add(fixture);
		resolveDeps(fixture.deps, depSet, pendingFixtures);
		pendingFixtures.push(fixture);
		depSet.clear();
	});
	return pendingFixtures;
}
function getUsedProps(fn) {
	let fnString = filterOutComments(fn.toString());
	// match lowered async function and strip it off
	// example code on esbuild-try https://esbuild.github.io/try/#YgAwLjI0LjAALS1zdXBwb3J0ZWQ6YXN5bmMtYXdhaXQ9ZmFsc2UAZQBlbnRyeS50cwBjb25zdCBvID0gewogIGYxOiBhc3luYyAoKSA9PiB7fSwKICBmMjogYXN5bmMgKGEpID0+IHt9LAogIGYzOiBhc3luYyAoYSwgYikgPT4ge30sCiAgZjQ6IGFzeW5jIGZ1bmN0aW9uKGEpIHt9LAogIGY1OiBhc3luYyBmdW5jdGlvbiBmZihhKSB7fSwKICBhc3luYyBmNihhKSB7fSwKCiAgZzE6IGFzeW5jICgpID0+IHt9LAogIGcyOiBhc3luYyAoeyBhIH0pID0+IHt9LAogIGczOiBhc3luYyAoeyBhIH0sIGIpID0+IHt9LAogIGc0OiBhc3luYyBmdW5jdGlvbiAoeyBhIH0pIHt9LAogIGc1OiBhc3luYyBmdW5jdGlvbiBnZyh7IGEgfSkge30sCiAgYXN5bmMgZzYoeyBhIH0pIHt9LAoKICBoMTogYXN5bmMgKCkgPT4ge30sCiAgLy8gY29tbWVudCBiZXR3ZWVuCiAgaDI6IGFzeW5jIChhKSA9PiB7fSwKfQ
	//   __async(this, null, function*
	//   __async(this, arguments, function*
	//   __async(this, [_0, _1], function*
	if (/__async\((?:this|null), (?:null|arguments|\[[_0-9, ]*\]), function\*/.test(fnString)) {
		fnString = fnString.split(/__async\((?:this|null),/)[1];
	}
	const match = fnString.match(/[^(]*\(([^)]*)/);
	if (!match) {
		return [];
	}
	const args = splitByComma(match[1]);
	if (!args.length) {
		return [];
	}
	let first = args[0];
	if ("__VITEST_FIXTURE_INDEX__" in fn) {
		first = args[fn.__VITEST_FIXTURE_INDEX__];
		if (!first) {
			return [];
		}
	}
	if (!(first[0] === "{" && first.endsWith("}"))) {
		throw new Error(`The first argument inside a fixture must use object destructuring pattern, e.g. ({ test } => {}). Instead, received "${first}".`);
	}
	const _first = first.slice(1, -1).replace(/\s/g, "");
	const props = splitByComma(_first).map((prop) => {
		return prop.replace(/:.*|=.*/g, "");
	});
	const last = props.at(-1);
	if (last && last.startsWith("...")) {
		throw new Error(`Rest parameters are not supported in fixtures, received "${last}".`);
	}
	return props;
}
function filterOutComments(s) {
	const result = [];
	let commentState = "none";
	for (let i = 0; i < s.length; ++i) {
		if (commentState === "singleline") {
			if (s[i] === "\n") {
				commentState = "none";
			}
		} else if (commentState === "multiline") {
			if (s[i - 1] === "*" && s[i] === "/") {
				commentState = "none";
			}
		} else if (commentState === "none") {
			if (s[i] === "/" && s[i + 1] === "/") {
				commentState = "singleline";
			} else if (s[i] === "/" && s[i + 1] === "*") {
				commentState = "multiline";
				i += 2;
			} else {
				result.push(s[i]);
			}
		}
	}
	return result.join("");
}
function splitByComma(s) {
	const result = [];
	const stack = [];
	let start = 0;
	for (let i = 0; i < s.length; i++) {
		if (s[i] === "{" || s[i] === "[") {
			stack.push(s[i] === "{" ? "}" : "]");
		} else if (s[i] === stack.at(-1)) {
			stack.pop();
		} else if (!stack.length && s[i] === ",") {
			const token = s.substring(start, i).trim();
			if (token) {
				result.push(token);
			}
			start = i + 1;
		}
	}
	const lastToken = s.substring(start).trim();
	if (lastToken) {
		result.push(lastToken);
	}
	return result;
}

let _test;
function setCurrentTest(test) {
	_test = test;
}
function getCurrentTest() {
	return _test;
}
const tests = [];
function addRunningTest(test) {
	tests.push(test);
	return () => {
		tests.splice(tests.indexOf(test));
	};
}
function getRunningTests() {
	return tests;
}

function getDefaultHookTimeout() {
	return getRunner().config.hookTimeout;
}
const CLEANUP_TIMEOUT_KEY = Symbol.for("VITEST_CLEANUP_TIMEOUT");
const CLEANUP_STACK_TRACE_KEY = Symbol.for("VITEST_CLEANUP_STACK_TRACE");
function getBeforeHookCleanupCallback(hook, result, context) {
	if (typeof result === "function") {
		const timeout = CLEANUP_TIMEOUT_KEY in hook && typeof hook[CLEANUP_TIMEOUT_KEY] === "number" ? hook[CLEANUP_TIMEOUT_KEY] : getDefaultHookTimeout();
		const stackTraceError = CLEANUP_STACK_TRACE_KEY in hook && hook[CLEANUP_STACK_TRACE_KEY] instanceof Error ? hook[CLEANUP_STACK_TRACE_KEY] : undefined;
		return withTimeout(result, timeout, true, stackTraceError, (_, error) => {
			if (context) {
				abortContextSignal(context, error);
			}
		});
	}
}
/**
* Registers a callback function to be executed once before all tests within the current suite.
* This hook is useful for scenarios where you need to perform setup operations that are common to all tests in a suite, such as initializing a database connection or setting up a test environment.
*
* **Note:** The `beforeAll` hooks are executed in the order they are defined one after another. You can configure this by changing the `sequence.hooks` option in the config file.
*
* @param {Function} fn - The callback function to be executed before all tests.
* @param {number} [timeout] - Optional timeout in milliseconds for the hook. If not provided, the default hook timeout from the runner's configuration is used.
* @returns {void}
* @example
* ```ts
* // Example of using beforeAll to set up a database connection
* beforeAll(async () => {
*   await database.connect();
* });
* ```
*/
function beforeAll(fn, timeout = getDefaultHookTimeout()) {
	assertTypes(fn, "\"beforeAll\" callback", ["function"]);
	const stackTraceError = new Error("STACK_TRACE_ERROR");
	return getCurrentSuite().on("beforeAll", Object.assign(withTimeout(fn, timeout, true, stackTraceError), {
		[CLEANUP_TIMEOUT_KEY]: timeout,
		[CLEANUP_STACK_TRACE_KEY]: stackTraceError
	}));
}
/**
* Registers a callback function to be executed once after all tests within the current suite have completed.
* This hook is useful for scenarios where you need to perform cleanup operations after all tests in a suite have run, such as closing database connections or cleaning up temporary files.
*
* **Note:** The `afterAll` hooks are running in reverse order of their registration. You can configure this by changing the `sequence.hooks` option in the config file.
*
* @param {Function} fn - The callback function to be executed after all tests.
* @param {number} [timeout] - Optional timeout in milliseconds for the hook. If not provided, the default hook timeout from the runner's configuration is used.
* @returns {void}
* @example
* ```ts
* // Example of using afterAll to close a database connection
* afterAll(async () => {
*   await database.disconnect();
* });
* ```
*/
function afterAll(fn, timeout) {
	assertTypes(fn, "\"afterAll\" callback", ["function"]);
	return getCurrentSuite().on("afterAll", withTimeout(fn, timeout ?? getDefaultHookTimeout(), true, new Error("STACK_TRACE_ERROR")));
}
/**
* Registers a callback function to be executed before each test within the current suite.
* This hook is useful for scenarios where you need to reset or reinitialize the test environment before each test runs, such as resetting database states, clearing caches, or reinitializing variables.
*
* **Note:** The `beforeEach` hooks are executed in the order they are defined one after another. You can configure this by changing the `sequence.hooks` option in the config file.
*
* @param {Function} fn - The callback function to be executed before each test. This function receives an `TestContext` parameter if additional test context is needed.
* @param {number} [timeout] - Optional timeout in milliseconds for the hook. If not provided, the default hook timeout from the runner's configuration is used.
* @returns {void}
* @example
* ```ts
* // Example of using beforeEach to reset a database state
* beforeEach(async () => {
*   await database.reset();
* });
* ```
*/
function beforeEach(fn, timeout = getDefaultHookTimeout()) {
	assertTypes(fn, "\"beforeEach\" callback", ["function"]);
	const stackTraceError = new Error("STACK_TRACE_ERROR");
	const runner = getRunner();
	return getCurrentSuite().on("beforeEach", Object.assign(withTimeout(withFixtures(runner, fn), timeout ?? getDefaultHookTimeout(), true, stackTraceError, abortIfTimeout), {
		[CLEANUP_TIMEOUT_KEY]: timeout,
		[CLEANUP_STACK_TRACE_KEY]: stackTraceError
	}));
}
/**
* Registers a callback function to be executed after each test within the current suite has completed.
* This hook is useful for scenarios where you need to clean up or reset the test environment after each test runs, such as deleting temporary files, clearing test-specific database entries, or resetting mocked functions.
*
* **Note:** The `afterEach` hooks are running in reverse order of their registration. You can configure this by changing the `sequence.hooks` option in the config file.
*
* @param {Function} fn - The callback function to be executed after each test. This function receives an `TestContext` parameter if additional test context is needed.
* @param {number} [timeout] - Optional timeout in milliseconds for the hook. If not provided, the default hook timeout from the runner's configuration is used.
* @returns {void}
* @example
* ```ts
* // Example of using afterEach to delete temporary files created during a test
* afterEach(async () => {
*   await fileSystem.deleteTempFiles();
* });
* ```
*/
function afterEach(fn, timeout) {
	assertTypes(fn, "\"afterEach\" callback", ["function"]);
	const runner = getRunner();
	return getCurrentSuite().on("afterEach", withTimeout(withFixtures(runner, fn), timeout ?? getDefaultHookTimeout(), true, new Error("STACK_TRACE_ERROR"), abortIfTimeout));
}
/**
* Registers a callback function to be executed when a test fails within the current suite.
* This function allows for custom actions to be performed in response to test failures, such as logging, cleanup, or additional diagnostics.
*
* **Note:** The `onTestFailed` hooks are running in reverse order of their registration. You can configure this by changing the `sequence.hooks` option in the config file.
*
* @param {Function} fn - The callback function to be executed upon a test failure. The function receives the test result (including errors).
* @param {number} [timeout] - Optional timeout in milliseconds for the hook. If not provided, the default hook timeout from the runner's configuration is used.
* @throws {Error} Throws an error if the function is not called within a test.
* @returns {void}
* @example
* ```ts
* // Example of using onTestFailed to log failure details
* onTestFailed(({ errors }) => {
*   console.log(`Test failed: ${test.name}`, errors);
* });
* ```
*/
const onTestFailed = createTestHook("onTestFailed", (test, handler, timeout) => {
	test.onFailed || (test.onFailed = []);
	test.onFailed.push(withTimeout(handler, timeout ?? getDefaultHookTimeout(), true, new Error("STACK_TRACE_ERROR"), abortIfTimeout));
});
/**
* Registers a callback function to be executed when the current test finishes, regardless of the outcome (pass or fail).
* This function is ideal for performing actions that should occur after every test execution, such as cleanup, logging, or resetting shared resources.
*
* This hook is useful if you have access to a resource in the test itself and you want to clean it up after the test finishes. It is a more compact way to clean up resources than using the combination of `beforeEach` and `afterEach`.
*
* **Note:** The `onTestFinished` hooks are running in reverse order of their registration. You can configure this by changing the `sequence.hooks` option in the config file.
*
* **Note:** The `onTestFinished` hook is not called if the test is canceled with a dynamic `ctx.skip()` call.
*
* @param {Function} fn - The callback function to be executed after a test finishes. The function can receive parameters providing details about the completed test, including its success or failure status.
* @param {number} [timeout] - Optional timeout in milliseconds for the hook. If not provided, the default hook timeout from the runner's configuration is used.
* @throws {Error} Throws an error if the function is not called within a test.
* @returns {void}
* @example
* ```ts
* // Example of using onTestFinished for cleanup
* const db = await connectToDatabase();
* onTestFinished(async () => {
*   await db.disconnect();
* });
* ```
*/
const onTestFinished = createTestHook("onTestFinished", (test, handler, timeout) => {
	test.onFinished || (test.onFinished = []);
	test.onFinished.push(withTimeout(handler, timeout ?? getDefaultHookTimeout(), true, new Error("STACK_TRACE_ERROR"), abortIfTimeout));
});
function createTestHook(name, handler) {
	return (fn, timeout) => {
		assertTypes(fn, `"${name}" callback`, ["function"]);
		const current = getCurrentTest();
		if (!current) {
			throw new Error(`Hook ${name}() can only be called inside a test`);
		}
		return handler(current, fn, timeout);
	};
}

/**
* Creates a suite of tests, allowing for grouping and hierarchical organization of tests.
* Suites can contain both tests and other suites, enabling complex test structures.
*
* @param {string} name - The name of the suite, used for identification and reporting.
* @param {Function} fn - A function that defines the tests and suites within this suite.
* @example
* ```ts
* // Define a suite with two tests
* suite('Math operations', () => {
*   test('should add two numbers', () => {
*     expect(add(1, 2)).toBe(3);
*   });
*
*   test('should subtract two numbers', () => {
*     expect(subtract(5, 2)).toBe(3);
*   });
* });
* ```
* @example
* ```ts
* // Define nested suites
* suite('String operations', () => {
*   suite('Trimming', () => {
*     test('should trim whitespace from start and end', () => {
*       expect('  hello  '.trim()).toBe('hello');
*     });
*   });
*
*   suite('Concatenation', () => {
*     test('should concatenate two strings', () => {
*       expect('hello' + ' ' + 'world').toBe('hello world');
*     });
*   });
* });
* ```
*/
const suite = createSuite();
/**
* Defines a test case with a given name and test function. The test function can optionally be configured with test options.
*
* @param {string | Function} name - The name of the test or a function that will be used as a test name.
* @param {TestOptions | TestFunction} [optionsOrFn] - Optional. The test options or the test function if no explicit name is provided.
* @param {number | TestOptions | TestFunction} [optionsOrTest] - Optional. The test function or options, depending on the previous parameters.
* @throws {Error} If called inside another test function.
* @example
* ```ts
* // Define a simple test
* test('should add two numbers', () => {
*   expect(add(1, 2)).toBe(3);
* });
* ```
* @example
* ```ts
* // Define a test with options
* test('should subtract two numbers', { retry: 3 }, () => {
*   expect(subtract(5, 2)).toBe(3);
* });
* ```
*/
const test = createTest(function(name, optionsOrFn, optionsOrTest) {
	if (getCurrentTest()) {
		throw new Error("Calling the test function inside another test function is not allowed. Please put it inside \"describe\" or \"suite\" so it can be properly collected.");
	}
	getCurrentSuite().test.fn.call(this, formatName(name), optionsOrFn, optionsOrTest);
});
/**
* Creates a suite of tests, allowing for grouping and hierarchical organization of tests.
* Suites can contain both tests and other suites, enabling complex test structures.
*
* @param {string} name - The name of the suite, used for identification and reporting.
* @param {Function} fn - A function that defines the tests and suites within this suite.
* @example
* ```ts
* // Define a suite with two tests
* describe('Math operations', () => {
*   test('should add two numbers', () => {
*     expect(add(1, 2)).toBe(3);
*   });
*
*   test('should subtract two numbers', () => {
*     expect(subtract(5, 2)).toBe(3);
*   });
* });
* ```
* @example
* ```ts
* // Define nested suites
* describe('String operations', () => {
*   describe('Trimming', () => {
*     test('should trim whitespace from start and end', () => {
*       expect('  hello  '.trim()).toBe('hello');
*     });
*   });
*
*   describe('Concatenation', () => {
*     test('should concatenate two strings', () => {
*       expect('hello' + ' ' + 'world').toBe('hello world');
*     });
*   });
* });
* ```
*/
const describe = suite;
/**
* Defines a test case with a given name and test function. The test function can optionally be configured with test options.
*
* @param {string | Function} name - The name of the test or a function that will be used as a test name.
* @param {TestOptions | TestFunction} [optionsOrFn] - Optional. The test options or the test function if no explicit name is provided.
* @param {number | TestOptions | TestFunction} [optionsOrTest] - Optional. The test function or options, depending on the previous parameters.
* @throws {Error} If called inside another test function.
* @example
* ```ts
* // Define a simple test
* it('adds two numbers', () => {
*   expect(add(1, 2)).toBe(3);
* });
* ```
* @example
* ```ts
* // Define a test with options
* it('subtracts two numbers', { retry: 3 }, () => {
*   expect(subtract(5, 2)).toBe(3);
* });
* ```
*/
const it = test;
let runner;
let defaultSuite;
let currentTestFilepath;
function assert(condition, message) {
	if (!condition) {
		throw new Error(`Vitest failed to find ${message}. This is a bug in Vitest. Please, open an issue with reproduction.`);
	}
}
function getDefaultSuite() {
	assert(defaultSuite, "the default suite");
	return defaultSuite;
}
function getRunner() {
	assert(runner, "the runner");
	return runner;
}
function createDefaultSuite(runner) {
	const config = runner.config.sequence;
	const collector = suite("", { concurrent: config.concurrent }, () => {});
	// no parent suite for top-level tests
	delete collector.suite;
	return collector;
}
function clearCollectorContext(file, currentRunner) {
	if (!defaultSuite) {
		defaultSuite = createDefaultSuite(currentRunner);
	}
	defaultSuite.file = file;
	runner = currentRunner;
	currentTestFilepath = file.filepath;
	collectorContext.tasks.length = 0;
	defaultSuite.clear();
	collectorContext.currentSuite = defaultSuite;
}
function getCurrentSuite() {
	const currentSuite = collectorContext.currentSuite || defaultSuite;
	assert(currentSuite, "the current suite");
	return currentSuite;
}
function createSuiteHooks() {
	return {
		beforeAll: [],
		afterAll: [],
		beforeEach: [],
		afterEach: []
	};
}
function parseArguments(optionsOrFn, timeoutOrTest) {
	if (timeoutOrTest != null && typeof timeoutOrTest === "object") {
		throw new TypeError(`Signature "test(name, fn, { ... })" was deprecated in Vitest 3 and removed in Vitest 4. Please, provide options as a second argument instead.`);
	}
	let options = {};
	let fn;
	// it('', () => {}, 1000)
	if (typeof timeoutOrTest === "number") {
		options = { timeout: timeoutOrTest };
	} else if (typeof optionsOrFn === "object") {
		options = optionsOrFn;
	}
	if (typeof optionsOrFn === "function") {
		if (typeof timeoutOrTest === "function") {
			throw new TypeError("Cannot use two functions as arguments. Please use the second argument for options.");
		}
		fn = optionsOrFn;
	} else if (typeof timeoutOrTest === "function") {
		fn = timeoutOrTest;
	}
	return {
		options,
		handler: fn
	};
}
// implementations
function createSuiteCollector(name, factory = () => {}, mode, each, suiteOptions, parentCollectorFixtures) {
	const tasks = [];
	let suite;
	initSuite(true);
	const task = function(name = "", options = {}) {
		var _collectorContext$cur, _collectorContext$cur2, _collectorContext$cur3;
		const timeout = (options === null || options === void 0 ? void 0 : options.timeout) ?? runner.config.testTimeout;
		const currentSuite = (_collectorContext$cur = collectorContext.currentSuite) === null || _collectorContext$cur === void 0 ? void 0 : _collectorContext$cur.suite;
		const task = {
			id: "",
			name,
			fullName: createTaskName([(currentSuite === null || currentSuite === void 0 ? void 0 : currentSuite.fullName) ?? ((_collectorContext$cur2 = collectorContext.currentSuite) === null || _collectorContext$cur2 === void 0 || (_collectorContext$cur2 = _collectorContext$cur2.file) === null || _collectorContext$cur2 === void 0 ? void 0 : _collectorContext$cur2.fullName), name]),
			fullTestName: createTaskName([currentSuite === null || currentSuite === void 0 ? void 0 : currentSuite.fullTestName, name]),
			suite: currentSuite,
			each: options.each,
			fails: options.fails,
			context: undefined,
			type: "test",
			file: (currentSuite === null || currentSuite === void 0 ? void 0 : currentSuite.file) ?? ((_collectorContext$cur3 = collectorContext.currentSuite) === null || _collectorContext$cur3 === void 0 ? void 0 : _collectorContext$cur3.file),
			timeout,
			retry: options.retry ?? runner.config.retry,
			repeats: options.repeats,
			mode: options.only ? "only" : options.skip ? "skip" : options.todo ? "todo" : "run",
			meta: options.meta ?? Object.create(null),
			annotations: [],
			artifacts: []
		};
		const handler = options.handler;
		if (task.mode === "run" && !handler) {
			task.mode = "todo";
		}
		if (options.concurrent || !options.sequential && runner.config.sequence.concurrent) {
			task.concurrent = true;
		}
		task.shuffle = suiteOptions === null || suiteOptions === void 0 ? void 0 : suiteOptions.shuffle;
		const context = createTestContext(task, runner);
		// create test context
		Object.defineProperty(task, "context", {
			value: context,
			enumerable: false
		});
		setTestFixture(context, options.fixtures);
		// custom can be called from any place, let's assume the limit is 15 stacks
		const limit = Error.stackTraceLimit;
		Error.stackTraceLimit = 15;
		const stackTraceError = new Error("STACK_TRACE_ERROR");
		Error.stackTraceLimit = limit;
		if (handler) {
			setFn(task, withTimeout(withAwaitAsyncAssertions(withFixtures(runner, handler, context), task), timeout, false, stackTraceError, (_, error) => abortIfTimeout([context], error)));
		}
		if (runner.config.includeTaskLocation) {
			const error = stackTraceError.stack;
			const stack = findTestFileStackTrace(currentTestFilepath, error);
			if (stack) {
				task.location = {
					line: stack.line,
					column: stack.column
				};
			}
		}
		tasks.push(task);
		return task;
	};
	const test = createTest(function(name, optionsOrFn, timeoutOrTest) {
		let { options, handler } = parseArguments(optionsOrFn, timeoutOrTest);
		// inherit repeats, retry, timeout from suite
		if (typeof suiteOptions === "object") {
			options = Object.assign({}, suiteOptions, options);
		}
		// inherit concurrent / sequential from suite
		options.concurrent = this.concurrent || !this.sequential && (options === null || options === void 0 ? void 0 : options.concurrent);
		options.sequential = this.sequential || !this.concurrent && (options === null || options === void 0 ? void 0 : options.sequential);
		const test = task(formatName(name), {
			...this,
			...options,
			handler
		});
		test.type = "test";
	});
	let collectorFixtures = parentCollectorFixtures;
	const collector = {
		type: "collector",
		name,
		mode,
		suite,
		options: suiteOptions,
		test,
		tasks,
		collect,
		task,
		clear,
		on: addHook,
		fixtures() {
			return collectorFixtures;
		},
		scoped(fixtures) {
			const parsed = mergeContextFixtures(fixtures, { fixtures: collectorFixtures }, runner);
			if (parsed.fixtures) {
				collectorFixtures = parsed.fixtures;
			}
		}
	};
	function addHook(name, ...fn) {
		getHooks(suite)[name].push(...fn);
	}
	function initSuite(includeLocation) {
		var _collectorContext$cur4, _collectorContext$cur5, _collectorContext$cur6;
		if (typeof suiteOptions === "number") {
			suiteOptions = { timeout: suiteOptions };
		}
		const currentSuite = (_collectorContext$cur4 = collectorContext.currentSuite) === null || _collectorContext$cur4 === void 0 ? void 0 : _collectorContext$cur4.suite;
		suite = {
			id: "",
			type: "suite",
			name,
			fullName: createTaskName([(currentSuite === null || currentSuite === void 0 ? void 0 : currentSuite.fullName) ?? ((_collectorContext$cur5 = collectorContext.currentSuite) === null || _collectorContext$cur5 === void 0 || (_collectorContext$cur5 = _collectorContext$cur5.file) === null || _collectorContext$cur5 === void 0 ? void 0 : _collectorContext$cur5.fullName), name]),
			fullTestName: createTaskName([currentSuite === null || currentSuite === void 0 ? void 0 : currentSuite.fullTestName, name]),
			suite: currentSuite,
			mode,
			each,
			file: (currentSuite === null || currentSuite === void 0 ? void 0 : currentSuite.file) ?? ((_collectorContext$cur6 = collectorContext.currentSuite) === null || _collectorContext$cur6 === void 0 ? void 0 : _collectorContext$cur6.file),
			shuffle: suiteOptions === null || suiteOptions === void 0 ? void 0 : suiteOptions.shuffle,
			tasks: [],
			meta: Object.create(null),
			concurrent: suiteOptions === null || suiteOptions === void 0 ? void 0 : suiteOptions.concurrent
		};
		if (runner && includeLocation && runner.config.includeTaskLocation) {
			const limit = Error.stackTraceLimit;
			Error.stackTraceLimit = 15;
			const error = new Error("stacktrace").stack;
			Error.stackTraceLimit = limit;
			const stack = findTestFileStackTrace(currentTestFilepath, error);
			if (stack) {
				suite.location = {
					line: stack.line,
					column: stack.column
				};
			}
		}
		setHooks(suite, createSuiteHooks());
	}
	function clear() {
		tasks.length = 0;
		initSuite(false);
	}
	async function collect(file) {
		if (!file) {
			throw new TypeError("File is required to collect tasks.");
		}
		if (factory) {
			await runWithSuite(collector, () => factory(test));
		}
		const allChildren = [];
		for (const i of tasks) {
			allChildren.push(i.type === "collector" ? await i.collect(file) : i);
		}
		suite.tasks = allChildren;
		return suite;
	}
	collectTask(collector);
	return collector;
}
function withAwaitAsyncAssertions(fn, task) {
	return (async (...args) => {
		const fnResult = await fn(...args);
		// some async expect will be added to this array, in case user forget to await them
		if (task.promises) {
			const result = await Promise.allSettled(task.promises);
			const errors = result.map((r) => r.status === "rejected" ? r.reason : undefined).filter(Boolean);
			if (errors.length) {
				throw errors;
			}
		}
		return fnResult;
	});
}
function createSuite() {
	function suiteFn(name, factoryOrOptions, optionsOrFactory) {
		var _currentSuite$options;
		if (getCurrentTest()) {
			throw new Error("Calling the suite function inside test function is not allowed. It can be only called at the top level or inside another suite function.");
		}
		let mode = this.only ? "only" : this.skip ? "skip" : this.todo ? "todo" : "run";
		const currentSuite = collectorContext.currentSuite || defaultSuite;
		let { options, handler: factory } = parseArguments(factoryOrOptions, optionsOrFactory);
		if (mode === "run" && !factory) {
			mode = "todo";
		}
		const isConcurrentSpecified = options.concurrent || this.concurrent || options.sequential === false;
		const isSequentialSpecified = options.sequential || this.sequential || options.concurrent === false;
		// inherit options from current suite
		options = {
			...currentSuite === null || currentSuite === void 0 ? void 0 : currentSuite.options,
			...options,
			shuffle: this.shuffle ?? options.shuffle ?? (currentSuite === null || currentSuite === void 0 || (_currentSuite$options = currentSuite.options) === null || _currentSuite$options === void 0 ? void 0 : _currentSuite$options.shuffle) ?? (runner === null || runner === void 0 ? void 0 : runner.config.sequence.shuffle)
		};
		// inherit concurrent / sequential from suite
		const isConcurrent = isConcurrentSpecified || options.concurrent && !isSequentialSpecified;
		const isSequential = isSequentialSpecified || options.sequential && !isConcurrentSpecified;
		options.concurrent = isConcurrent && !isSequential;
		options.sequential = isSequential && !isConcurrent;
		return createSuiteCollector(formatName(name), factory, mode, this.each, options, currentSuite === null || currentSuite === void 0 ? void 0 : currentSuite.fixtures());
	}
	suiteFn.each = function(cases, ...args) {
		const suite = this.withContext();
		this.setContext("each", true);
		if (Array.isArray(cases) && args.length) {
			cases = formatTemplateString(cases, args);
		}
		return (name, optionsOrFn, fnOrOptions) => {
			const _name = formatName(name);
			const arrayOnlyCases = cases.every(Array.isArray);
			const { options, handler } = parseArguments(optionsOrFn, fnOrOptions);
			const fnFirst = typeof optionsOrFn === "function";
			cases.forEach((i, idx) => {
				const items = Array.isArray(i) ? i : [i];
				if (fnFirst) {
					if (arrayOnlyCases) {
						suite(formatTitle(_name, items, idx), handler ? () => handler(...items) : undefined, options.timeout);
					} else {
						suite(formatTitle(_name, items, idx), handler ? () => handler(i) : undefined, options.timeout);
					}
				} else {
					if (arrayOnlyCases) {
						suite(formatTitle(_name, items, idx), options, handler ? () => handler(...items) : undefined);
					} else {
						suite(formatTitle(_name, items, idx), options, handler ? () => handler(i) : undefined);
					}
				}
			});
			this.setContext("each", undefined);
		};
	};
	suiteFn.for = function(cases, ...args) {
		if (Array.isArray(cases) && args.length) {
			cases = formatTemplateString(cases, args);
		}
		return (name, optionsOrFn, fnOrOptions) => {
			const name_ = formatName(name);
			const { options, handler } = parseArguments(optionsOrFn, fnOrOptions);
			cases.forEach((item, idx) => {
				suite(formatTitle(name_, toArray(item), idx), options, handler ? () => handler(item) : undefined);
			});
		};
	};
	suiteFn.skipIf = (condition) => condition ? suite.skip : suite;
	suiteFn.runIf = (condition) => condition ? suite : suite.skip;
	return createChainable([
		"concurrent",
		"sequential",
		"shuffle",
		"skip",
		"only",
		"todo"
	], suiteFn);
}
function createTaskCollector(fn, context) {
	const taskFn = fn;
	taskFn.each = function(cases, ...args) {
		const test = this.withContext();
		this.setContext("each", true);
		if (Array.isArray(cases) && args.length) {
			cases = formatTemplateString(cases, args);
		}
		return (name, optionsOrFn, fnOrOptions) => {
			const _name = formatName(name);
			const arrayOnlyCases = cases.every(Array.isArray);
			const { options, handler } = parseArguments(optionsOrFn, fnOrOptions);
			const fnFirst = typeof optionsOrFn === "function";
			cases.forEach((i, idx) => {
				const items = Array.isArray(i) ? i : [i];
				if (fnFirst) {
					if (arrayOnlyCases) {
						test(formatTitle(_name, items, idx), handler ? () => handler(...items) : undefined, options.timeout);
					} else {
						test(formatTitle(_name, items, idx), handler ? () => handler(i) : undefined, options.timeout);
					}
				} else {
					if (arrayOnlyCases) {
						test(formatTitle(_name, items, idx), options, handler ? () => handler(...items) : undefined);
					} else {
						test(formatTitle(_name, items, idx), options, handler ? () => handler(i) : undefined);
					}
				}
			});
			this.setContext("each", undefined);
		};
	};
	taskFn.for = function(cases, ...args) {
		const test = this.withContext();
		if (Array.isArray(cases) && args.length) {
			cases = formatTemplateString(cases, args);
		}
		return (name, optionsOrFn, fnOrOptions) => {
			const _name = formatName(name);
			const { options, handler } = parseArguments(optionsOrFn, fnOrOptions);
			cases.forEach((item, idx) => {
				// monkey-patch handler to allow parsing fixture
				const handlerWrapper = handler ? (ctx) => handler(item, ctx) : undefined;
				if (handlerWrapper) {
					handlerWrapper.__VITEST_FIXTURE_INDEX__ = 1;
					handlerWrapper.toString = () => handler.toString();
				}
				test(formatTitle(_name, toArray(item), idx), options, handlerWrapper);
			});
		};
	};
	taskFn.skipIf = function(condition) {
		return condition ? this.skip : this;
	};
	taskFn.runIf = function(condition) {
		return condition ? this : this.skip;
	};
	taskFn.scoped = function(fixtures) {
		const collector = getCurrentSuite();
		collector.scoped(fixtures);
	};
	taskFn.extend = function(fixtures) {
		const _context = mergeContextFixtures(fixtures, context || {}, runner);
		const originalWrapper = fn;
		return createTest(function(name, optionsOrFn, optionsOrTest) {
			const collector = getCurrentSuite();
			const scopedFixtures = collector.fixtures();
			const context = { ...this };
			if (scopedFixtures) {
				context.fixtures = mergeScopedFixtures(context.fixtures || [], scopedFixtures);
			}
			originalWrapper.call(context, formatName(name), optionsOrFn, optionsOrTest);
		}, _context);
	};
	taskFn.beforeEach = beforeEach;
	taskFn.afterEach = afterEach;
	taskFn.beforeAll = beforeAll;
	taskFn.afterAll = afterAll;
	const _test = createChainable([
		"concurrent",
		"sequential",
		"skip",
		"only",
		"todo",
		"fails"
	], taskFn);
	if (context) {
		_test.mergeContext(context);
	}
	return _test;
}
function createTest(fn, context) {
	return createTaskCollector(fn, context);
}
function formatName(name) {
	return typeof name === "string" ? name : typeof name === "function" ? name.name || "<anonymous>" : String(name);
}
function formatTitle(template, items, idx) {
	if (template.includes("%#") || template.includes("%$")) {
		// '%#' match index of the test case
		template = template.replace(/%%/g, "__vitest_escaped_%__").replace(/%#/g, `${idx}`).replace(/%\$/g, `${idx + 1}`).replace(/__vitest_escaped_%__/g, "%%");
	}
	const count = template.split("%").length - 1;
	if (template.includes("%f")) {
		const placeholders = template.match(/%f/g) || [];
		placeholders.forEach((_, i) => {
			if (isNegativeNaN(items[i]) || Object.is(items[i], -0)) {
				// Replace the i-th occurrence of '%f' with '-%f'
				let occurrence = 0;
				template = template.replace(/%f/g, (match) => {
					occurrence++;
					return occurrence === i + 1 ? "-%f" : match;
				});
			}
		});
	}
	const isObjectItem = isObject(items[0]);
	function formatAttribute(s) {
		return s.replace(/\$([$\w.]+)/g, (_, key) => {
			var _runner$config;
			const isArrayKey = /^\d+$/.test(key);
			if (!isObjectItem && !isArrayKey) {
				return `$${key}`;
			}
			const arrayElement = isArrayKey ? objectAttr(items, key) : undefined;
			const value = isObjectItem ? objectAttr(items[0], key, arrayElement) : arrayElement;
			return objDisplay(value, { truncate: runner === null || runner === void 0 || (_runner$config = runner.config) === null || _runner$config === void 0 || (_runner$config = _runner$config.chaiConfig) === null || _runner$config === void 0 ? void 0 : _runner$config.truncateThreshold });
		});
	}
	let output = "";
	let i = 0;
	handleRegexMatch(
		template,
		formatRegExp,
		// format "%"
		(match) => {
			if (i < count) {
				output += format(match[0], items[i++]);
			} else {
				output += match[0];
			}
		},
		// format "$"
		(nonMatch) => {
			output += formatAttribute(nonMatch);
		}
	);
	return output;
}
// based on https://github.com/unocss/unocss/blob/2e74b31625bbe3b9c8351570749aa2d3f799d919/packages/autocomplete/src/parse.ts#L11
function handleRegexMatch(input, regex, onMatch, onNonMatch) {
	let lastIndex = 0;
	for (const m of input.matchAll(regex)) {
		if (lastIndex < m.index) {
			onNonMatch(input.slice(lastIndex, m.index));
		}
		onMatch(m);
		lastIndex = m.index + m[0].length;
	}
	if (lastIndex < input.length) {
		onNonMatch(input.slice(lastIndex));
	}
}
function formatTemplateString(cases, args) {
	const header = cases.join("").trim().replace(/ /g, "").split("\n").map((i) => i.split("|"))[0];
	const res = [];
	for (let i = 0; i < Math.floor(args.length / header.length); i++) {
		const oneCase = {};
		for (let j = 0; j < header.length; j++) {
			oneCase[header[j]] = args[i * header.length + j];
		}
		res.push(oneCase);
	}
	return res;
}

const now$2 = Date.now;
const collectorContext = {
	tasks: [],
	currentSuite: null
};
function collectTask(task) {
	var _collectorContext$cur;
	(_collectorContext$cur = collectorContext.currentSuite) === null || _collectorContext$cur === void 0 ? void 0 : _collectorContext$cur.tasks.push(task);
}
async function runWithSuite(suite, fn) {
	const prev = collectorContext.currentSuite;
	collectorContext.currentSuite = suite;
	await fn();
	collectorContext.currentSuite = prev;
}
function withTimeout(fn, timeout, isHook = false, stackTraceError, onTimeout) {
	if (timeout <= 0 || timeout === Number.POSITIVE_INFINITY) {
		return fn;
	}
	const { setTimeout, clearTimeout } = getSafeTimers();
	// this function name is used to filter error in test/cli/test/fails.test.ts
	return (function runWithTimeout(...args) {
		const startTime = now$2();
		const runner = getRunner();
		runner._currentTaskStartTime = startTime;
		runner._currentTaskTimeout = timeout;
		return new Promise((resolve_, reject_) => {
			var _timer$unref;
			const timer = setTimeout(() => {
				clearTimeout(timer);
				rejectTimeoutError();
			}, timeout);
			// `unref` might not exist in browser
			(_timer$unref = timer.unref) === null || _timer$unref === void 0 ? void 0 : _timer$unref.call(timer);
			function rejectTimeoutError() {
				const error = makeTimeoutError(isHook, timeout, stackTraceError);
				onTimeout === null || onTimeout === void 0 ? void 0 : onTimeout(args, error);
				reject_(error);
			}
			function resolve(result) {
				runner._currentTaskStartTime = undefined;
				runner._currentTaskTimeout = undefined;
				clearTimeout(timer);
				// if test/hook took too long in microtask, setTimeout won't be triggered,
				// but we still need to fail the test, see
				// https://github.com/vitest-dev/vitest/issues/2920
				if (now$2() - startTime >= timeout) {
					rejectTimeoutError();
					return;
				}
				resolve_(result);
			}
			function reject(error) {
				runner._currentTaskStartTime = undefined;
				runner._currentTaskTimeout = undefined;
				clearTimeout(timer);
				reject_(error);
			}
			// sync test/hook will be caught by try/catch
			try {
				const result = fn(...args);
				// the result is a thenable, we don't wrap this in Promise.resolve
				// to avoid creating new promises
				if (typeof result === "object" && result != null && typeof result.then === "function") {
					result.then(resolve, reject);
				} else {
					resolve(result);
				}
			} 
			// user sync test/hook throws an error
catch (error) {
				reject(error);
			}
		});
	});
}
const abortControllers = new WeakMap();
function abortIfTimeout([context], error) {
	if (context) {
		abortContextSignal(context, error);
	}
}
function abortContextSignal(context, error) {
	const abortController = abortControllers.get(context);
	abortController === null || abortController === void 0 ? void 0 : abortController.abort(error);
}
function createTestContext(test, runner) {
	var _runner$extendTaskCon;
	const context = function() {
		throw new Error("done() callback is deprecated, use promise instead");
	};
	let abortController = abortControllers.get(context);
	if (!abortController) {
		abortController = new AbortController();
		abortControllers.set(context, abortController);
	}
	context.signal = abortController.signal;
	context.task = test;
	context.skip = (condition, note) => {
		if (condition === false) {
			// do nothing
			return undefined;
		}
		test.result ?? (test.result = { state: "skip" });
		test.result.pending = true;
		throw new PendingError("test is skipped; abort execution", test, typeof condition === "string" ? condition : note);
	};
	context.annotate = ((message, type, attachment) => {
		if (test.result && test.result.state !== "run") {
			throw new Error(`Cannot annotate tests outside of the test run. The test "${test.name}" finished running with the "${test.result.state}" state already.`);
		}
		const annotation = {
			message,
			type: typeof type === "object" || type === undefined ? "notice" : type
		};
		const annotationAttachment = typeof type === "object" ? type : attachment;
		if (annotationAttachment) {
			annotation.attachment = annotationAttachment;
			manageArtifactAttachment(annotation.attachment);
		}
		return recordAsyncOperation(test, recordArtifact(test, {
			type: "internal:annotation",
			annotation
		}).then(async ({ annotation }) => {
			if (!runner.onTestAnnotate) {
				throw new Error(`Test runner doesn't support test annotations.`);
			}
			await finishSendTasksUpdate(runner);
			const resolvedAnnotation = await runner.onTestAnnotate(test, annotation);
			test.annotations.push(resolvedAnnotation);
			return resolvedAnnotation;
		}));
	});
	context.onTestFailed = (handler, timeout) => {
		test.onFailed || (test.onFailed = []);
		test.onFailed.push(withTimeout(handler, timeout ?? runner.config.hookTimeout, true, new Error("STACK_TRACE_ERROR"), (_, error) => abortController.abort(error)));
	};
	context.onTestFinished = (handler, timeout) => {
		test.onFinished || (test.onFinished = []);
		test.onFinished.push(withTimeout(handler, timeout ?? runner.config.hookTimeout, true, new Error("STACK_TRACE_ERROR"), (_, error) => abortController.abort(error)));
	};
	return ((_runner$extendTaskCon = runner.extendTaskContext) === null || _runner$extendTaskCon === void 0 ? void 0 : _runner$extendTaskCon.call(runner, context)) || context;
}
function makeTimeoutError(isHook, timeout, stackTraceError) {
	const message = `${isHook ? "Hook" : "Test"} timed out in ${timeout}ms.\nIf this is a long-running ${isHook ? "hook" : "test"}, pass a timeout value as the last argument or configure it globally with "${isHook ? "hookTimeout" : "testTimeout"}".`;
	const error = new Error(message);
	if (stackTraceError === null || stackTraceError === void 0 ? void 0 : stackTraceError.stack) {
		error.stack = stackTraceError.stack.replace(error.message, stackTraceError.message);
	}
	return error;
}
const fileContexts = new WeakMap();
function getFileContext(file) {
	const context = fileContexts.get(file);
	if (!context) {
		throw new Error(`Cannot find file context for ${file.name}`);
	}
	return context;
}
function setFileContext(file, context) {
	fileContexts.set(file, context);
}

async function runSetupFiles(config, files, runner) {
	if (config.sequence.setupFiles === "parallel") {
		await Promise.all(files.map(async (fsPath) => {
			await runner.importFile(fsPath, "setup");
		}));
	} else {
		for (const fsPath of files) {
			await runner.importFile(fsPath, "setup");
		}
	}
}

const now$1 = globalThis.performance ? globalThis.performance.now.bind(globalThis.performance) : Date.now;
async function collectTests(specs, runner) {
	const files = [];
	const config = runner.config;
	const $ = runner.trace;
	for (const spec of specs) {
		const filepath = typeof spec === "string" ? spec : spec.filepath;
		await $("collect_spec", { "code.file.path": filepath }, async () => {
			var _runner$onCollectStar;
			const testLocations = typeof spec === "string" ? undefined : spec.testLocations;
			const file = createFileTask(filepath, config.root, config.name, runner.pool, runner.viteEnvironment);
			setFileContext(file, Object.create(null));
			file.shuffle = config.sequence.shuffle;
			(_runner$onCollectStar = runner.onCollectStart) === null || _runner$onCollectStar === void 0 ? void 0 : _runner$onCollectStar.call(runner, file);
			clearCollectorContext(file, runner);
			try {
				var _runner$getImportDura;
				const setupFiles = toArray(config.setupFiles);
				if (setupFiles.length) {
					const setupStart = now$1();
					await runSetupFiles(config, setupFiles, runner);
					const setupEnd = now$1();
					file.setupDuration = setupEnd - setupStart;
				} else {
					file.setupDuration = 0;
				}
				const collectStart = now$1();
				await runner.importFile(filepath, "collect");
				const durations = (_runner$getImportDura = runner.getImportDurations) === null || _runner$getImportDura === void 0 ? void 0 : _runner$getImportDura.call(runner);
				if (durations) {
					file.importDurations = durations;
				}
				const defaultTasks = await getDefaultSuite().collect(file);
				const fileHooks = createSuiteHooks();
				mergeHooks(fileHooks, getHooks(defaultTasks));
				for (const c of [...defaultTasks.tasks, ...collectorContext.tasks]) {
					if (c.type === "test" || c.type === "suite") {
						file.tasks.push(c);
					} else if (c.type === "collector") {
						const suite = await c.collect(file);
						if (suite.name || suite.tasks.length) {
							mergeHooks(fileHooks, getHooks(suite));
							file.tasks.push(suite);
						}
					} else {
						// check that types are exhausted
						c;
					}
				}
				setHooks(file, fileHooks);
				file.collectDuration = now$1() - collectStart;
			} catch (e) {
				var _runner$getImportDura2;
				const error = processError(e);
				file.result = {
					state: "fail",
					errors: [error]
				};
				const durations = (_runner$getImportDura2 = runner.getImportDurations) === null || _runner$getImportDura2 === void 0 ? void 0 : _runner$getImportDura2.call(runner);
				if (durations) {
					file.importDurations = durations;
				}
			}
			calculateSuiteHash(file);
			const hasOnlyTasks = someTasksAreOnly(file);
			interpretTaskModes(file, config.testNamePattern, testLocations, hasOnlyTasks, false, config.allowOnly);
			if (file.mode === "queued") {
				file.mode = "run";
			}
			files.push(file);
		});
	}
	return files;
}
function mergeHooks(baseHooks, hooks) {
	for (const _key in hooks) {
		const key = _key;
		baseHooks[key].push(...hooks[key]);
	}
	return baseHooks;
}

const now = globalThis.performance ? globalThis.performance.now.bind(globalThis.performance) : Date.now;
const unixNow = Date.now;
const { clearTimeout, setTimeout } = getSafeTimers();
function updateSuiteHookState(task, name, state, runner) {
	if (!task.result) {
		task.result = { state: "run" };
	}
	if (!task.result.hooks) {
		task.result.hooks = {};
	}
	const suiteHooks = task.result.hooks;
	if (suiteHooks) {
		suiteHooks[name] = state;
		let event = state === "run" ? "before-hook-start" : "before-hook-end";
		if (name === "afterAll" || name === "afterEach") {
			event = state === "run" ? "after-hook-start" : "after-hook-end";
		}
		updateTask(event, task, runner);
	}
}
function getSuiteHooks(suite, name, sequence) {
	const hooks = getHooks(suite)[name];
	if (sequence === "stack" && (name === "afterAll" || name === "afterEach")) {
		return hooks.slice().reverse();
	}
	return hooks;
}
async function callTestHooks(runner, test, hooks, sequence) {
	if (sequence === "stack") {
		hooks = hooks.slice().reverse();
	}
	if (!hooks.length) {
		return;
	}
	const context = test.context;
	const onTestFailed = test.context.onTestFailed;
	const onTestFinished = test.context.onTestFinished;
	context.onTestFailed = () => {
		throw new Error(`Cannot call "onTestFailed" inside a test hook.`);
	};
	context.onTestFinished = () => {
		throw new Error(`Cannot call "onTestFinished" inside a test hook.`);
	};
	if (sequence === "parallel") {
		try {
			await Promise.all(hooks.map((fn) => fn(test.context)));
		} catch (e) {
			failTask(test.result, e, runner.config.diffOptions);
		}
	} else {
		for (const fn of hooks) {
			try {
				await fn(test.context);
			} catch (e) {
				failTask(test.result, e, runner.config.diffOptions);
			}
		}
	}
	context.onTestFailed = onTestFailed;
	context.onTestFinished = onTestFinished;
}
async function callSuiteHook(suite, currentTask, name, runner, args) {
	const sequence = runner.config.sequence.hooks;
	const callbacks = [];
	// stop at file level
	const parentSuite = "filepath" in suite ? null : suite.suite || suite.file;
	if (name === "beforeEach" && parentSuite) {
		callbacks.push(...await callSuiteHook(parentSuite, currentTask, name, runner, args));
	}
	const hooks = getSuiteHooks(suite, name, sequence);
	if (hooks.length > 0) {
		updateSuiteHookState(currentTask, name, "run", runner);
	}
	async function runHook(hook) {
		return getBeforeHookCleanupCallback(hook, await hook(...args), name === "beforeEach" ? args[0] : undefined);
	}
	if (sequence === "parallel") {
		callbacks.push(...await Promise.all(hooks.map((hook) => runHook(hook))));
	} else {
		for (const hook of hooks) {
			callbacks.push(await runHook(hook));
		}
	}
	if (hooks.length > 0) {
		updateSuiteHookState(currentTask, name, "pass", runner);
	}
	if (name === "afterEach" && parentSuite) {
		callbacks.push(...await callSuiteHook(parentSuite, currentTask, name, runner, args));
	}
	return callbacks;
}
const packs = new Map();
const eventsPacks = [];
const pendingTasksUpdates = [];
function sendTasksUpdate(runner) {
	if (packs.size) {
		var _runner$onTaskUpdate;
		const taskPacks = Array.from(packs).map(([id, task]) => {
			return [
				id,
				task[0],
				task[1]
			];
		});
		const p = (_runner$onTaskUpdate = runner.onTaskUpdate) === null || _runner$onTaskUpdate === void 0 ? void 0 : _runner$onTaskUpdate.call(runner, taskPacks, eventsPacks);
		if (p) {
			pendingTasksUpdates.push(p);
			// remove successful promise to not grow array indefnitely,
			// but keep rejections so finishSendTasksUpdate can handle them
			p.then(() => pendingTasksUpdates.splice(pendingTasksUpdates.indexOf(p), 1), () => {});
		}
		eventsPacks.length = 0;
		packs.clear();
	}
}
async function finishSendTasksUpdate(runner) {
	sendTasksUpdate(runner);
	await Promise.all(pendingTasksUpdates);
}
function throttle(fn, ms) {
	let last = 0;
	let pendingCall;
	return function call(...args) {
		const now = unixNow();
		if (now - last > ms) {
			last = now;
			clearTimeout(pendingCall);
			pendingCall = undefined;
			return fn.apply(this, args);
		}
		// Make sure fn is still called even if there are no further calls
		pendingCall ?? (pendingCall = setTimeout(() => call.bind(this)(...args), ms));
	};
}
// throttle based on summary reporter's DURATION_UPDATE_INTERVAL_MS
const sendTasksUpdateThrottled = throttle(sendTasksUpdate, 100);
function updateTask(event, task, runner) {
	eventsPacks.push([
		task.id,
		event,
		undefined
	]);
	packs.set(task.id, [task.result, task.meta]);
	sendTasksUpdateThrottled(runner);
}
async function callCleanupHooks(runner, cleanups) {
	const sequence = runner.config.sequence.hooks;
	if (sequence === "stack") {
		cleanups = cleanups.slice().reverse();
	}
	if (sequence === "parallel") {
		await Promise.all(cleanups.map(async (fn) => {
			if (typeof fn !== "function") {
				return;
			}
			await fn();
		}));
	} else {
		for (const fn of cleanups) {
			if (typeof fn !== "function") {
				continue;
			}
			await fn();
		}
	}
}
async function runTest(test, runner) {
	var _runner$onBeforeRunTa, _test$result, _runner$onAfterRunTas;
	await ((_runner$onBeforeRunTa = runner.onBeforeRunTask) === null || _runner$onBeforeRunTa === void 0 ? void 0 : _runner$onBeforeRunTa.call(runner, test));
	if (test.mode !== "run" && test.mode !== "queued") {
		updateTask("test-prepare", test, runner);
		updateTask("test-finished", test, runner);
		return;
	}
	if (((_test$result = test.result) === null || _test$result === void 0 ? void 0 : _test$result.state) === "fail") {
		// should not be possible to get here, I think this is just copy pasted from suite
		// TODO: maybe someone fails tests in `beforeAll` hooks?
		// https://github.com/vitest-dev/vitest/pull/7069
		updateTask("test-failed-early", test, runner);
		return;
	}
	const start = now();
	test.result = {
		state: "run",
		startTime: unixNow(),
		retryCount: 0
	};
	updateTask("test-prepare", test, runner);
	const cleanupRunningTest = addRunningTest(test);
	setCurrentTest(test);
	const suite = test.suite || test.file;
	const $ = runner.trace;
	const repeats = test.repeats ?? 0;
	for (let repeatCount = 0; repeatCount <= repeats; repeatCount++) {
		const retry = test.retry ?? 0;
		for (let retryCount = 0; retryCount <= retry; retryCount++) {
			var _test$onFinished, _test$onFailed, _runner$onAfterRetryT, _test$result2, _test$result3;
			let beforeEachCleanups = [];
			try {
				var _runner$onBeforeTryTa, _runner$onAfterTryTas;
				await ((_runner$onBeforeTryTa = runner.onBeforeTryTask) === null || _runner$onBeforeTryTa === void 0 ? void 0 : _runner$onBeforeTryTa.call(runner, test, {
					retry: retryCount,
					repeats: repeatCount
				}));
				test.result.repeatCount = repeatCount;
				beforeEachCleanups = await $("test.beforeEach", () => callSuiteHook(suite, test, "beforeEach", runner, [test.context, suite]));
				if (runner.runTask) {
					await $("test.callback", () => runner.runTask(test));
				} else {
					const fn = getFn(test);
					if (!fn) {
						throw new Error("Test function is not found. Did you add it using `setFn`?");
					}
					await $("test.callback", () => fn());
				}
				await ((_runner$onAfterTryTas = runner.onAfterTryTask) === null || _runner$onAfterTryTas === void 0 ? void 0 : _runner$onAfterTryTas.call(runner, test, {
					retry: retryCount,
					repeats: repeatCount
				}));
				if (test.result.state !== "fail") {
					if (!test.repeats) {
						test.result.state = "pass";
					} else if (test.repeats && retry === retryCount) {
						test.result.state = "pass";
					}
				}
			} catch (e) {
				failTask(test.result, e, runner.config.diffOptions);
			}
			try {
				var _runner$onTaskFinishe;
				await ((_runner$onTaskFinishe = runner.onTaskFinished) === null || _runner$onTaskFinishe === void 0 ? void 0 : _runner$onTaskFinishe.call(runner, test));
			} catch (e) {
				failTask(test.result, e, runner.config.diffOptions);
			}
			try {
				await $("test.afterEach", () => callSuiteHook(suite, test, "afterEach", runner, [test.context, suite]));
				if (beforeEachCleanups.length) {
					await $("test.cleanup", () => callCleanupHooks(runner, beforeEachCleanups));
				}
				await callFixtureCleanup(test.context);
			} catch (e) {
				failTask(test.result, e, runner.config.diffOptions);
			}
			if ((_test$onFinished = test.onFinished) === null || _test$onFinished === void 0 ? void 0 : _test$onFinished.length) {
				await $("test.onFinished", () => callTestHooks(runner, test, test.onFinished, "stack"));
			}
			if (test.result.state === "fail" && ((_test$onFailed = test.onFailed) === null || _test$onFailed === void 0 ? void 0 : _test$onFailed.length)) {
				await $("test.onFailed", () => callTestHooks(runner, test, test.onFailed, runner.config.sequence.hooks));
			}
			test.onFailed = undefined;
			test.onFinished = undefined;
			await ((_runner$onAfterRetryT = runner.onAfterRetryTask) === null || _runner$onAfterRetryT === void 0 ? void 0 : _runner$onAfterRetryT.call(runner, test, {
				retry: retryCount,
				repeats: repeatCount
			}));
			// skipped with new PendingError
			if (((_test$result2 = test.result) === null || _test$result2 === void 0 ? void 0 : _test$result2.pending) || ((_test$result3 = test.result) === null || _test$result3 === void 0 ? void 0 : _test$result3.state) === "skip") {
				var _test$result4;
				test.mode = "skip";
				test.result = {
					state: "skip",
					note: (_test$result4 = test.result) === null || _test$result4 === void 0 ? void 0 : _test$result4.note,
					pending: true,
					duration: now() - start
				};
				updateTask("test-finished", test, runner);
				setCurrentTest(undefined);
				cleanupRunningTest();
				return;
			}
			if (test.result.state === "pass") {
				break;
			}
			if (retryCount < retry) {
				// reset state when retry test
				test.result.state = "run";
				test.result.retryCount = (test.result.retryCount ?? 0) + 1;
			}
			// update retry info
			updateTask("test-retried", test, runner);
		}
	}
	// if test is marked to be failed, flip the result
	if (test.fails) {
		if (test.result.state === "pass") {
			const error = processError(new Error("Expect test to fail"));
			test.result.state = "fail";
			test.result.errors = [error];
		} else {
			test.result.state = "pass";
			test.result.errors = undefined;
		}
	}
	cleanupRunningTest();
	setCurrentTest(undefined);
	test.result.duration = now() - start;
	await ((_runner$onAfterRunTas = runner.onAfterRunTask) === null || _runner$onAfterRunTas === void 0 ? void 0 : _runner$onAfterRunTas.call(runner, test));
	updateTask("test-finished", test, runner);
}
function failTask(result, err, diffOptions) {
	if (err instanceof PendingError) {
		result.state = "skip";
		result.note = err.note;
		result.pending = true;
		return;
	}
	result.state = "fail";
	const errors = Array.isArray(err) ? err : [err];
	for (const e of errors) {
		const error = processError(e, diffOptions);
		result.errors ?? (result.errors = []);
		result.errors.push(error);
	}
}
function markTasksAsSkipped(suite, runner) {
	suite.tasks.forEach((t) => {
		t.mode = "skip";
		t.result = {
			...t.result,
			state: "skip"
		};
		updateTask("test-finished", t, runner);
		if (t.type === "suite") {
			markTasksAsSkipped(t, runner);
		}
	});
}
async function runSuite(suite, runner) {
	var _runner$onBeforeRunSu, _suite$result;
	await ((_runner$onBeforeRunSu = runner.onBeforeRunSuite) === null || _runner$onBeforeRunSu === void 0 ? void 0 : _runner$onBeforeRunSu.call(runner, suite));
	if (((_suite$result = suite.result) === null || _suite$result === void 0 ? void 0 : _suite$result.state) === "fail") {
		markTasksAsSkipped(suite, runner);
		// failed during collection
		updateTask("suite-failed-early", suite, runner);
		return;
	}
	const start = now();
	const mode = suite.mode;
	suite.result = {
		state: mode === "skip" || mode === "todo" ? mode : "run",
		startTime: unixNow()
	};
	const $ = runner.trace;
	updateTask("suite-prepare", suite, runner);
	let beforeAllCleanups = [];
	if (suite.mode === "skip") {
		suite.result.state = "skip";
		updateTask("suite-finished", suite, runner);
	} else if (suite.mode === "todo") {
		suite.result.state = "todo";
		updateTask("suite-finished", suite, runner);
	} else {
		var _runner$onAfterRunSui;
		try {
			try {
				beforeAllCleanups = await $("suite.beforeAll", () => callSuiteHook(suite, suite, "beforeAll", runner, [suite]));
			} catch (e) {
				markTasksAsSkipped(suite, runner);
				throw e;
			}
			if (runner.runSuite) {
				await runner.runSuite(suite);
			} else {
				for (let tasksGroup of partitionSuiteChildren(suite)) {
					if (tasksGroup[0].concurrent === true) {
						await Promise.all(tasksGroup.map((c) => runSuiteChild(c, runner)));
					} else {
						const { sequence } = runner.config;
						if (suite.shuffle) {
							// run describe block independently from tests
							const suites = tasksGroup.filter((group) => group.type === "suite");
							const tests = tasksGroup.filter((group) => group.type === "test");
							const groups = shuffle([suites, tests], sequence.seed);
							tasksGroup = groups.flatMap((group) => shuffle(group, sequence.seed));
						}
						for (const c of tasksGroup) {
							await runSuiteChild(c, runner);
						}
					}
				}
			}
		} catch (e) {
			failTask(suite.result, e, runner.config.diffOptions);
		}
		try {
			await $("suite.afterAll", () => callSuiteHook(suite, suite, "afterAll", runner, [suite]));
			if (beforeAllCleanups.length) {
				await $("suite.cleanup", () => callCleanupHooks(runner, beforeAllCleanups));
			}
			if (suite.file === suite) {
				const context = getFileContext(suite);
				await callFixtureCleanup(context);
			}
		} catch (e) {
			failTask(suite.result, e, runner.config.diffOptions);
		}
		if (suite.mode === "run" || suite.mode === "queued") {
			if (!runner.config.passWithNoTests && !hasTests(suite)) {
				var _suite$result$errors;
				suite.result.state = "fail";
				if (!((_suite$result$errors = suite.result.errors) === null || _suite$result$errors === void 0 ? void 0 : _suite$result$errors.length)) {
					const error = processError(new Error(`No test found in suite ${suite.name}`));
					suite.result.errors = [error];
				}
			} else if (hasFailed(suite)) {
				suite.result.state = "fail";
			} else {
				suite.result.state = "pass";
			}
		}
		suite.result.duration = now() - start;
		await ((_runner$onAfterRunSui = runner.onAfterRunSuite) === null || _runner$onAfterRunSui === void 0 ? void 0 : _runner$onAfterRunSui.call(runner, suite));
		updateTask("suite-finished", suite, runner);
	}
}
let limitMaxConcurrency;
async function runSuiteChild(c, runner) {
	const $ = runner.trace;
	if (c.type === "test") {
		return limitMaxConcurrency(() => {
			var _c$location, _c$location2;
			return $("run.test", {
				"vitest.test.id": c.id,
				"vitest.test.name": c.name,
				"vitest.test.mode": c.mode,
				"vitest.test.timeout": c.timeout,
				"code.file.path": c.file.filepath,
				"code.line.number": (_c$location = c.location) === null || _c$location === void 0 ? void 0 : _c$location.line,
				"code.column.number": (_c$location2 = c.location) === null || _c$location2 === void 0 ? void 0 : _c$location2.column
			}, () => runTest(c, runner));
		});
	} else if (c.type === "suite") {
		var _c$location3, _c$location4;
		return $("run.suite", {
			"vitest.suite.id": c.id,
			"vitest.suite.name": c.name,
			"vitest.suite.mode": c.mode,
			"code.file.path": c.file.filepath,
			"code.line.number": (_c$location3 = c.location) === null || _c$location3 === void 0 ? void 0 : _c$location3.line,
			"code.column.number": (_c$location4 = c.location) === null || _c$location4 === void 0 ? void 0 : _c$location4.column
		}, () => runSuite(c, runner));
	}
}
async function runFiles(files, runner) {
	limitMaxConcurrency ?? (limitMaxConcurrency = limitConcurrency(runner.config.maxConcurrency));
	for (const file of files) {
		if (!file.tasks.length && !runner.config.passWithNoTests) {
			var _file$result;
			if (!((_file$result = file.result) === null || _file$result === void 0 || (_file$result = _file$result.errors) === null || _file$result === void 0 ? void 0 : _file$result.length)) {
				const error = processError(new Error(`No test suite found in file ${file.filepath}`));
				file.result = {
					state: "fail",
					errors: [error]
				};
			}
		}
		await runner.trace("run.spec", {
			"code.file.path": file.filepath,
			"vitest.suite.tasks.length": file.tasks.length
		}, () => runSuite(file, runner));
	}
}
const workerRunners = new WeakSet();
function defaultTrace(_, attributes, cb) {
	if (typeof attributes === "function") {
		return attributes();
	}
	return cb();
}
async function startTests(specs, runner) {
	var _runner$cancel;
	runner.trace ?? (runner.trace = defaultTrace);
	const cancel = (_runner$cancel = runner.cancel) === null || _runner$cancel === void 0 ? void 0 : _runner$cancel.bind(runner);
	// Ideally, we need to have an event listener for this, but only have a runner here.
	// Adding another onCancel felt wrong (maybe it needs to be refactored)
	runner.cancel = (reason) => {
		// We intentionally create only one error since there is only one test run that can be cancelled
		const error = new TestRunAbortError("The test run was aborted by the user.", reason);
		getRunningTests().forEach((test) => abortContextSignal(test.context, error));
		return cancel === null || cancel === void 0 ? void 0 : cancel(reason);
	};
	if (!workerRunners.has(runner)) {
		var _runner$onCleanupWork;
		(_runner$onCleanupWork = runner.onCleanupWorkerContext) === null || _runner$onCleanupWork === void 0 ? void 0 : _runner$onCleanupWork.call(runner, async () => {
			var _runner$getWorkerCont;
			const context = (_runner$getWorkerCont = runner.getWorkerContext) === null || _runner$getWorkerCont === void 0 ? void 0 : _runner$getWorkerCont.call(runner);
			if (context) {
				await callFixtureCleanup(context);
			}
		});
		workerRunners.add(runner);
	}
	try {
		var _runner$onBeforeColle, _runner$onCollected, _runner$onBeforeRunFi, _runner$onAfterRunFil;
		const paths = specs.map((f) => typeof f === "string" ? f : f.filepath);
		await ((_runner$onBeforeColle = runner.onBeforeCollect) === null || _runner$onBeforeColle === void 0 ? void 0 : _runner$onBeforeColle.call(runner, paths));
		const files = await collectTests(specs, runner);
		await ((_runner$onCollected = runner.onCollected) === null || _runner$onCollected === void 0 ? void 0 : _runner$onCollected.call(runner, files));
		await ((_runner$onBeforeRunFi = runner.onBeforeRunFiles) === null || _runner$onBeforeRunFi === void 0 ? void 0 : _runner$onBeforeRunFi.call(runner, files));
		await runFiles(files, runner);
		await ((_runner$onAfterRunFil = runner.onAfterRunFiles) === null || _runner$onAfterRunFil === void 0 ? void 0 : _runner$onAfterRunFil.call(runner, files));
		await finishSendTasksUpdate(runner);
		return files;
	} finally {
		runner.cancel = cancel;
	}
}
async function publicCollect(specs, runner) {
	var _runner$onBeforeColle2, _runner$onCollected2;
	runner.trace ?? (runner.trace = defaultTrace);
	const paths = specs.map((f) => typeof f === "string" ? f : f.filepath);
	await ((_runner$onBeforeColle2 = runner.onBeforeCollect) === null || _runner$onBeforeColle2 === void 0 ? void 0 : _runner$onBeforeColle2.call(runner, paths));
	const files = await collectTests(specs, runner);
	await ((_runner$onCollected2 = runner.onCollected) === null || _runner$onCollected2 === void 0 ? void 0 : _runner$onCollected2.call(runner, files));
	return files;
}

/**
* @experimental
* @advanced
*
* Records a custom test artifact during test execution.
*
* This function allows you to attach structured data, files, or metadata to a test.
*
* Vitest automatically injects the source location where the artifact was created and manages any attachments you include.
*
* @param task - The test task context, typically accessed via `this.task` in custom matchers or `context.task` in tests
* @param artifact - The artifact to record. Must extend {@linkcode TestArtifactBase}
*
* @returns A promise that resolves to the recorded artifact with location injected
*
* @throws {Error} If called after the test has finished running
* @throws {Error} If the test runner doesn't support artifacts
*
* @example
* ```ts
* // In a custom assertion
* async function toHaveValidSchema(this: MatcherState, actual: unknown) {
*   const validation = validateSchema(actual)
*
*   await recordArtifact(this.task, {
*     type: 'my-plugin:schema-validation',
*     passed: validation.valid,
*     errors: validation.errors,
*   })
*
*   return { pass: validation.valid, message: () => '...' }
* }
* ```
*/
async function recordArtifact(task, artifact) {
	const runner = getRunner();
	if (task.result && task.result.state !== "run") {
		throw new Error(`Cannot record a test artifact outside of the test run. The test "${task.name}" finished running with the "${task.result.state}" state already.`);
	}
	const stack = findTestFileStackTrace(task.file.filepath, new Error("STACK_TRACE").stack);
	if (stack) {
		artifact.location = {
			file: stack.file,
			line: stack.line,
			column: stack.column
		};
		if (artifact.type === "internal:annotation") {
			artifact.annotation.location = artifact.location;
		}
	}
	if (Array.isArray(artifact.attachments)) {
		for (const attachment of artifact.attachments) {
			manageArtifactAttachment(attachment);
		}
	}
	// annotations won't resolve as artifacts for backwards compatibility until next major
	if (artifact.type === "internal:annotation") {
		return artifact;
	}
	if (!runner.onTestArtifactRecord) {
		throw new Error(`Test runner doesn't support test artifacts.`);
	}
	await finishSendTasksUpdate(runner);
	const resolvedArtifact = await runner.onTestArtifactRecord(task, artifact);
	task.artifacts.push(resolvedArtifact);
	return resolvedArtifact;
}
const table = [];
for (let i = 65; i < 91; i++) {
	table.push(String.fromCharCode(i));
}
for (let i = 97; i < 123; i++) {
	table.push(String.fromCharCode(i));
}
for (let i = 0; i < 10; i++) {
	table.push(i.toString(10));
}
table.push("+", "/");
function encodeUint8Array(bytes) {
	let base64 = "";
	const len = bytes.byteLength;
	for (let i = 0; i < len; i += 3) {
		if (len === i + 1) {
			const a = (bytes[i] & 252) >> 2;
			const b = (bytes[i] & 3) << 4;
			base64 += table[a];
			base64 += table[b];
			base64 += "==";
		} else if (len === i + 2) {
			const a = (bytes[i] & 252) >> 2;
			const b = (bytes[i] & 3) << 4 | (bytes[i + 1] & 240) >> 4;
			const c = (bytes[i + 1] & 15) << 2;
			base64 += table[a];
			base64 += table[b];
			base64 += table[c];
			base64 += "=";
		} else {
			const a = (bytes[i] & 252) >> 2;
			const b = (bytes[i] & 3) << 4 | (bytes[i + 1] & 240) >> 4;
			const c = (bytes[i + 1] & 15) << 2 | (bytes[i + 2] & 192) >> 6;
			const d = bytes[i + 2] & 63;
			base64 += table[a];
			base64 += table[b];
			base64 += table[c];
			base64 += table[d];
		}
	}
	return base64;
}
/**
* Records an async operation associated with a test task.
*
* This function tracks promises that should be awaited before a test completes.
* The promise is automatically removed from the test's promise list once it settles.
*/
function recordAsyncOperation(test, promise) {
	// if promise is explicitly awaited, remove it from the list
	promise = promise.finally(() => {
		if (!test.promises) {
			return;
		}
		const index = test.promises.indexOf(promise);
		if (index !== -1) {
			test.promises.splice(index, 1);
		}
	});
	// record promise
	if (!test.promises) {
		test.promises = [];
	}
	test.promises.push(promise);
	return promise;
}
/**
* Validates and prepares a test attachment for serialization.
*
* This function ensures attachments have either `body` or `path` set (but not both), and converts `Uint8Array` bodies to base64-encoded strings for easier serialization.
*
* @param attachment - The attachment to validate and prepare
*
* @throws {TypeError} If neither `body` nor `path` is provided
* @throws {TypeError} If both `body` and `path` are provided
*/
function manageArtifactAttachment(attachment) {
	if (attachment.body == null && !attachment.path) {
		throw new TypeError(`Test attachment requires "body" or "path" to be set. Both are missing.`);
	}
	if (attachment.body && attachment.path) {
		throw new TypeError(`Test attachment requires only one of "body" or "path" to be set. Both are specified.`);
	}
	// convert to a string so it's easier to serialise
	if (attachment.body instanceof Uint8Array) {
		attachment.body = encodeUint8Array(attachment.body);
	}
}

export { afterAll, afterEach, beforeAll, beforeEach, publicCollect as collectTests, createTaskCollector, describe, getCurrentSuite, getCurrentTest, getFn, getHooks, it, onTestFailed, onTestFinished, recordArtifact, setFn, setHooks, startTests, suite, test, updateTask };
