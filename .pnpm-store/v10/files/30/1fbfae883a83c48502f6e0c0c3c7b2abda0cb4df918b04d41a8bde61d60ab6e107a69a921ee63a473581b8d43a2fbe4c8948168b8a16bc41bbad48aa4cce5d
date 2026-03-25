import { existsSync, readFileSync, promises } from 'node:fs';
import { mkdir, writeFile, readdir, stat, readFile } from 'node:fs/promises';
import { resolve as resolve$1, dirname, isAbsolute, relative, basename, join, normalize } from 'pathe';
import { performance as performance$1 } from 'node:perf_hooks';
import { getTests, getTestName, hasFailed, getSuites, generateHash, createTaskName, calculateSuiteHash, someTasksAreOnly, interpretTaskModes, getTasks, getFullName } from '@vitest/runner/utils';
import { slash, toArray, isPrimitive } from '@vitest/utils/helpers';
import { parseStacktrace, defaultStackIgnorePatterns, parseErrorStacktrace } from '@vitest/utils/source-map';
import c from 'tinyrainbow';
import { i as isTTY } from './env.D4Lgay0q.js';
import { stripVTControlCharacters } from 'node:util';
import { Console } from 'node:console';
import { Writable } from 'node:stream';
import { inspect } from '@vitest/utils/display';
import nodeos__default, { hostname } from 'node:os';
import { x } from 'tinyexec';
import { distDir } from '../path.js';
import { parseAstAsync } from 'vite';
import { positionToOffset, lineSplitRE } from '@vitest/utils/offset';
import { createRequire } from 'node:module';

/// <reference types="../types/index.d.ts" />

// (c) 2020-present Andrea Giammarchi

const {parse: $parse, stringify: $stringify} = JSON;
const {keys} = Object;

const Primitive = String;   // it could be Number
const primitive = 'string'; // it could be 'number'

const ignore$1 = {};
const object = 'object';

const noop = (_, value) => value;

const primitives = value => (
  value instanceof Primitive ? Primitive(value) : value
);

const Primitives = (_, value) => (
  typeof value === primitive ? new Primitive(value) : value
);

const revive = (input, parsed, output, $) => {
  const lazy = [];
  for (let ke = keys(output), {length} = ke, y = 0; y < length; y++) {
    const k = ke[y];
    const value = output[k];
    if (value instanceof Primitive) {
      const tmp = input[value];
      if (typeof tmp === object && !parsed.has(tmp)) {
        parsed.add(tmp);
        output[k] = ignore$1;
        lazy.push({k, a: [input, parsed, tmp, $]});
      }
      else
        output[k] = $.call(output, k, tmp);
    }
    else if (output[k] !== ignore$1)
      output[k] = $.call(output, k, value);
  }
  for (let {length} = lazy, i = 0; i < length; i++) {
    const {k, a} = lazy[i];
    output[k] = $.call(output, k, revive.apply(null, a));
  }
  return output;
};

const set = (known, input, value) => {
  const index = Primitive(input.push(value) - 1);
  known.set(value, index);
  return index;
};

/**
 * Converts a specialized flatted string into a JS value.
 * @param {string} text
 * @param {(this: any, key: string, value: any) => any} [reviver]
 * @returns {any}
 */
const parse$1 = (text, reviver) => {
  const input = $parse(text, Primitives).map(primitives);
  const value = input[0];
  const $ = reviver || noop;
  const tmp = typeof value === object && value ?
              revive(input, new Set, value, $) :
              value;
  return $.call({'': tmp}, '', tmp);
};

/**
 * Converts a JS value into a specialized flatted string.
 * @param {any} value
 * @param {((this: any, key: string, value: any) => any) | (string | number)[] | null | undefined} [replacer]
 * @param {string | number | undefined} [space]
 * @returns {string}
 */
const stringify = (value, replacer, space) => {
  const $ = replacer && typeof replacer === object ?
            (k, v) => (k === '' || -1 < replacer.indexOf(k) ? v : void 0) :
            (replacer || noop);
  const known = new Map;
  const input = [];
  const output = [];
  let i = +set(known, input, $.call({'': value}, '', value));
  let firstRun = !i;
  while (i < input.length) {
    firstRun = true;
    output[i] = $stringify(input[i++], replace, space);
  }
  return '[' + output.join(',') + ']';
  function replace(key, value) {
    if (firstRun) {
      firstRun = !firstRun;
      return value;
    }
    const after = $.call(this, key, value);
    switch (typeof after) {
      case object:
        if (after === null) return after;
      case primitive:
        return known.get(after) || set(known, input, after);
    }
    return after;
  }
};

function getOutputFile(config, reporter) {
	if (!config?.outputFile) return;
	if (typeof config.outputFile === "string") return config.outputFile;
	return config.outputFile[reporter];
}
function createDefinesScript(define) {
	if (!define) return "";
	if (serializeDefine(define) === "{}") return "";
	return `
const defines = ${serializeDefine(define)}
Object.keys(defines).forEach((key) => {
  const segments = key.split('.')
  let target = globalThis
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    if (i === segments.length - 1) {
      target[segment] = defines[key]
    } else {
      target = target[segment] || (target[segment] = {})
    }
  }
})
  `;
}
/**
* Like `JSON.stringify` but keeps raw string values as a literal
* in the generated code. For example: `"window"` would refer to
* the global `window` object directly.
*/
function serializeDefine(define) {
	const userDefine = {};
	for (const key in define) {
		// vitest sets this to avoid vite:client-inject plugin
		if (key === "process.env.NODE_ENV" && define[key] === "process.env.NODE_ENV") continue;
		// import.meta.env.* is handled in `importAnalysis` plugin
		if (!key.startsWith("import.meta.env.")) userDefine[key] = define[key];
	}
	let res = `{`;
	const keys = Object.keys(userDefine).sort();
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		const val = userDefine[key];
		res += `${JSON.stringify(key)}: ${handleDefineValue(val)}`;
		if (i !== keys.length - 1) res += `, `;
	}
	return `${res}}`;
}
function handleDefineValue(value) {
	if (typeof value === "undefined") return "undefined";
	if (typeof value === "string") return value;
	return JSON.stringify(value);
}

class BlobReporter {
	start = 0;
	ctx;
	options;
	coverage;
	constructor(options) {
		this.options = options;
	}
	onInit(ctx) {
		if (ctx.config.watch) throw new Error("Blob reporter is not supported in watch mode");
		this.ctx = ctx;
		this.start = performance.now();
		this.coverage = void 0;
	}
	onCoverage(coverage) {
		this.coverage = coverage;
	}
	async onTestRunEnd(testModules, unhandledErrors) {
		const executionTime = performance.now() - this.start;
		const files = testModules.map((testModule) => testModule.task);
		const errors = [...unhandledErrors];
		const coverage = this.coverage;
		let outputFile = this.options.outputFile ?? getOutputFile(this.ctx.config, "blob");
		if (!outputFile) {
			const shard = this.ctx.config.shard;
			outputFile = shard ? `.vitest-reports/blob-${shard.index}-${shard.count}.json` : ".vitest-reports/blob.json";
		}
		const modules = this.ctx.projects.map((project) => {
			return [project.name, [...project.vite.moduleGraph.idToModuleMap.entries()].map((mod) => {
				if (!mod[1].file) return null;
				return [
					mod[0],
					mod[1].file,
					mod[1].url
				];
			}).filter((x) => x != null)];
		});
		const report = [
			this.ctx.version,
			files,
			errors,
			modules,
			coverage,
			executionTime
		];
		const reportFile = resolve$1(this.ctx.config.root, outputFile);
		await writeBlob(report, reportFile);
		this.ctx.logger.log("blob report written to", reportFile);
	}
}
async function writeBlob(content, filename) {
	const report = stringify(content);
	const dir = dirname(filename);
	if (!existsSync(dir)) await mkdir(dir, { recursive: true });
	await writeFile(filename, report, "utf-8");
}
async function readBlobs(currentVersion, blobsDirectory, projectsArray) {
	// using process.cwd() because --merge-reports can only be used in CLI
	const resolvedDir = resolve$1(process.cwd(), blobsDirectory);
	const promises = (await readdir(resolvedDir)).map(async (filename) => {
		const fullPath = resolve$1(resolvedDir, filename);
		if (!(await stat(fullPath)).isFile()) throw new TypeError(`vitest.mergeReports() expects all paths in "${blobsDirectory}" to be files generated by the blob reporter, but "${filename}" is not a file`);
		const [version, files, errors, moduleKeys, coverage, executionTime] = parse$1(await readFile(fullPath, "utf-8"));
		if (!version) throw new TypeError(`vitest.mergeReports() expects all paths in "${blobsDirectory}" to be files generated by the blob reporter, but "${filename}" is not a valid blob file`);
		return {
			version,
			files,
			errors,
			moduleKeys,
			coverage,
			file: filename,
			executionTime
		};
	});
	const blobs = await Promise.all(promises);
	if (!blobs.length) throw new Error(`vitest.mergeReports() requires at least one blob file in "${blobsDirectory}" directory, but none were found`);
	const versions = new Set(blobs.map((blob) => blob.version));
	if (versions.size > 1) throw new Error(`vitest.mergeReports() requires all blob files to be generated by the same Vitest version, received\n\n${blobs.map((b) => `- "${b.file}" uses v${b.version}`).join("\n")}`);
	if (!versions.has(currentVersion)) throw new Error(`the blobs in "${blobsDirectory}" were generated by a different version of Vitest. Expected v${currentVersion}, but received v${blobs[0].version}`);
	// fake module graph - it is used to check if module is imported, but we don't use values inside
	const projects = Object.fromEntries(projectsArray.map((p) => [p.name, p]));
	blobs.forEach((blob) => {
		blob.moduleKeys.forEach(([projectName, moduleIds]) => {
			const project = projects[projectName];
			if (!project) return;
			moduleIds.forEach(([moduleId, file, url]) => {
				const moduleNode = project.vite.moduleGraph.createFileOnlyEntry(file);
				moduleNode.url = url;
				moduleNode.id = moduleId;
				moduleNode.transformResult = {
					code: " ",
					map: null
				};
				project.vite.moduleGraph.idToModuleMap.set(moduleId, moduleNode);
			});
		});
	});
	return {
		files: blobs.flatMap((blob) => blob.files).sort((f1, f2) => {
			return (f1.result?.startTime || 0) - (f2.result?.startTime || 0);
		}),
		errors: blobs.flatMap((blob) => blob.errors),
		coverages: blobs.map((blob) => blob.coverage),
		executionTimes: blobs.map((blob) => blob.executionTime)
	};
}

function groupBy(collection, iteratee) {
	return collection.reduce((acc, item) => {
		const key = iteratee(item);
		acc[key] ||= [];
		acc[key].push(item);
		return acc;
	}, {});
}
function stdout() {
	// @ts-expect-error Node.js maps process.stdout to console._stdout
	// eslint-disable-next-line no-console
	return console._stdout || process.stdout;
}
function escapeRegExp(s) {
	// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function wildcardPatternToRegExp(pattern) {
	const negated = pattern[0] === "!";
	if (negated) pattern = pattern.slice(1);
	let regexp = `${pattern.split("*").map(escapeRegExp).join(".*")}$`;
	if (negated) regexp = `(?!${regexp})`;
	return new RegExp(`^${regexp}`, "i");
}
function createIndexLocationsMap(source) {
	const map = /* @__PURE__ */ new Map();
	let index = 0;
	let line = 1;
	let column = 1;
	for (const char of source) {
		map.set(index++, {
			line,
			column
		});
		if (char === "\n" || char === "\r\n") {
			line++;
			column = 0;
		} else column++;
	}
	return map;
}
function createLocationsIndexMap(source) {
	const map = /* @__PURE__ */ new Map();
	let index = 0;
	let line = 1;
	let column = 1;
	for (const char of source) {
		map.set(`${line}:${column}`, index++);
		if (char === "\n" || char === "\r\n") {
			line++;
			column = 0;
		} else column++;
	}
	return map;
}

function hasFailedSnapshot(suite) {
	return getTests(suite).some((s) => {
		return s.result?.errors?.some((e) => typeof e?.message === "string" && e.message.match(/Snapshot .* mismatched/));
	});
}
function convertTasksToEvents(file, onTask) {
	const packs = [];
	const events = [];
	function visit(suite) {
		onTask?.(suite);
		packs.push([
			suite.id,
			suite.result,
			suite.meta
		]);
		events.push([
			suite.id,
			"suite-prepare",
			void 0
		]);
		suite.tasks.forEach((task) => {
			if (task.type === "suite") visit(task);
			else {
				onTask?.(task);
				if (suite.mode !== "skip" && suite.mode !== "todo") {
					packs.push([
						task.id,
						task.result,
						task.meta
					]);
					events.push([
						task.id,
						"test-prepare",
						void 0
					]);
					task.annotations.forEach((annotation) => {
						events.push([
							task.id,
							"test-annotation",
							{ annotation }
						]);
					});
					task.artifacts.forEach((artifact) => {
						events.push([
							task.id,
							"test-artifact",
							{ artifact }
						]);
					});
					events.push([
						task.id,
						"test-finished",
						void 0
					]);
				}
			}
		});
		events.push([
			suite.id,
			"suite-finished",
			void 0
		]);
	}
	visit(file);
	return {
		packs,
		events
	};
}

const F_RIGHT = "→";
const F_DOWN = "↓";
const F_DOWN_RIGHT = "↳";
const F_POINTER = "❯";
const F_DOT = "·";
const F_CHECK = "✓";
const F_CROSS = "×";
const F_LONG_DASH = "⎯";
const F_TREE_NODE_MIDDLE = "├──";
const F_TREE_NODE_END = "└──";

const pointer = c.yellow(F_POINTER);
const skipped = c.dim(c.gray(F_DOWN));
const benchmarkPass = c.green(F_DOT);
const testPass = c.green(F_CHECK);
const taskFail = c.red(F_CROSS);
const suiteFail = c.red(F_POINTER);
const pending$1 = c.gray("·");
const separator = c.dim(" > ");
const labelDefaultColors = [
	c.bgYellow,
	c.bgCyan,
	c.bgGreen,
	c.bgMagenta
];
function getCols(delta = 0) {
	let length = process.stdout?.columns;
	if (!length || Number.isNaN(length)) length = 30;
	return Math.max(length + delta, 0);
}
function errorBanner(message) {
	return divider(c.bold(c.bgRed(` ${message} `)), null, null, c.red);
}
function divider(text, left, right, color) {
	const cols = getCols();
	const c = color || ((text) => text);
	if (text) {
		const textLength = stripVTControlCharacters(text).length;
		if (left == null && right != null) left = cols - textLength - right;
		else {
			left = left ?? Math.floor((cols - textLength) / 2);
			right = cols - textLength - left;
		}
		left = Math.max(0, left);
		right = Math.max(0, right);
		return `${c(F_LONG_DASH.repeat(left))}${text}${c(F_LONG_DASH.repeat(right))}`;
	}
	return F_LONG_DASH.repeat(cols);
}
function formatTestPath(root, path) {
	if (isAbsolute(path)) path = relative(root, path);
	const dir = dirname(path);
	const ext = path.match(/(\.(spec|test)\.[cm]?[tj]sx?)$/)?.[0] || "";
	const base = basename(path, ext);
	return slash(c.dim(`${dir}/`) + c.bold(base)) + c.dim(ext);
}
function renderSnapshotSummary(rootDir, snapshots) {
	const summary = [];
	if (snapshots.added) summary.push(c.bold(c.green(`${snapshots.added} written`)));
	if (snapshots.unmatched) summary.push(c.bold(c.red(`${snapshots.unmatched} failed`)));
	if (snapshots.updated) summary.push(c.bold(c.green(`${snapshots.updated} updated `)));
	if (snapshots.filesRemoved) if (snapshots.didUpdate) summary.push(c.bold(c.green(`${snapshots.filesRemoved} files removed `)));
	else summary.push(c.bold(c.yellow(`${snapshots.filesRemoved} files obsolete `)));
	if (snapshots.filesRemovedList && snapshots.filesRemovedList.length) {
		const [head, ...tail] = snapshots.filesRemovedList;
		summary.push(`${c.gray(F_DOWN_RIGHT)} ${formatTestPath(rootDir, head)}`);
		tail.forEach((key) => {
			summary.push(`  ${c.gray(F_DOT)} ${formatTestPath(rootDir, key)}`);
		});
	}
	if (snapshots.unchecked) {
		if (snapshots.didUpdate) summary.push(c.bold(c.green(`${snapshots.unchecked} removed`)));
		else summary.push(c.bold(c.yellow(`${snapshots.unchecked} obsolete`)));
		snapshots.uncheckedKeysByFile.forEach((uncheckedFile) => {
			summary.push(`${c.gray(F_DOWN_RIGHT)} ${formatTestPath(rootDir, uncheckedFile.filePath)}`);
			uncheckedFile.keys.forEach((key) => summary.push(`  ${c.gray(F_DOT)} ${key}`));
		});
	}
	return summary;
}
function countTestErrors(tasks) {
	return tasks.reduce((c, i) => c + (i.result?.errors?.length || 0), 0);
}
function getStateString$1(tasks, name = "tests", showTotal = true) {
	if (tasks.length === 0) return c.dim(`no ${name}`);
	const passed = tasks.reduce((acc, i) => i.result?.state === "pass" ? acc + 1 : acc, 0);
	const failed = tasks.reduce((acc, i) => i.result?.state === "fail" ? acc + 1 : acc, 0);
	const skipped = tasks.reduce((acc, i) => i.mode === "skip" ? acc + 1 : acc, 0);
	const todo = tasks.reduce((acc, i) => i.mode === "todo" ? acc + 1 : acc, 0);
	return [
		failed ? c.bold(c.red(`${failed} failed`)) : null,
		passed ? c.bold(c.green(`${passed} passed`)) : null,
		skipped ? c.yellow(`${skipped} skipped`) : null,
		todo ? c.gray(`${todo} todo`) : null
	].filter(Boolean).join(c.dim(" | ")) + (showTotal ? c.gray(` (${tasks.length})`) : "");
}
function getStateSymbol(task) {
	if (task.mode === "skip" || task.mode === "todo") return skipped;
	if (!task.result) return pending$1;
	if (task.result.state === "run" || task.result.state === "queued") {
		if (task.type === "suite") return pointer;
	}
	if (task.result.state === "pass") return task.meta?.benchmark ? benchmarkPass : testPass;
	if (task.result.state === "fail") return task.type === "suite" ? suiteFail : taskFail;
	return " ";
}
function formatTimeString(date) {
	return date.toTimeString().split(" ")[0];
}
function formatTime(time) {
	if (time > 1e3) return `${(time / 1e3).toFixed(2)}s`;
	return `${Math.round(time)}ms`;
}
function formatProjectName(project, suffix = " ") {
	if (!project?.name) return "";
	if (!c.isColorSupported) return `|${project.name}|${suffix}`;
	let background = project.color && c[`bg${capitalize(project.color)}`];
	if (!background) background = labelDefaultColors[project.name.split("").reduce((acc, v, idx) => acc + v.charCodeAt(0) + idx, 0) % labelDefaultColors.length];
	return c.black(background(` ${project.name} `)) + suffix;
}
function withLabel(color, label, message) {
	const bgColor = `bg${color.charAt(0).toUpperCase()}${color.slice(1)}`;
	return `${c.bold(c[bgColor](` ${label} `))} ${message ? c[color](message) : ""}`;
}
function padSummaryTitle(str) {
	return c.dim(`${str.padStart(11)} `);
}
function truncateString(text, maxLength) {
	const plainText = stripVTControlCharacters(text);
	if (plainText.length <= maxLength) return text;
	return `${plainText.slice(0, maxLength - 1)}…`;
}
function capitalize(text) {
	return `${text[0].toUpperCase()}${text.slice(1)}`;
}

