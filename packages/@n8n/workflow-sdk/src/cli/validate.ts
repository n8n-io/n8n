import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { resolveNodeDefinitionDirs, NODE_DEFINITION_DIRS_ENV_VAR } from './node-definition-dirs';
import { lintWorkflowSource, type SourceLintIssue } from '../lint/lint-workflow-source';
import type { WorkflowJSON } from '../types/base';
import {
	isInformationalValidationCode,
	setSchemaBaseDirs,
	validateWorkflow,
	type ValidationError,
	type ValidationWarning,
	type ValidationResult,
} from '../validation';

export interface ValidateCliOptions {
	json?: boolean;
	nodeTypes?: string[];
}

interface CollectedIssue {
	code: string;
	message: string;
	nodeName?: string;
	parameterPath?: string;
	/** 1-based line in the workflow source file, when resolvable */
	line?: number;
	source: 'graph' | 'schema' | 'sdk' | 'jsCode' | 'pythonCode';
}

interface WorkflowBuilderLike {
	validate: () => ValidationResult;
	toJSON: (options?: { tidyUp?: boolean }) => WorkflowJSON;
}

const UNCHECKED_ALWAYS = [
	'wrong-kind resource locator values',
	// IF/Switch/SIB/Merge bounds are covered by connection-index-validator;
	// other node types still need a full nodeTypesProvider.
	'input/output index bounds for non-control-flow nodes',
	'AI input type / required-input support',
	'n8n credits aiGateway constraints (needs Instance AI metadata)',
] as const;

const UNCHECKED_WITHOUT_SCHEMAS = `node parameter names and values (no node definitions found — pass --node-types <dir> or set ${NODE_DEFINITION_DIRS_ENV_VAR})`;

function buildUnchecked(schemasLoaded: boolean): string[] {
	return schemasLoaded ? [...UNCHECKED_ALWAYS] : [...UNCHECKED_ALWAYS, UNCHECKED_WITHOUT_SCHEMAS];
}

function buildTrailer(unchecked: string[]): string {
	return `note: errors block a build-workflow save, warnings do not — but warnings flag likely run-time defects, so resolve each one instead of shipping past it. Not checked here: ${unchecked.join('; ')}.`;
}

