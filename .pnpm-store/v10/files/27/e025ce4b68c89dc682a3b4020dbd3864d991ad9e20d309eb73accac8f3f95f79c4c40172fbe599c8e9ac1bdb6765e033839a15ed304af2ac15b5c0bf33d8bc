import { stripVTControlCharacters } from 'node:util';
import { slash } from '@vitest/utils';
import { isAbsolute, relative, dirname, basename } from 'pathe';
import c from 'tinyrainbow';

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
const pending = c.gray("·");
function getCols(delta = 0) {
	let length = process.stdout?.columns;
	if (!length || Number.isNaN(length)) {
		length = 30;
	}
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
		if (left == null && right != null) {
			left = cols - textLength - right;
		} else {
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
	if (isAbsolute(path)) {
		path = relative(root, path);
	}
	const dir = dirname(path);
	const ext = path.match(/(\.(spec|test)\.[cm]?[tj]sx?)$/)?.[0] || "";
	const base = basename(path, ext);
	return slash(c.dim(`${dir}/`) + c.bold(base)) + c.dim(ext);
}
function renderSnapshotSummary(rootDir, snapshots) {
	const summary = [];
	if (snapshots.added) {
		summary.push(c.bold(c.green(`${snapshots.added} written`)));
	}
	if (snapshots.unmatched) {
		summary.push(c.bold(c.red(`${snapshots.unmatched} failed`)));
	}
	if (snapshots.updated) {
		summary.push(c.bold(c.green(`${snapshots.updated} updated `)));
	}
	if (snapshots.filesRemoved) {
		if (snapshots.didUpdate) {
			summary.push(c.bold(c.green(`${snapshots.filesRemoved} files removed `)));
		} else {
			summary.push(c.bold(c.yellow(`${snapshots.filesRemoved} files obsolete `)));
		}
	}
	if (snapshots.filesRemovedList && snapshots.filesRemovedList.length) {
		const [head, ...tail] = snapshots.filesRemovedList;
		summary.push(`${c.gray(F_DOWN_RIGHT)} ${formatTestPath(rootDir, head)}`);
		tail.forEach((key) => {
			summary.push(`  ${c.gray(F_DOT)} ${formatTestPath(rootDir, key)}`);
		});
	}
	if (snapshots.unchecked) {
		if (snapshots.didUpdate) {
			summary.push(c.bold(c.green(`${snapshots.unchecked} removed`)));
		} else {
			summary.push(c.bold(c.yellow(`${snapshots.unchecked} obsolete`)));
		}
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
function getStateString(tasks, name = "tests", showTotal = true) {
	if (tasks.length === 0) {
		return c.dim(`no ${name}`);
	}
	const passed = tasks.filter((i) => i.result?.state === "pass");
	const failed = tasks.filter((i) => i.result?.state === "fail");
	const skipped = tasks.filter((i) => i.mode === "skip");
	const todo = tasks.filter((i) => i.mode === "todo");
	return [
		failed.length ? c.bold(c.red(`${failed.length} failed`)) : null,
		passed.length ? c.bold(c.green(`${passed.length} passed`)) : null,
		skipped.length ? c.yellow(`${skipped.length} skipped`) : null,
		todo.length ? c.gray(`${todo.length} todo`) : null
	].filter(Boolean).join(c.dim(" | ")) + (showTotal ? c.gray(` (${tasks.length})`) : "");
}
function getStateSymbol(task) {
	if (task.mode === "skip" || task.mode === "todo") {
		return skipped;
	}
	if (!task.result) {
		return pending;
	}
	if (task.result.state === "run" || task.result.state === "queued") {
		if (task.type === "suite") {
			return pointer;
		}
	}
	if (task.result.state === "pass") {
		return task.meta?.benchmark ? benchmarkPass : testPass;
	}
	if (task.result.state === "fail") {
		return task.type === "suite" ? suiteFail : taskFail;
	}
	return " ";
}
function formatTimeString(date) {
	return date.toTimeString().split(" ")[0];
}
function formatTime(time) {
	if (time > 1e3) {
		return `${(time / 1e3).toFixed(2)}s`;
	}
	return `${Math.round(time)}ms`;
}
function formatProjectName(name, suffix = " ") {
	if (!name) {
		return "";
	}
	if (!c.isColorSupported) {
		return `|${name}|${suffix}`;
	}
	const index = name.split("").reduce((acc, v, idx) => acc + v.charCodeAt(0) + idx, 0);
	const colors = [
		c.bgYellow,
		c.bgCyan,
		c.bgGreen,
		c.bgMagenta
	];
	return c.black(colors[index % colors.length](` ${name} `)) + suffix;
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
	if (plainText.length <= maxLength) {
		return text;
	}
	return `${plainText.slice(0, maxLength - 1)}…`;
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
  getStateString: getStateString,
  getStateSymbol: getStateSymbol,
  padSummaryTitle: padSummaryTitle,
  pending: pending,
  pointer: pointer,
  renderSnapshotSummary: renderSnapshotSummary,
  skipped: skipped,
  suiteFail: suiteFail,
  taskFail: taskFail,
  testPass: testPass,
  truncateString: truncateString,
  withLabel: withLabel
});

export { F_POINTER as F, taskFail as a, F_CHECK as b, formatProjectName as c, divider as d, errorBanner as e, formatTimeString as f, getStateSymbol as g, F_RIGHT as h, getStateString as i, formatTime as j, countTestErrors as k, F_TREE_NODE_END as l, F_TREE_NODE_MIDDLE as m, padSummaryTitle as p, renderSnapshotSummary as r, truncateString as t, utils as u, withLabel as w };