var utils = /*#__PURE__*/Object.freeze({
  __proto__: null,
  benchmarkPass: benchmarkPass,
  countTestErrors: countTestErrors,
  divider: divider,
  errorBanner: errorBanner,
  formatProjectName: formatProjectName,
  formatTestPath: formatTestPath,
  formatTime: formatTime,
  formatTimeString: formatTimeString,
  getStateString: getStateString$1,
  getStateSymbol: getStateSymbol,
  padSummaryTitle: padSummaryTitle,
  pending: pending$1,
  pointer: pointer,
  renderSnapshotSummary: renderSnapshotSummary,
  separator: separator,
  skipped: skipped,
  suiteFail: suiteFail,
  taskFail: taskFail,
  testPass: testPass,
  truncateString: truncateString,
  withLabel: withLabel
});

const BADGE_PADDING = "       ";
class BaseReporter {
	start = 0;
	end = 0;
	watchFilters;
	failedUnwatchedFiles = [];
	isTTY;
	ctx = void 0;
	renderSucceed = false;
	verbose = false;
	_filesInWatchMode = /* @__PURE__ */ new Map();
	_timeStart = formatTimeString(/* @__PURE__ */ new Date());
	constructor(options = {}) {
		this.isTTY = options.isTTY ?? isTTY;
	}
	onInit(ctx) {
		this.ctx = ctx;
		this.ctx.logger.printBanner();
	}
	log(...messages) {
		this.ctx.logger.log(...messages);
	}
	error(...messages) {
		this.ctx.logger.error(...messages);
	}
	relative(path) {
		return relative(this.ctx.config.root, path);
	}
	onTestRunStart(_specifications) {
		this.start = performance$1.now();
		this._timeStart = formatTimeString(/* @__PURE__ */ new Date());
	}
	onTestRunEnd(testModules, unhandledErrors, _reason) {
		const files = testModules.map((testModule) => testModule.task);
		const errors = [...unhandledErrors];
		this.end = performance$1.now();
		if (!files.length && !errors.length) this.ctx.logger.printNoTestFound(this.ctx.filenamePattern);
		else this.reportSummary(files, errors);
	}
	onTestCaseResult(testCase) {
		if (testCase.result().state === "failed") this.logFailedTask(testCase.task);
	}
	onTestSuiteResult(testSuite) {
		if (testSuite.state() === "failed") this.logFailedTask(testSuite.task);
	}
	onTestModuleEnd(testModule) {
		if (testModule.state() === "failed") this.logFailedTask(testModule.task);
		this.printTestModule(testModule);
	}
	logFailedTask(task) {
		if (this.ctx.config.silent === "passed-only") for (const log of task.logs || []) this.onUserConsoleLog(log, "failed");
	}
	printTestModule(testModule) {
		const moduleState = testModule.state();
		if (moduleState === "queued" || moduleState === "pending") return;
		let testsCount = 0;
		let failedCount = 0;
		let skippedCount = 0;
		// delaying logs to calculate the test stats first
		// which minimizes the amount of for loops
		const logs = [];
		const originalLog = this.log.bind(this);
		this.log = (msg) => logs.push(msg);
		const visit = (suiteState, children) => {
			for (const child of children) if (child.type === "suite") {
				const suiteState = child.state();
				// Skipped suites are hidden when --hideSkippedTests, print otherwise
				if (!this.ctx.config.hideSkippedTests || suiteState !== "skipped") this.printTestSuite(child);
				visit(suiteState, child.children);
			} else {
				const testResult = child.result();
				testsCount++;
				if (testResult.state === "failed") failedCount++;
				else if (testResult.state === "skipped") skippedCount++;
				if (this.ctx.config.hideSkippedTests && suiteState === "skipped")
 // Skipped suites are hidden when --hideSkippedTests
				continue;
				this.printTestCase(moduleState, child);
			}
		};
		try {
			visit(moduleState, testModule.children);
		} finally {
			this.log = originalLog;
		}
		this.log(this.getModuleLog(testModule, {
			tests: testsCount,
			failed: failedCount,
			skipped: skippedCount
		}));
		logs.forEach((log) => this.log(log));
	}
	printTestCase(moduleState, test) {
		const testResult = test.result();
		const { duration = 0 } = test.diagnostic() || {};
		const padding = this.getTestIndentation(test.task);
		const suffix = this.getTestCaseSuffix(test);
		if (testResult.state === "failed") this.log(c.red(` ${padding}${taskFail} ${this.getTestName(test.task, separator)}`) + suffix);
		else if (duration > this.ctx.config.slowTestThreshold) this.log(` ${padding}${c.yellow(c.dim(F_CHECK))} ${this.getTestName(test.task, separator)} ${suffix}`);
		else if (this.ctx.config.hideSkippedTests && testResult.state === "skipped") ; else if (this.renderSucceed || moduleState === "failed") this.log(` ${padding}${this.getStateSymbol(test)} ${this.getTestName(test.task, separator)}${suffix}`);
	}
	getModuleLog(testModule, counts) {
		let state = c.dim(`${counts.tests} test${counts.tests > 1 ? "s" : ""}`);
		if (counts.failed) state += c.dim(" | ") + c.red(`${counts.failed} failed`);
		if (counts.skipped) state += c.dim(" | ") + c.yellow(`${counts.skipped} skipped`);
		let suffix = c.dim("(") + state + c.dim(")") + this.getDurationPrefix(testModule.task);
		const diagnostic = testModule.diagnostic();
		if (diagnostic.heap != null) suffix += c.magenta(` ${Math.floor(diagnostic.heap / 1024 / 1024)} MB heap used`);
		return ` ${this.getEntityPrefix(testModule)} ${testModule.task.name} ${suffix}`;
	}
	printTestSuite(testSuite) {
		if (!this.renderSucceed) return;
		const indentation = "  ".repeat(getIndentation(testSuite.task));
		const tests = Array.from(testSuite.children.allTests());
		const state = this.getStateSymbol(testSuite);
		this.log(` ${indentation}${state} ${testSuite.name} ${c.dim(`(${tests.length})`)}`);
	}
	getTestName(test, _separator) {
		return test.name;
	}
	getFullName(test, separator) {
		if (test === test.file) return test.name;
		let name = test.file.name;
		if (test.location) name += c.dim(`:${test.location.line}:${test.location.column}`);
		name += separator;
		name += getTestName(test, separator);
		return name;
	}
	getTestIndentation(test) {
		return "  ".repeat(getIndentation(test));
	}
	printAnnotations(test, console, padding = 0) {
		const annotations = test.annotations();
		if (!annotations.length) return;
		const PADDING = " ".repeat(padding);
		const groupedAnnotations = {};
		annotations.forEach((annotation) => {
			const { location, type } = annotation;
			let group;
			if (location) {
				const file = relative(test.project.config.root, location.file);
				group = `${c.gray(`${file}:${location.line}:${location.column}`)} ${c.bold(type)}`;
			} else group = c.bold(type);
			groupedAnnotations[group] ??= [];
			groupedAnnotations[group].push(annotation);
		});
		for (const group in groupedAnnotations) {
			this[console](`${PADDING}${c.blue(F_POINTER)} ${group}`);
			groupedAnnotations[group].forEach(({ message }) => {
				this[console](`${PADDING}  ${c.blue(F_DOWN_RIGHT)} ${message}`);
			});
		}
	}
	getEntityPrefix(entity) {
		let title = this.getStateSymbol(entity);
		if (entity.project.name) title += ` ${formatProjectName(entity.project, "")}`;
		if (entity.meta().typecheck) title += ` ${c.bgBlue(c.bold(" TS "))}`;
		return title;
	}
	getTestCaseSuffix(testCase) {
		const { heap, retryCount, repeatCount } = testCase.diagnostic() || {};
		const testResult = testCase.result();
		let suffix = this.getDurationPrefix(testCase.task);
		if (retryCount != null && retryCount > 0) suffix += c.yellow(` (retry x${retryCount})`);
		if (repeatCount != null && repeatCount > 0) suffix += c.yellow(` (repeat x${repeatCount})`);
		if (heap != null) suffix += c.magenta(` ${Math.floor(heap / 1024 / 1024)} MB heap used`);
		if (testResult.state === "skipped" && testResult.note) suffix += c.dim(c.gray(` [${testResult.note}]`));
		return suffix;
	}
	getStateSymbol(test) {
		return getStateSymbol(test.task);
	}
	getDurationPrefix(task) {
		const duration = task.result?.duration && Math.round(task.result?.duration);
		if (duration == null) return "";
		return (duration > this.ctx.config.slowTestThreshold ? c.yellow : c.green)(` ${duration}${c.dim("ms")}`);
	}
	onWatcherStart(files = this.ctx.state.getFiles(), errors = this.ctx.state.getUnhandledErrors()) {
		if (errors.length > 0 || hasFailed(files)) this.log(withLabel("red", "FAIL", "Tests failed. Watching for file changes..."));
		else if (this.ctx.isCancelling) this.log(withLabel("red", "CANCELLED", "Test run cancelled. Watching for file changes..."));
		else this.log(withLabel("green", "PASS", "Waiting for file changes..."));
		const hints = [c.dim("press ") + c.bold("h") + c.dim(" to show help")];
		if (hasFailedSnapshot(files)) hints.unshift(c.dim("press ") + c.bold(c.yellow("u")) + c.dim(" to update snapshot"));
		else hints.push(c.dim("press ") + c.bold("q") + c.dim(" to quit"));
		this.log(BADGE_PADDING + hints.join(c.dim(", ")));
	}
	onWatcherRerun(files, trigger) {
		this.watchFilters = files;
		this.failedUnwatchedFiles = this.ctx.state.getTestModules().filter((testModule) => !files.includes(testModule.task.filepath) && testModule.state() === "failed");
		// Update re-run count for each file
		files.forEach((filepath) => {
			let reruns = this._filesInWatchMode.get(filepath) ?? 0;
			this._filesInWatchMode.set(filepath, ++reruns);
		});
		let banner = trigger ? c.dim(`${this.relative(trigger)} `) : "";
		if (files.length === 1) {
			const rerun = this._filesInWatchMode.get(files[0]) ?? 1;
			banner += c.blue(`x${rerun} `);
		}
		this.ctx.logger.clearFullScreen();
		this.log(withLabel("blue", "RERUN", banner));
		if (this.ctx.configOverride.project) this.log(BADGE_PADDING + c.dim(" Project name: ") + c.blue(toArray(this.ctx.configOverride.project).join(", ")));
		if (this.ctx.filenamePattern) this.log(BADGE_PADDING + c.dim(" Filename pattern: ") + c.blue(this.ctx.filenamePattern.join(", ")));
		if (this.ctx.configOverride.testNamePattern) this.log(BADGE_PADDING + c.dim(" Test name pattern: ") + c.blue(String(this.ctx.configOverride.testNamePattern)));
		this.log("");
		for (const testModule of this.failedUnwatchedFiles) this.printTestModule(testModule);
	}
	onUserConsoleLog(log, taskState) {
		if (!this.shouldLog(log, taskState)) return;
		const output = log.type === "stdout" ? this.ctx.logger.outputStream : this.ctx.logger.errorStream;
		const write = (msg) => output.write(msg);
		let headerText = "unknown test";
		const task = log.taskId ? this.ctx.state.idMap.get(log.taskId) : void 0;
		if (task) headerText = this.getFullName(task, separator);
		else if (log.taskId && log.taskId !== "__vitest__unknown_test__") headerText = log.taskId;
		write(c.gray(log.type + c.dim(` | ${headerText}\n`)) + log.content);
		if (log.origin) {
			// browser logs don't have an extra end of line at the end like Node.js does
			if (log.browser) write("\n");
			const project = task ? this.ctx.getProjectByName(task.file.projectName || "") : this.ctx.getRootProject();
			const stack = log.browser ? project.browser?.parseStacktrace(log.origin) || [] : parseStacktrace(log.origin);
			const highlight = task && stack.find((i) => i.file === task.file.filepath);
			for (const frame of stack) {
				const color = frame === highlight ? c.cyan : c.gray;
				const path = relative(project.config.root, frame.file);
				const positions = [frame.method, `${path}:${c.dim(`${frame.line}:${frame.column}`)}`].filter(Boolean).join(" ");
				write(color(` ${c.dim(F_POINTER)} ${positions}\n`));
			}
		}
		write("\n");
	}
	onTestRemoved(trigger) {
		this.log(c.yellow("Test removed...") + (trigger ? c.dim(` [ ${this.relative(trigger)} ]\n`) : ""));
	}
	shouldLog(log, taskState) {
		if (this.ctx.config.silent === true) return false;
		if (this.ctx.config.silent === "passed-only" && taskState !== "failed") return false;
		if (this.ctx.config.onConsoleLog) {
			const task = log.taskId ? this.ctx.state.idMap.get(log.taskId) : void 0;
			const entity = task && this.ctx.state.getReportedEntity(task);
			if (this.ctx.config.onConsoleLog(log.content, log.type, entity) === false) return false;
		}
		return true;
	}
	onServerRestart(reason) {
		this.log(c.bold(c.magenta(reason === "config" ? "\nRestarting due to config changes..." : "\nRestarting Vitest...")));
	}
	reportSummary(files, errors) {
		this.printErrorsSummary(files, errors);
		if (this.ctx.config.mode === "benchmark") this.reportBenchmarkSummary(files);
		else this.reportTestSummary(files, errors);
	}
	reportTestSummary(files, errors) {
		this.log();
		const affectedFiles = [...this.failedUnwatchedFiles.map((m) => m.task), ...files];
		const tests = getTests(affectedFiles);
		const snapshotOutput = renderSnapshotSummary(this.ctx.config.root, this.ctx.snapshot.summary);
		for (const [index, snapshot] of snapshotOutput.entries()) {
			const title = index === 0 ? "Snapshots" : "";
			this.log(`${padSummaryTitle(title)} ${snapshot}`);
		}
		if (snapshotOutput.length > 1) this.log();
		this.log(padSummaryTitle("Test Files"), getStateString$1(affectedFiles));
		this.log(padSummaryTitle("Tests"), getStateString$1(tests));
		if (this.ctx.projects.some((c) => c.config.typecheck.enabled)) {
			const failed = tests.filter((t) => t.meta?.typecheck && t.result?.errors?.length);
			this.log(padSummaryTitle("Type Errors"), failed.length ? c.bold(c.red(`${failed.length} failed`)) : c.dim("no errors"));
		}
		if (errors.length) this.log(padSummaryTitle("Errors"), c.bold(c.red(`${errors.length} error${errors.length > 1 ? "s" : ""}`)));
		this.log(padSummaryTitle("Start at"), this._timeStart);
		const collectTime = sum(files, (file) => file.collectDuration);
		const testsTime = sum(files, (file) => file.result?.duration);
		const setupTime = sum(files, (file) => file.setupDuration);
		if (this.watchFilters) this.log(padSummaryTitle("Duration"), formatTime(collectTime + testsTime + setupTime));
		else {
			const blobs = this.ctx.state.blobs;
			// Execution time is either sum of all runs of `--merge-reports` or the current run's time
			const executionTime = blobs?.executionTimes ? sum(blobs.executionTimes, (time) => time) : this.end - this.start;
			const environmentTime = sum(files, (file) => file.environmentLoad);
			const transformTime = this.ctx.state.transformTime;
			const typecheck = sum(this.ctx.projects, (project) => project.typechecker?.getResult().time);
			const timers = [
				`transform ${formatTime(transformTime)}`,
				`setup ${formatTime(setupTime)}`,
				`import ${formatTime(collectTime)}`,
				`tests ${formatTime(testsTime)}`,
				`environment ${formatTime(environmentTime)}`,
				typecheck && `typecheck ${formatTime(typecheck)}`
			].filter(Boolean).join(", ");
			this.log(padSummaryTitle("Duration"), formatTime(executionTime) + c.dim(` (${timers})`));
			if (blobs?.executionTimes) this.log(padSummaryTitle("Per blob") + blobs.executionTimes.map((time) => ` ${formatTime(time)}`).join(""));
		}
		if (this.ctx.config.experimental.printImportBreakdown) this.printImportsBreakdown();
		this.log();
	}
	printImportsBreakdown() {
		const testModules = this.ctx.state.getTestModules();
		const allImports = [];
		for (const testModule of testModules) {
			const importDurations = testModule.diagnostic().importDurations;
			for (const filePath in importDurations) {
				const duration = importDurations[filePath];
				allImports.push({
					importedModuleId: filePath,
					testModule,
					selfTime: duration.selfTime,
					totalTime: duration.totalTime,
					external: duration.external
				});
			}
		}
		if (allImports.length === 0) return;
		const sortedImports = allImports.sort((a, b) => b.totalTime - a.totalTime);
		const maxTotalTime = sortedImports[0].totalTime;
		const topImports = sortedImports.slice(0, 10);
		const totalSelfTime = allImports.reduce((sum, imp) => sum + imp.selfTime, 0);
		const totalTotalTime = allImports.reduce((sum, imp) => sum + imp.totalTime, 0);
		const slowestImport = sortedImports[0];
		this.log();
		this.log(c.bold("Import Duration Breakdown") + c.dim(" (ordered by Total Time) (Top 10)"));
		// if there are multiple files, it's highly possible that some of them will import the same large file
		// we group them to show the distinction between those files more easily
		//     Import Duration Breakdown (ordered by Total Time) (Top 10)
		// .../fields/FieldFile/__tests__/FieldFile.spec.ts   self:    7ms total:  1.01s ████████████████████
		//  ↳ tests/support/components/index.ts               self:    0ms total:  861ms █████████████████░░░
		//  ↳ tests/support/components/renderComponent.ts     self:   59ms total:  861ms █████████████████░░░
		// ...s__/apps/desktop/form-updater.desktop.spec.ts   self:    8ms total:  991ms ████████████████████
		// ...sts__/apps/mobile/form-updater.mobile.spec.ts   self:   11ms total:  990ms ████████████████████
		// shared/components/Form/__tests__/Form.spec.ts      self:    5ms total:  988ms ████████████████████
		//  ↳ tests/support/components/index.ts               self:    0ms total:  935ms ███████████████████░
		//  ↳ tests/support/components/renderComponent.ts     self:   61ms total:  935ms ███████████████████░
		// ...ditor/features/link/__test__/LinkForm.spec.ts   self:    7ms total:  972ms ███████████████████░
		//  ↳ tests/support/components/renderComponent.ts     self:   56ms total:  936ms ███████████████████░
		const groupedImports = Object.entries(
			groupBy(topImports, (i) => i.testModule.id)
			// the first one is always the highest because the modules are already sorted
		).sort(([, imps1], [, imps2]) => imps2[0].totalTime - imps1[0].totalTime);
		for (const [_, group] of groupedImports) group.forEach((imp, index) => {
			const barWidth = 20;
			const filledWidth = Math.round(imp.totalTime / maxTotalTime * barWidth);
			const bar = c.cyan("█".repeat(filledWidth)) + c.dim("░".repeat(barWidth - filledWidth));
			// only show the arrow if there is more than 1 group
			const pathDisplay = this.ellipsisPath(imp.importedModuleId, imp.external, groupedImports.length > 1 && index > 0);
			this.log(`${pathDisplay} ${c.dim("self:")} ${this.importDurationTime(imp.selfTime)} ${c.dim("total:")} ${this.importDurationTime(imp.totalTime)} ${bar}`);
		});
		this.log();
		this.log(c.dim("Total imports: ") + allImports.length);
		this.log(c.dim("Slowest import (total-time): ") + formatTime(slowestImport.totalTime));
		this.log(c.dim("Total import time (self/total): ") + formatTime(totalSelfTime) + c.dim(" / ") + formatTime(totalTotalTime));
	}
	importDurationTime(duration) {
		return (duration >= 500 ? c.red : duration >= 100 ? c.yellow : (c) => c)(formatTime(duration).padStart(6));
	}
	ellipsisPath(path, external, nested) {
		const pathDisplay = this.relative(path);
		const color = external ? c.magenta : (c) => c;
		const slicedPath = pathDisplay.slice(-44);
		let title = "";
		if (pathDisplay.length > slicedPath.length) title += "...";
		if (nested) title = ` ${F_DOWN_RIGHT} ${title}`;
		title += slicedPath;
		return color(title.padEnd(50));
	}
	printErrorsSummary(files, errors) {
		const suites = getSuites(files);
		const tests = getTests(files);
		const failedSuites = suites.filter((i) => i.result?.errors);
		const failedTests = tests.filter((i) => i.result?.state === "fail");
		const failedTotal = countTestErrors(failedSuites) + countTestErrors(failedTests);
		// TODO: error divider should take into account merged errors for counting
		let current = 1;
		const errorDivider = () => this.error(`${c.red(c.dim(divider(`[${current++}/${failedTotal}]`, void 0, 1)))}\n`);
		if (failedSuites.length) {
			this.error(`\n${errorBanner(`Failed Suites ${failedSuites.length}`)}\n`);
			this.printTaskErrors(failedSuites, errorDivider);
		}
		if (failedTests.length) {
			this.error(`\n${errorBanner(`Failed Tests ${failedTests.length}`)}\n`);
			this.printTaskErrors(failedTests, errorDivider);
		}
		if (errors.length) {
			this.ctx.logger.printUnhandledErrors(errors);
			this.error();
		}
	}
	reportBenchmarkSummary(files) {
		const topBenches = getTests(files).filter((i) => i.result?.benchmark?.rank === 1);
		this.log(`\n${withLabel("cyan", "BENCH", "Summary\n")}`);
		for (const bench of topBenches) {
			const group = bench.suite || bench.file;
			if (!group) continue;
			const groupName = this.getFullName(group, separator);
			const project = this.ctx.projects.find((p) => p.name === bench.file.projectName);
			this.log(`  ${formatProjectName(project)}${bench.name}${c.dim(` - ${groupName}`)}`);
			const siblings = group.tasks.filter((i) => i.meta.benchmark && i.result?.benchmark && i !== bench).sort((a, b) => a.result.benchmark.rank - b.result.benchmark.rank);
			for (const sibling of siblings) {
				const number = (sibling.result.benchmark.mean / bench.result.benchmark.mean).toFixed(2);
				this.log(c.green(`    ${number}x `) + c.gray("faster than ") + sibling.name);
			}
			this.log("");
		}
	}
	printTaskErrors(tasks, errorDivider) {
		const errorsQueue = [];
		for (const task of tasks)
 // Merge identical errors
		task.result?.errors?.forEach((error) => {
			let previous;
			if (error?.stack) previous = errorsQueue.find((i) => {
				if (i[0]?.stack !== error.stack || i[0]?.diff !== error.diff) return false;
				const currentProjectName = task?.projectName || task.file?.projectName || "";
				const projectName = i[1][0]?.projectName || i[1][0].file?.projectName || "";
				const currentAnnotations = task.type === "test" && task.annotations;
				const itemAnnotations = i[1][0].type === "test" && i[1][0].annotations;
				return projectName === currentProjectName && deepEqual(currentAnnotations, itemAnnotations);
			});
			if (previous) previous[1].push(task);
			else errorsQueue.push([error, [task]]);
		});
		for (const [error, tasks] of errorsQueue) {
			for (const task of tasks) {
				const filepath = task?.filepath || "";
				const projectName = task?.projectName || task.file?.projectName || "";
				const project = this.ctx.projects.find((p) => p.name === projectName);
				let name = this.getFullName(task, separator);
				if (filepath) name += c.dim(` [ ${this.relative(filepath)} ]`);
				this.ctx.logger.error(`${c.bgRed(c.bold(" FAIL "))} ${formatProjectName(project)}${name}`);
			}
			const screenshotPaths = tasks.map((t) => t.meta?.failScreenshotPath).filter((screenshot) => screenshot != null);
			this.ctx.logger.printError(error, {
				project: this.ctx.getProjectByName(tasks[0].file.projectName || ""),
				verbose: this.verbose,
				screenshotPaths,
				task: tasks[0]
			});
			if (tasks[0].type === "test" && tasks[0].annotations.length) {
				const test = this.ctx.state.getReportedEntity(tasks[0]);
				this.printAnnotations(test, "error", 1);
				this.error();
			}
			errorDivider();
		}
	}
}
function deepEqual(a, b) {
	if (a === b) return true;
	if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
	const keysA = Object.keys(a);
	const keysB = Object.keys(b);
	if (keysA.length !== keysB.length) return false;
	for (const key of keysA) if (!keysB.includes(key) || !deepEqual(a[key], b[key])) return false;
	return true;
}
function sum(items, cb) {
	return items.reduce((total, next) => {
		return total + Math.max(cb(next) || 0, 0);
	}, 0);
}
function getIndentation(suite, level = 1) {
	if (suite.suite && !("filepath" in suite.suite)) return getIndentation(suite.suite, level + 1);
	return level;
}

