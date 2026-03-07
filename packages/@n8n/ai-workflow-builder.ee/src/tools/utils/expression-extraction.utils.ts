import type { IConnections, INodeParameters, Logger } from 'n8n-workflow';
import { isExpression } from 'n8n-workflow';

import { MAX_NODE_EXAMPLE_CHARS, MIN_EXPRESSION_TEMPLATES } from '@/constants';
import type { WorkflowMetadata } from '@/types';
import type { SimpleWorkflow } from '@/types/workflow';

import { fetchWorkflowsFromTemplates } from '../web/templates';

/**
 * A single expression example extracted from a template workflow
 */
export interface ExpressionExample {
	/** The full expression string, e.g. "={{ $json.data.id }}" */
	expression: string;
	/** The field path accessed, e.g. "data.id" */
	fieldPath: string;
	/** The parameter path in the consuming node, e.g. "sendTo" or "conditions.0.leftValue" */
	parameterPath: string;
	/** Type of the consuming node, e.g. "n8n-nodes-base.if" */
	consumerNodeType: string;
	/** How the expression references the target: 'direct' ($json) or 'named' ($('Name')) */
	referenceType: 'direct' | 'named';
}

/**
 * Recursively walks the parameter tree and extracts all expression strings.
 * Returns a flat array of { parameterPath, expression } entries.
 */
export function extractExpressionsFromParameters(
	parameters: INodeParameters,
	parentPath?: string,
): Array<{ parameterPath: string; expression: string }> {
	const results: Array<{ parameterPath: string; expression: string }> = [];

	for (const [key, value] of Object.entries(parameters)) {
		const currentPath = parentPath ? `${parentPath}.${key}` : key;

		if (typeof value === 'string' && isExpression(value)) {
			results.push({ parameterPath: currentPath, expression: value });
		} else if (Array.isArray(value)) {
			for (let i = 0; i < value.length; i++) {
				const item = value[i];
				if (typeof item === 'string' && isExpression(item)) {
					results.push({ parameterPath: `${currentPath}.${i}`, expression: item });
				} else if (item && typeof item === 'object') {
					results.push(
						...extractExpressionsFromParameters(item as INodeParameters, `${currentPath}.${i}`),
					);
				}
			}
		} else if (value && typeof value === 'object' && !Array.isArray(value)) {
			results.push(...extractExpressionsFromParameters(value as INodeParameters, currentPath));
		}
	}

	return results;
}

// --- Regex building blocks for field path extraction ---

/** Matches a dotted identifier path: field, field.nested, field.deeply.nested */
const FIELD_PATH = '([a-zA-Z_]\\w*(?:\\.[a-zA-Z_]\\w*)*)';

/** Matches n8n data accessors: .first(), .last(), .all(), .all()[0], .item */
const ACCESSOR = '(?:(?:first|last|all)\\(\\)(?:\\[\\d+\\])?|item)';

/** Matches a named node reference: $('Node Name') or $("Node Name") */
const NAMED_REF = '\\$\\([\'"][^\'"]+[\'"]\\)';

interface FieldPathPattern {
	pattern: RegExp;
	binary?: boolean;
}

const FIELD_PATH_PATTERNS: FieldPathPattern[] = [
	// $json.field.nested
	{ pattern: new RegExp('\\$json\\.' + FIELD_PATH, 'g') },
	// $json["field"]
	{ pattern: new RegExp('\\$json\\["([^"]+)"\\]', 'g') },
	// $input.first().json.field  OR  $('Name').item.json.field  (all combos)
	{
		pattern: new RegExp(
			'(?:\\$input|' + NAMED_REF + ')\\.' + ACCESSOR + '\\.json\\.' + FIELD_PATH,
			'g',
		),
	},
	// $binary.propertyName
	{ pattern: new RegExp('\\$binary\\.([a-zA-Z_]\\w*)', 'g'), binary: true },
];

/**
 * Extract field paths from an expression string.
 * Handles $json.field, $('Name').first().json.field, $input.*, $binary.* patterns.
 */
