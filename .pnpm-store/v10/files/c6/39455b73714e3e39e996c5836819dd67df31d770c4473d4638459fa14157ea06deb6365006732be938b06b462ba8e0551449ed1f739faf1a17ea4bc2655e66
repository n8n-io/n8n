import { processError } from '@vitest/utils/error';
import { parseSingleStack } from '@vitest/utils/source-map';
import { relative } from 'pathe';
import { toArray } from '@vitest/utils/helpers';

function createChainable(keys, fn) {
	function create(context) {
		const chain = function(...args) {
			return fn.apply(context, args);
		};
		Object.assign(chain, fn);
		chain.withContext = () => chain.bind(context);
		chain.setContext = (key, value) => {
			context[key] = value;
		};
		chain.mergeContext = (ctx) => {
			Object.assign(context, ctx);
		};
		for (const key of keys) {
			Object.defineProperty(chain, key, { get() {
				return create({
					...context,
					[key]: true
				});
			} });
		}
		return chain;
	}
	const chain = create({});
	chain.fn = fn;
	return chain;
}

/**
* If any tasks been marked as `only`, mark all other tasks as `skip`.
*/
function interpretTaskModes(file, namePattern, testLocations, onlyMode, parentIsOnly, allowOnly) {
	const matchedLocations = [];
	const traverseSuite = (suite, parentIsOnly, parentMatchedWithLocation) => {
		const suiteIsOnly = parentIsOnly || suite.mode === "only";
		suite.tasks.forEach((t) => {
			// Check if either the parent suite or the task itself are marked as included
			const includeTask = suiteIsOnly || t.mode === "only";
			if (onlyMode) {
				if (t.type === "suite" && (includeTask || someTasksAreOnly(t))) {
					// Don't skip this suite
					if (t.mode === "only") {
						checkAllowOnly(t, allowOnly);
						t.mode = "run";
					}
				} else if (t.mode === "run" && !includeTask) {
					t.mode = "skip";
				} else if (t.mode === "only") {
					checkAllowOnly(t, allowOnly);
					t.mode = "run";
				}
			}
			let hasLocationMatch = parentMatchedWithLocation;
			// Match test location against provided locations, only run if present
			// in `testLocations`. Note: if `includeTaskLocations` is not enabled,
			// all test will be skipped.
			if (testLocations !== undefined && testLocations.length !== 0) {
				if (t.location && (testLocations === null || testLocations === void 0 ? void 0 : testLocations.includes(t.location.line))) {
					t.mode = "run";
					matchedLocations.push(t.location.line);
					hasLocationMatch = true;
				} else if (parentMatchedWithLocation) {
					t.mode = "run";
				} else if (t.type === "test") {
					t.mode = "skip";
				}
			}
			if (t.type === "test") {
				if (namePattern && !getTaskFullName(t).match(namePattern)) {
					t.mode = "skip";
				}
			} else if (t.type === "suite") {
				if (t.mode === "skip") {
					skipAllTasks(t);
				} else if (t.mode === "todo") {
					todoAllTasks(t);
				} else {
					traverseSuite(t, includeTask, hasLocationMatch);
				}
			}
		});
		// if all subtasks are skipped, mark as skip
		if (suite.mode === "run" || suite.mode === "queued") {
			if (suite.tasks.length && suite.tasks.every((i) => i.mode !== "run" && i.mode !== "queued")) {
				suite.mode = "skip";
			}
		}
	};
	traverseSuite(file, parentIsOnly, false);
	const nonMatching = testLocations === null || testLocations === void 0 ? void 0 : testLocations.filter((loc) => !matchedLocations.includes(loc));
	if (nonMatching && nonMatching.length !== 0) {
		const message = nonMatching.length === 1 ? `line ${nonMatching[0]}` : `lines ${nonMatching.join(", ")}`;
		if (file.result === undefined) {
			file.result = {
				state: "fail",
				errors: []
			};
		}
		if (file.result.errors === undefined) {
			file.result.errors = [];
		}
		file.result.errors.push(processError(new Error(`No test found in ${file.name} in ${message}`)));
	}
}
function getTaskFullName(task) {
	return `${task.suite ? `${getTaskFullName(task.suite)} ` : ""}${task.name}`;
}
function someTasksAreOnly(suite) {
	return suite.tasks.some((t) => t.mode === "only" || t.type === "suite" && someTasksAreOnly(t));
}
function skipAllTasks(suite) {
	suite.tasks.forEach((t) => {
		if (t.mode === "run" || t.mode === "queued") {
			t.mode = "skip";
			if (t.type === "suite") {
				skipAllTasks(t);
			}
		}
	});
}
function todoAllTasks(suite) {
	suite.tasks.forEach((t) => {
		if (t.mode === "run" || t.mode === "queued") {
			t.mode = "todo";
			if (t.type === "suite") {
				todoAllTasks(t);
			}
		}
	});
}
function checkAllowOnly(task, allowOnly) {
	if (allowOnly) {
		return;
	}
	const error = processError(new Error("[Vitest] Unexpected .only modifier. Remove it or pass --allowOnly argument to bypass this error"));
	task.result = {
		state: "fail",
		errors: [error]
	};
}
/* @__NO_SIDE_EFFECTS__ */
function generateHash(str) {
	let hash = 0;
	if (str.length === 0) {
		return `${hash}`;
	}
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	return `${hash}`;
}
function calculateSuiteHash(parent) {
	parent.tasks.forEach((t, idx) => {
		t.id = `${parent.id}_${idx}`;
		if (t.type === "suite") {
			calculateSuiteHash(t);
		}
	});
}
function createFileTask(filepath, root, projectName, pool, viteEnvironment) {
	const path = relative(root, filepath);
	const file = {
		id: generateFileHash(path, projectName),
		name: path,
		fullName: path,
		type: "suite",
		mode: "queued",
		filepath,
		tasks: [],
		meta: Object.create(null),
		projectName,
		file: undefined,
		pool,
		viteEnvironment
	};
	file.file = file;
	return file;
}
/**
* Generate a unique ID for a file based on its path and project name
* @param file File relative to the root of the project to keep ID the same between different machines
* @param projectName The name of the test project
*/
/* @__NO_SIDE_EFFECTS__ */
function generateFileHash(file, projectName) {
	return /* @__PURE__ */ generateHash(`${file}${projectName || ""}`);
}
function findTestFileStackTrace(testFilePath, error) {
	// first line is the error message
	const lines = error.split("\n").slice(1);
	for (const line of lines) {
		const stack = parseSingleStack(line);
		if (stack && stack.file === testFilePath) {
			return stack;
		}
	}
}

