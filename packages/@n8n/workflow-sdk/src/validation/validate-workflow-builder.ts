import { lintWorkflowSource, type SourceLintIssue } from '../lint';
import { type IssueSeverity, partitionValidationIssues } from './issue-severity';
import { getSchemaBaseDirs, setSchemaBaseDirs } from './node-parameter-schema/schema-validator';
import {
	validateWorkflow,
	type ValidationError,
	type ValidationOptions,
	type ValidationResult,
	type ValidationWarning,
} from './validate-workflow';
import type { WorkflowJSON } from '../types/base';

export type ValidationIssueSource = 'graph' | 'schema' | 'sdk' | 'jsCode' | 'pythonCode';

export interface CollectedValidationIssue {
	code: string;
	message: string;
	/** Severity set at the issue creation site. */
	severity: IssueSeverity;
	nodeName?: string;
	parameterPath?: string;
	/** 1-based line in the workflow source file, when resolvable. */
	line?: number;
	/** 1-based column in the workflow source file, when resolvable. */
	column?: number;
	source: ValidationIssueSource;
}

export interface ValidateWorkflowBuilderOptions extends ValidationOptions {
	/**
	 * When true, also run source lint (SDK builder + embedded Code-node rules).
	 * Requires {@link source}.
	 */
	lint?: boolean;
	/** TypeScript source of the workflow file (needed for lint + line mapping). */
	source?: string;
	/**
	 * Directories for Zod parameter schemas (`setSchemaBaseDirs`).
	 * These do **not** build an `INodeTypes` provider — pass {@link nodeTypesProvider}
	 * separately when AI-input / port-bound checks are needed.
	 */
	nodeDefinitionDirs?: string[];
}

export interface ValidateWorkflowBuilderResult {
	/** True when graph+schema report no fatal errors (`ValidationResult.valid`). */
	valid: boolean;
	/** True when no blocking (non-informational) issues remain after partition. */
	ok: boolean;
	issues: CollectedValidationIssue[];
	blocking: CollectedValidationIssue[];
	informational: CollectedValidationIssue[];
	graph: ValidationResult;
	schema: ValidationResult;
	lint: SourceLintIssue[];
	unchecked: string[];
	nodeDefinitionDirs: string[];
}