const DEFAULT_RENDER_INTERVAL_MS = 1e3;
const ESC = "\x1B[";
const CLEAR_LINE = `${ESC}K`;
const MOVE_CURSOR_ONE_ROW_UP = `${ESC}1A`;
const SYNC_START = `${ESC}?2026h`;
const SYNC_END = `${ESC}?2026l`;
/**
* Renders content of `getWindow` at the bottom of the terminal and
* forwards all other intercepted `stdout` and `stderr` logs above it.
*/
class WindowRenderer {
	options;
	streams;
	buffer = [];
	renderInterval = void 0;
	renderScheduled = false;
	windowHeight = 0;
	started = false;
	finished = false;
	cleanups = [];
	constructor(options) {
		this.options = {
			interval: DEFAULT_RENDER_INTERVAL_MS,
			...options
		};
		this.streams = {
			output: options.logger.outputStream.write.bind(options.logger.outputStream),
			error: options.logger.errorStream.write.bind(options.logger.errorStream)
		};
		this.cleanups.push(this.interceptStream(process.stdout, "output"), this.interceptStream(process.stderr, "error"));
		// Write buffered content on unexpected exits, e.g. direct `process.exit()` calls
		this.options.logger.onTerminalCleanup(() => {
			this.flushBuffer();
			this.stop();
		});
	}
	start() {
		this.started = true;
		this.finished = false;
		this.renderInterval = setInterval(() => this.schedule(), this.options.interval).unref();
	}
	stop() {
		this.cleanups.splice(0).map((fn) => fn());
		clearInterval(this.renderInterval);
	}
	/**
	* Write all buffered output and stop buffering.
	* All intercepted writes are forwarded to actual write after this.
	*/
	finish() {
		this.finished = true;
		this.flushBuffer();
		clearInterval(this.renderInterval);
	}
	/**
	* Queue new render update
	*/
	schedule() {
		if (!this.renderScheduled) {
			this.renderScheduled = true;
			this.flushBuffer();
			setTimeout(() => {
				this.renderScheduled = false;
			}, 100).unref();
		}
	}
	flushBuffer() {
		if (this.buffer.length === 0) return this.render();
		let current;
		// Concatenate same types into a single render
		for (const next of this.buffer.splice(0)) {
			if (!current) {
				current = next;
				continue;
			}
			if (current.type !== next.type) {
				this.render(current.message, current.type);
				current = next;
				continue;
			}
			current.message += next.message;
		}
		if (current) this.render(current?.message, current?.type);
	}
	render(message, type = "output") {
		if (this.finished) {
			this.clearWindow();
			return this.write(message || "", type);
		}
		const windowContent = this.options.getWindow();
		const rowCount = getRenderedRowCount(windowContent, this.options.logger.getColumns());
		let padding = this.windowHeight - rowCount;
		if (padding > 0 && message) padding -= getRenderedRowCount([message], this.options.logger.getColumns());
		this.write(SYNC_START);
		this.clearWindow();
		if (message) this.write(message, type);
		if (padding > 0) this.write("\n".repeat(padding));
		this.write(windowContent.join("\n"));
		this.write(SYNC_END);
		this.windowHeight = rowCount + Math.max(0, padding);
	}
	clearWindow() {
		if (this.windowHeight === 0) return;
		this.write(CLEAR_LINE);
		for (let i = 1; i < this.windowHeight; i++) this.write(`${MOVE_CURSOR_ONE_ROW_UP}${CLEAR_LINE}`);
		this.windowHeight = 0;
	}
	interceptStream(stream, type) {
		const original = stream.write;
		// @ts-expect-error -- not sure how 2 overloads should be typed
		stream.write = (chunk, _, callback) => {
			if (chunk) if (this.finished || !this.started) this.write(chunk.toString(), type);
			else this.buffer.push({
				type,
				message: chunk.toString()
			});
			callback?.();
		};
		return function restore() {
			stream.write = original;
		};
	}
	write(message, type = "output") {
		this.streams[type](message);
	}
}
/** Calculate the actual row count needed to render `rows` into `stream` */
function getRenderedRowCount(rows, columns) {
	let count = 0;
	for (const row of rows) {
		const text = stripVTControlCharacters(row);
		count += Math.max(1, Math.ceil(text.length / columns));
	}
	return count;
}

const DURATION_UPDATE_INTERVAL_MS = 100;
const FINISHED_TEST_CLEANUP_TIME_MS = 1e3;
/**
* Reporter extension that renders summary and forwards all other logs above itself.
* Intended to be used by other reporters, not as a standalone reporter.
*/
class SummaryReporter {
	ctx;
	options;
	renderer;
	modules = emptyCounters();
	tests = emptyCounters();
	maxParallelTests = 0;
	/** Currently running test modules, may include finished test modules too */
	runningModules = /* @__PURE__ */ new Map();
	/** ID of finished `this.runningModules` that are currently being shown */
	finishedModules = /* @__PURE__ */ new Map();
	startTime = "";
	currentTime = 0;
	duration = 0;
	durationInterval = void 0;
	onInit(ctx, options = {}) {
		this.ctx = ctx;
		this.options = {
			verbose: false,
			...options
		};
		this.renderer = new WindowRenderer({
			logger: ctx.logger,
			getWindow: () => this.createSummary()
		});
		this.ctx.onClose(() => {
			clearInterval(this.durationInterval);
			this.renderer.stop();
		});
	}
	onTestRunStart(specifications) {
		this.runningModules.clear();
		this.finishedModules.clear();
		this.modules = emptyCounters();
		this.tests = emptyCounters();
		this.startTimers();
		this.renderer.start();
		this.modules.total = specifications.length;
	}
	onTestRunEnd() {
		this.runningModules.clear();
		this.finishedModules.clear();
		this.renderer.finish();
		clearInterval(this.durationInterval);
	}
	onTestModuleQueued(module) {
		// When new test module starts, take the place of previously finished test module, if any
		if (this.finishedModules.size) {
			const finished = this.finishedModules.keys().next().value;
			this.removeTestModule(finished);
		}
		this.runningModules.set(module.id, initializeStats(module));
		this.renderer.schedule();
	}
	onTestModuleCollected(module) {
		let stats = this.runningModules.get(module.id);
		if (!stats) {
			stats = initializeStats(module);
			this.runningModules.set(module.id, stats);
		}
		const total = Array.from(module.children.allTests()).length;
		this.tests.total += total;
		stats.total = total;
		this.maxParallelTests = Math.max(this.maxParallelTests, this.runningModules.size);
		this.renderer.schedule();
	}
	onHookStart(options) {
		const stats = this.getHookStats(options);
		if (!stats) return;
		const hook = {
			name: options.name,
			visible: false,
			startTime: performance.now(),
			onFinish: () => {}
		};
		stats.hook?.onFinish?.();
		stats.hook = hook;
		const timeout = setTimeout(() => {
			hook.visible = true;
		}, this.ctx.config.slowTestThreshold).unref();
		hook.onFinish = () => clearTimeout(timeout);
	}
	onHookEnd(options) {
		const stats = this.getHookStats(options);
		if (stats?.hook?.name !== options.name) return;
		stats.hook.onFinish();
		stats.hook.visible = false;
	}
	onTestCaseReady(test) {
		// Track slow running tests only on verbose mode
		if (!this.options.verbose) return;
		const stats = this.runningModules.get(test.module.id);
		if (!stats || stats.tests.has(test.id)) return;
		const slowTest = {
			name: test.name,
			visible: false,
			startTime: performance.now(),
			onFinish: () => {}
		};
		const timeout = setTimeout(() => {
			slowTest.visible = true;
		}, this.ctx.config.slowTestThreshold).unref();
		slowTest.onFinish = () => {
			slowTest.hook?.onFinish();
			clearTimeout(timeout);
		};
		stats.tests.set(test.id, slowTest);
	}
	onTestCaseResult(test) {
		const stats = this.runningModules.get(test.module.id);
		if (!stats) return;
		stats.tests.get(test.id)?.onFinish();
		stats.tests.delete(test.id);
		stats.completed++;
		const result = test.result();
		if (result?.state === "passed") this.tests.passed++;
		else if (result?.state === "failed") this.tests.failed++;
		else if (!result?.state || result?.state === "skipped") this.tests.skipped++;
		this.renderer.schedule();
	}
	onTestModuleEnd(module) {
		const state = module.state();
		this.modules.completed++;
		if (state === "passed") this.modules.passed++;
		else if (state === "failed") this.modules.failed++;
		else if (module.task.mode === "todo" && state === "skipped") this.modules.todo++;
		else if (state === "skipped") this.modules.skipped++;
		// Keep finished tests visible in summary for a while if there are more tests left.
		// When a new test starts in onTestModuleQueued it will take this ones place.
		// This reduces flickering by making summary more stable.
		if (this.modules.total - this.modules.completed > this.maxParallelTests) this.finishedModules.set(module.id, setTimeout(() => {
			this.removeTestModule(module.id);
		}, FINISHED_TEST_CLEANUP_TIME_MS).unref());
		else
 // Run is about to end as there are less tests left than whole run had parallel at max.
		// Remove finished test immediately.
		this.removeTestModule(module.id);
		this.renderer.schedule();
	}
	getHookStats({ entity }) {
		// Track slow running hooks only on verbose mode
		if (!this.options.verbose) return;
		const module = entity.type === "module" ? entity : entity.module;
		const stats = this.runningModules.get(module.id);
		if (!stats) return;
		return entity.type === "test" ? stats.tests.get(entity.id) : stats;
	}
	createSummary() {
		const summary = [""];
		for (const testFile of Array.from(this.runningModules.values()).sort(sortRunningModules)) {
			const typecheck = testFile.typecheck ? `${c.bgBlue(c.bold(" TS "))} ` : "";
			summary.push(c.bold(c.yellow(` ${F_POINTER} `)) + formatProjectName({
				name: testFile.projectName,
				color: testFile.projectColor
			}) + typecheck + testFile.filename + c.dim(!testFile.completed && !testFile.total ? " [queued]" : ` ${testFile.completed}/${testFile.total}`));
			const slowTasks = [testFile.hook, ...testFile.tests.values()].filter((t) => t != null && t.visible);
			for (const [index, task] of slowTasks.entries()) {
				const elapsed = this.currentTime - task.startTime;
				const icon = index === slowTasks.length - 1 ? F_TREE_NODE_END : F_TREE_NODE_MIDDLE;
				summary.push(c.bold(c.yellow(`   ${icon} `)) + task.name + c.bold(c.yellow(` ${formatTime(Math.max(0, elapsed))}`)));
				if (task.hook?.visible) summary.push(c.bold(c.yellow(`      ${F_TREE_NODE_END} `)) + task.hook.name);
			}
		}
		if (this.runningModules.size > 0) summary.push("");
		summary.push(padSummaryTitle("Test Files") + getStateString(this.modules));
		summary.push(padSummaryTitle("Tests") + getStateString(this.tests));
		summary.push(padSummaryTitle("Start at") + this.startTime);
		summary.push(padSummaryTitle("Duration") + formatTime(this.duration));
		summary.push("");
		return summary;
	}
	startTimers() {
		const start = performance.now();
		this.startTime = formatTimeString(/* @__PURE__ */ new Date());
		this.durationInterval = setInterval(() => {
			this.currentTime = performance.now();
			this.duration = this.currentTime - start;
		}, DURATION_UPDATE_INTERVAL_MS).unref();
	}
	removeTestModule(id) {
		if (!id) return;
		const testFile = this.runningModules.get(id);
		testFile?.hook?.onFinish();
		testFile?.tests?.forEach((test) => test.onFinish());
		this.runningModules.delete(id);
		clearTimeout(this.finishedModules.get(id));
		this.finishedModules.delete(id);
	}
}
function emptyCounters() {
	return {
		completed: 0,
		passed: 0,
		failed: 0,
		skipped: 0,
		todo: 0,
		total: 0
	};
}
function getStateString(entry) {
	return [
		entry.failed ? c.bold(c.red(`${entry.failed} failed`)) : null,
		c.bold(c.green(`${entry.passed} passed`)),
		entry.skipped ? c.yellow(`${entry.skipped} skipped`) : null,
		entry.todo ? c.gray(`${entry.todo} todo`) : null
	].filter(Boolean).join(c.dim(" | ")) + c.gray(` (${entry.total})`);
}
function sortRunningModules(a, b) {
	if ((a.projectName || "") > (b.projectName || "")) return 1;
	if ((a.projectName || "") < (b.projectName || "")) return -1;
	return a.filename.localeCompare(b.filename);
}
function initializeStats(module) {
	return {
		total: 0,
		completed: 0,
		filename: module.task.name,
		projectName: module.project.name,
		projectColor: module.project.color,
		tests: /* @__PURE__ */ new Map(),
		typecheck: !!module.task.meta.typecheck
	};
}