export function extractFieldPaths(expression: string): string[] {
	const fieldPaths = new Set<string>();

	for (const { pattern, binary } of FIELD_PATH_PATTERNS) {
		// Reset lastIndex for global regex reuse
		pattern.lastIndex = 0;
		let match: RegExpExecArray | null;
		while ((match = pattern.exec(expression)) !== null) {
			let path = match[1];
			if (path) {
				// If the match is immediately followed by '(', the last segment is a
				// method call (e.g. $json.items.includes(...)), not a field path.
				const endIndex = match.index + match[0].length;
				if (endIndex < expression.length && expression[endIndex] === '(') {
					const lastDot = path.lastIndexOf('.');
					if (lastDot > 0) {
						path = path.substring(0, lastDot);
					} else {
						// Entire "path" is a method name (e.g. $json.toString())
						continue;
					}
				}

				fieldPaths.add(binary ? `binary:${path}` : path);
			}
		}
	}

	return [...fieldPaths];
}

/**
 * Get direct child node names from connections (connections are indexed by source node).
 */
export function getDirectChildren(connections: IConnections, nodeName: string): string[] {
	const nodeConnections = connections[nodeName];
	if (!nodeConnections) return [];

	const children = new Set<string>();
	for (const outputType of Object.values(nodeConnections)) {
		for (const outputIndex of outputType) {
			if (!outputIndex) continue;
			for (const conn of outputIndex) {
				children.add(conn.node);
			}
		}
	}

	return [...children];
}

