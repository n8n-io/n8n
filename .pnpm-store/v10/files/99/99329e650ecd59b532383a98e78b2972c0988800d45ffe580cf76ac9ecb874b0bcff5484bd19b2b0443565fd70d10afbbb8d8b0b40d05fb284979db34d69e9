import { isObject, createDefer, toArray, isNegativeNaN, format, objectAttr, objDisplay, getSafeTimers, assertTypes, shuffle } from '@vitest/utils';
import { parseSingleStack } from '@vitest/utils/source-map';
import { c as createChainable, b as createFileTask, a as calculateSuiteHash, s as someTasksAreOnly, i as interpretTaskModes, l as limitConcurrency, p as partitionSuiteChildren, o as hasTests, n as hasFailed } from './chunk-tasks.js';
import { processError } from '@vitest/utils/error';
export { processError } from '@vitest/utils/error';
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
		fixture.deps = (_fixture$deps = fixture.deps) === null || _fixture$deps === void 0 ? void 0 : _fixture$deps.map((dep) => newFixtures[dep.prop]);
	}
	return Object.values(newFixtures);
}
function mergeContextFixtures(fixtures, context, inject) {
	const fixtureOptionKeys = ["auto", "injected"];
	const fixtureArray = Object.entries(fixtures).map(([prop, value]) => {
		const fixtureItem = { value };
		if (Array.isArray(value) && value.length >= 2 && isObject(value[1]) && Object.keys(value[1]).some((key) => fixtureOptionKeys.includes(key))) {
			Object.assign(fixtureItem, value[1]);
			const userValue = value[0];
			fixtureItem.value = fixtureItem.injected ? inject(prop) ?? userValue : userValue;
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
	fixtureArray.forEach((fixture) => {
		if (fixture.isFn) {
			const usedProps = getUsedProps(fixture.value);
			if (usedProps.length) {
				fixture.deps = context.fixtures.filter(({ prop }) => prop !== fixture.prop && usedProps.includes(prop));
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
function withFixtures(fn, testContext) {
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
				if (fixtureValueMap.has(fixture)) {
					continue;
				}
				const resolvedValue = fixture.isFn ? await resolveFixtureFunction(fixture.value, context, cleanupFnArray) : fixture.value;
				context[fixture.prop] = resolvedValue;
				fixtureValueMap.set(fixture, resolvedValue);
				cleanupFnArray.unshift(() => {
					fixtureValueMap.delete(fixture);
				});
			}
		}
		return resolveFixtures().then(() => fn(context));
	};
}
async function resolveFixtureFunction(fixtureFn, context, cleanupFnArray) {
	const useFnArgPromise = createDefer();
	let isUseFnArgResolved = false;
	const fixtureReturn = fixtureFn(context, async (useFnArg) => {
		isUseFnArgResolved = true;
		useFnArgPromise.resolve(useFnArg);
		const useReturnPromise = createDefer();
		cleanupFnArray.push(async () => {
			useReturnPromise.resolve();
			await fixtureReturn;
		});
		await useReturnPromise;
	}).catch((e) => {
		if (!isUseFnArgResolved) {
			useFnArgPromise.reject(e);
			return;
		}
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
	let fnString = fn.toString();
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
	if (!(first.startsWith("{") && first.endsWith("}"))) {
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
function splitByComma(s) {
	const result = [];
	const stack = [];
	let start = 0;
	for (let i = 0; i < s.length; i++) {
		if (s[i] === "{" || s[i] === "[") {
			stack.push(s[i] === "{" ? "}" : "]");
		} else if (s[i] === stack[stack.length - 1]) {
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
function getTestFilepath() {
	return currentTestFilepath;
}
function getRunner() {
	assert(runner, "the runner");
	return runner;
}
function createDefaultSuite(runner) {
	const config = runner.config.sequence;
	const collector = suite("", { concurrent: config.concurrent }, () => {});
	delete collector.suite;
	return collector;
}
function clearCollectorContext(filepath, currentRunner) {
	if (!defaultSuite) {
		defaultSuite = createDefaultSuite(currentRunner);
	}
	runner = currentRunner;
	currentTestFilepath = filepath;
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
function parseArguments(optionsOrFn, optionsOrTest) {
	let options = {};
	let fn = () => {};
	if (typeof optionsOrTest === "object") {
		if (typeof optionsOrFn === "object") {
			throw new TypeError("Cannot use two objects as arguments. Please provide options and a function callback in that order.");
		}
		console.warn("Using an object as a third argument is deprecated. Vitest 4 will throw an error if the third argument is not a timeout number. Please use the second argument for options. See more at https://vitest.dev/guide/migration");
		options = optionsOrTest;
	} else if (typeof optionsOrTest === "number") {
		options = { timeout: optionsOrTest };
	} else if (typeof optionsOrFn === "object") {
		options = optionsOrFn;
	}
	if (typeof optionsOrFn === "function") {
		if (typeof optionsOrTest === "function") {
			throw new TypeError("Cannot use two functions as arguments. Please use the second argument for options.");
		}
		fn = optionsOrFn;
	} else if (typeof optionsOrTest === "function") {
		fn = optionsOrTest;
	}
	return {
		options,
		handler: fn
	};
}
function createSuiteCollector(name, factory = () => {}, mode, each, suiteOptions, parentCollectorFixtures) {
	const tasks = [];
	let suite;
	initSuite(true);
	const task = function(name = "", options = {}) {
		var _collectorContext$cur;
		const timeout = (options === null || options === void 0 ? void 0 : options.timeout) ?? runner.config.testTimeout;
		const task = {
			id: "",
			name,
			suite: (_collectorContext$cur = collectorContext.currentSuite) === null || _collectorContext$cur === void 0 ? void 0 : _collectorContext$cur.suite,
			each: options.each,
			fails: options.fails,
			context: undefined,
			type: "test",
			file: undefined,
			timeout,
			retry: options.retry ?? runner.config.retry,
			repeats: options.repeats,
			mode: options.only ? "only" : options.skip ? "skip" : options.todo ? "todo" : "run",
			meta: options.meta ?? Object.create(null)
		};
		const handler = options.handler;
		if (options.concurrent || !options.sequential && runner.config.sequence.concurrent) {
			task.concurrent = true;
		}
		task.shuffle = suiteOptions === null || suiteOptions === void 0 ? void 0 : suiteOptions.shuffle;
		const context = createTestContext(task, runner);
		Object.defineProperty(task, "context", {
			value: context,
			enumerable: false
		});
		setTestFixture(context, options.fixtures);
		const limit = Error.stackTraceLimit;
		Error.stackTraceLimit = 15;
		const stackTraceError = new Error("STACK_TRACE_ERROR");
		Error.stackTraceLimit = limit;
		if (handler) {
			setFn(task, withTimeout(withAwaitAsyncAssertions(withFixtures(handler, context), task), timeout, false, stackTraceError));
		}
		if (runner.config.includeTaskLocation) {
			const error = stackTraceError.stack;
			const stack = findTestFileStackTrace(error, task.each ?? false);
			if (stack) {
				task.location = stack;
			}
		}
		tasks.push(task);
		return task;
	};
	const test = createTest(function(name, optionsOrFn, optionsOrTest) {
		let { options, handler } = parseArguments(optionsOrFn, optionsOrTest);
		if (typeof suiteOptions === "object") {
			options = Object.assign({}, suiteOptions, options);
		}
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
			const parsed = mergeContextFixtures(fixtures, { fixtures: collectorFixtures }, (key) => {
				var _getRunner$injectValu, _getRunner;
				return (_getRunner$injectValu = (_getRunner = getRunner()).injectValue) === null || _getRunner$injectValu === void 0 ? void 0 : _getRunner$injectValu.call(_getRunner, key);
			});
			if (parsed.fixtures) {
				collectorFixtures = parsed.fixtures;
			}
		}
	};
	function addHook(name, ...fn) {
		getHooks(suite)[name].push(...fn);
	}
	function initSuite(includeLocation) {
		var _collectorContext$cur2;
		if (typeof suiteOptions === "number") {
			suiteOptions = { timeout: suiteOptions };
		}
		suite = {
			id: "",
			type: "suite",
			name,
			suite: (_collectorContext$cur2 = collectorContext.currentSuite) === null || _collectorContext$cur2 === void 0 ? void 0 : _collectorContext$cur2.suite,
			mode,
			each,
			file: undefined,
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
			const stack = findTestFileStackTrace(error, suite.each ?? false);
			if (stack) {
				suite.location = stack;
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
		suite.file = file;
		suite.tasks = allChildren;
		allChildren.forEach((task) => {
			task.file = file;
		});
		return suite;
	}
	collectTask(collector);
	return collector;
}
function withAwaitAsyncAssertions(fn, task) {
	return async (...args) => {
		const fnResult = await fn(...args);
		if (task.promises) {
			const result = await Promise.allSettled(task.promises);
			const errors = result.map((r) => r.status === "rejected" ? r.reason : undefined).filter(Boolean);
			if (errors.length) {
				throw errors;
			}
		}
		return fnResult;
	};
}
function createSuite() {
	function suiteFn(name, factoryOrOptions, optionsOrFactory) {
		var _currentSuite$options;
		const mode = this.only ? "only" : this.skip ? "skip" : this.todo ? "todo" : "run";
		const currentSuite = collectorContext.currentSuite || defaultSuite;
		let { options, handler: factory } = parseArguments(factoryOrOptions, optionsOrFactory);
		const isConcurrentSpecified = options.concurrent || this.concurrent || options.sequential === false;
		const isSequentialSpecified = options.sequential || this.sequential || options.concurrent === false;
		options = {
			...currentSuite === null || currentSuite === void 0 ? void 0 : currentSuite.options,
			...options,
			shuffle: this.shuffle ?? options.shuffle ?? (currentSuite === null || currentSuite === void 0 || (_currentSuite$options = currentSuite.options) === null || _currentSuite$options === void 0 ? void 0 : _currentSuite$options.shuffle) ?? (runner === null || runner === void 0 ? void 0 : runner.config.sequence.shuffle)
		};
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
			const fnFirst = typeof optionsOrFn === "function" && typeof fnOrOptions === "object";
			cases.forEach((i, idx) => {
				const items = Array.isArray(i) ? i : [i];
				if (fnFirst) {
					if (arrayOnlyCases) {
						suite(formatTitle(_name, items, idx), () => handler(...items), options);
					} else {
						suite(formatTitle(_name, items, idx), () => handler(i), options);
					}
				} else {
					if (arrayOnlyCases) {
						suite(formatTitle(_name, items, idx), options, () => handler(...items));
					} else {
						suite(formatTitle(_name, items, idx), options, () => handler(i));
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
				suite(formatTitle(name_, toArray(item), idx), options, () => handler(item));
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
			const fnFirst = typeof optionsOrFn === "function" && typeof fnOrOptions === "object";
			cases.forEach((i, idx) => {
				const items = Array.isArray(i) ? i : [i];
				if (fnFirst) {
					if (arrayOnlyCases) {
						test(formatTitle(_name, items, idx), () => handler(...items), options);
					} else {
						test(formatTitle(_name, items, idx), () => handler(i), options);
					}
				} else {
					if (arrayOnlyCases) {
						test(formatTitle(_name, items, idx), options, () => handler(...items));
					} else {
						test(formatTitle(_name, items, idx), options, () => handler(i));
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
				const handlerWrapper = (ctx) => handler(item, ctx);
				handlerWrapper.__VITEST_FIXTURE_INDEX__ = 1;
				handlerWrapper.toString = () => handler.toString();
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
		const _context = mergeContextFixtures(fixtures, context || {}, (key) => {
			var _getRunner$injectValu2, _getRunner2;
			return (_getRunner$injectValu2 = (_getRunner2 = getRunner()).injectValue) === null || _getRunner$injectValu2 === void 0 ? void 0 : _getRunner$injectValu2.call(_getRunner2, key);
		});
		return createTest(function fn(name, optionsOrFn, optionsOrTest) {
			const collector = getCurrentSuite();
			const scopedFixtures = collector.fixtures();
			const context = { ...this };
			if (scopedFixtures) {
				context.fixtures = mergeScopedFixtures(context.fixtures || [], scopedFixtures);
			}
			collector.test.fn.call(context, formatName(name), optionsOrFn, optionsOrTest);
		}, _context);
	};
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
		template = template.replace(/%%/g, "__vitest_escaped_%__").replace(/%#/g, `${idx}`).replace(/%\$/g, `${idx + 1}`).replace(/__vitest_escaped_%__/g, "%%");
	}
	const count = template.split("%").length - 1;
	if (template.includes("%f")) {
		const placeholders = template.match(/%f/g) || [];
		placeholders.forEach((_, i) => {
			if (isNegativeNaN(items[i]) || Object.is(items[i], -0)) {
				let occurrence = 0;
				template = template.replace(/%f/g, (match) => {
					occurrence++;
					return occurrence === i + 1 ? "-%f" : match;
				});
			}
		});
	}
	let formatted = format(template, ...items.slice(0, count));
	const isObjectItem = isObject(items[0]);
	formatted = formatted.replace(/\$([$\w.]+)/g, (_, key) => {
		var _runner$config;
		const isArrayKey = /^\d+$/.test(key);
		if (!isObjectItem && !isArrayKey) {
			return `$${key}`;
		}
		const arrayElement = isArrayKey ? objectAttr(items, key) : undefined;
		const value = isObjectItem ? objectAttr(items[0], key, arrayElement) : arrayElement;
		return objDisplay(value, { truncate: runner === null || runner === void 0 || (_runner$config = runner.config) === null || _runner$config === void 0 || (_runner$config = _runner$config.chaiConfig) === null || _runner$config === void 0 ? void 0 : _runner$config.truncateThreshold });
	});
	return formatted;
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
function findTestFileStackTrace(error, each) {
	const lines = error.split("\n").slice(1);
	for (const line of lines) {
		const stack = parseSingleStack(line);
		if (stack && stack.file === getTestFilepath()) {
			return {
				line: stack.line,
				column: each ? stack.column + 1 : stack.column
			};
		}
	}
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
function withTimeout(fn, timeout, isHook = false, stackTraceError) {
	if (timeout <= 0 || timeout === Number.POSITIVE_INFINITY) {
		return fn;
	}
	const { setTimeout, clearTimeout } = getSafeTimers();
	return function runWithTimeout(...args) {
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
			(_timer$unref = timer.unref) === null || _timer$unref === void 0 ? void 0 : _timer$unref.call(timer);
			function rejectTimeoutError() {
				reject_(makeTimeoutError(isHook, timeout, stackTraceError));
			}
			function resolve(result) {
				runner._currentTaskStartTime = undefined;
				runner._currentTaskTimeout = undefined;
				clearTimeout(timer);
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
			try {
				const result = fn(...args);
				if (typeof result === "object" && result != null && typeof result.then === "function") {
					result.then(resolve, reject);
				} else {
					resolve(result);
				}
			} catch (error) {
				reject(error);
			}
		});
	};
}
function createTestContext(test, runner) {
	var _runner$extendTaskCon;
	const context = function() {
		throw new Error("done() callback is deprecated, use promise instead");
	};
	context.task = test;
	context.skip = (condition, note) => {
		if (condition === false) {
			return undefined;
		}
		test.result ?? (test.result = { state: "skip" });
		test.result.pending = true;
		throw new PendingError("test is skipped; abort execution", test, typeof condition === "string" ? condition : note);
	};
	context.onTestFailed = (handler, timeout) => {
		test.onFailed || (test.onFailed = []);
		test.onFailed.push(withTimeout(handler, timeout ?? runner.config.hookTimeout, true, new Error("STACK_TRACE_ERROR")));
	};
	context.onTestFinished = (handler, timeout) => {
		test.onFinished || (test.onFinished = []);
		test.onFinished.push(withTimeout(handler, timeout ?? runner.config.hookTimeout, true, new Error("STACK_TRACE_ERROR")));
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

function getDefaultHookTimeout() {
	return getRunner().config.hookTimeout;
}
const CLEANUP_TIMEOUT_KEY = Symbol.for("VITEST_CLEANUP_TIMEOUT");
const CLEANUP_STACK_TRACE_KEY = Symbol.for("VITEST_CLEANUP_STACK_TRACE");
function getBeforeHookCleanupCallback(hook, result) {
	if (typeof result === "function") {
		const timeout = CLEANUP_TIMEOUT_KEY in hook && typeof hook[CLEANUP_TIMEOUT_KEY] === "number" ? hook[CLEANUP_TIMEOUT_KEY] : getDefaultHookTimeout();
		const stackTraceError = CLEANUP_STACK_TRACE_KEY in hook && hook[CLEANUP_STACK_TRACE_KEY] instanceof Error ? hook[CLEANUP_STACK_TRACE_KEY] : undefined;
		return withTimeout(result, timeout, true, stackTraceError);
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
	return getCurrentSuite().on("beforeEach", Object.assign(withTimeout(withFixtures(fn), timeout ?? getDefaultHookTimeout(), true, stackTraceError), {
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
	return getCurrentSuite().on("afterEach", withTimeout(withFixtures(fn), timeout ?? getDefaultHookTimeout(), true, new Error("STACK_TRACE_ERROR")));
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
	test.onFailed.push(withTimeout(handler, timeout ?? getDefaultHookTimeout(), true, new Error("STACK_TRACE_ERROR")));
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
	test.onFinished.push(withTimeout(handler, timeout ?? getDefaultHookTimeout(), true, new Error("STACK_TRACE_ERROR")));
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
	for (const spec of specs) {
		var _runner$onCollectStar;
		const filepath = typeof spec === "string" ? spec : spec.filepath;
		const testLocations = typeof spec === "string" ? undefined : spec.testLocations;
		const file = createFileTask(filepath, config.root, config.name, runner.pool);
		file.shuffle = config.sequence.shuffle;
		(_runner$onCollectStar = runner.onCollectStart) === null || _runner$onCollectStar === void 0 ? void 0 : _runner$onCollectStar.call(runner, file);
		clearCollectorContext(filepath, runner);
		try {
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
					c;
				}
			}
			setHooks(file, fileHooks);
			file.collectDuration = now$1() - collectStart;
		} catch (e) {
			const error = processError(e);
			file.result = {
				state: "fail",
				errors: [error]
			};
		}
		calculateSuiteHash(file);
		const hasOnlyTasks = someTasksAreOnly(file);
		interpretTaskModes(file, config.testNamePattern, testLocations, hasOnlyTasks, false, config.allowOnly);
		if (file.mode === "queued") {
			file.mode = "run";
		}
		files.push(file);
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
	const onTestFailed = test.context.onTestFailed;
	const onTestFinished = test.context.onTestFinished;
	test.context.onTestFailed = () => {
		throw new Error(`Cannot call "onTestFailed" inside a test hook.`);
	};
	test.context.onTestFinished = () => {
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
	test.context.onTestFailed = onTestFailed;
	test.context.onTestFinished = onTestFinished;
}
async function callSuiteHook(suite, currentTask, name, runner, args) {
	const sequence = runner.config.sequence.hooks;
	const callbacks = [];
	const parentSuite = "filepath" in suite ? null : suite.suite || suite.file;
	if (name === "beforeEach" && parentSuite) {
		callbacks.push(...await callSuiteHook(parentSuite, currentTask, name, runner, args));
	}
	const hooks = getSuiteHooks(suite, name, sequence);
	if (hooks.length > 0) {
		updateSuiteHookState(currentTask, name, "run", runner);
	}
	async function runHook(hook) {
		return getBeforeHookCleanupCallback(hook, await hook(...args));
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
	return function(...args) {
		const now = unixNow();
		if (now - last > ms) {
			last = now;
			return fn.apply(this, args);
		}
	};
}
const sendTasksUpdateThrottled = throttle(sendTasksUpdate, 100);
function updateTask(event, task, runner) {
	eventsPacks.push([task.id, event]);
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
	setCurrentTest(test);
	const suite = test.suite || test.file;
	const repeats = test.repeats ?? 0;
	for (let repeatCount = 0; repeatCount <= repeats; repeatCount++) {
		const retry = test.retry ?? 0;
		for (let retryCount = 0; retryCount <= retry; retryCount++) {
			var _test$result2, _test$result3;
			let beforeEachCleanups = [];
			try {
				var _runner$onBeforeTryTa, _runner$onAfterTryTas;
				await ((_runner$onBeforeTryTa = runner.onBeforeTryTask) === null || _runner$onBeforeTryTa === void 0 ? void 0 : _runner$onBeforeTryTa.call(runner, test, {
					retry: retryCount,
					repeats: repeatCount
				}));
				test.result.repeatCount = repeatCount;
				beforeEachCleanups = await callSuiteHook(suite, test, "beforeEach", runner, [test.context, suite]);
				if (runner.runTask) {
					await runner.runTask(test);
				} else {
					const fn = getFn(test);
					if (!fn) {
						throw new Error("Test function is not found. Did you add it using `setFn`?");
					}
					await fn();
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
				await callSuiteHook(suite, test, "afterEach", runner, [test.context, suite]);
				await callCleanupHooks(runner, beforeEachCleanups);
				await callFixtureCleanup(test.context);
			} catch (e) {
				failTask(test.result, e, runner.config.diffOptions);
			}
			await callTestHooks(runner, test, test.onFinished || [], "stack");
			if (test.result.state === "fail") {
				await callTestHooks(runner, test, test.onFailed || [], runner.config.sequence.hooks);
			}
			test.onFailed = undefined;
			test.onFinished = undefined;
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
				return;
			}
			if (test.result.state === "pass") {
				break;
			}
			if (retryCount < retry) {
				test.result.state = "run";
				test.result.retryCount = (test.result.retryCount ?? 0) + 1;
			}
			updateTask("test-retried", test, runner);
		}
	}
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
		updateTask("suite-failed-early", suite, runner);
		return;
	}
	const start = now();
	const mode = suite.mode;
	suite.result = {
		state: mode === "skip" || mode === "todo" ? mode : "run",
		startTime: unixNow()
	};
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
				beforeAllCleanups = await callSuiteHook(suite, suite, "beforeAll", runner, [suite]);
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
			await callSuiteHook(suite, suite, "afterAll", runner, [suite]);
			await callCleanupHooks(runner, beforeAllCleanups);
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
		updateTask("suite-finished", suite, runner);
		await ((_runner$onAfterRunSui = runner.onAfterRunSuite) === null || _runner$onAfterRunSui === void 0 ? void 0 : _runner$onAfterRunSui.call(runner, suite));
	}
}
let limitMaxConcurrency;
async function runSuiteChild(c, runner) {
	if (c.type === "test") {
		return limitMaxConcurrency(() => runTest(c, runner));
	} else if (c.type === "suite") {
		return runSuite(c, runner);
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
		await runSuite(file, runner);
	}
}
async function startTests(specs, runner) {
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
}
async function publicCollect(specs, runner) {
	var _runner$onBeforeColle2, _runner$onCollected2;
	const paths = specs.map((f) => typeof f === "string" ? f : f.filepath);
	await ((_runner$onBeforeColle2 = runner.onBeforeCollect) === null || _runner$onBeforeColle2 === void 0 ? void 0 : _runner$onBeforeColle2.call(runner, paths));
	const files = await collectTests(specs, runner);
	await ((_runner$onCollected2 = runner.onCollected) === null || _runner$onCollected2 === void 0 ? void 0 : _runner$onCollected2.call(runner, files));
	return files;
}

export { afterAll, afterEach, beforeAll, beforeEach, publicCollect as collectTests, createTaskCollector, describe, getCurrentSuite, getCurrentTest, getFn, getHooks, it, onTestFailed, onTestFinished, setFn, setHooks, startTests, suite, test, updateTask };