class DefaultReporter extends BaseReporter {
	options;
	summary;
	constructor(options = {}) {
		super(options);
		this.options = {
			summary: true,
			...options
		};
		if (!this.isTTY) this.options.summary = false;
		if (this.options.summary) this.summary = new SummaryReporter();
	}
	onTestRunStart(specifications) {
		if (this.isTTY) {
			if (this.renderSucceed === void 0) this.renderSucceed = !!this.renderSucceed;
			if (this.renderSucceed !== true) this.renderSucceed = specifications.length <= 1;
		}
		super.onTestRunStart(specifications);
		this.summary?.onTestRunStart(specifications);
	}
	onTestRunEnd(testModules, unhandledErrors, reason) {
		super.onTestRunEnd(testModules, unhandledErrors, reason);
		this.summary?.onTestRunEnd();
	}
	onTestModuleQueued(file) {
		this.summary?.onTestModuleQueued(file);
	}
	onTestModuleCollected(module) {
		this.summary?.onTestModuleCollected(module);
	}
	onTestModuleEnd(module) {
		super.onTestModuleEnd(module);
		this.summary?.onTestModuleEnd(module);
	}
	onTestCaseReady(test) {
		this.summary?.onTestCaseReady(test);
	}
	onTestCaseResult(test) {
		super.onTestCaseResult(test);
		this.summary?.onTestCaseResult(test);
	}
	onHookStart(hook) {
		this.summary?.onHookStart(hook);
	}
	onHookEnd(hook) {
		this.summary?.onHookEnd(hook);
	}
	onInit(ctx) {
		super.onInit(ctx);
		this.summary?.onInit(ctx, { verbose: this.verbose });
	}
}

class DotReporter extends BaseReporter {
	renderer;
	tests = /* @__PURE__ */ new Map();
	finishedTests = /* @__PURE__ */ new Set();
	onInit(ctx) {
		super.onInit(ctx);
		if (this.isTTY) {
			this.renderer = new WindowRenderer({
				logger: ctx.logger,
				getWindow: () => this.createSummary()
			});
			this.ctx.onClose(() => this.renderer?.stop());
		}
	}
	// Ignore default logging of base reporter
	printTestModule() {}
	onWatcherRerun(files, trigger) {
		this.tests.clear();
		this.renderer?.start();
		super.onWatcherRerun(files, trigger);
	}
	onTestRunEnd(testModules, unhandledErrors, reason) {
		if (this.isTTY) {
			const finalLog = formatTests(Array.from(this.tests.values()));
			this.ctx.logger.log(finalLog);
		} else this.ctx.logger.log();
		this.tests.clear();
		this.renderer?.finish();
		super.onTestRunEnd(testModules, unhandledErrors, reason);
	}
	onTestModuleCollected(module) {
		for (const test of module.children.allTests())
 // Dot reporter marks pending tests as running
		this.onTestCaseReady(test);
	}
	onTestCaseReady(test) {
		if (this.finishedTests.has(test.id)) return;
		this.tests.set(test.id, test.result().state || "run");
		this.renderer?.schedule();
	}
	onTestCaseResult(test) {
		const result = test.result().state;
		// On non-TTY the finished tests are printed immediately
		if (!this.isTTY && result !== "pending") this.ctx.logger.outputStream.write(formatTests([result]));
		super.onTestCaseResult(test);
		this.finishedTests.add(test.id);
		this.tests.set(test.id, result || "skipped");
		this.renderer?.schedule();
	}
	onTestModuleEnd(testModule) {
		super.onTestModuleEnd(testModule);
		if (!this.isTTY) return;
		const columns = this.ctx.logger.getColumns();
		if (this.tests.size < columns) return;
		const finishedTests = Array.from(this.tests).filter((entry) => entry[1] !== "pending");
		if (finishedTests.length < columns) return;
		// Remove finished tests from state and render them in static output
		const states = [];
		let count = 0;
		for (const [id, state] of finishedTests) {
			if (count++ >= columns) break;
			this.tests.delete(id);
			states.push(state);
		}
		this.ctx.logger.log(formatTests(states));
		this.renderer?.schedule();
	}
	createSummary() {
		return [formatTests(Array.from(this.tests.values())), ""];
	}
}
// These are compared with reference equality in formatTests
const pass = {
	char: "·",
	color: c.green
};
const fail = {
	char: "x",
	color: c.red
};
const pending = {
	char: "*",
	color: c.yellow
};
const skip = {
	char: "-",
	color: (char) => c.dim(c.gray(char))
};
function getIcon(state) {
	switch (state) {
		case "passed": return pass;
		case "failed": return fail;
		case "skipped": return skip;
		default: return pending;
	}
}
/**
* Format test states into string while keeping ANSI escapes at minimal.
* Sibling icons with same color are merged into a single c.color() call.
*/
function formatTests(states) {
	let currentIcon = pending;
	let count = 0;
	let output = "";
	for (const state of states) {
		const icon = getIcon(state);
		if (currentIcon === icon) {
			count++;
			continue;
		}
		output += currentIcon.color(currentIcon.char.repeat(count));
		// Start tracking new group
		count = 1;
		currentIcon = icon;
	}
	output += currentIcon.color(currentIcon.char.repeat(count));
	return output;
}

// src/vlq.ts
var comma = ",".charCodeAt(0);
var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var intToChar = new Uint8Array(64);
var charToInt = new Uint8Array(128);
for (let i = 0; i < chars.length; i++) {
  const c = chars.charCodeAt(i);
  intToChar[i] = c;
  charToInt[c] = i;
}
function decodeInteger(reader, relative) {
  let value = 0;
  let shift = 0;
  let integer = 0;
  do {
    const c = reader.next();
    integer = charToInt[c];
    value |= (integer & 31) << shift;
    shift += 5;
  } while (integer & 32);
  const shouldNegate = value & 1;
  value >>>= 1;
  if (shouldNegate) {
    value = -2147483648 | -value;
  }
  return relative + value;
}
function hasMoreVlq(reader, max) {
  if (reader.pos >= max) return false;
  return reader.peek() !== comma;
}
var StringReader = class {
  constructor(buffer) {
    this.pos = 0;
    this.buffer = buffer;
  }
  next() {
    return this.buffer.charCodeAt(this.pos++);
  }
  peek() {
    return this.buffer.charCodeAt(this.pos);
  }
  indexOf(char) {
    const { buffer, pos } = this;
    const idx = buffer.indexOf(char, pos);
    return idx === -1 ? buffer.length : idx;
  }
};

// src/sourcemap-codec.ts
function decode(mappings) {
  const { length } = mappings;
  const reader = new StringReader(mappings);
  const decoded = [];
  let genColumn = 0;
  let sourcesIndex = 0;
  let sourceLine = 0;
  let sourceColumn = 0;
  let namesIndex = 0;
  do {
    const semi = reader.indexOf(";");
    const line = [];
    let sorted = true;
    let lastCol = 0;
    genColumn = 0;
    while (reader.pos < semi) {
      let seg;
      genColumn = decodeInteger(reader, genColumn);
      if (genColumn < lastCol) sorted = false;
      lastCol = genColumn;
      if (hasMoreVlq(reader, semi)) {
        sourcesIndex = decodeInteger(reader, sourcesIndex);
        sourceLine = decodeInteger(reader, sourceLine);
        sourceColumn = decodeInteger(reader, sourceColumn);
        if (hasMoreVlq(reader, semi)) {
          namesIndex = decodeInteger(reader, namesIndex);
          seg = [genColumn, sourcesIndex, sourceLine, sourceColumn, namesIndex];
        } else {
          seg = [genColumn, sourcesIndex, sourceLine, sourceColumn];
        }
      } else {
        seg = [genColumn];
      }
      line.push(seg);
      reader.pos++;
    }
    if (!sorted) sort(line);
    decoded.push(line);
    reader.pos = semi + 1;
  } while (reader.pos <= length);
  return decoded;
}
function sort(line) {
  line.sort(sortComparator$1);
}
function sortComparator$1(a, b) {
  return a[0] - b[0];
}

// Matches the scheme of a URL, eg "http://"
const schemeRegex = /^[\w+.-]+:\/\//;
/**
 * Matches the parts of a URL:
 * 1. Scheme, including ":", guaranteed.
 * 2. User/password, including "@", optional.
 * 3. Host, guaranteed.
 * 4. Port, including ":", optional.
 * 5. Path, including "/", optional.
 * 6. Query, including "?", optional.
 * 7. Hash, including "#", optional.
 */
