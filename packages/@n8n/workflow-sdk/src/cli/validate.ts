import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { resolveNodeDefinitionDirs, NODE_DEFINITION_DIRS_ENV_VAR } from './node-definition-dirs';
import type { WorkflowJSON } from '../types/base';
import {
	partitionValidationIssues,
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
	severity: 'error' | 'warning';
	source: 'graph' | 'schema';
}

interface WorkflowBuilderLike {
	validate: () => ValidationResult;
	toJSON: (options?: { tidyUp?: boolean }) => WorkflowJSON;
}

const UNCHECKED_ALWAYS = [
	'wrong-kind resource locator values',
	'input/output index bounds',
	'AI input type / required-input support',
] as const;

const UNCHECKED_WITHOUT_SCHEMAS = `node parameter names and values (no node definitions found — pass --node-types <dir> or set ${NODE_DEFINITION_DIRS_ENV_VAR})`;

function buildUnchecked(schemasLoaded: boolean): string[] {
	return schemasLoaded ? [...UNCHECKED_ALWAYS] : [...UNCHECKED_ALWAYS, UNCHECKED_WITHOUT_SCHEMAS];
}

function buildTrailer(unchecked: string[]): string {
	return [
		'Note: this check is a subset of build-workflow. Not checked without a node-type registry:',
		...unchecked.map((item) => `  - ${item}`),
	].join('\n');
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

function toCollected(
	issues: ReadonlyArray<ValidationError | ValidationWarning>,
	severity: 'error' | 'warning',
	source: CollectedIssue['source'],
): CollectedIssue[] {
	return issues.map((issue) => ({
		code: issue.code,
		message: issue.message,
		nodeName: issue.nodeName,
		severity,
		source,
	}));
}

function formatText(
	blocking: CollectedIssue[],
	informational: CollectedIssue[],
	unchecked: string[],
): string {
	const lines: string[] = [];

	if (blocking.length === 0 && informational.length === 0) {
		lines.push('Validation passed (no issues).');
	} else {
		if (blocking.length > 0) {
			lines.push(`Blocking (${blocking.length}):`);
			for (const issue of blocking) {
				const where = issue.nodeName ? ` [${issue.nodeName}]` : '';
				lines.push(`  - ${issue.code}${where}: ${issue.message}`);
			}
		}
		if (informational.length > 0) {
			if (lines.length > 0) lines.push('');
			lines.push(`Informational (${informational.length}):`);
			for (const issue of informational) {
				const where = issue.nodeName ? ` [${issue.nodeName}]` : '';
				lines.push(`  - ${issue.code}${where}: ${issue.message}`);
			}
		}
	}

	lines.push('');
	lines.push(buildTrailer(unchecked));
	return lines.join('\n');
}

function failAndExit(
	options: ValidateCliOptions,
	unchecked: string[],
	code: string,
	message: string,
): never {
	if (options.json) {
		console.log(
			JSON.stringify({
				ok: false,
				blocking: [{ code, message }],
				informational: [],
				unchecked,
			}),
		);
	} else {
		console.error(message);
		console.error('');
		console.error(buildTrailer(unchecked));
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
 * Validate a workflow SDK TypeScript source file.
 *
 * Mirrors the sandbox build.mjs path: dynamic import → wf.validate() →
 * validateWorkflow(wf.toJSON()) without a nodeTypesProvider. Does not use the
 * AST interpreter (parseWorkflowCodeToBuilder) so results stay faithful to
 * build-workflow.
 */
export async function validateCommand(argv: string[] = process.argv.slice(3)): Promise<void> {
	const { filePath, options } = parseArgs(argv);
	const absolutePath = path.resolve(filePath);
	const importUrl = pathToFileURL(absolutePath).href;

	const nodeDefinitionDirs = resolveNodeDefinitionDirs({
		explicit: options.nodeTypes,
		workflowDir: path.dirname(absolutePath),
	});
	if (nodeDefinitionDirs.dirs.length > 0) {
		setSchemaBaseDirs(nodeDefinitionDirs.dirs);
	}
	const unchecked = buildUnchecked(nodeDefinitionDirs.dirs.length > 0);

	let mod: { default?: unknown };
	try {
		mod = (await import(importUrl)) as { default?: unknown };
	} catch (error) {
		failAndExit(
			options,
			unchecked,
			'LOAD_FAILED',
			`Failed to load workflow: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	if (!isWorkflowBuilder(mod.default)) {
		failAndExit(
			options,
			unchecked,
			'INVALID_DEFAULT_EXPORT',
			'Default export is not a workflow. Make sure your file has: export default workflow(...)',
		);
	}

	const graphResult = mod.default.validate();
	const schemaResult = validateWorkflow(mod.default.toJSON({ tidyUp: true }));

	const allIssues: CollectedIssue[] = [
		...toCollected(graphResult.errors, 'error', 'graph'),
		...toCollected(graphResult.warnings, 'warning', 'graph'),
		...toCollected(schemaResult.errors, 'error', 'schema'),
		...toCollected(schemaResult.warnings, 'warning', 'schema'),
	];

	// Deduplicate identical issues that both passes can emit (e.g. MISSING_TRIGGER).
	const seen = new Set<string>();
	const deduped: CollectedIssue[] = [];
	for (const issue of allIssues) {
		const key = `${issue.code}|${issue.nodeName ?? ''}|${issue.message}`;
		if (seen.has(key)) continue;
		seen.add(key);
		deduped.push(issue);
	}

	const { errors: blocking, informational } = partitionValidationIssues(deduped);

	if (options.json) {
		console.log(
			JSON.stringify({
				ok: blocking.length === 0,
				blocking,
				informational,
				unchecked,
				nodeDefinitionDirs: nodeDefinitionDirs.dirs,
			}),
		);
	} else {
		console.log(formatText(blocking, informational, unchecked));
	}

	process.exit(blocking.length === 0 ? 0 : 1);
}