interface WorkflowBuilderLike {
	validate: (options?: ValidationOptions) => ValidationResult;
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

const UNCHECKED_WITHOUT_SCHEMAS =
	'node parameter names and values (no node definitions found — pass --node-types <dir> or set N8N_NODE_DEFINITION_DIRS)';

const UNCHECKED_WITHOUT_PROVIDER =
	'full nodeTypesProvider checks (node-definition dirs only supply Zod parameter schemas, not INodeTypes)';

/** Notes about checks the unified validator does not cover (CLI trailer / JSON). */
export function buildUncheckedNotes(options: {
	schemasLoaded: boolean;
	hasNodeTypesProvider: boolean;
}): string[] {
	const unchecked: string[] = [...UNCHECKED_ALWAYS];
	if (!options.schemasLoaded) {
		unchecked.push(UNCHECKED_WITHOUT_SCHEMAS);
	}
	if (!options.hasNodeTypesProvider) {
		unchecked.push(UNCHECKED_WITHOUT_PROVIDER);
	}
	return unchecked;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Best-effort: locate the `config.name` assignment for a node in the source.
 * Validators don't carry AST locations, so we map nodeName → source line/column.
 */
function findNodeLocation(
	sourceLines: string[],
	nodeName: string,
): { line: number; column: number } | undefined {
	const pattern = new RegExp(`\\bname:\\s*['"]${escapeRegExp(nodeName)}['"]`);
	for (let i = 0; i < sourceLines.length; i++) {
		const match = pattern.exec(sourceLines[i] ?? '');
		if (match) {
			return { line: i + 1, column: match.index + 1 };
		}
	}
	return undefined;
}

function toCollected(
	issues: ReadonlyArray<ValidationError | ValidationWarning>,
	source: 'graph' | 'schema',
	sourceLines: string[] | undefined,
): CollectedValidationIssue[] {
	return issues.map((issue) => {
		const parameterPath =
			'parameterPath' in issue && typeof issue.parameterPath === 'string'
				? issue.parameterPath
				: 'parameterName' in issue && typeof issue.parameterName === 'string'
					? issue.parameterName
					: undefined;
		const location =
			issue.nodeName && sourceLines ? findNodeLocation(sourceLines, issue.nodeName) : undefined;
		return {
			code: issue.code,
			message: issue.message,
			severity: issue.severity,
			nodeName: issue.nodeName,
			parameterPath,
			line: location?.line,
			column: location?.column,
			source,
		};
	});
}

function sourceLintToCollected(issue: SourceLintIssue): CollectedValidationIssue {
	return {
		code: issue.code,
		message: issue.message,
		severity: issue.severity,
		line: issue.line,
		column: issue.column,
		source: issue.lintTarget,
		nodeName: issue.nodeName,
		parameterPath: issue.parameterPath,
	};
}

/**
 * Dedupe overlapping graph+schema findings (e.g. DISCONNECTED_NODE) without
 * requiring identical messages — plugins and validateWorkflow phrase them differently.
 *
 * Keep `parameterPath` so distinct INVALID_PARAMETER (etc.) findings on the same
 * node are not collapsed into one.
 */
function dedupeIssues(issues: CollectedValidationIssue[]): CollectedValidationIssue[] {
	const seen = new Set<string>();
	const deduped: CollectedValidationIssue[] = [];
	for (const issue of issues) {
		const key = `${issue.code}|${issue.nodeName ?? ''}|${issue.parameterPath ?? ''}|${issue.line ?? ''}|${issue.column ?? ''}`;
		if (seen.has(key)) continue;
		seen.add(key);
		deduped.push(issue);
	}
	return deduped;
}

/**
 * Run graph validators (`wf.validate`), JSON/schema validation, and optionally
 * source lint — the single path used by the CLI and fixture tests.
 *
 * Pass `{ lint: true, source }` to include SDK / Code-node source lint.
 * Pass `nodeTypesProvider` when the host already has live node types; definition
 * dirs alone cannot synthesize one (they only back Zod parameter schemas).
 */
export function validateWorkflowBuilder(
	workflow: WorkflowBuilderLike,
	options: ValidateWorkflowBuilderOptions = {},
): ValidateWorkflowBuilderResult {
	const nodeDefinitionDirs = options.nodeDefinitionDirs ?? [];
	// Scope schema dirs to this call only — omit/empty must not reuse a prior
	// call's dirs, and we must not leak empty/cleared dirs into later callers
	// (tests and long-lived hosts share the process-level schema registry).
	const previousSchemaDirs = getSchemaBaseDirs();
	setSchemaBaseDirs(nodeDefinitionDirs);

	try {
		const unchecked = buildUncheckedNotes({
			schemasLoaded: nodeDefinitionDirs.length > 0,
			hasNodeTypesProvider: options.nodeTypesProvider !== undefined,
		});

		const validationOptions: ValidationOptions = {
			strictMode: options.strictMode,
			allowDisconnectedNodes: options.allowDisconnectedNodes,
			allowNoTrigger: options.allowNoTrigger,
			validateSchema: options.validateSchema,
			nodeTypesProvider: options.nodeTypesProvider,
		};

		const graph = workflow.validate(validationOptions);
		const schema = validateWorkflow(workflow.toJSON({ tidyUp: true }), validationOptions);

		const source = options.source ?? '';
		const sourceLines = source.length > 0 ? source.split(/\r?\n/) : undefined;
		const lint =
			options.lint === true && source.length > 0
				? lintWorkflowSource(source)
				: ([] as SourceLintIssue[]);

		const allIssues = dedupeIssues([
			...toCollected(graph.errors, 'graph', sourceLines),
			...toCollected(graph.warnings, 'graph', sourceLines),
			...toCollected(schema.errors, 'schema', sourceLines),
			...toCollected(schema.warnings, 'schema', sourceLines),
			...lint.map(sourceLintToCollected),
		]);

		const { blocking, informational } = partitionValidationIssues(allIssues);

		return {
			valid: graph.valid && schema.valid,
			ok: blocking.length === 0,
			issues: allIssues,
			blocking,
			informational,
			graph,
			schema,
			lint,
			unchecked,
			nodeDefinitionDirs,
		};
	} finally {
		setSchemaBaseDirs(previousSchemaDirs);
	}
}