const urlRegex = /^([\w+.-]+:)\/\/([^@/#?]*@)?([^:/#?]*)(:\d+)?(\/[^#?]*)?(\?[^#]*)?(#.*)?/;
/**
 * File URLs are weird. They dont' need the regular `//` in the scheme, they may or may not start
 * with a leading `/`, they can have a domain (but only if they don't start with a Windows drive).
 *
 * 1. Host, optional.
 * 2. Path, which may include "/", guaranteed.
 * 3. Query, including "?", optional.
 * 4. Hash, including "#", optional.
 */
const fileRegex = /^file:(?:\/\/((?![a-z]:)[^/#?]*)?)?(\/?[^#?]*)(\?[^#]*)?(#.*)?/i;
function isAbsoluteUrl(input) {
    return schemeRegex.test(input);
}
function isSchemeRelativeUrl(input) {
    return input.startsWith('//');
}
function isAbsolutePath(input) {
    return input.startsWith('/');
}
function isFileUrl(input) {
    return input.startsWith('file:');
}
function isRelative(input) {
    return /^[.?#]/.test(input);
}
function parseAbsoluteUrl(input) {
    const match = urlRegex.exec(input);
    return makeUrl(match[1], match[2] || '', match[3], match[4] || '', match[5] || '/', match[6] || '', match[7] || '');
}
function parseFileUrl(input) {
    const match = fileRegex.exec(input);
    const path = match[2];
    return makeUrl('file:', '', match[1] || '', '', isAbsolutePath(path) ? path : '/' + path, match[3] || '', match[4] || '');
}
function makeUrl(scheme, user, host, port, path, query, hash) {
    return {
        scheme,
        user,
        host,
        port,
        path,
        query,
        hash,
        type: 7 /* Absolute */,
    };
}
function parseUrl(input) {
    if (isSchemeRelativeUrl(input)) {
        const url = parseAbsoluteUrl('http:' + input);
        url.scheme = '';
        url.type = 6 /* SchemeRelative */;
        return url;
    }
    if (isAbsolutePath(input)) {
        const url = parseAbsoluteUrl('http://foo.com' + input);
        url.scheme = '';
        url.host = '';
        url.type = 5 /* AbsolutePath */;
        return url;
    }
    if (isFileUrl(input))
        return parseFileUrl(input);
    if (isAbsoluteUrl(input))
        return parseAbsoluteUrl(input);
    const url = parseAbsoluteUrl('http://foo.com/' + input);
    url.scheme = '';
    url.host = '';
    url.type = input
        ? input.startsWith('?')
            ? 3 /* Query */
            : input.startsWith('#')
                ? 2 /* Hash */
                : 4 /* RelativePath */
        : 1 /* Empty */;
    return url;
}
function stripPathFilename(path) {
    // If a path ends with a parent directory "..", then it's a relative path with excess parent
    // paths. It's not a file, so we can't strip it.
    if (path.endsWith('/..'))
        return path;
    const index = path.lastIndexOf('/');
    return path.slice(0, index + 1);
}
function mergePaths(url, base) {
    normalizePath(base, base.type);
    // If the path is just a "/", then it was an empty path to begin with (remember, we're a relative
    // path).
    if (url.path === '/') {
        url.path = base.path;
    }
    else {
        // Resolution happens relative to the base path's directory, not the file.
        url.path = stripPathFilename(base.path) + url.path;
    }
}
/**
 * The path can have empty directories "//", unneeded parents "foo/..", or current directory
 * "foo/.". We need to normalize to a standard representation.
 */
function normalizePath(url, type) {
    const rel = type <= 4 /* RelativePath */;
    const pieces = url.path.split('/');
    // We need to preserve the first piece always, so that we output a leading slash. The item at
    // pieces[0] is an empty string.
    let pointer = 1;
    // Positive is the number of real directories we've output, used for popping a parent directory.
    // Eg, "foo/bar/.." will have a positive 2, and we can decrement to be left with just "foo".
    let positive = 0;
    // We need to keep a trailing slash if we encounter an empty directory (eg, splitting "foo/" will
    // generate `["foo", ""]` pieces). And, if we pop a parent directory. But once we encounter a
    // real directory, we won't need to append, unless the other conditions happen again.
    let addTrailingSlash = false;
    for (let i = 1; i < pieces.length; i++) {
        const piece = pieces[i];
        // An empty directory, could be a trailing slash, or just a double "//" in the path.
        if (!piece) {
            addTrailingSlash = true;
            continue;
        }
        // If we encounter a real directory, then we don't need to append anymore.
        addTrailingSlash = false;
        // A current directory, which we can always drop.
        if (piece === '.')
            continue;
        // A parent directory, we need to see if there are any real directories we can pop. Else, we
        // have an excess of parents, and we'll need to keep the "..".
        if (piece === '..') {
            if (positive) {
                addTrailingSlash = true;
                positive--;
                pointer--;
            }
            else if (rel) {
                // If we're in a relativePath, then we need to keep the excess parents. Else, in an absolute
                // URL, protocol relative URL, or an absolute path, we don't need to keep excess.
                pieces[pointer++] = piece;
            }
            continue;
        }
        // We've encountered a real directory. Move it to the next insertion pointer, which accounts for
        // any popped or dropped directories.
        pieces[pointer++] = piece;
        positive++;
    }
    let path = '';
    for (let i = 1; i < pointer; i++) {
        path += '/' + pieces[i];
    }
    if (!path || (addTrailingSlash && !path.endsWith('/..'))) {
        path += '/';
    }
    url.path = path;
}
/**
 * Attempts to resolve `input` URL/path relative to `base`.
 */
function resolve(input, base) {
    if (!input && !base)
        return '';
    const url = parseUrl(input);
    let inputType = url.type;
    if (base && inputType !== 7 /* Absolute */) {
        const baseUrl = parseUrl(base);
        const baseType = baseUrl.type;
        switch (inputType) {
            case 1 /* Empty */:
                url.hash = baseUrl.hash;
            // fall through
            case 2 /* Hash */:
                url.query = baseUrl.query;
            // fall through
            case 3 /* Query */:
            case 4 /* RelativePath */:
                mergePaths(url, baseUrl);
            // fall through
            case 5 /* AbsolutePath */:
                // The host, user, and port are joined, you can't copy one without the others.
                url.user = baseUrl.user;
                url.host = baseUrl.host;
                url.port = baseUrl.port;
            // fall through
            case 6 /* SchemeRelative */:
                // The input doesn't have a schema at least, so we need to copy at least that over.
                url.scheme = baseUrl.scheme;
        }
        if (baseType > inputType)
            inputType = baseType;
    }
    normalizePath(url, inputType);
    const queryHash = url.query + url.hash;
    switch (inputType) {
        // This is impossible, because of the empty checks at the start of the function.
        // case UrlType.Empty:
        case 2 /* Hash */:
        case 3 /* Query */:
            return queryHash;
        case 4 /* RelativePath */: {
            // The first char is always a "/", and we need it to be relative.
            const path = url.path.slice(1);
            if (!path)
                return queryHash || '.';
            if (isRelative(base || input) && !isRelative(path)) {
                // If base started with a leading ".", or there is no base and input started with a ".",
                // then we need to ensure that the relative path starts with a ".". We don't know if
                // relative starts with a "..", though, so check before prepending.
                return './' + path + queryHash;
            }
            return path + queryHash;
        }
        case 5 /* AbsolutePath */:
            return url.path + queryHash;
        default:
            return url.scheme + '//' + url.user + url.host + url.port + url.path + queryHash;
    }
}

// src/trace-mapping.ts

// src/strip-filename.ts
function stripFilename(path) {
  if (!path) return "";
  const index = path.lastIndexOf("/");
  return path.slice(0, index + 1);
}

// src/resolve.ts
function resolver(mapUrl, sourceRoot) {
  const from = stripFilename(mapUrl);
  const prefix = sourceRoot ? sourceRoot + "/" : "";
  return (source) => resolve(prefix + (source || ""), from);
}

// src/sourcemap-segment.ts
var COLUMN = 0;
var SOURCES_INDEX = 1;
var SOURCE_LINE = 2;
var SOURCE_COLUMN = 3;
var NAMES_INDEX = 4;
var REV_GENERATED_LINE = 1;
var REV_GENERATED_COLUMN = 2;

// src/sort.ts
function maybeSort(mappings, owned) {
  const unsortedIndex = nextUnsortedSegmentLine(mappings, 0);
  if (unsortedIndex === mappings.length) return mappings;
  if (!owned) mappings = mappings.slice();
  for (let i = unsortedIndex; i < mappings.length; i = nextUnsortedSegmentLine(mappings, i + 1)) {
    mappings[i] = sortSegments(mappings[i], owned);
  }
  return mappings;
}
function nextUnsortedSegmentLine(mappings, start) {
  for (let i = start; i < mappings.length; i++) {
    if (!isSorted(mappings[i])) return i;
  }
  return mappings.length;
}
function isSorted(line) {
  for (let j = 1; j < line.length; j++) {
    if (line[j][COLUMN] < line[j - 1][COLUMN]) {
      return false;
    }
  }
  return true;
}
function sortSegments(line, owned) {
  if (!owned) line = line.slice();
  return line.sort(sortComparator);
}
function sortComparator(a, b) {
  return a[COLUMN] - b[COLUMN];
}

// src/by-source.ts
function buildBySources(decoded, memos) {
  const sources = memos.map(() => []);
  for (let i = 0; i < decoded.length; i++) {
    const line = decoded[i];
    for (let j = 0; j < line.length; j++) {
      const seg = line[j];
      if (seg.length === 1) continue;
      const sourceIndex2 = seg[SOURCES_INDEX];
      const sourceLine = seg[SOURCE_LINE];
      const sourceColumn = seg[SOURCE_COLUMN];
      const source = sources[sourceIndex2];
      const segs = source[sourceLine] || (source[sourceLine] = []);
      segs.push([sourceColumn, i, seg[COLUMN]]);
    }
  }
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    for (let j = 0; j < source.length; j++) {
      const line = source[j];
      if (line) line.sort(sortComparator);
    }
  }
  return sources;
}

// src/binary-search.ts
var found = false;
function binarySearch(haystack, needle, low, high) {
  while (low <= high) {
    const mid = low + (high - low >> 1);
    const cmp = haystack[mid][COLUMN] - needle;
    if (cmp === 0) {
      found = true;
      return mid;
    }
    if (cmp < 0) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  found = false;
  return low - 1;
}
function upperBound(haystack, needle, index) {
  for (let i = index + 1; i < haystack.length; index = i++) {
    if (haystack[i][COLUMN] !== needle) break;
  }
  return index;
}
function lowerBound(haystack, needle, index) {
  for (let i = index - 1; i >= 0; index = i--) {
    if (haystack[i][COLUMN] !== needle) break;
  }
  return index;
}
function memoizedState() {
  return {
    lastKey: -1,
    lastNeedle: -1,
    lastIndex: -1
  };
}
function memoizedBinarySearch(haystack, needle, state, key) {
  const { lastKey, lastNeedle, lastIndex } = state;
  let low = 0;
  let high = haystack.length - 1;
  if (key === lastKey) {
    if (needle === lastNeedle) {
      found = lastIndex !== -1 && haystack[lastIndex][COLUMN] === needle;
      return lastIndex;
    }
    if (needle >= lastNeedle) {
      low = lastIndex === -1 ? 0 : lastIndex;
    } else {
      high = lastIndex;
    }
  }
  state.lastKey = key;
  state.lastNeedle = needle;
  return state.lastIndex = binarySearch(haystack, needle, low, high);
}

// src/types.ts
function parse(map) {
  return typeof map === "string" ? JSON.parse(map) : map;
}

// src/trace-mapping.ts
var LINE_GTR_ZERO = "`line` must be greater than 0 (lines start at line 1)";
var COL_GTR_EQ_ZERO = "`column` must be greater than or equal to 0 (columns start at column 0)";
var LEAST_UPPER_BOUND = -1;
var GREATEST_LOWER_BOUND = 1;
var TraceMap = class {
  constructor(map, mapUrl) {
    const isString = typeof map === "string";
    if (!isString && map._decodedMemo) return map;
    const parsed = parse(map);
    const { version, file, names, sourceRoot, sources, sourcesContent } = parsed;
    this.version = version;
    this.file = file;
    this.names = names || [];
    this.sourceRoot = sourceRoot;
    this.sources = sources;
    this.sourcesContent = sourcesContent;
    this.ignoreList = parsed.ignoreList || parsed.x_google_ignoreList || void 0;
    const resolve = resolver(mapUrl, sourceRoot);
    this.resolvedSources = sources.map(resolve);
    const { mappings } = parsed;
    if (typeof mappings === "string") {
      this._encoded = mappings;
      this._decoded = void 0;
    } else if (Array.isArray(mappings)) {
      this._encoded = void 0;
      this._decoded = maybeSort(mappings, isString);
    } else if (parsed.sections) {
      throw new Error(`TraceMap passed sectioned source map, please use FlattenMap export instead`);
    } else {
      throw new Error(`invalid source map: ${JSON.stringify(parsed)}`);
    }
    this._decodedMemo = memoizedState();
    this._bySources = void 0;
    this._bySourceMemos = void 0;
  }
};
function cast(map) {
  return map;
}
function decodedMappings(map) {
  var _a;
  return (_a = cast(map))._decoded || (_a._decoded = decode(cast(map)._encoded));
}
function originalPositionFor(map, needle) {
  let { line, column, bias } = needle;
  line--;
  if (line < 0) throw new Error(LINE_GTR_ZERO);
  if (column < 0) throw new Error(COL_GTR_EQ_ZERO);
  const decoded = decodedMappings(map);
  if (line >= decoded.length) return OMapping(null, null, null, null);
  const segments = decoded[line];
  const index = traceSegmentInternal(
    segments,
    cast(map)._decodedMemo,
    line,
    column,
    bias || GREATEST_LOWER_BOUND
  );
  if (index === -1) return OMapping(null, null, null, null);
  const segment = segments[index];
  if (segment.length === 1) return OMapping(null, null, null, null);
  const { names, resolvedSources } = map;
  return OMapping(
    resolvedSources[segment[SOURCES_INDEX]],
    segment[SOURCE_LINE] + 1,
    segment[SOURCE_COLUMN],
    segment.length === 5 ? names[segment[NAMES_INDEX]] : null
  );
}
function generatedPositionFor(map, needle) {
  const { source, line, column, bias } = needle;
  return generatedPosition(map, source, line, column, bias || GREATEST_LOWER_BOUND, false);
}
function eachMapping(map, cb) {
  const decoded = decodedMappings(map);
  const { names, resolvedSources } = map;
  for (let i = 0; i < decoded.length; i++) {
    const line = decoded[i];
    for (let j = 0; j < line.length; j++) {
      const seg = line[j];
      const generatedLine = i + 1;
      const generatedColumn = seg[0];
      let source = null;
      let originalLine = null;
      let originalColumn = null;
      let name = null;
      if (seg.length !== 1) {
        source = resolvedSources[seg[1]];
        originalLine = seg[2] + 1;
        originalColumn = seg[3];
      }
      if (seg.length === 5) name = names[seg[4]];
      cb({
        generatedLine,
        generatedColumn,
        source,
        originalLine,
        originalColumn,
        name
      });
    }
  }
}
function OMapping(source, line, column, name) {
  return { source, line, column, name };
}
function GMapping(line, column) {
  return { line, column };
}
function traceSegmentInternal(segments, memo, line, column, bias) {
  let index = memoizedBinarySearch(segments, column, memo, line);
  if (found) {
    index = (bias === LEAST_UPPER_BOUND ? upperBound : lowerBound)(segments, column, index);
  } else if (bias === LEAST_UPPER_BOUND) index++;
  if (index === -1 || index === segments.length) return -1;
  return index;
}
function generatedPosition(map, source, line, column, bias, all) {
  var _a, _b;
  line--;
  if (line < 0) throw new Error(LINE_GTR_ZERO);
  if (column < 0) throw new Error(COL_GTR_EQ_ZERO);
  const { sources, resolvedSources } = map;
  let sourceIndex2 = sources.indexOf(source);
  if (sourceIndex2 === -1) sourceIndex2 = resolvedSources.indexOf(source);
  if (sourceIndex2 === -1) return all ? [] : GMapping(null, null);
  const bySourceMemos = (_a = cast(map))._bySourceMemos || (_a._bySourceMemos = sources.map(memoizedState));
  const generated = (_b = cast(map))._bySources || (_b._bySources = buildBySources(decodedMappings(map), bySourceMemos));
  const segments = generated[sourceIndex2][line];
  if (segments == null) return all ? [] : GMapping(null, null);
  const memo = bySourceMemos[sourceIndex2];
  const index = traceSegmentInternal(segments, memo, line, column, bias);
  if (index === -1) return GMapping(null, null);
  const segment = segments[index];
  return GMapping(segment[REV_GENERATED_LINE] + 1, segment[REV_GENERATED_COLUMN]);
}

// AST walker module for ESTree compatible trees


// An ancestor walk keeps an array of ancestor nodes (including the
// current node) and passes them to the callback as third parameter
// (and also as state parameter when no other state is present).
function ancestor(node, visitors, baseVisitor, state, override) {
  var ancestors = [];
  if (!baseVisitor) { baseVisitor = base
  ; }(function c(node, st, override) {
    var type = override || node.type;
    var isNew = node !== ancestors[ancestors.length - 1];
    if (isNew) { ancestors.push(node); }
    baseVisitor[type](node, st, c);
    if (visitors[type]) { visitors[type](node, st || ancestors, ancestors); }
    if (isNew) { ancestors.pop(); }
  })(node, state, override);
}

function skipThrough(node, st, c) { c(node, st); }
function ignore(_node, _st, _c) {}

// Node walkers.

var base = {};

base.Program = base.BlockStatement = base.StaticBlock = function (node, st, c) {
  for (var i = 0, list = node.body; i < list.length; i += 1)
    {
    var stmt = list[i];

    c(stmt, st, "Statement");
  }
};
base.Statement = skipThrough;
base.EmptyStatement = ignore;
base.ExpressionStatement = base.ParenthesizedExpression = base.ChainExpression =
  function (node, st, c) { return c(node.expression, st, "Expression"); };
base.IfStatement = function (node, st, c) {
  c(node.test, st, "Expression");
  c(node.consequent, st, "Statement");
  if (node.alternate) { c(node.alternate, st, "Statement"); }
};
base.LabeledStatement = function (node, st, c) { return c(node.body, st, "Statement"); };
base.BreakStatement = base.ContinueStatement = ignore;
base.WithStatement = function (node, st, c) {
  c(node.object, st, "Expression");
  c(node.body, st, "Statement");
};
base.SwitchStatement = function (node, st, c) {
  c(node.discriminant, st, "Expression");
  for (var i = 0, list = node.cases; i < list.length; i += 1) {
    var cs = list[i];

    c(cs, st);
  }
};
base.SwitchCase = function (node, st, c) {
  if (node.test) { c(node.test, st, "Expression"); }
  for (var i = 0, list = node.consequent; i < list.length; i += 1)
    {
    var cons = list[i];

    c(cons, st, "Statement");
  }
};
base.ReturnStatement = base.YieldExpression = base.AwaitExpression = function (node, st, c) {
  if (node.argument) { c(node.argument, st, "Expression"); }
};
base.ThrowStatement = base.SpreadElement =
  function (node, st, c) { return c(node.argument, st, "Expression"); };
base.TryStatement = function (node, st, c) {
  c(node.block, st, "Statement");
  if (node.handler) { c(node.handler, st); }
  if (node.finalizer) { c(node.finalizer, st, "Statement"); }
};
base.CatchClause = function (node, st, c) {
  if (node.param) { c(node.param, st, "Pattern"); }
  c(node.body, st, "Statement");
};
base.WhileStatement = base.DoWhileStatement = function (node, st, c) {
  c(node.test, st, "Expression");
  c(node.body, st, "Statement");
};
base.ForStatement = function (node, st, c) {
  if (node.init) { c(node.init, st, "ForInit"); }
  if (node.test) { c(node.test, st, "Expression"); }
  if (node.update) { c(node.update, st, "Expression"); }
  c(node.body, st, "Statement");
};
base.ForInStatement = base.ForOfStatement = function (node, st, c) {
  c(node.left, st, "ForInit");
  c(node.right, st, "Expression");
  c(node.body, st, "Statement");
};
base.ForInit = function (node, st, c) {
  if (node.type === "VariableDeclaration") { c(node, st); }
  else { c(node, st, "Expression"); }
};
base.DebuggerStatement = ignore;

base.FunctionDeclaration = function (node, st, c) { return c(node, st, "Function"); };
base.VariableDeclaration = function (node, st, c) {
  for (var i = 0, list = node.declarations; i < list.length; i += 1)
    {
    var decl = list[i];

    c(decl, st);
  }
};
base.VariableDeclarator = function (node, st, c) {
  c(node.id, st, "Pattern");
  if (node.init) { c(node.init, st, "Expression"); }
};

base.Function = function (node, st, c) {
  if (node.id) { c(node.id, st, "Pattern"); }
  for (var i = 0, list = node.params; i < list.length; i += 1)
    {
    var param = list[i];

    c(param, st, "Pattern");
  }
  c(node.body, st, node.expression ? "Expression" : "Statement");
};

base.Pattern = function (node, st, c) {
  if (node.type === "Identifier")
    { c(node, st, "VariablePattern"); }
  else if (node.type === "MemberExpression")
    { c(node, st, "MemberPattern"); }
  else
    { c(node, st); }
};
base.VariablePattern = ignore;
base.MemberPattern = skipThrough;
base.RestElement = function (node, st, c) { return c(node.argument, st, "Pattern"); };
base.ArrayPattern = function (node, st, c) {
  for (var i = 0, list = node.elements; i < list.length; i += 1) {
    var elt = list[i];

    if (elt) { c(elt, st, "Pattern"); }
  }
};
base.ObjectPattern = function (node, st, c) {
  for (var i = 0, list = node.properties; i < list.length; i += 1) {
    var prop = list[i];

    if (prop.type === "Property") {
      if (prop.computed) { c(prop.key, st, "Expression"); }
      c(prop.value, st, "Pattern");
    } else if (prop.type === "RestElement") {
      c(prop.argument, st, "Pattern");
    }
  }
};

base.Expression = skipThrough;
base.ThisExpression = base.Super = base.MetaProperty = ignore;
base.ArrayExpression = function (node, st, c) {
  for (var i = 0, list = node.elements; i < list.length; i += 1) {
    var elt = list[i];

    if (elt) { c(elt, st, "Expression"); }
  }
};
base.ObjectExpression = function (node, st, c) {
  for (var i = 0, list = node.properties; i < list.length; i += 1)
    {
    var prop = list[i];

    c(prop, st);
  }
};
base.FunctionExpression = base.ArrowFunctionExpression = base.FunctionDeclaration;
base.SequenceExpression = function (node, st, c) {
  for (var i = 0, list = node.expressions; i < list.length; i += 1)
    {
    var expr = list[i];

    c(expr, st, "Expression");
  }
};
base.TemplateLiteral = function (node, st, c) {
  for (var i = 0, list = node.quasis; i < list.length; i += 1)
    {
    var quasi = list[i];

    c(quasi, st);
  }

  for (var i$1 = 0, list$1 = node.expressions; i$1 < list$1.length; i$1 += 1)
    {
    var expr = list$1[i$1];

    c(expr, st, "Expression");
  }
};
base.TemplateElement = ignore;
base.UnaryExpression = base.UpdateExpression = function (node, st, c) {
  c(node.argument, st, "Expression");
};
base.BinaryExpression = base.LogicalExpression = function (node, st, c) {
  c(node.left, st, "Expression");
  c(node.right, st, "Expression");
};
base.AssignmentExpression = base.AssignmentPattern = function (node, st, c) {
  c(node.left, st, "Pattern");
  c(node.right, st, "Expression");
};
base.ConditionalExpression = function (node, st, c) {
  c(node.test, st, "Expression");
  c(node.consequent, st, "Expression");
  c(node.alternate, st, "Expression");
};
base.NewExpression = base.CallExpression = function (node, st, c) {
  c(node.callee, st, "Expression");
  if (node.arguments)
    { for (var i = 0, list = node.arguments; i < list.length; i += 1)
      {
        var arg = list[i];

        c(arg, st, "Expression");
      } }
};
base.MemberExpression = function (node, st, c) {
  c(node.object, st, "Expression");
  if (node.computed) { c(node.property, st, "Expression"); }
};
base.ExportNamedDeclaration = base.ExportDefaultDeclaration = function (node, st, c) {
  if (node.declaration)
    { c(node.declaration, st, node.type === "ExportNamedDeclaration" || node.declaration.id ? "Statement" : "Expression"); }
  if (node.source) { c(node.source, st, "Expression"); }
};
base.ExportAllDeclaration = function (node, st, c) {
  if (node.exported)
    { c(node.exported, st); }
  c(node.source, st, "Expression");
};
base.ImportDeclaration = function (node, st, c) {
  for (var i = 0, list = node.specifiers; i < list.length; i += 1)
    {
    var spec = list[i];

    c(spec, st);
  }
  c(node.source, st, "Expression");
};
base.ImportExpression = function (node, st, c) {
  c(node.source, st, "Expression");
};
base.ImportSpecifier = base.ImportDefaultSpecifier = base.ImportNamespaceSpecifier = base.Identifier = base.PrivateIdentifier = base.Literal = ignore;

base.TaggedTemplateExpression = function (node, st, c) {
  c(node.tag, st, "Expression");
  c(node.quasi, st, "Expression");
};
base.ClassDeclaration = base.ClassExpression = function (node, st, c) { return c(node, st, "Class"); };
base.Class = function (node, st, c) {
  if (node.id) { c(node.id, st, "Pattern"); }
  if (node.superClass) { c(node.superClass, st, "Expression"); }
  c(node.body, st);
};
base.ClassBody = function (node, st, c) {
  for (var i = 0, list = node.body; i < list.length; i += 1)
    {
    var elt = list[i];

    c(elt, st);
  }
};
base.MethodDefinition = base.PropertyDefinition = base.Property = function (node, st, c) {
  if (node.computed) { c(node.key, st, "Expression"); }
  if (node.value) { c(node.value, st, "Expression"); }
};

async function collectTests(ctx, filepath) {
	const request = await ctx.vite.environments.ssr.transformRequest(filepath);
	if (!request) return null;
	const ast = await parseAstAsync(request.code);
	const testFilepath = relative(ctx.config.root, filepath);
	const projectName = ctx.name;
	const file = {
		filepath,
		type: "suite",
		id: generateHash(`${testFilepath}${projectName ? `${projectName}:__typecheck__` : "__typecheck__"}`),
		name: testFilepath,
		fullName: testFilepath,
		mode: "run",
		tasks: [],
		start: ast.start,
		end: ast.end,
		projectName,
		meta: { typecheck: true },
		file: null
	};
	file.file = file;
	const definitions = [];
	const getName = (callee) => {
		if (!callee) return null;
		if (callee.type === "Identifier") return callee.name;
		if (callee.type === "CallExpression") return getName(callee.callee);
		if (callee.type === "TaggedTemplateExpression") return getName(callee.tag);
		if (callee.type === "MemberExpression") {
			if (callee.object?.type === "Identifier" && [
				"it",
				"test",
				"describe",
				"suite"
			].includes(callee.object.name)) return callee.object?.name;
			// direct call as `__vite_ssr_exports_0__.test()`
			if (callee.object?.name?.startsWith("__vite_ssr_")) return getName(callee.property);
			// call as `__vite_ssr__.test.skip()`
			return getName(callee.object?.property);
		}
		// unwrap (0, ...)
		if (callee.type === "SequenceExpression" && callee.expressions.length === 2) {
			const [e0, e1] = callee.expressions;
			if (e0.type === "Literal" && e0.value === 0) return getName(e1);
		}
		return null;
	};
	ancestor(ast, { CallExpression(node) {
		const { callee } = node;
		const name = getName(callee);
		if (!name) return;
		if (![
			"it",
			"test",
			"describe",
			"suite"
		].includes(name)) return;
		const property = callee?.property?.name;
		let mode = !property || property === name ? "run" : property;
		// they will be picked up in the next iteration
		if ([
			"each",
			"for",
			"skipIf",
			"runIf"
		].includes(mode)) return;
		let start;
		const end = node.end;
		// .each
		if (callee.type === "CallExpression") start = callee.end;
		else if (callee.type === "TaggedTemplateExpression") start = callee.end + 1;
		else start = node.start;
		const { arguments: [messageNode] } = node;
		const message = messageNode?.type === "Literal" || messageNode?.type === "TemplateLiteral" ? request.code.slice(messageNode.start + 1, messageNode.end - 1) : request.code.slice(messageNode.start, messageNode.end);
		// cannot statically analyze, so we always skip it
		if (mode === "skipIf" || mode === "runIf") mode = "skip";
		definitions.push({
			start,
			end,
			name: message,
			type: name === "it" || name === "test" ? "test" : "suite",
			mode,
			task: null
		});
	} });
	let lastSuite = file;
	const updateLatestSuite = (index) => {
		while (lastSuite.suite && lastSuite.end < index) lastSuite = lastSuite.suite;
		return lastSuite;
	};
	definitions.sort((a, b) => a.start - b.start).forEach((definition) => {
		const latestSuite = updateLatestSuite(definition.start);
		let mode = definition.mode;
		if (latestSuite.mode !== "run")
 // inherit suite mode, if it's set
		mode = latestSuite.mode;
		if (definition.type === "suite") {
			const task = {
				type: definition.type,
				id: "",
				suite: latestSuite,
				file,
				tasks: [],
				mode,
				name: definition.name,
				fullName: createTaskName([lastSuite.fullName, definition.name]),
				fullTestName: createTaskName([lastSuite.fullTestName, definition.name]),
				end: definition.end,
				start: definition.start,
				meta: { typecheck: true }
			};
			definition.task = task;
			latestSuite.tasks.push(task);
			lastSuite = task;
			return;
		}
		const task = {
			type: definition.type,
			id: "",
			suite: latestSuite,
			file,
			mode,
			timeout: 0,
			context: {},
			name: definition.name,
			fullName: createTaskName([lastSuite.fullName, definition.name]),
			fullTestName: createTaskName([lastSuite.fullTestName, definition.name]),
			end: definition.end,
			start: definition.start,
			annotations: [],
			artifacts: [],
			meta: { typecheck: true }
		};
		definition.task = task;
		latestSuite.tasks.push(task);
	});
	calculateSuiteHash(file);
	const hasOnly = someTasksAreOnly(file);
	interpretTaskModes(file, ctx.config.testNamePattern, void 0, hasOnly, false, ctx.config.allowOnly);
	return {
		file,
		parsed: request.code,
		filepath,
		map: request.map,
		definitions
	};
}

const newLineRegExp = /\r?\n/;
const errCodeRegExp = /error TS(?<errCode>\d+)/;
async function makeTscErrorInfo(errInfo) {
	const [errFilePathPos = "", ...errMsgRawArr] = errInfo.split(":");
	if (!errFilePathPos || errMsgRawArr.length === 0 || errMsgRawArr.join("").length === 0) return ["unknown filepath", null];
	const errMsgRaw = errMsgRawArr.join("").trim();
	// get filePath, line, col
	const [errFilePath, errPos] = errFilePathPos.slice(0, -1).split("(");
	if (!errFilePath || !errPos) return ["unknown filepath", null];
	const [errLine, errCol] = errPos.split(",");
	if (!errLine || !errCol) return [errFilePath, null];
	// get errCode, errMsg
	const execArr = errCodeRegExp.exec(errMsgRaw);
	if (!execArr) return [errFilePath, null];
	const errCodeStr = execArr.groups?.errCode ?? "";
	if (!errCodeStr) return [errFilePath, null];
	const line = Number(errLine);
	const col = Number(errCol);
	const errCode = Number(errCodeStr);
	return [errFilePath, {
		filePath: errFilePath,
		errCode,
		line,
		column: col,
		errMsg: errMsgRaw.slice(`error TS${errCode} `.length)
	}];
}
async function getRawErrsMapFromTsCompile(tscErrorStdout) {
	const rawErrsMap = /* @__PURE__ */ new Map();
	(await Promise.all(tscErrorStdout.split(newLineRegExp).reduce((prev, next) => {
		if (!next) return prev;
		else if (next[0] !== " ") prev.push(next);
		else prev[prev.length - 1] += `\n${next}`;
		return prev;
	}, []).map((errInfoLine) => makeTscErrorInfo(errInfoLine)))).forEach(([errFilePath, errInfo]) => {
		if (!errInfo) return;
		if (!rawErrsMap.has(errFilePath)) rawErrsMap.set(errFilePath, [errInfo]);
		else rawErrsMap.get(errFilePath)?.push(errInfo);
	});
	return rawErrsMap;
}

class TypeCheckError extends Error {
	name = "TypeCheckError";
	constructor(message, stacks) {
		super(message);
		this.message = message;
		this.stacks = stacks;
	}
}
class Typechecker {
	_onParseStart;
	_onParseEnd;
	_onWatcherRerun;
	_result = {
		files: [],
		sourceErrors: [],
		time: 0
	};
	_startTime = 0;
	_output = "";
	_tests = {};
	process;
	files = [];
	constructor(project) {
		this.project = project;
	}
	setFiles(files) {
		this.files = files;
	}
	onParseStart(fn) {
		this._onParseStart = fn;
	}
	onParseEnd(fn) {
		this._onParseEnd = fn;
	}
	onWatcherRerun(fn) {
		this._onWatcherRerun = fn;
	}
	async collectFileTests(filepath) {
		return collectTests(this.project, filepath);
	}
	getFiles() {
		return this.files;
	}
	async collectTests() {
		const tests = (await Promise.all(this.getFiles().map((filepath) => this.collectFileTests(filepath)))).reduce((acc, data) => {
			if (!data) return acc;
			acc[data.filepath] = data;
			return acc;
		}, {});
		this._tests = tests;
		return tests;
	}
	markPassed(file) {
		if (!file.result?.state) file.result = { state: "pass" };
		const markTasks = (tasks) => {
			for (const task of tasks) {
				if ("tasks" in task) markTasks(task.tasks);
				if (!task.result?.state && (task.mode === "run" || task.mode === "queued")) task.result = { state: "pass" };
			}
		};
		markTasks(file.tasks);
	}
	async prepareResults(output) {
		const typeErrors = await this.parseTscLikeOutput(output);
		const testFiles = new Set(this.getFiles());
		if (!this._tests) this._tests = await this.collectTests();
		const sourceErrors = [];
		const files = [];
		testFiles.forEach((path) => {
			const { file, definitions, map, parsed } = this._tests[path];
			const errors = typeErrors.get(path);
			files.push(file);
			if (!errors) {
				this.markPassed(file);
				return;
			}
			const sortedDefinitions = [...definitions.sort((a, b) => b.start - a.start)];
			// has no map for ".js" files that use // @ts-check
			const traceMap = map && new TraceMap(map);
			const indexMap = createLocationsIndexMap(parsed);
			const markState = (task, state) => {
				task.result = { state: task.mode === "run" || task.mode === "only" ? state : task.mode };
				if (task.suite) markState(task.suite, state);
				else if (task.file && task !== task.file) markState(task.file, state);
			};
			errors.forEach(({ error, originalError }) => {
				const processedPos = traceMap ? findGeneratedPosition(traceMap, {
					line: originalError.line,
					column: originalError.column,
					source: basename(path)
				}) : originalError;
				const line = processedPos.line ?? originalError.line;
				const column = processedPos.column ?? originalError.column;
				const index = indexMap.get(`${line}:${column}`);
				const definition = index != null && sortedDefinitions.find((def) => def.start <= index && def.end >= index);
				const suite = definition ? definition.task : file;
				const state = suite.mode === "run" || suite.mode === "only" ? "fail" : suite.mode;
				const errors = suite.result?.errors || [];
				suite.result = {
					state,
					errors
				};
				errors.push(error);
				if (state === "fail") {
					if (suite.suite) markState(suite.suite, "fail");
					else if (suite.file && suite !== suite.file) markState(suite.file, "fail");
				}
			});
			this.markPassed(file);
		});
		typeErrors.forEach((errors, path) => {
			if (!testFiles.has(path)) sourceErrors.push(...errors.map(({ error }) => error));
		});
		return {
			files,
			sourceErrors,
			time: performance$1.now() - this._startTime
		};
	}
	async parseTscLikeOutput(output) {
		const errorsMap = await getRawErrsMapFromTsCompile(output);
		const typesErrors = /* @__PURE__ */ new Map();
		errorsMap.forEach((errors, path) => {
			const filepath = resolve$1(this.project.config.root, path);
			const suiteErrors = errors.map((info) => {
				const limit = Error.stackTraceLimit;
				Error.stackTraceLimit = 0;
				// Some expect-type errors have the most useful information on the second line e.g. `This expression is not callable.\n  Type 'ExpectString<number>' has no call signatures.`
				const errMsg = info.errMsg.replace(/\r?\n\s*(Type .* has no call signatures)/g, " $1");
				const error = new TypeCheckError(errMsg, [{
					file: filepath,
					line: info.line,
					column: info.column,
					method: ""
				}]);
				Error.stackTraceLimit = limit;
				return {
					originalError: info,
					error: {
						name: error.name,
						message: errMsg,
						stacks: error.stacks,
						stack: ""
					}
				};
			});
			typesErrors.set(filepath, suiteErrors);
		});
		return typesErrors;
	}
	async stop() {
		this.process?.kill();
		this.process = void 0;
	}
	async ensurePackageInstalled(ctx, checker) {
		if (checker !== "tsc" && checker !== "vue-tsc") return;
		const packageName = checker === "tsc" ? "typescript" : "vue-tsc";
		await ctx.packageInstaller.ensureInstalled(packageName, ctx.config.root);
	}
	getExitCode() {
		return this.process?.exitCode != null && this.process.exitCode;
	}
	getOutput() {
		return this._output;
	}
	async spawn() {
		const { root, watch, typecheck } = this.project.config;
		const args = [
			"--noEmit",
			"--pretty",
			"false",
			"--incremental",
			"--tsBuildInfoFile",
			join(process.versions.pnp ? join(nodeos__default.tmpdir(), this.project.hash) : distDir, "tsconfig.tmp.tsbuildinfo")
		];
		// use builtin watcher because it's faster
		if (watch) args.push("--watch");
		if (typecheck.allowJs) args.push("--allowJs", "--checkJs");
		if (typecheck.tsconfig) args.push("-p", resolve$1(root, typecheck.tsconfig));
		this._output = "";
		this._startTime = performance$1.now();
		const child = x(typecheck.checker, args, {
			nodeOptions: {
				cwd: root,
				stdio: "pipe"
			},
			throwOnError: false
		});
		this.process = child.process;
		let rerunTriggered = false;
		let dataReceived = false;
		return new Promise((resolve, reject) => {
			if (!child.process || !child.process.stdout) {
				reject(/* @__PURE__ */ new Error(`Failed to initialize ${typecheck.checker}. This is a bug in Vitest - please, open an issue with reproduction.`));
				return;
			}
			child.process.stdout.on("data", (chunk) => {
				dataReceived = true;
				this._output += chunk;
				if (!watch) return;
				if (this._output.includes("File change detected") && !rerunTriggered) {
					this._onWatcherRerun?.();
					this._startTime = performance$1.now();
					this._result.sourceErrors = [];
					this._result.files = [];
					this._tests = null;
					rerunTriggered = true;
				}
				if (/Found \w+ errors*. Watching for/.test(this._output)) {
					rerunTriggered = false;
					this.prepareResults(this._output).then((result) => {
						this._result = result;
						this._onParseEnd?.(result);
					});
					this._output = "";
				}
			});
			const timeout = setTimeout(() => reject(/* @__PURE__ */ new Error(`${typecheck.checker} spawn timed out`)), this.project.config.typecheck.spawnTimeout);
			function onError(cause) {
				clearTimeout(timeout);
				reject(new Error("Spawning typechecker failed - is typescript installed?", { cause }));
			}
			child.process.once("spawn", () => {
				this._onParseStart?.();
				child.process?.off("error", onError);
				clearTimeout(timeout);
				if (process.platform === "win32")
 // on Windows, the process might be spawned but fail to start
				// we wait for a potential error here. if "close" event didn't trigger,
				// we resolve the promise
				setTimeout(() => {
					resolve({ result: child });
				}, 200);
				else resolve({ result: child });
			});
			if (process.platform === "win32") child.process.once("close", (code) => {
				if (code != null && code !== 0 && !dataReceived) onError(/* @__PURE__ */ new Error(`The ${typecheck.checker} command exited with code ${code}.`));
			});
			child.process.once("error", onError);
		});
	}
	async start() {
		if (this.process) return;
		const { watch } = this.project.config;
		const { result: child } = await this.spawn();
		if (!watch) {
			await child;
			this._result = await this.prepareResults(this._output);
			await this._onParseEnd?.(this._result);
		}
	}
	getResult() {
		return this._result;
	}
	getTestFiles() {
		return Object.values(this._tests || {}).map((i) => i.file);
	}
	getTestPacksAndEvents() {
		const packs = [];
		const events = [];
		for (const { file } of Object.values(this._tests || {})) {
			const result = convertTasksToEvents(file);
			packs.push(...result.packs);
			events.push(...result.events);
		}
		return {
			packs,
			events
		};
	}
}
function findGeneratedPosition(traceMap, { line, column, source }) {
	const found = generatedPositionFor(traceMap, {
		line,
		column,
		source
	});
	if (found.line !== null) return found;
	// find the next source token position when the exact error position doesn't exist in source map.
	// this can happen, for example, when the type error is in the comment "// @ts-expect-error"
	// and comments are stripped away in the generated code.
	const mappings = [];
	eachMapping(traceMap, (m) => {
		if (m.source === source && m.originalLine !== null && m.originalColumn !== null && (line === m.originalLine ? column < m.originalColumn : line < m.originalLine)) mappings.push(m);
	});
	const next = mappings.sort((a, b) => a.originalLine === b.originalLine ? a.originalColumn - b.originalColumn : a.originalLine - b.originalLine).at(0);
	if (next) return {
		line: next.generatedLine,
		column: next.generatedColumn
	};
	return {
		line: null,
		column: null
	};
}

// use Logger with custom Console to capture entire error printing
function capturePrintError(error, ctx, options) {
	let output = "";
	const console = new Console(new Writable({ write(chunk, _encoding, callback) {
		output += String(chunk);
		callback();
	} }));
	return {
		nearest: printError(error, ctx, {
			error: console.error.bind(console),
			highlight: ctx.logger.highlight.bind(ctx.logger)
		}, {
			showCodeFrame: false,
			...options
		})?.nearest,
		output
	};
}
function printError(error, ctx, logger, options) {
	const project = options.project ?? ctx.coreWorkspaceProject ?? ctx.projects[0];
	return printErrorInner(error, project, {
		logger,
		type: options.type,
		showCodeFrame: options.showCodeFrame,
		screenshotPaths: options.screenshotPaths,
		printProperties: options.verbose,
		parseErrorStacktrace(error) {
			if (error.stacks) if (options.fullStack) return error.stacks;
			else return error.stacks.filter((stack) => {
				return !defaultStackIgnorePatterns.some((p) => stack.file.match(p));
			});
			// browser stack trace needs to be processed differently,
			// so there is a separate method for that
			if (options.task?.file.pool === "browser" && project.browser) return project.browser.parseErrorStacktrace(error, {
				frameFilter: project.config.onStackTrace,
				ignoreStackEntries: options.fullStack ? [] : void 0
			});
			// node.js stack trace already has correct source map locations
			return parseErrorStacktrace(error, {
				frameFilter: project.config.onStackTrace,
				ignoreStackEntries: options.fullStack ? [] : void 0
			});
		}
	});
}
function printErrorInner(error, project, options) {
	const { showCodeFrame = true, type, printProperties = true } = options;
	const logger = options.logger;
	let e = error;
	if (isPrimitive(e)) e = {
		message: String(error).split(/\n/g)[0],
		stack: String(error)
	};
	if (!e) {
		const error = /* @__PURE__ */ new Error("unknown error");
		e = {
			message: e ?? error.message,
			stack: error.stack
		};
	}
	// Error may have occurred even before the configuration was resolved
	if (!project) {
		printErrorMessage(e, logger);
		return;
	}
	const stacks = options.parseErrorStacktrace(e);
	const nearest = error instanceof TypeCheckError ? error.stacks[0] : stacks.find((stack) => {
		// we are checking that this module was processed by us at one point
		try {
			return [...Object.values(project._vite?.environments || {}), ...Object.values(project.browser?.vite.environments || {})].some((environment) => {
				return [...environment.moduleGraph.getModulesByFile(stack.file)?.values() || []].some((module) => !!module.transformResult);
			}) && existsSync(stack.file);
		} catch {
			return false;
		}
	});
	if (type) printErrorType(type, project.vitest);
	printErrorMessage(e, logger);
	if (options.screenshotPaths?.length) {
		const uniqueScreenshots = Array.from(new Set(options.screenshotPaths));
		const length = uniqueScreenshots.length;
		logger.error(`\nFailure screenshot${length > 1 ? "s" : ""}:`);
		logger.error(uniqueScreenshots.map((p) => `  - ${c.dim(relative(process.cwd(), p))}`).join("\n"));
		if (!e.diff) logger.error();
	}
	if (e.codeFrame) logger.error(`${e.codeFrame}\n`);
	if ("__vitest_rollup_error__" in e) {
		// https://github.com/vitejs/vite/blob/95020ab49e12d143262859e095025cf02423c1d9/packages/vite/src/node/server/middlewares/error.ts#L25-L36
		const err = e.__vitest_rollup_error__;
		logger.error([
			err.plugin && `  Plugin: ${c.magenta(err.plugin)}`,
			err.id && `  File: ${c.cyan(err.id)}${err.loc ? `:${err.loc.line}:${err.loc.column}` : ""}`,
			err.frame && c.yellow(err.frame.split(/\r?\n/g).map((l) => ` `.repeat(2) + l).join(`\n`))
		].filter(Boolean).join("\n"));
	}
	// E.g. AssertionError from assert does not set showDiff but has both actual and expected properties
	if (e.diff) logger.error(`\n${e.diff}\n`);
	// if the error provide the frame
	if (e.frame) logger.error(c.yellow(e.frame));
	else printStack(logger, project, stacks, nearest, printProperties ? getErrorProperties(e) : {}, (s) => {
		if (showCodeFrame && s === nearest && nearest) {
			const sourceCode = readFileSync(nearest.file, "utf-8");
			logger.error(generateCodeFrame(sourceCode.length > 1e5 ? sourceCode : logger.highlight(nearest.file, sourceCode), 4, s));
		}
	});
	const testPath = e.VITEST_TEST_PATH;
	const testName = e.VITEST_TEST_NAME;
	// testName has testPath inside
	if (testPath) logger.error(c.red(`This error originated in "${c.bold(relative(project.config.root, testPath))}" test file. It doesn't mean the error was thrown inside the file itself, but while it was running.`));
	if (testName) logger.error(c.red(`The latest test that might've caused the error is "${c.bold(testName)}". It might mean one of the following:
- The error was thrown, while Vitest was running this test.
- If the error occurred after the test had been completed, this was the last documented test before it was thrown.`));
	if (typeof e.cause === "object" && e.cause && "name" in e.cause) {
		e.cause.name = `Caused by: ${e.cause.name}`;
		printErrorInner(e.cause, project, {
			showCodeFrame: false,
			logger: options.logger,
			parseErrorStacktrace: options.parseErrorStacktrace
		});
	}
	handleImportOutsideModuleError(e.stack || "", logger);
	return { nearest };
}
function printErrorType(type, ctx) {
	ctx.logger.error(`\n${errorBanner(type)}`);
}
const skipErrorProperties = new Set([
	"cause",
	"stacks",
	"type",
	"showDiff",
	"ok",
	"operator",
	"diff",
	"codeFrame",
	"actual",
	"expected",
	"diffOptions",
	"runnerError",
	"sourceURL",
	"column",
	"line",
	"fileName",
	"lineNumber",
	"columnNumber",
	"VITEST_TEST_NAME",
	"VITEST_TEST_PATH",
	"__vitest_rollup_error__",
	...Object.getOwnPropertyNames(Error.prototype),
	...Object.getOwnPropertyNames(Object.prototype)
]);
function getErrorProperties(e) {
	const errorObject = Object.create(null);
	if (e.name === "AssertionError") return errorObject;
	for (const key of Object.getOwnPropertyNames(e))
 // print the original stack if it was ever changed manually by the user
	if (key === "stack" && e[key] != null && typeof e[key] !== "string") errorObject[key] = e[key];
	else if (key !== "stack" && !skipErrorProperties.has(key)) errorObject[key] = e[key];
	return errorObject;
}
const esmErrors = ["Cannot use import statement outside a module", "Unexpected token 'export'"];
function handleImportOutsideModuleError(stack, logger) {
	if (!esmErrors.some((e) => stack.includes(e))) return;
	const path = normalize(stack.split("\n")[0].trim());
	let name = path.split("/node_modules/").pop() || "";
	if (name[0] === "@") name = name.split("/").slice(0, 2).join("/");
	else name = name.split("/")[0];
	if (name) printModuleWarningForPackage(logger, path, name);
	else printModuleWarningForSourceCode(logger, path);
}
function printModuleWarningForPackage(logger, path, name) {
	logger.error(c.yellow(`Module ${path} seems to be an ES Module but shipped in a CommonJS package. You might want to create an issue to the package ${c.bold(`"${name}"`)} asking them to ship the file in .mjs extension or add "type": "module" in their package.json.

As a temporary workaround you can try to inline the package by updating your config:

` + c.gray(c.dim("// vitest.config.js")) + "\n" + c.green(`export default {
  test: {
    server: {
      deps: {
        inline: [
          ${c.yellow(c.bold(`"${name}"`))}
        ]
      }
    }
  }
}\n`)));
}
function printModuleWarningForSourceCode(logger, path) {
	logger.error(c.yellow(`Module ${path} seems to be an ES Module but shipped in a CommonJS package. To fix this issue, change the file extension to .mjs or add "type": "module" in your package.json.`));
}
function printErrorMessage(error, logger) {
	const errorName = error.name || "Unknown Error";
	if (!error.message) {
		logger.error(error);
		return;
	}
	if (error.message.length > 5e3)
 // Protect against infinite stack trace in tinyrainbow
	logger.error(`${c.red(c.bold(errorName))}: ${error.message}`);
	else logger.error(c.red(`${c.bold(errorName)}: ${error.message}`));
}
function printStack(logger, project, stack, highlight, errorProperties, onStack) {
	for (const frame of stack) {
		const color = frame === highlight ? c.cyan : c.gray;
		const path = relative(project.config.root, frame.file);
		logger.error(color(` ${c.dim(F_POINTER)} ${[frame.method, `${path}:${c.dim(`${frame.line}:${frame.column}`)}`].filter(Boolean).join(" ")}`));
		onStack?.(frame);
	}
	if (stack.length) logger.error();
	if (hasProperties(errorProperties)) {
		logger.error(c.red(c.dim(divider())));
		const propertiesString = inspect(errorProperties);
		logger.error(c.red(c.bold("Serialized Error:")), c.gray(propertiesString));
	}
}
function hasProperties(obj) {
	// eslint-disable-next-line no-unreachable-loop
	for (const _key in obj) return true;
	return false;
}
function generateCodeFrame(source, indent = 0, loc, range = 2) {
	const start = typeof loc === "object" ? positionToOffset(source, loc.line, loc.column) : loc;
	const end = start;
	const lines = source.split(lineSplitRE);
	const nl = /\r\n/.test(source) ? 2 : 1;
	let count = 0;
	let res = [];
	const columns = process.stdout?.columns || 80;
	for (let i = 0; i < lines.length; i++) {
		count += lines[i].length + nl;
		if (count >= start) {
			for (let j = i - range; j <= i + range || end > count; j++) {
				if (j < 0 || j >= lines.length) continue;
				const lineLength = lines[j].length;
				const strippedContent = stripVTControlCharacters(lines[j]);
				if (strippedContent.startsWith("//# sourceMappingURL")) continue;
				// too long, maybe it's a minified file, skip for codeframe
				if (strippedContent.length > 200) return "";
				res.push(lineNo(j + 1) + truncateString(lines[j].replace(/\t/g, " "), columns - 5 - indent));
				if (j === i) {
					// push underline
					const pad = start - (count - lineLength) + (nl - 1);
					const length = Math.max(1, end > count ? lineLength - pad : end - start);
					res.push(lineNo() + " ".repeat(pad) + c.red("^".repeat(length)));
				} else if (j > i) {
					if (end > count) {
						const length = Math.max(1, Math.min(end - count, lineLength));
						res.push(lineNo() + c.red("^".repeat(length)));
					}
					count += lineLength + 1;
				}
			}
			break;
		}
	}
	if (indent) res = res.map((line) => " ".repeat(indent) + line);
	return res.join("\n");
}
function lineNo(no = "") {
	return c.gray(`${String(no).padStart(3, " ")}| `);
}

class GithubActionsReporter {
	ctx = void 0;
	options;
	constructor(options = {}) {
		this.options = options;
	}
	onInit(ctx) {
		this.ctx = ctx;
	}
	onTestCaseAnnotate(testCase, annotation) {
		if (!annotation.location || this.options.displayAnnotations === false) return;
		const type = getTitle(annotation.type);
		const formatted = formatMessage({
			command: getType(annotation.type),
			properties: {
				file: annotation.location.file,
				line: String(annotation.location.line),
				column: String(annotation.location.column),
				...type && { title: type }
			},
			message: stripVTControlCharacters(annotation.message)
		});
		this.ctx.logger.log(`\n${formatted}`);
	}
	onTestRunEnd(testModules, unhandledErrors) {
		const files = testModules.map((testModule) => testModule.task);
		const errors = [...unhandledErrors];
		// collect all errors and associate them with projects
		const projectErrors = new Array();
		for (const error of errors) projectErrors.push({
			project: this.ctx.getRootProject(),
			title: "Unhandled error",
			error
		});
		for (const file of files) {
			const tasks = getTasks(file);
			const project = this.ctx.getProjectByName(file.projectName || "");
			for (const task of tasks) {
				if (task.result?.state !== "fail") continue;
				const title = getFullName(task, " > ");
				for (const error of task.result?.errors ?? []) projectErrors.push({
					project,
					title: project.name ? `[${project.name}] ${title}` : title,
					error,
					file
				});
			}
		}
		const onWritePath = this.options.onWritePath ?? defaultOnWritePath;
		// format errors via `printError`
		for (const { project, title, error, file } of projectErrors) {
			const result = capturePrintError(error, this.ctx, {
				project,
				task: file
			});
			const stack = result?.nearest;
			if (!stack) continue;
			const formatted = formatMessage({
				command: "error",
				properties: {
					file: onWritePath(stack.file),
					title,
					line: String(stack.line),
					column: String(stack.column)
				},
				message: stripVTControlCharacters(result.output)
			});
			this.ctx.logger.log(`\n${formatted}`);
		}
	}
}
const BUILT_IN_TYPES = [
	"notice",
	"error",
	"warning"
];
function getTitle(type) {
	if (BUILT_IN_TYPES.includes(type)) return;
	return type;
}
function getType(type) {
	if (BUILT_IN_TYPES.includes(type)) return type;
	return "notice";
}
function defaultOnWritePath(path) {
	return path;
}
// workflow command formatting based on
// https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#setting-an-error-message
// https://github.com/actions/toolkit/blob/f1d9b4b985e6f0f728b4b766db73498403fd5ca3/packages/core/src/command.ts#L80-L85
function formatMessage({ command, properties, message }) {
	let result = `::${command}`;
	Object.entries(properties).forEach(([k, v], i) => {
		result += i === 0 ? " " : ",";
		result += `${k}=${escapeProperty(v)}`;
	});
	result += `::${escapeData(message)}`;
	return result;
}
function escapeData(s) {
	return s.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}
function escapeProperty(s) {
	return s.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A").replace(/:/g, "%3A").replace(/,/g, "%2C");
}

class HangingProcessReporter {
	whyRunning;
	onInit() {
		this.whyRunning = createRequire(import.meta.url)("why-is-node-running");
	}
	onProcessTimeout() {
		this.whyRunning?.();
	}
}

const StatusMap = {
	fail: "failed",
	only: "pending",
	pass: "passed",
	run: "pending",
	skip: "skipped",
	todo: "todo",
	queued: "pending"
};
class JsonReporter {
	start = 0;
	ctx;
	options;
	coverageMap;
	constructor(options) {
		this.options = options;
	}
	onInit(ctx) {
		this.ctx = ctx;
		this.start = Date.now();
		this.coverageMap = void 0;
	}
	onCoverage(coverageMap) {
		this.coverageMap = coverageMap;
	}
	async onTestRunEnd(testModules) {
		const files = testModules.map((testModule) => testModule.task);
		const suites = getSuites(files);
		const numTotalTestSuites = suites.length;
		const tests = getTests(files);
		const numTotalTests = tests.length;
		const numFailedTestSuites = suites.filter((s) => s.result?.state === "fail").length;
		const numPendingTestSuites = suites.filter((s) => s.result?.state === "run" || s.result?.state === "queued" || s.mode === "todo").length;
		const numPassedTestSuites = numTotalTestSuites - numFailedTestSuites - numPendingTestSuites;
		const numFailedTests = tests.filter((t) => t.result?.state === "fail").length;
		const numPassedTests = tests.filter((t) => t.result?.state === "pass").length;
		const numPendingTests = tests.filter((t) => t.result?.state === "run" || t.result?.state === "queued" || t.mode === "skip" || t.result?.state === "skip").length;
		const numTodoTests = tests.filter((t) => t.mode === "todo").length;
		const testResults = [];
		const success = !!(files.length > 0 || this.ctx.config.passWithNoTests) && numFailedTestSuites === 0 && numFailedTests === 0;
		for (const file of files) {
			const tests = getTests([file]);
			let startTime = tests.reduce((prev, next) => Math.min(prev, next.result?.startTime ?? Number.POSITIVE_INFINITY), Number.POSITIVE_INFINITY);
			if (startTime === Number.POSITIVE_INFINITY) startTime = this.start;
			const endTime = tests.reduce((prev, next) => Math.max(prev, (next.result?.startTime ?? 0) + (next.result?.duration ?? 0)), startTime);
			const assertionResults = tests.map((t) => {
				const ancestorTitles = [];
				let iter = t.suite;
				while (iter) {
					ancestorTitles.push(iter.name);
					iter = iter.suite;
				}
				ancestorTitles.reverse();
				return {
					ancestorTitles,
					fullName: t.name ? [...ancestorTitles, t.name].join(" ") : ancestorTitles.join(" "),
					status: StatusMap[t.result?.state || t.mode] || "skipped",
					title: t.name,
					duration: t.result?.duration,
					failureMessages: t.result?.errors?.map((e) => e.stack || e.message) || [],
					location: t.location,
					meta: t.meta
				};
			});
			if (tests.some((t) => t.result?.state === "run" || t.result?.state === "queued")) this.ctx.logger.warn("WARNING: Some tests are still running when generating the JSON report.This is likely an internal bug in Vitest.Please report it to https://github.com/vitest-dev/vitest/issues");
			const hasFailedTests = tests.some((t) => t.result?.state === "fail");
			testResults.push({
				assertionResults,
				startTime,
				endTime,
				status: file.result?.state === "fail" || hasFailedTests ? "failed" : "passed",
				message: file.result?.errors?.[0]?.message ?? "",
				name: file.filepath
			});
		}
		const result = {
			numTotalTestSuites,
			numPassedTestSuites,
			numFailedTestSuites,
			numPendingTestSuites,
			numTotalTests,
			numPassedTests,
			numFailedTests,
			numPendingTests,
			numTodoTests,
			snapshot: this.ctx.snapshot.summary,
			startTime: this.start,
			success,
			testResults,
			coverageMap: this.coverageMap
		};
		await this.writeReport(JSON.stringify(result));
	}
	/**
	* Writes the report to an output file if specified in the config,
	* or logs it to the console otherwise.
	* @param report
	*/
	async writeReport(report) {
		const outputFile = this.options.outputFile ?? getOutputFile(this.ctx.config, "json");
		if (outputFile) {
			const reportFile = resolve$1(this.ctx.config.root, outputFile);
			const outputDirectory = dirname(reportFile);
			if (!existsSync(outputDirectory)) await promises.mkdir(outputDirectory, { recursive: true });
			await promises.writeFile(reportFile, report, "utf-8");
			this.ctx.logger.log(`JSON report written to ${reportFile}`);
		} else this.ctx.logger.log(report);
	}
}

class IndentedLogger {
	currentIndent = "";
	constructor(baseLog) {
		this.baseLog = baseLog;
	}
	indent() {
		this.currentIndent += "    ";
	}
	unindent() {
		this.currentIndent = this.currentIndent.substring(0, this.currentIndent.length - 4);
	}
	log(text) {
		return this.baseLog(this.currentIndent + text);
	}
}

function flattenTasks$1(task, baseName = "") {
	const base = baseName ? `${baseName} > ` : "";
	if (task.type === "suite") return task.tasks.flatMap((child) => flattenTasks$1(child, `${base}${task.name}`));
	else return [{
		...task,
		name: `${base}${task.name}`
	}];
}
// https://gist.github.com/john-doherty/b9195065884cdbfd2017a4756e6409cc
function removeInvalidXMLCharacters(value, removeDiscouragedChars) {
	let regex = /([\0-\x08\v\f\x0E-\x1F\uFFFD\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])/g;
	value = String(value || "").replace(regex, "");
	{
		// remove everything discouraged by XML 1.0 specifications
		regex = new RegExp(
			/* eslint-disable regexp/prefer-character-class, regexp/no-obscure-range, regexp/no-useless-non-capturing-group */
			"([\\x7F-\\x84]|[\\x86-\\x9F]|[\\uFDD0-\\uFDEF]|\\uD83F[\\uDFFE\\uDFFF]|(?:\\uD87F[\\uDFFE\\uDFFF])|\\uD8BF[\\uDFFE\\uDFFF]|\\uD8FF[\\uDFFE\\uDFFF]|(?:\\uD93F[\\uDFFE\\uDFFF])|\\uD97F[\\uDFFE\\uDFFF]|\\uD9BF[\\uDFFE\\uDFFF]|\\uD9FF[\\uDFFE\\uDFFF]|\\uDA3F[\\uDFFE\\uDFFF]|\\uDA7F[\\uDFFE\\uDFFF]|\\uDABF[\\uDFFE\\uDFFF]|(?:\\uDAFF[\\uDFFE\\uDFFF])|\\uDB3F[\\uDFFE\\uDFFF]|\\uDB7F[\\uDFFE\\uDFFF]|(?:\\uDBBF[\\uDFFE\\uDFFF])|\\uDBFF[\\uDFFE\\uDFFF](?:[\\0-\\t\\v\\f\\x0E-\\u2027\\u202A-\\uD7FF\\uE000-\\uFFFF]|[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]|[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|(?:[^\\uD800-\\uDBFF]|^)[\\uDC00-\\uDFFF]))",
			"g"
			/* eslint-enable */
		);
		value = value.replace(regex, "");
	}
	return value;
}
function escapeXML(value) {
	return removeInvalidXMLCharacters(String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&apos;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
}
function executionTime(durationMS) {
	return (durationMS / 1e3).toLocaleString("en-US", {
		useGrouping: false,
		maximumFractionDigits: 10
	});
}
function getDuration(task) {
	return executionTime(task.result?.duration ?? 0);
}
class JUnitReporter {
	ctx;
	reportFile;
	baseLog;
	logger;
	_timeStart = /* @__PURE__ */ new Date();
	fileFd;
	options;
	constructor(options) {
		this.options = { ...options };
		this.options.includeConsoleOutput ??= true;
	}
	async onInit(ctx) {
		this.ctx = ctx;
		const outputFile = this.options.outputFile ?? getOutputFile(this.ctx.config, "junit");
		if (outputFile) {
			this.reportFile = resolve$1(this.ctx.config.root, outputFile);
			const outputDirectory = dirname(this.reportFile);
			if (!existsSync(outputDirectory)) await promises.mkdir(outputDirectory, { recursive: true });
			this.fileFd = await promises.open(this.reportFile, "w+");
			this.baseLog = async (text) => {
				if (!this.fileFd) this.fileFd = await promises.open(this.reportFile, "w+");
				await promises.writeFile(this.fileFd, `${text}\n`);
			};
		} else this.baseLog = async (text) => this.ctx.logger.log(text);
		this._timeStart = /* @__PURE__ */ new Date();
		this.logger = new IndentedLogger(this.baseLog);
	}
	async writeElement(name, attrs, children) {
		const pairs = [];
		for (const key in attrs) {
			const attr = attrs[key];
			if (attr === void 0) continue;
			pairs.push(`${key}="${escapeXML(attr)}"`);
		}
		await this.logger.log(`<${name}${pairs.length ? ` ${pairs.join(" ")}` : ""}>`);
		this.logger.indent();
		await children.call(this);
		this.logger.unindent();
		await this.logger.log(`</${name}>`);
	}
	async writeLogs(task, type) {
		if (task.logs == null || task.logs.length === 0) return;
		const logType = type === "err" ? "stderr" : "stdout";
		const logs = task.logs.filter((log) => log.type === logType);
		if (logs.length === 0) return;
		await this.writeElement(`system-${type}`, {}, async () => {
			for (const log of logs) await this.baseLog(escapeXML(log.content));
		});
	}
	async writeTasks(tasks, filename) {
		for (const task of tasks) {
			let classname = filename;
			const templateVars = {
				filename: task.file.name,
				filepath: task.file.filepath
			};
			if (typeof this.options.classnameTemplate === "function") classname = this.options.classnameTemplate(templateVars);
			else if (typeof this.options.classnameTemplate === "string") classname = this.options.classnameTemplate.replace(/\{filename\}/g, templateVars.filename).replace(/\{filepath\}/g, templateVars.filepath);
			await this.writeElement("testcase", {
				classname,
				file: this.options.addFileAttribute ? filename : void 0,
				name: task.name,
				time: getDuration(task)
			}, async () => {
				if (this.options.includeConsoleOutput) {
					await this.writeLogs(task, "out");
					await this.writeLogs(task, "err");
				}
				if (task.mode === "skip" || task.mode === "todo") await this.logger.log("<skipped/>");
				if (task.type === "test" && task.annotations.length) {
					await this.logger.log("<properties>");
					this.logger.indent();
					for (const annotation of task.annotations) {
						await this.logger.log(`<property name="${escapeXML(annotation.type)}" value="${escapeXML(annotation.message)}">`);
						await this.logger.log("</property>");
					}
					this.logger.unindent();
					await this.logger.log("</properties>");
				}
				if (task.result?.state === "fail") {
					const errors = task.result.errors || [];
					for (const error of errors) await this.writeElement("failure", {
						message: error?.message,
						type: error?.name
					}, async () => {
						if (!error) return;
						const result = capturePrintError(error, this.ctx, {
							project: this.ctx.getProjectByName(task.file.projectName || ""),
							task
						});
						await this.baseLog(escapeXML(stripVTControlCharacters(result.output.trim())));
					});
				}
			});
		}
	}
	async onTestRunEnd(testModules) {
		const files = testModules.map((testModule) => testModule.task);
		await this.logger.log("<?xml version=\"1.0\" encoding=\"UTF-8\" ?>");
		const transformed = files.map((file) => {
			const tasks = file.tasks.flatMap((task) => flattenTasks$1(task));
			const stats = tasks.reduce((stats, task) => {
				return {
					passed: stats.passed + Number(task.result?.state === "pass"),
					failures: stats.failures + Number(task.result?.state === "fail"),
					skipped: stats.skipped + Number(task.mode === "skip" || task.mode === "todo")
				};
			}, {
				passed: 0,
				failures: 0,
				skipped: 0
			});
			// inject failed suites to surface errors during beforeAll/afterAll
			const suites = getSuites(file);
			for (const suite of suites) if (suite.result?.errors) {
				tasks.push(suite);
				stats.failures += 1;
			}
			// If there are no tests, but the file failed to load, we still want to report it as a failure
			if (tasks.length === 0 && file.result?.state === "fail") {
				stats.failures = 1;
				tasks.push({
					id: file.id,
					type: "test",
					name: file.name,
					fullName: file.name,
					fullTestName: file.name,
					mode: "run",
					result: file.result,
					meta: {},
					timeout: 0,
					context: null,
					suite: null,
					file: null,
					annotations: [],
					artifacts: []
				});
			}
			return {
				...file,
				tasks,
				stats
			};
		});
		const stats = transformed.reduce((stats, file) => {
			stats.tests += file.tasks.length;
			stats.failures += file.stats.failures;
			stats.time += file.result?.duration || 0;
			return stats;
		}, {
			name: this.options.suiteName || "vitest tests",
			tests: 0,
			failures: 0,
			errors: 0,
			time: 0
		});
		await this.writeElement("testsuites", {
			...stats,
			time: executionTime(stats.time)
		}, async () => {
			for (const file of transformed) {
				const filename = relative(this.ctx.config.root, file.filepath);
				await this.writeElement("testsuite", {
					name: filename,
					timestamp: (/* @__PURE__ */ new Date()).toISOString(),
					hostname: hostname(),
					tests: file.tasks.length,
					failures: file.stats.failures,
					errors: 0,
					skipped: file.stats.skipped,
					time: getDuration(file)
				}, async () => {
					await this.writeTasks(file.tasks, filename);
				});
			}
		});
		if (this.reportFile) this.ctx.logger.log(`JUNIT report written to ${this.reportFile}`);
		await this.fileFd?.close();
		this.fileFd = void 0;
	}
}

function yamlString(str) {
	if (!str) return "";
	return `"${str.replace(/"/g, "\\\"")}"`;
}
function tapString(str) {
	return str.replace(/\\/g, "\\\\").replace(/#/g, "\\#").replace(/\n/g, " ");
}
class TapReporter {
	ctx;
	logger;
	onInit(ctx) {
		this.ctx = ctx;
		this.logger = new IndentedLogger(ctx.logger.log.bind(ctx.logger));
	}
	static getComment(task) {
		if (task.mode === "skip") return " # SKIP";
		else if (task.mode === "todo") return " # TODO";
		else if (task.result?.duration != null) return ` # time=${task.result.duration.toFixed(2)}ms`;
		else return "";
	}
	logErrorDetails(error, stack) {
		const errorName = error.name || "Unknown Error";
		this.logger.log(`name: ${yamlString(String(errorName))}`);
		this.logger.log(`message: ${yamlString(String(error.message))}`);
		if (stack)
 // For compatibility with tap-mocha-reporter
		this.logger.log(`stack: ${yamlString(`${stack.file}:${stack.line}:${stack.column}`)}`);
	}
	logTasks(tasks) {
		this.logger.log(`1..${tasks.length}`);
		for (const [i, task] of tasks.entries()) {
			const id = i + 1;
			const ok = task.result?.state === "pass" || task.mode === "skip" || task.mode === "todo" ? "ok" : "not ok";
			const comment = TapReporter.getComment(task);
			if (task.type === "suite" && task.tasks.length > 0) {
				this.logger.log(`${ok} ${id} - ${tapString(task.name)}${comment} {`);
				this.logger.indent();
				this.logTasks(task.tasks);
				this.logger.unindent();
				this.logger.log("}");
			} else {
				this.logger.log(`${ok} ${id} - ${tapString(task.name)}${comment}`);
				const project = this.ctx.getProjectByName(task.file.projectName || "");
				if (task.type === "test" && task.annotations) {
					this.logger.indent();
					task.annotations.forEach(({ type, message }) => {
						this.logger.log(`# ${type}: ${message}`);
					});
					this.logger.unindent();
				}
				if (task.result?.state === "fail" && task.result.errors) {
					this.logger.indent();
					task.result.errors.forEach((error) => {
						const stack = (task.file.pool === "browser" ? project.browser?.parseErrorStacktrace(error) || [] : parseErrorStacktrace(error, { frameFilter: this.ctx.config.onStackTrace }))[0];
						this.logger.log("---");
						this.logger.log("error:");
						this.logger.indent();
						this.logErrorDetails(error);
						this.logger.unindent();
						if (stack) this.logger.log(`at: ${yamlString(`${stack.file}:${stack.line}:${stack.column}`)}`);
						if (error.showDiff) {
							this.logger.log(`actual: ${yamlString(error.actual)}`);
							this.logger.log(`expected: ${yamlString(error.expected)}`);
						}
					});
					this.logger.log("...");
					this.logger.unindent();
				}
			}
		}
	}
	onTestRunEnd(testModules) {
		const files = testModules.map((testModule) => testModule.task);
		this.logger.log("TAP version 13");
		this.logTasks(files);
	}
}

function flattenTasks(task, baseName = "") {
	const base = baseName ? `${baseName} > ` : "";
	if (task.type === "suite" && task.tasks.length > 0) return task.tasks.flatMap((child) => flattenTasks(child, `${base}${task.name}`));
	else return [{
		...task,
		name: `${base}${task.name}`
	}];
}
class TapFlatReporter extends TapReporter {
	onInit(ctx) {
		super.onInit(ctx);
	}
	onTestRunEnd(testModules) {
		this.ctx.logger.log("TAP version 13");
		const flatTasks = testModules.flatMap((testModule) => flattenTasks(testModule.task));
		this.logTasks(flatTasks);
	}
}

class TreeReporter extends DefaultReporter {
	verbose = true;
	renderSucceed = true;
}

class VerboseReporter extends DefaultReporter {
	verbose = true;
	renderSucceed = true;
	printTestModule(_module) {
		// don't print test module, only print tests
	}
	onTestCaseResult(test) {
		super.onTestCaseResult(test);
		const testResult = test.result();
		if (this.ctx.config.hideSkippedTests && testResult.state === "skipped") return;
		let title = ` ${this.getEntityPrefix(test)} `;
		title += test.module.task.name;
		if (test.location) title += c.dim(`:${test.location.line}:${test.location.column}`);
		title += separator;
		title += getTestName(test.task, separator);
		title += this.getTestCaseSuffix(test);
		this.log(title);
		if (testResult.state === "failed") testResult.errors.forEach((error) => this.log(c.red(`   ${F_RIGHT} ${error.message}`)));
		if (test.annotations().length) {
			this.log();
			this.printAnnotations(test, "log", 3);
			this.log();
		}
	}
}

const ReportersMap = {
	"default": DefaultReporter,
	"blob": BlobReporter,
	"verbose": VerboseReporter,
	"dot": DotReporter,
	"json": JsonReporter,
	"tap": TapReporter,
	"tap-flat": TapFlatReporter,
	"junit": JUnitReporter,
	"tree": TreeReporter,
	"hanging-process": HangingProcessReporter,
	"github-actions": GithubActionsReporter
};

export { utils as A, BlobReporter as B, DefaultReporter as D, F_RIGHT as F, GithubActionsReporter as G, HangingProcessReporter as H, JsonReporter as J, ReportersMap as R, TapFlatReporter as T, VerboseReporter as V, DotReporter as a, JUnitReporter as b, TapReporter as c, stringify as d, createIndexLocationsMap as e, formatProjectName as f, getStateSymbol as g, TraceMap as h, ancestor as i, printError as j, errorBanner as k, divider as l, Typechecker as m, generateCodeFrame as n, originalPositionFor as o, parse$1 as p, escapeRegExp as q, createDefinesScript as r, separator as s, truncateString as t, groupBy as u, readBlobs as v, withLabel as w, convertTasksToEvents as x, wildcardPatternToRegExp as y, stdout as z };