function usageAndExit(): never {
	console.error('Usage: workflow-sdk validate <file-path> [--json] [--node-types <dir>]');
	console.error('');
	console.error('Load a workflow SDK TypeScript file via dynamic import, run graph');
	console.error('validators (wf.validate) plus schema validateWorkflow, and report issues.');
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

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Best-effort: locate the `config.name` assignment for a node in the source.
 * Validators don't carry AST locations, so we map nodeName → source line.
 */
function findNodeLine(sourceLines: string[], nodeName: string): number | undefined {
	const pattern = new RegExp(`\\bname:\\s*['"]${escapeRegExp(nodeName)}['"]`);
	for (let i = 0; i < sourceLines.length; i++) {
		if (pattern.test(sourceLines[i] ?? '')) {
			return i + 1;
		}
	}
	return undefined;
}

function readSourceLines(absolutePath: string): string[] | undefined {
	try {
		return fs.readFileSync(absolutePath, 'utf8').split(/\r?\n/);
	} catch {
		return undefined;
	}
}

function toCollected(
	issues: ReadonlyArray<ValidationError | ValidationWarning>,
	source: CollectedIssue['source'],
	sourceLines: string[] | undefined,
): CollectedIssue[] {
	return issues.map((issue) => {
		const parameterPath =
			'parameterPath' in issue && typeof issue.parameterPath === 'string'
				? issue.parameterPath
				: undefined;
		const line =
			issue.nodeName && sourceLines ? findNodeLine(sourceLines, issue.nodeName) : undefined;
		return {
			code: issue.code,
			message: issue.message,
			nodeName: issue.nodeName,
			parameterPath,
			line,
			source,
		};
	});
}

function sourceLintToCollected(issue: SourceLintIssue): CollectedIssue {
	return {
		code: issue.code,
		message: issue.message,
		line: issue.line,
		source: issue.lintTarget,
		nodeName: issue.nodeName,
		parameterPath: issue.parameterPath,
	};
}

/** Blocking issues report as `error`, informational ones as `warning`. */
interface ReportEntry {
	line?: number;
	severity: 'error' | 'warning';
	code: string;
	message: string;
}

function toReportEntry(issue: CollectedIssue, severity: ReportEntry['severity']): ReportEntry {
	// Most validator messages already name the node; only prefix when they don't.
	const message =
		issue.nodeName && !issue.message.includes(issue.nodeName)
			? `${issue.nodeName}: ${issue.message}`
			: issue.message;
	return { line: issue.line, severity, code: issue.code, message };
}

function byLine(a: ReportEntry, b: ReportEntry): number {
	return (a.line ?? Number.MAX_SAFE_INTEGER) - (b.line ?? Number.MAX_SAFE_INTEGER);
}

function pluralize(count: number, noun: string): string {
	return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** ESLint-stylish layout: one file header, then `line  severity  code  message` rows. */
function formatReport(file: string, entries: ReportEntry[], unchecked: string[]): string {
	if (entries.length === 0) {
		return [file, '  no issues found', '', buildTrailer(unchecked)].join('\n');
	}

	const sorted = [...entries].sort(byLine);
	const locations = sorted.map((entry) => (entry.line === undefined ? '-' : String(entry.line)));
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
	blocking: CollectedIssue[],
	informational: CollectedIssue[],
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

function partitionIssues(issues: CollectedIssue[]): {
	blocking: CollectedIssue[];
	informational: CollectedIssue[];
} {
	const blocking: CollectedIssue[] = [];
	const informational: CollectedIssue[] = [];
	for (const issue of issues) {
		if (isInformationalValidationCode(issue.code)) {
			informational.push(issue);
		} else {
			blocking.push(issue);
		}
	}
	return { blocking, informational };
}

function dedupeIssues(issues: CollectedIssue[]): CollectedIssue[] {
	const seen = new Set<string>();
	const deduped: CollectedIssue[] = [];
	for (const issue of issues) {
		const key = `${issue.code}|${issue.nodeName ?? ''}|${issue.message}`;
		if (seen.has(key)) continue;
		seen.add(key);
		deduped.push(issue);
	}
	return deduped;
}

/**
 * Validate a workflow SDK TypeScript source file.
 *
 * Mirrors the sandbox build.mjs path: dynamic import → wf.validate() →
 * validateWorkflow(wf.toJSON()) without a nodeTypesProvider. Does not use the
 * AST interpreter (parseWorkflowCodeToBuilder) so results stay faithful to
 * build-workflow. Source lint is the extra pass that build-workflow does not
 * run — agents are expected to call this CLI before build-workflow.
 */
export async function validateCommand(argv: string[] = process.argv.slice(3)): Promise<void> {
	const { filePath, options } = parseArgs(argv);
	const absolutePath = path.resolve(filePath);
	const displayPath = path.relative(process.cwd(), absolutePath) || absolutePath;
	const importUrl = pathToFileURL(absolutePath).href;
	const sourceLines = readSourceLines(absolutePath);

	const nodeDefinitionDirs = resolveNodeDefinitionDirs({
		explicit: options.nodeTypes,
		workflowDir: path.dirname(absolutePath),
	});
	if (nodeDefinitionDirs.length > 0) {
		setSchemaBaseDirs(nodeDefinitionDirs);
	}
	const unchecked = buildUnchecked(nodeDefinitionDirs.length > 0);

	let mod: { default?: unknown };
	try {
		mod = (await import(importUrl)) as { default?: unknown };
	} catch (error) {
		failAndExit(
			options,
			unchecked,
			'LOAD_FAILED',
			`Failed to load workflow: ${error instanceof Error ? error.message : String(error)}`,
			displayPath,
		);
	}

	const workflowExport = resolveWorkflowExport(mod);
	if (!isWorkflowBuilder(workflowExport)) {
		failAndExit(
			options,
			unchecked,
			'INVALID_DEFAULT_EXPORT',
			'Default export is not a workflow. Make sure your file has: export default workflow(...)',
			displayPath,
		);
	}

	const graphResult = workflowExport.validate();
	const schemaResult = validateWorkflow(workflowExport.toJSON({ tidyUp: true }));
	const sourceText = sourceLines?.join('\n') ?? '';
	const sourceIssues = sourceText.length > 0 ? lintWorkflowSource(sourceText) : [];

	const allIssues: CollectedIssue[] = [
		...toCollected(graphResult.errors, 'graph', sourceLines),
		...toCollected(graphResult.warnings, 'graph', sourceLines),
		...toCollected(schemaResult.errors, 'schema', sourceLines),
		...toCollected(schemaResult.warnings, 'schema', sourceLines),
		...sourceIssues.map(sourceLintToCollected),
	];

	const deduped = dedupeIssues(allIssues);
	const { blocking, informational } = partitionIssues(deduped);

	if (options.json) {
		console.log(
			JSON.stringify({
				ok: blocking.length === 0,
				file: displayPath,
				blocking,
				informational,
				unchecked,
				nodeDefinitionDirs,
			}),
		);
	} else {
		console.log(formatText(displayPath, blocking, informational, unchecked));
	}

	process.exit(blocking.length === 0 ? 0 : 1);
}
