/**
 * Schema Validator
 *
 * Dynamically loads and applies Zod schemas for node configuration validation.
 * Schemas are loaded from `nodeDefinitionDirs` configured via `setSchemaBaseDirs()`.
 */

import { realpathSync } from 'fs';
import * as path from 'path';
import type { ZodSchema, ZodIssue } from 'zod';

// Import all schema helpers for factory function support
import * as schemaHelpers from './schema-helpers';

// Directories to search for generated schemas (set via setSchemaBaseDirs)
let schemaBaseDirs: string[] = [];

// Cache for loaded schemas (either ZodSchema or factory function)
// Factory functions receive all schema helpers as parameters
type SchemaOrFactory =
	| ZodSchema
	| ((args: typeof schemaHelpers & { parameters: Record<string, unknown> }) => ZodSchema);
const schemaCache = new Map<string, SchemaOrFactory | null>();

/**
 * Validation result from schema validation
 */
export interface SchemaValidationResult {
	valid: boolean;
	errors: Array<{
		path: string;
		message: string;
		/**
		 * The only problem is an omitted `resource`/`operation`/`mode` discriminator.
		 * n8n falls back to the node default at runtime (the editor strips default
		 * values on save), so consumers may treat this as non-blocking.
		 */
		missingDiscriminator?: boolean;
	}>;
}

/**
 * Get the current schema base directories
 */
export function getSchemaBaseDirs(): string[] {
	return schemaBaseDirs;
}

/**
 * Set the directories to search for generated schemas.
 * These should be the same `nodeDefinitionDirs` that `get_node_types` uses.
 */
export function setSchemaBaseDirs(dirs: string[]): void {
	schemaBaseDirs = dirs;
	// Clear cache when dirs change
	schemaCache.clear();
}

/**
 * Convert node type to schema file path components
 *
 * Examples:
 * - "n8n-nodes-base.httpRequest" -> { pkg: "n8n-nodes-base", nodeName: "httpRequest" }
 * - "@n8n/n8n-nodes-langchain.agent" -> { pkg: "n8n-nodes-langchain", nodeName: "agent" }
 */