/**
* Return a function for running multiple async operations with limited concurrency.
*/
function limitConcurrency(concurrency = Infinity) {
	// The number of currently active + pending tasks.
	let count = 0;
	// The head and tail of the pending task queue, built using a singly linked list.
	// Both head and tail are initially undefined, signifying an empty queue.
	// They both become undefined again whenever there are no pending tasks.
	let head;
	let tail;
	// A bookkeeping function executed whenever a task has been run to completion.
	const finish = () => {
		count--;
		// Check if there are further pending tasks in the queue.
		if (head) {
			// Allow the next pending task to run and pop it from the queue.
			head[0]();
			head = head[1];
			// The head may now be undefined if there are no further pending tasks.
			// In that case, set tail to undefined as well.
			tail = head && tail;
		}
	};
	return (func, ...args) => {
		// Create a promise chain that:
		//  1. Waits for its turn in the task queue (if necessary).
		//  2. Runs the task.
		//  3. Allows the next pending task (if any) to run.
		return new Promise((resolve) => {
			if (count++ < concurrency) {
				// No need to queue if fewer than maxConcurrency tasks are running.
				resolve();
			} else if (tail) {
				// There are pending tasks, so append to the queue.
				tail = tail[1] = [resolve];
			} else {
				// No other pending tasks, initialize the queue with a new tail and head.
				head = tail = [resolve];
			}
		}).then(() => {
			// Running func here ensures that even a non-thenable result or an
			// immediately thrown error gets wrapped into a Promise.
			return func(...args);
		}).finally(finish);
	};
}

/**
* Partition in tasks groups by consecutive concurrent
*/
function partitionSuiteChildren(suite) {
	let tasksGroup = [];
	const tasksGroups = [];
	for (const c of suite.tasks) {
		if (tasksGroup.length === 0 || c.concurrent === tasksGroup[0].concurrent) {
			tasksGroup.push(c);
		} else {
			tasksGroups.push(tasksGroup);
			tasksGroup = [c];
		}
	}
	if (tasksGroup.length > 0) {
		tasksGroups.push(tasksGroup);
	}
	return tasksGroups;
}

function isTestCase(s) {
	return s.type === "test";
}
function getTests(suite) {
	const tests = [];
	const arraySuites = toArray(suite);
	for (const s of arraySuites) {
		if (isTestCase(s)) {
			tests.push(s);
		} else {
			for (const task of s.tasks) {
				if (isTestCase(task)) {
					tests.push(task);
				} else {
					const taskTests = getTests(task);
					for (const test of taskTests) {
						tests.push(test);
					}
				}
			}
		}
	}
	return tests;
}
function getTasks(tasks = []) {
	return toArray(tasks).flatMap((s) => isTestCase(s) ? [s] : [s, ...getTasks(s.tasks)]);
}
function getSuites(suite) {
	return toArray(suite).flatMap((s) => s.type === "suite" ? [s, ...getSuites(s.tasks)] : []);
}
function hasTests(suite) {
	return toArray(suite).some((s) => s.tasks.some((c) => isTestCase(c) || hasTests(c)));
}
function hasFailed(suite) {
	return toArray(suite).some((s) => {
		var _s$result;
		return ((_s$result = s.result) === null || _s$result === void 0 ? void 0 : _s$result.state) === "fail" || s.type === "suite" && hasFailed(s.tasks);
	});
}
function getNames(task) {
	const names = [task.name];
	let current = task;
	while (current === null || current === void 0 ? void 0 : current.suite) {
		current = current.suite;
		if (current === null || current === void 0 ? void 0 : current.name) {
			names.unshift(current.name);
		}
	}
	if (current !== task.file) {
		names.unshift(task.file.name);
	}
	return names;
}
function getFullName(task, separator = " > ") {
	return getNames(task).join(separator);
}
function getTestName(task, separator = " > ") {
	return getNames(task).slice(1).join(separator);
}
function createTaskName(names, separator = " > ") {
	return names.filter((name) => name !== undefined).join(separator);
}

export { calculateSuiteHash as a, createFileTask as b, createChainable as c, generateHash as d, createTaskName as e, findTestFileStackTrace as f, generateFileHash as g, getFullName as h, interpretTaskModes as i, getNames as j, getSuites as k, limitConcurrency as l, getTasks as m, getTestName as n, getTests as o, partitionSuiteChildren as p, hasFailed as q, hasTests as r, someTasksAreOnly as s, isTestCase as t };
