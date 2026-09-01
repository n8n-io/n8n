import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { resolveNodeDefinitionDirs, NODE_DEFINITION_DIRS_ENV_VAR } from './node-definition-dirs';
import type { WorkflowJSON } from '../types/base';
import {
	buildUncheckedNotes,
	validateWorkflowBuilder,
	type CollectedValidationIssue,
	type ValidationResult,
} from '../validation';

export interface ValidateCliOptions {
	json?: boolean;
	nodeTypes?: string[];
}

interface WorkflowBuilderLike {
	validate: () => ValidationResult;
	toJSON: (options?: { tidyUp?: boolean }) => WorkflowJSON;
}

/** Blocking issues report as `error`, informational ones as `warning`. */
interface ReportEntry {
	line?: number;
	column?: number;
	severity: 'error' | 'warning';
	code: string;
	message: string;
}

function buildTrailer(unchecked: string[]): string {
	return `note: errors block a build-workflow save, warnings do not — but warnings flag likely run-time defects, so resolve each one instead of shipping past it. Not checked here: ${unchecked.join('; ')}.`;
}

function usageAndExit(): never {
	console.error('Usage: workflow-sdk validate <file-path> [--json] [--node-types <dir>]');
	console.error('');
	console.error('Load a workflow SDK TypeScript file via dynamic import, run graph');
	console.error('validators (wf.validate), schema validateWorkflow, and source lint.');
	console.error('Exit non-zero only for issues that would block a build-workflow save.');
	console.error('');
	console.error('Node parameter validation needs generated node definitions. They are');
	console.error('resolved from the workflow file and cwd; override with --node-types');
	console.error(`(repeatable) or ${NODE_DEFINITION_DIRS_ENV_VAR} (${path.delimiter}-separated).`);
	process.exit(1);
}

function parseArgs(argv: string[]): { filePath: string; options: ValidateCliOptions } {
	let filePath: string | undefined;
	let json = false;
	const nodeTypes: string[] = [];

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--json') {
			json = true;
		} else if (arg.startsWith('--node-types=')) {
			nodeTypes.push(arg.slice('--node-types='.length));
		} else if (arg === '--node-types') {
			const value = argv[++i];
			if (!value) {
				console.error('--node-types requires a directory');
				usageAndExit();
			}
			nodeTypes.push(value);
		} else if (arg.startsWith('-')) {
			console.error(`Unknown option: ${arg}`);
			usageAndExit();
		} else if (!filePath) {
			filePath = arg;
		} else {
			console.error(`Unexpected argument: ${arg}`);
			usageAndExit();
		}
	}

	if (!filePath) {
		usageAndExit();
	}

	return { filePath, options: { json, nodeTypes } };
}

function toReportEntry(
	issue: CollectedValidationIssue,
	severity: ReportEntry['severity'],
): ReportEntry {
	// Most validator messages already name the node; only prefix when they don't.
	const message =
		issue.nodeName && !issue.message.includes(issue.nodeName)
			? `${issue.nodeName}: ${issue.message}`
			: issue.message;
	return {
		line: issue.line,
		column: issue.column,
		severity,
		code: issue.code,
		message,
	};
}

function byLocation(a: ReportEntry, b: ReportEntry): number {
	const lineDiff = (a.line ?? Number.MAX_SAFE_INTEGER) - (b.line ?? Number.MAX_SAFE_INTEGER);
	if (lineDiff !== 0) return lineDiff;
	return (a.column ?? Number.MAX_SAFE_INTEGER) - (b.column ?? Number.MAX_SAFE_INTEGER);
}