function nodeTypeToPathComponents(nodeType: string): { pkg: string; nodeName: string } {
	// Handle @n8n/ prefix for langchain nodes
	const normalized = nodeType.replace(/^@n8n\//, '');
	const [pkg, ...rest] = normalized.split('.');
	const nodeName = rest.join('.'); // Handle multi-part names (shouldn't happen, but be safe)
	return { pkg, nodeName };
}

/**
 * Whether a node-type-derived path component is a single, safe path segment.
 * A legitimate `pkg`/`nodeName` never contains separators or parent references.
 */
function isSafePathComponent(component: string): boolean {
	if (component.includes('\0')) return false;
	if (component.includes('/') || component.includes('\\')) return false;
	if (component === '.' || component === '..') return false;
	return true;
}

/**
 * Real (symlink-resolved) path of `child` if it lands on `parent` itself or
 * somewhere beneath it, otherwise null. Comparing fully resolved paths means
 * neither a `..` sequence nor a symlinked directory or file can point outside
 * `parent`. Both paths must already exist. Callers should use the returned path
 * so the resolved real file is what gets loaded.
 */
function realPathWithin(parent: string, child: string): string | null {
	const realParent = realpathSync(parent);
	const realChild = realpathSync(child);
	const contained = realChild === realParent || realChild.startsWith(realParent + path.sep);
	return contained ? realChild : null;
}

/**
 * Convert version number to version string for file path
 *
 * Examples:
 * - 1 -> "v1"
 * - 4.2 -> "v42"
 * - 1.7 -> "v17"
 */
function versionToString(version: number): string {
	// Remove decimal point: 4.2 -> "42", 1.7 -> "17"
	const versionStr = String(version).replace('.', '');
	return `v${versionStr}`;
}

/**
 * Build the expected ConfigSchema export name for a node
 *
 * Schema naming conventions:
 * - n8n-nodes-base.set v2 -> SetV2ConfigSchema
 * - n8n-nodes-langchain.agent v1 -> LcAgentV1ConfigSchema (Lc prefix for langchain)
 * - n8n-nodes-base.httpRequest v4.2 -> HttpRequestV42ConfigSchema
 *
 * @param nodeName - Node name from node type (e.g., "set", "agent", "httpRequest")
 * @param versionStr - Version string (e.g., "v2", "v42")
 * @param isLangchain - Whether this is a langchain node
 * @returns Expected schema export name
 */
function buildExpectedSchemaName(
	nodeName: string,
	versionStr: string,
	isLangchain: boolean,
): string {
	// Convert first letter to uppercase for PascalCase
	const pascalName = nodeName.charAt(0).toUpperCase() + nodeName.slice(1);
	// Convert versionStr to PascalCase: "v2" -> "V2", "v42" -> "V42"
	const pascalVersion = versionStr.charAt(0).toUpperCase() + versionStr.slice(1);
	// Add Lc prefix for langchain nodes
	const prefix = isLangchain ? 'Lc' : '';
	return `${prefix}${pascalName}${pascalVersion}ConfigSchema`;
}

/**
 * Build the expected factory function name for a node
 *
 * Factory naming conventions (for nodes with displayOptions):
 * - n8n-nodes-base.set v2 -> getSetV2ConfigSchema
 * - n8n-nodes-langchain.agent v1 -> getLcAgentV1ConfigSchema (Lc prefix for langchain)
 *
 * @param nodeName - Node name from node type
 * @param versionStr - Version string (e.g., "v2", "v42")
 * @param isLangchain - Whether this is a langchain node
 * @returns Expected factory function name
 */
function buildExpectedFactoryName(
	nodeName: string,
	versionStr: string,
	isLangchain: boolean,
): string {
	// Convert first letter to uppercase for PascalCase
	const pascalName = nodeName.charAt(0).toUpperCase() + nodeName.slice(1);
	// Convert versionStr to PascalCase: "v2" -> "V2", "v42" -> "V42"
	const pascalVersion = versionStr.charAt(0).toUpperCase() + versionStr.slice(1);
	// Add Lc prefix for langchain nodes
	const prefix = isLangchain ? 'Lc' : '';
	return `get${prefix}${pascalName}${pascalVersion}ConfigSchema`;
}

/**
 * Try to load a schema module from a given path, but only if the file `require()`
 * would actually open resolves inside `nodesRoot`. Resolving the module first
 * (with its real extension, following any symlinks) and checking containment on
 * the realpath closes both `..` traversal and symlinked directory/leaf escapes.
 * @returns The module if found and contained, null otherwise
 */
function tryLoadSchemaModule(
	schemaPath: string,
	nodesRoot: string,
): Record<string, unknown> | null {
	try {
		const safePath = realPathWithin(nodesRoot, require.resolve(schemaPath));
		if (!safePath) {
			return null;
		}
		// eslint-disable-next-line @typescript-eslint/no-require-imports -- Dynamic module loading requires CommonJS require
		return require(safePath) as Record<string, unknown>;
	} catch {
		return null;
	}
}

/**
 * Try to resolve a schema from a loaded module
 * @returns SchemaOrFactory if a valid schema export is found, null otherwise
 */
function resolveSchemaFromModule(
	schemaModule: Record<string, unknown>,
	nodeName: string,
	versionStr: string,
	isLangchain: boolean,
): SchemaOrFactory | null {
	// Build the expected names to find the right export
	const expectedSchemaName = buildExpectedSchemaName(nodeName, versionStr, isLangchain);
	const expectedFactoryName = buildExpectedFactoryName(nodeName, versionStr, isLangchain);

	// For CommonJS modules with module.exports = function, require() returns the function directly
	if (typeof schemaModule === 'function') {
		return schemaModule as SchemaOrFactory;
	}

	// Try default export for ESM interop (for split structure factory functions)
	if (typeof schemaModule.default === 'function') {
		return schemaModule.default as SchemaOrFactory;
	}

	// Try exact match for static schema
	if (schemaModule[expectedSchemaName]) {
		return schemaModule[expectedSchemaName] as ZodSchema;
	}

	// Try exact match for factory function
	if (typeof schemaModule[expectedFactoryName] === 'function') {
		return schemaModule[expectedFactoryName] as SchemaOrFactory;
	}

	// Fallback: find any export ending with ConfigSchema but NOT SubnodeConfigSchema
	const schemaName = Object.keys(schemaModule).find(
		(k) => k.endsWith('ConfigSchema') && !k.includes('Subnode'),
	);

	if (schemaName && schemaModule[schemaName]) {
		return schemaModule[schemaName] as ZodSchema;
	}

	// Fallback: find any factory function (starts with 'get', ends with 'ConfigSchema')
	const factoryName = Object.keys(schemaModule).find(
		(k) =>
			k.startsWith('get') &&
			k.endsWith('ConfigSchema') &&
			!k.includes('Subnode') &&
			typeof schemaModule[k] === 'function',
	);

	if (factoryName && schemaModule[factoryName]) {
		return schemaModule[factoryName] as SchemaOrFactory;
	}

	// No ConfigSchema found
	return null;
}

/**
 * Try to load a schema for a specific node type and version.
 * Searches all configured `schemaBaseDirs` in order.
 * @returns SchemaOrFactory if found, null otherwise
 */
function tryLoadSchemaForNodeType(nodeType: string, version: number): SchemaOrFactory | null {
	const { pkg, nodeName } = nodeTypeToPathComponents(nodeType);
	const versionStr = versionToString(version);
	const isLangchain = pkg === 'n8n-nodes-langchain';

	// Reject node types whose path components could escape the schema directory.
	// Only built-in nodes have generated schemas, so a rejected type would resolve
	// to nothing anyway; returning null falls back to skip-validation.
	if (!isSafePathComponent(pkg) || !isSafePathComponent(nodeName)) {
		return null;
	}

	for (const baseDir of schemaBaseDirs) {
		const nodesRoot = path.resolve(baseDir, 'nodes');
		// Try flat structure first: nodes/{pkg}/{nodeName}/{version}.schema.js
		const flatSchemaPath = path.join(nodesRoot, pkg, nodeName, `${versionStr}.schema`);
		// Try split structure: nodes/{pkg}/{nodeName}/{version}/index.schema.js
		const splitSchemaPath = path.join(nodesRoot, pkg, nodeName, versionStr, 'index.schema');

		// Try flat structure first, then split structure. `tryLoadSchemaModule`
		// refuses to require() a file that resolves outside the schema root.
		const schemaModule =
			tryLoadSchemaModule(flatSchemaPath, nodesRoot) ??
			tryLoadSchemaModule(splitSchemaPath, nodesRoot);

		if (!schemaModule) {
			continue;
		}

		const result = resolveSchemaFromModule(schemaModule, nodeName, versionStr, isLangchain);
		if (result) {
			return result;
		}
	}

	return null;
}

/**
 * Load and cache schema for a node type/version
 *
 * Supports both:
 * - Static schemas: ConfigSchema exports (ZodSchema)
 * - Factory functions: getConfigSchema exports (for nodes with displayOptions)
 * - Flat structure: {version}.schema.js
 * - Split structure: {version}/index.schema.js (for discriminated nodes)
 *
 * For tool variants (e.g., "googleCalendarTool"), falls back to the base node
 * (e.g., "googleCalendar") since tool variants don't have separate schemas.
 *
 * @param nodeType - Full node type string (e.g., "n8n-nodes-base.set", "@n8n/n8n-nodes-langchain.agent")
 * @param version - Node version (e.g., 2, 4.2, 1.7)
 * @returns ZodSchema or factory function if found, null otherwise
 */
export function loadSchema(nodeType: string, version: number): SchemaOrFactory | null {
	const cacheKey = `${nodeType}@${version}`;

	// Check cache first
	if (schemaCache.has(cacheKey)) {
		return schemaCache.get(cacheKey) ?? null;
	}

	// Try loading schema for the exact node type first
	let schema = tryLoadSchemaForNodeType(nodeType, version);

	// If not found and node name ends with 'Tool', try base node as fallback
	// (e.g., n8n-nodes-base.googleCalendarTool -> n8n-nodes-base.googleCalendar)
	// Note: Some nodes legitimately end in Tool (agentTool, mcpClientTool) but those
	// have their own schemas, so this fallback only triggers when no schema is found
	if (!schema && nodeType.endsWith('Tool')) {
		const baseNodeType = nodeType.slice(0, -4);
		schema = tryLoadSchemaForNodeType(baseNodeType, version);
	}

	schemaCache.set(cacheKey, schema);
	return schema;
}

/**
 * Score a union variant by how well it matches - lower score = better match.
 * Returns the number of discriminator mismatches.
 */
function scoreUnionVariant(issues: ZodIssue[]): number {
	const discriminatorFields = ['mode', 'resource', 'operation'];
	let discriminatorMismatches = 0;

	for (const iss of issues) {
		if (iss.code === 'invalid_literal') {
			const lastPart = iss.path[iss.path.length - 1];
			if (typeof lastPart === 'string' && discriminatorFields.includes(lastPart)) {
				discriminatorMismatches++;
			}
		} else if (
			iss.code === 'invalid_union' &&
			'unionErrors' in iss &&
			Array.isArray(iss.unionErrors)
		) {
			// For nested unions, find the best scoring nested variant
			const nestedScores = (iss.unionErrors as Array<{ issues: ZodIssue[] }>).map((ue) =>
				scoreUnionVariant(ue.issues),
			);
			discriminatorMismatches += Math.min(...nestedScores);
		}
	}

	return discriminatorMismatches;
}

/**
 * Find the best matching union variant (one with fewest discriminator mismatches).
 */
function findBestMatchingVariant(
	unionErrors: Array<{ issues: ZodIssue[] }>,
): { issues: ZodIssue[] } | null {
	if (unionErrors.length === 0) return null;

	let bestVariant = unionErrors[0];
	let bestScore = scoreUnionVariant(bestVariant.issues);

	for (let i = 1; i < unionErrors.length; i++) {
		const score = scoreUnionVariant(unionErrors[i].issues);
		if (score < bestScore) {
			bestScore = score;
			bestVariant = unionErrors[i];
		}
	}

	return bestVariant;
}

/**
 * Recursively collect issues from the best matching path through nested unions.
 */
function collectIssuesFromBestPath(unionErrors: Array<{ issues: ZodIssue[] }>): ZodIssue[] {
	const bestVariant = findBestMatchingVariant(unionErrors);
	if (!bestVariant) return [];

	const result: ZodIssue[] = [];

	for (const iss of bestVariant.issues) {
		if (iss.code === 'invalid_union' && 'unionErrors' in iss && Array.isArray(iss.unionErrors)) {
			// Recursively follow the best path for nested unions
			result.push(...collectIssuesFromBestPath(iss.unionErrors as Array<{ issues: ZodIssue[] }>));
		} else {
			result.push(iss);
		}
	}

	return result;
}

/**
 * Discriminators from outermost to innermost. An `operation` is chosen within a
 * `resource`, so a variant for a different resource offers different operations.
 */
const DISCRIMINATOR_ORDER = ['mode', 'resource', 'operation'];

function discriminatorRank(path: string): number {
	return DISCRIMINATOR_ORDER.findIndex((field) => path.endsWith(field));
}

/**
 * Whether a union variant already failed on a discriminator that outranks `rank`.
 *
 * When listing the operations valid for `resource: "lead"`, the `account` variant
 * describes a different resource, so its operations are not valid answers. Zod
 * still reports them, because a failing object surfaces an issue per key.
 */
function failsHigherLevelDiscriminator(issues: ZodIssue[], rank: number): boolean {
	return issues.some((iss) => {
		if (iss.code !== 'invalid_literal') return false;
		const otherRank = discriminatorRank(iss.path.join('.'));
		return otherRank !== -1 && otherRank < rank;
	});
}

/**
 * Recursively collect ALL discriminator values from the union variants that are
 * reachable given the discriminators already supplied. Used to list valid options
 * for a discriminator that is missing or invalid.
 */
function collectAllDiscriminatorValues(
	unionErrors: Array<{ issues: ZodIssue[] }>,
	discriminatorPath: string,
): unknown[] {
	const values: unknown[] = [];
	const rank = discriminatorRank(discriminatorPath);

	for (const unionError of unionErrors) {
		// Nested unions surface the resource literal one level down, so this check
		// applies at every level rather than only at the top.
		if (rank !== -1 && failsHigherLevelDiscriminator(unionError.issues, rank)) {
			continue;
		}

		for (const iss of unionError.issues) {
			if (iss.code === 'invalid_literal' && iss.path.join('.') === discriminatorPath) {
				values.push((iss as { expected?: unknown }).expected);
			} else if (
				iss.code === 'invalid_union' &&
				'unionErrors' in iss &&
				Array.isArray(iss.unionErrors)
			) {
				values.push(
					...collectAllDiscriminatorValues(
						iss.unionErrors as Array<{ issues: ZodIssue[] }>,
						discriminatorPath,
					),
				);
			}
		}
	}

	return [...new Set(values)];
}

/** Formatted issue with structured metadata alongside the human-readable message. */
interface FormattedIssue {
	message: string;
	missingDiscriminator?: boolean;
}

/**
 * Extract the most useful error information from union validation failures.
 * Returns a clear, actionable error message summarizing what went wrong.
 */
function extractUnionErrorSummary(
	unionErrors: Array<{ issues: ZodIssue[] }>,
): FormattedIssue | null {
	// Find the best matching variant and collect its issues (handles nested unions)
	const bestPathIssues = collectIssuesFromBestPath(unionErrors);

	if (bestPathIssues.length === 0) {
		return null;
	}

	// Group issues by path
	const issuesByPath = new Map<string, ZodIssue[]>();
	for (const iss of bestPathIssues) {
		const path = iss.path.join('.');
		if (!issuesByPath.has(path)) {
			issuesByPath.set(path, []);
		}
		issuesByPath.get(path)!.push(iss);
	}

	// Check for discriminator issues first (invalid_literal on resource/operation/mode)
	const discriminatorFields = ['mode', 'resource', 'operation'];
	for (const field of discriminatorFields) {
		for (const [path, issues] of issuesByPath) {
			if (path.endsWith(field)) {
				const literalIssues = issues.filter((i) => i.code === 'invalid_literal');
				if (literalIssues.length > 0) {
					const receivedValue = (literalIssues[0] as { received?: unknown }).received;

					// Collect ALL valid values from ALL variants, not just the best-matching
					// one — otherwise a node with 12 resources reports only the first.
					// The best-path literals are a fallback for schemas whose variants
					// don't surface an issue at this exact path.
					const allValues = collectAllDiscriminatorValues(unionErrors, path);
					const expectedValues =
						allValues.length > 0
							? allValues
							: [...new Set(literalIssues.map((i) => (i as { expected?: unknown }).expected))];

					const expectedStr = expectedValues.map((v) => `"${String(v)}"`).join(', ');
					if (receivedValue === undefined) {
						// The downgrade signal only applies when there EXISTS a variant this
						// config satisfies apart from the omitted discriminator(s). Quantified
						// over all variants, not the best-path one: best-path selection breaks
						// score ties by order, so a variant failing only on discriminators
						// could win while the config satisfies no variant at all.
						const isOmittedDiscriminator = (iss: ZodIssue) =>
							iss.code === 'invalid_literal' &&
							(iss as { received?: unknown }).received === undefined &&
							discriminatorFields.some((discriminator) =>
								iss.path.join('.').endsWith(discriminator),
							);
						const onlyOmittedDiscriminators = unionErrors.some((unionError) =>
							unionError.issues.every(isOmittedDiscriminator),
						);
						return {
							message: `Missing discriminator "${path}". Expected one of: ${expectedStr}. When "${field}" is omitted, n8n falls back to the node default at runtime (the editor strips default values on save), so this can be intentional. If you set it, make sure "${field}" is inside "parameters".`,
							...(onlyOmittedDiscriminators ? { missingDiscriminator: true } : {}),
						};
					}
					let receivedStr: string;
					if (typeof receivedValue === 'object') {
						receivedStr = JSON.stringify(receivedValue);
					} else {
						// eslint-disable-next-line @typescript-eslint/no-base-to-string -- Object case handled above
						receivedStr = String(receivedValue);
					}
					return {
						message: `Invalid value for "${path}": got "${receivedStr}", expected one of: ${expectedStr}.`,
					};
				}
			}
		}
	}

	// Check for type mismatches
	const typeMismatches: Array<{ path: string; expected: string; received: string }> = [];
	for (const [path, issues] of issuesByPath) {
		for (const iss of issues) {
			if (iss.code === 'invalid_type') {
				typeMismatches.push({
					path,
					expected: (iss as { expected?: string }).expected ?? 'unknown',
					received: (iss as { received?: string }).received ?? 'unknown',
				});
			}
		}
	}

	if (typeMismatches.length > 0) {
		// Find unique type mismatches
		const uniqueMismatches = new Map<string, { expected: string; received: string }>();
		for (const m of typeMismatches) {
			if (!uniqueMismatches.has(m.path)) {
				uniqueMismatches.set(m.path, { expected: m.expected, received: m.received });
			}
		}

		if (uniqueMismatches.size === 1) {
			const [path, { expected, received }] = [...uniqueMismatches.entries()][0];
			return { message: `Field "${path}" has wrong type: expected ${expected}, got ${received}.` };
		}

		// Multiple type mismatches - summarize
		const paths = [...uniqueMismatches.keys()].slice(0, 3);
		const summaries = paths.map((p) => {
			const { expected, received } = uniqueMismatches.get(p)!;
			return `"${p}" (expected ${expected}, got ${received})`;
		});
		const more = uniqueMismatches.size > 3 ? ` and ${uniqueMismatches.size - 3} more` : '';
		return { message: `Type mismatches: ${summaries.join(', ')}${more}.` };
	}

	// Fallback: show the first few specific issues
	const specificIssues = bestPathIssues
		.filter((i: ZodIssue) => i.code !== 'invalid_union')
		.slice(0, 3);
	if (specificIssues.length > 0) {
		const summaries = specificIssues.map((iss: ZodIssue) => {
			const path = iss.path.join('.') || 'config';
			if (iss.code === 'invalid_literal') {
				return `"${path}" must be "${String((iss as { expected?: unknown }).expected)}"`;
			}
			return `"${path}": ${iss.message}`;
		});
		return { message: `Validation failed: ${summaries.join('; ')}.` };
	}

	return null;
}

/**
 * Issue formatter function type
 */
type IssueFormatter = (issue: ZodIssue, path: string) => string;

/**
 * Format invalid_type issues
 */
function formatInvalidType(issue: ZodIssue, path: string): string {
	const received = (issue as { received?: string }).received;
	const expected = (issue as { expected?: string }).expected;
	if (received === 'undefined') {
		return `Required field "${path}" is missing. Expected ${expected}.`;
	}
	return `Field "${path}" has wrong type. Expected ${expected}, but got ${received}.`;
}

/**
 * Format invalid_union issues. Returns structured metadata so callers can tell
 * a missing-discriminator finding apart from other union failures.
 */
function formatInvalidUnion(issue: ZodIssue, path: string): FormattedIssue {
	if ('unionErrors' in issue && Array.isArray(issue.unionErrors)) {
		// Check if all union errors are about undefined/missing value
		const allMissing = issue.unionErrors.every((ue) =>
			ue.issues.some(
				(i) => i.code === 'invalid_type' && (i as { received?: string }).received === 'undefined',
			),
		);
		if (allMissing) {
			return { message: `Required field "${path}" is missing.` };
		}

		// Extract the most useful error summary from the union
		const errorSummary = extractUnionErrorSummary(issue.unionErrors);
		if (errorSummary) {
			return errorSummary;
		}
	}
	return { message: `Field "${path}" has invalid value. None of the expected types matched.` };
}

/**
 * Format invalid_literal issues
 */
function formatInvalidLiteral(issue: ZodIssue, path: string): string {
	const expected = (issue as { expected?: unknown }).expected;
	const received = (issue as { received?: unknown }).received;
	return `Field "${path}" must be exactly "${String(expected)}", but got "${String(received)}".`;
}

/**
 * Format invalid_enum_value issues
 */
function formatInvalidEnum(issue: ZodIssue, path: string): string {
	if ('options' in issue && Array.isArray(issue.options)) {
		return `Field "${path}" must be one of: ${issue.options.map((o) => `"${String(o)}"`).join(', ')}.`;
	}
	return `Field "${path}" has invalid enum value.`;
}

/**
 * Format too_small issues
 */
function formatTooSmall(issue: ZodIssue, path: string): string {
	const issueType = (issue as { type?: string }).type;
	const minimum = (issue as { minimum?: number }).minimum;
	if (issueType === 'string') {
		return `Field "${path}" is too short. Minimum length is ${minimum}.`;
	}
	if (issueType === 'array') {
		return `Field "${path}" must have at least ${minimum} item(s).`;
	}
	return `Field "${path}" is too small.`;
}

/**
 * Format too_big issues
 */
function formatTooBig(issue: ZodIssue, path: string): string {
	const issueType = (issue as { type?: string }).type;
	const maximum = (issue as { maximum?: number }).maximum;
	if (issueType === 'string') {
		return `Field "${path}" is too long. Maximum length is ${maximum}.`;
	}
	if (issueType === 'array') {
		return `Field "${path}" must have at most ${maximum} item(s).`;
	}
	return `Field "${path}" is too large.`;
}

/**
 * Format unrecognized_keys issues
 */
function formatUnrecognizedKeys(issue: ZodIssue, path: string): string {
	if ('keys' in issue && Array.isArray(issue.keys)) {
		return `Unknown field(s) at "${path}": ${issue.keys.map((k) => `"${String(k)}"`).join(', ')}.`;
	}
	return `Unknown fields at "${path}".`;
}

/**
 * Map of Zod issue codes to their formatter functions
 */
const ISSUE_FORMATTERS: Partial<Record<string, IssueFormatter>> = {
	invalid_type: formatInvalidType,
	invalid_literal: formatInvalidLiteral,
	invalid_enum_value: formatInvalidEnum,
	too_small: formatTooSmall,
	too_big: formatTooBig,
	unrecognized_keys: formatUnrecognizedKeys,
};

/**
 * Format a single Zod issue into a clear, actionable error message
 */
function formatZodIssue(issue: ZodIssue): FormattedIssue {
	const path = issue.path.length > 0 ? issue.path.join('.') : 'config';

	// Union issues carry structured metadata (missing-discriminator detection)
	if (issue.code === 'invalid_union') {
		return formatInvalidUnion(issue, path);
	}

	const formatter = ISSUE_FORMATTERS[issue.code];
	if (formatter) {
		return { message: formatter(issue, path) };
	}

	// Fallback to Zod's default message with path context
	return { message: `Field "${path}": ${issue.message}` };
}

/**
 * Convert Zod issues to our error format with clear, actionable messages
 */
function formatZodErrors(issues: ZodIssue[]): SchemaValidationResult['errors'] {
	return issues.map((issue) => {
		const { message, missingDiscriminator } = formatZodIssue(issue);
		return {
			path: issue.path.join('.'),
			message,
			...(missingDiscriminator ? { missingDiscriminator } : {}),
		};
	});
}

/**
 * Check if a value is a Zod schema (has safeParse method)
 */
function isZodSchema(value: SchemaOrFactory): value is ZodSchema {
	return typeof value === 'object' && value !== null && 'safeParse' in value;
}

/**
 * Validate node config against its Zod schema
 *
 * Supports both static schemas and factory functions.
 * For factory functions, calls them with the node's parameters to get
 * a context-aware schema that respects displayOptions conditions.
 *
 * @param nodeType - Full node type string
 * @param version - Node version
 * @param config - Node configuration (parameters, subnodes, etc.)
 * @param options - Optional validation options (e.g., isToolNode for tool subnodes)
 * @returns Validation result with errors if invalid
 */
export function validateNodeConfig(
	nodeType: string,
	version: number,
	config: { parameters?: unknown; subnodes?: unknown },
	options?: { isToolNode?: boolean },
): SchemaValidationResult {
	const schemaOrFactory = loadSchema(nodeType, version);

	if (!schemaOrFactory) {
		// No schema available - skip validation (graceful fallback)
		return { valid: true, errors: [] };
	}

	// Determine if this is a static schema or factory function
	let schema: ZodSchema;
	if (isZodSchema(schemaOrFactory)) {
		// Static schema - use directly
		schema = schemaOrFactory;
	} else {
		// Factory function - call it with parameters and all schema helpers
		const parameters = (config.parameters ?? {}) as Record<string, unknown>;
		const isToolNode = options?.isToolNode ?? false;
		schema = schemaOrFactory({
			...schemaHelpers,
			parameters,
			// Override resolveSchema to inject isToolNode
			resolveSchema: (cfg) => schemaHelpers.resolveSchema({ ...cfg, isToolNode }),
			resolveOneOfSchemas: (cfg) => schemaHelpers.resolveOneOfSchemas({ ...cfg, isToolNode }),
		});
	}

	const result = schema.safeParse(config);

	if (result.success) {
		return { valid: true, errors: [] };
	}

	return {
		valid: false,
		errors: formatZodErrors(result.error.issues),
	};
}