// Regex to detect named references: $('NodeName') or $("NodeName")
const NAMED_REF_PATTERN = /\$\(['"](.*?)['"]\)/g;

/**
 * Check if an expression contains a named reference to a specific node name.
 */
function hasNamedReference(expression: string, nodeName: string): boolean {
	NAMED_REF_PATTERN.lastIndex = 0;
	let match: RegExpExecArray | null;
	while ((match = NAMED_REF_PATTERN.exec(expression)) !== null) {
		if (match[1] === nodeName) return true;
	}
	return false;
}

// Regex to detect direct references: $json, $input, $binary (not preceded by . or ')
const DIRECT_REF_PATTERN = /(?<![.'"])\$(?:json|input|binary)\b/;

/**
 * Extract expression examples for a specific node within a workflow.
 *
 * Captures:
 * - Direct references ($json.*, $binary.*, $input.*) from immediate downstream nodes
 * - Named references ($('targetNodeName').*) from any node in the workflow
 */
export function extractExpressionExamplesForNode(
	workflow: SimpleWorkflow,
	targetNodeName: string,
): ExpressionExample[] {
	const examples: ExpressionExample[] = [];
	const directChildren = new Set(getDirectChildren(workflow.connections, targetNodeName));

	for (const node of workflow.nodes) {
		if (node.name === targetNodeName) continue;
		if (!node.parameters || Object.keys(node.parameters).length === 0) continue;

		const expressions = extractExpressionsFromParameters(node.parameters);
		const isDirectChild = directChildren.has(node.name);

		for (const { parameterPath, expression } of expressions) {
			// Check for named references to the target node
			if (hasNamedReference(expression, targetNodeName)) {
				const fieldPaths = extractFieldPaths(expression);
				for (const fieldPath of fieldPaths) {
					examples.push({
						expression,
						fieldPath,
						parameterPath,
						consumerNodeType: node.type,
						referenceType: 'named',
					});
				}
			}
			// Check for direct references from immediate children
			else if (isDirectChild && DIRECT_REF_PATTERN.test(expression)) {
				const fieldPaths = extractFieldPaths(expression);
				for (const fieldPath of fieldPaths) {
					examples.push({
						expression,
						fieldPath,
						parameterPath,
						consumerNodeType: node.type,
						referenceType: 'direct',
					});
				}
			}
		}
	}

	// Deduplicate by fieldPath (keep first occurrence regardless of reference type)
	const seen = new Set<string>();
	return examples.filter((ex) => {
		if (seen.has(ex.fieldPath)) return false;
		seen.add(ex.fieldPath);
		return true;
	});
}

/**
 * Collect expression examples from template workflows for a given node type.
 * For each template, finds nodes of the given type and extracts expression examples.
 * Deduplicates by fieldPath across templates.
 */
export function collectExpressionExamplesFromTemplates(
	templates: WorkflowMetadata[],
	nodeType: string,
): ExpressionExample[] {
	const allExamples: ExpressionExample[] = [];

	for (const template of templates) {
		const nodesOfType = template.workflow.nodes.filter((n) => n.type === nodeType);
		for (const node of nodesOfType) {
			const examples = extractExpressionExamplesForNode(template.workflow, node.name);
			allExamples.push(...examples);
		}
	}

	// Deduplicate by fieldPath (same field from different templates = one example)
	const seen = new Set<string>();
	return allExamples.filter((ex) => {
		if (seen.has(ex.fieldPath)) return false;
		seen.add(ex.fieldPath);
		return true;
	});
}

/**
 * Build a clean field path string from an ExpressionExample.
 * Binary paths are prefixed with "binary:" internally; display as "$binary.name".
 * All other paths are shown as plain field paths (e.g. "data.id", "issue.key").
 */
function buildFieldPathLine(ex: ExpressionExample): string {
	if (ex.fieldPath.startsWith('binary:')) {
		return `$binary.${ex.fieldPath.slice(7)}`;
	}
	return ex.fieldPath;
}

/**
 * Format expression examples as a structured block for the builder LLM.
 * Lists only the field paths (not full expression syntax) since the builder
 * prompt instructs to always use $('NodeName').item.json.fieldPath syntax.
 */
export function formatExpressionExamples(
	nodeType: string,
	examples: ExpressionExample[],
	maxChars: number = MAX_NODE_EXAMPLE_CHARS,
): string {
	if (examples.length === 0) {
		return '';
	}

	// Sort by field path length (shortest first) for readability
	const sorted = [...examples].sort((a, b) => a.fieldPath.length - b.fieldPath.length);

	const header = `## ${nodeType} — verified output fields from real n8n workflows:`;
	const lines: string[] = [header];
	let currentChars = header.length + 1;

	for (const ex of sorted) {
		const pattern = `- ${buildFieldPathLine(ex)}`;
		if (currentChars + pattern.length + 1 > maxChars) break;
		lines.push(pattern);
		currentChars += pattern.length + 1;
	}

	lines.push(
		`Access these fields via $('NodeName').item.json.fieldPath when referencing ${nodeType} outputs.`,
	);

	return lines.join('\n');
}

/**
 * Fetch templates for each node type, extract expression examples, and format.
 * Uses cached templates and supplements from the API when fewer than 20 are cached.
 * Returns the formatted markdown string and any newly fetched templates for caching.
 */
export async function fetchAndFormatExpressionExamples(
	nodeTypes: string[],
	cachedTemplates: WorkflowMetadata[],
	logger?: Logger,
): Promise<{ formatted: Record<string, string>; newTemplates: WorkflowMetadata[] }> {
	const allNewTemplates: WorkflowMetadata[] = [];
	const formatted: Record<string, string> = {};

	for (const nodeType of nodeTypes) {
		const relevantFromCache = cachedTemplates.filter((wf) =>
			wf.workflow.nodes.some((n) => n.type === nodeType),
		);

		if (relevantFromCache.length > 0) {
			logger?.debug('Found templates in state cache for expression examples', {
				nodeType,
				workflowCount: relevantFromCache.length,
			});
		}

		// Supplement from API when cache has fewer than the minimum
		let freshFromApi: WorkflowMetadata[] = [];
		if (relevantFromCache.length < MIN_EXPRESSION_TEMPLATES) {
			const needed = MIN_EXPRESSION_TEMPLATES - relevantFromCache.length;
			try {
				const result = await fetchWorkflowsFromTemplates(
					{ nodes: nodeType, rows: needed },
					{ maxTemplates: needed, logger },
				);
				// Avoid duplicates — only add templates not already in cache
				const cachedIds = new Set(relevantFromCache.map((wf) => wf.templateId));
				freshFromApi = result.workflows.filter((wf) => !cachedIds.has(wf.templateId));
				if (freshFromApi.length > 0) {
					allNewTemplates.push(...freshFromApi);
					logger?.debug('Fetched additional workflows from templates API', {
						nodeType,
						workflowCount: freshFromApi.length,
					});
				}
			} catch (error) {
				logger?.warn('Failed to fetch expression examples from templates', {
					nodeType,
					error,
				});
			}
		}

		const workflows = [...relevantFromCache, ...freshFromApi];

		const examples = collectExpressionExamplesFromTemplates(workflows, nodeType);
		const formattedForType = formatExpressionExamples(nodeType, examples);
		if (formattedForType) {
			formatted[nodeType] = formattedForType;
		}
	}

	return {
		formatted,
		newTemplates: allNewTemplates,
	};
}