function pluralize(count: number, noun: string): string {
	return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** ESLint-stylish location: `line:column`, or `-` when unknown. */
function formatLocation(entry: Pick<ReportEntry, 'line' | 'column'>): string {
	if (entry.line === undefined) return '-';
	if (entry.column === undefined) return String(entry.line);
	return `${entry.line}:${entry.column}`;
}

/** ESLint-stylish layout: one file header, then `line:col  severity  code  message` rows. */
function formatReport(file: string, entries: ReportEntry[], unchecked: string[]): string {
	if (entries.length === 0) {
		return [file, '  no issues found', '', buildTrailer(unchecked)].join('\n');
	}

	const sorted = [...entries].sort(byLocation);
	const locations = sorted.map(formatLocation);
	const locationWidth = Math.max(...locations.map((location) => location.length));
	const severityWidth = Math.max(...sorted.map((entry) => entry.severity.length));
	const codeWidth = Math.max(...sorted.map((entry) => entry.code.length));

	const rows = sorted.map((entry, index) => {
		const location = locations[index].padStart(locationWidth);
		const severity = entry.severity.padEnd(severityWidth);
		const code = entry.code.padEnd(codeWidth);
		return `  ${location}  ${severity}  ${code}  ${entry.message}`;
	});

	const errorCount = sorted.filter((entry) => entry.severity === 'error').length;
	const warningCount = sorted.length - errorCount;
	const summary = `${pluralize(sorted.length, 'problem')} (${pluralize(errorCount, 'error')}, ${pluralize(warningCount, 'warning')})`;

	return [file, ...rows, '', summary, buildTrailer(unchecked)].join('\n');
}

function formatText(
	file: string,
	blocking: CollectedValidationIssue[],
	informational: CollectedValidationIssue[],
	unchecked: string[],
): string {
	return formatReport(
		file,
		[
			...blocking.map((issue) => toReportEntry(issue, 'error')),
			...informational.map((issue) => toReportEntry(issue, 'warning')),
		],
		unchecked,
	);
}

function failAndExit(
	options: ValidateCliOptions,
	unchecked: string[],
	code: string,
	message: string,
	file: string,
): never {
	if (options.json) {
		console.log(
			JSON.stringify({
				ok: false,
				file,
				blocking: [{ code, message }],
				informational: [],
				unchecked,
			}),
		);
	} else {
		console.error(formatReport(file, [{ severity: 'error', code, message }], unchecked));
	}
	process.exit(1);
}

function isWorkflowBuilder(value: unknown): value is WorkflowBuilderLike {
	if (typeof value !== 'object' || value === null) {
		return false;
	}
	const candidate = value as { validate?: unknown; toJSON?: unknown };
	return typeof candidate.validate === 'function' && typeof candidate.toJSON === 'function';
}

/**
 * Resolve `export default workflow(...)` across CJS/ESM interop shapes.
 *
 * The validate CLI is published as CommonJS. When it dynamically imports a
 * TypeScript workflow via tsx in a package without `"type": "module"` (the
 * Instance AI sandbox), Node can surface the builder as `mod.default.default`
 * instead of `mod.default`. build.mjs is ESM and usually gets the unwrapped
 * shape, which is why validate was failing while build-workflow still worked.
 */
function resolveWorkflowExport(mod: { default?: unknown }): unknown {
	const exported = mod.default;
	if (isWorkflowBuilder(exported)) {
		return exported;
	}
	if (typeof exported === 'object' && exported !== null && 'default' in exported) {
		const nested = (exported as { default: unknown }).default;
		if (isWorkflowBuilder(nested)) {
			return nested;
		}
	}
	return exported;
}

/**
 * Validate a workflow SDK TypeScript source file.
 *
 * Thin CLI wrapper around {@link validateWorkflowBuilder} with `lint: true`.
 */
export async function validateCommand(argv: string[] = process.argv.slice(3)): Promise<void> {
	const { filePath, options } = parseArgs(argv);
	const absolutePath = path.resolve(filePath);
	const displayPath = path.relative(process.cwd(), absolutePath) || absolutePath;
	const importUrl = pathToFileURL(absolutePath).href;

	const nodeDefinitionDirs = resolveNodeDefinitionDirs({
		explicit: options.nodeTypes,
		workflowDir: path.dirname(absolutePath),
	});

	let source = '';
	try {
		source = fs.readFileSync(absolutePath, 'utf8');
	} catch {
		// Load failure below reports a clearer error; lint simply skips.
	}

	const earlyUnchecked = buildUncheckedNotes({
		schemasLoaded: nodeDefinitionDirs.length > 0,
		hasNodeTypesProvider: false,
	});

	let mod: { default?: unknown };
	try {
		mod = (await import(importUrl)) as { default?: unknown };
	} catch (error) {
		failAndExit(
			options,
			earlyUnchecked,
			'LOAD_FAILED',
			`Failed to load workflow: ${error instanceof Error ? error.message : String(error)}`,
			displayPath,
		);
	}

	const workflowExport = resolveWorkflowExport(mod);
	if (!isWorkflowBuilder(workflowExport)) {
		failAndExit(
			options,
			earlyUnchecked,
			'INVALID_DEFAULT_EXPORT',
			'Default export is not a workflow. Make sure your file has: export default workflow(...)',
			displayPath,
		);
	}

	const result = validateWorkflowBuilder(workflowExport, {
		lint: true,
		source,
		nodeDefinitionDirs,
	});

	if (options.json) {
		console.log(
			JSON.stringify({
				ok: result.ok,
				file: displayPath,
				blocking: result.blocking,
				informational: result.informational,
				unchecked: result.unchecked,
				nodeDefinitionDirs: result.nodeDefinitionDirs,
			}),
		);
	} else {
		console.log(formatText(displayPath, result.blocking, result.informational, result.unchecked));
	}

	process.exit(result.ok ? 0 : 1);
}
