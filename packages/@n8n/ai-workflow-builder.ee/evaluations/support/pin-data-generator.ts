/**
 * LLM-based pin data generator for evaluations.
 *
 * Generates realistic mock output data for service nodes in a workflow
 * via a single LLM call, ensuring cross-node data consistency.
 * Works with both the code-based and multi-agent builder outputs.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { existsSync, readFileSync, readdirSync } from 'fs';
import {
	jsonParse,
	type IDataObject,
	type INode,
	type INodeTypeDescription,
	type IPinData,
} from 'n8n-workflow';
import { join } from 'path';

import type { SimpleWorkflow } from '../../src/types/workflow';
import type { EvalLogger } from '../harness/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PinDataGeneratorOptions {
	/** LLM to use for generating mock data */
	llm: BaseChatModel;
	/** Loaded node type descriptions (from env.parsedNodeTypes) */
	nodeTypes: INodeTypeDescription[];
	/** Path to packages/nodes-base/nodes/ for __schema__ resolution */
	nodesBasePath?: string;
	/** Logger for verbose output */
	logger?: EvalLogger;
}

interface NodeSchemaContext {
	nodeName: string;
	nodeType: string;
	typeVersion: number;
	resource?: string;
	operation?: string;
	schema?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Utility node deny-list
// ---------------------------------------------------------------------------

/**
 * Nodes that define credentials in their type description but don't actually
 * call external APIs, so they don't need pin data. All other non-service nodes
 * are excluded naturally because they have no credentials defined.
 */
const NON_SERVICE_NODES_WITH_CREDENTIALS = new Set([
	'n8n-nodes-base.wait', // optional webhook-resumption auth
	'n8n-nodes-base.respondToWebhook', // optional JWT signing when responding
]);

// ---------------------------------------------------------------------------
// Node identification
// ---------------------------------------------------------------------------

/**
 * Build a set of node names that are targets of AI-type connections
 * (ai_languageModel, ai_tool, ai_memory, etc.). These are root AI nodes
 * (e.g. Agent, Chain) whose sub-nodes can't be individually pinned.
 * Pinning the root prevents sub-node execution entirely.
 */
function findAiRootNodeNames(workflow: SimpleWorkflow): Set<string> {
	const roots = new Set<string>();
	for (const nodeConns of Object.values(workflow.connections)) {
		for (const [connType, outputs] of Object.entries(nodeConns)) {
			if (!connType.startsWith('ai_')) continue;
			if (!Array.isArray(outputs)) continue;
			for (const group of outputs) {
				if (!Array.isArray(group)) continue;
				for (const conn of group) {
					if (conn?.node) roots.add(conn.node);
				}
			}
		}
	}
	return roots;
}

/**
 * Identify which nodes in a workflow need pin data.
 * In eval context, we pin all service/API nodes since none have real credentials.
 */
export function identifyPinDataNodes(
	workflow: SimpleWorkflow,
	nodeTypes: INodeTypeDescription[],
): INode[] {
	const nodeTypeMap = new Map(nodeTypes.map((nt) => [nt.name, nt]));
	const aiRootNodes = findAiRootNodeNames(workflow);

	return workflow.nodes.filter((node) => {
		// Skip disabled nodes
		if (node.disabled) return false;

		// Pin root AI nodes (Agent, Chain, etc.) — their sub-nodes (tools,
		// memory, LLMs) can't run without real providers in the eval context.
		if (aiRootNodes.has(node.name)) return true;

		// Check if the node type definition has credentials (→ it's a service node)
		const typeDesc = nodeTypeMap.get(node.type);
		if (typeDesc?.credentials && typeDesc.credentials.length > 0) {
			// Exclude nodes that define credentials for local/optional auth, not external APIs
			return !NON_SERVICE_NODES_WITH_CREDENTIALS.has(node.type);
		}

		// Nodes that require infrastructure unavailable in the eval context:
		// - HTTP/Webhook: optional credentials, may call external APIs
		// - DataTable: requires the data-table module
		// - Code/ExecuteCommand: require a task runner to execute
		if (
			node.type === 'n8n-nodes-base.httpRequest' ||
			node.type === 'n8n-nodes-base.webhook' ||
			node.type === 'n8n-nodes-base.dataTable' ||
			node.type === 'n8n-nodes-base.code' ||
			node.type === 'n8n-nodes-base.executeCommand'
		) {
			return true;
		}

		return false;
	});
}

// ---------------------------------------------------------------------------
// Schema resolution
// ---------------------------------------------------------------------------

/**
 * Build a map from node type name (e.g., "n8n-nodes-base.linear") to the
 * directory containing its __schema__ folder by scanning .node.ts files.
 * Cached per nodesBasePath.
 */
const schemaMapCache = new Map<string, Map<string, string>>();

function buildSchemaMap(nodesBasePath: string): Map<string, string> {
	const cached = schemaMapCache.get(nodesBasePath);
	if (cached) return cached;

	const result = new Map<string, string>();

	function scanDir(dir: string) {
		try {
			for (const entry of readdirSync(dir, { withFileTypes: true })) {
				if (!entry.isDirectory()) continue;

				const entryPath = join(dir, entry.name);
				const schemaDir = join(entryPath, '__schema__');

				if (existsSync(schemaDir)) {
					// Find .node.ts/.node.js files to extract the node type name
					const nodeFiles = readdirSync(entryPath).filter(
						(f) => f.endsWith('.node.ts') || f.endsWith('.node.js'),
					);
					for (const nodeFile of nodeFiles) {
						try {
							const content = readFileSync(join(entryPath, nodeFile), 'utf-8');
							const nameMatch = content.match(/name:\s*['"]([^'"]+)['"]/);
							if (nameMatch) {
								result.set(`n8n-nodes-base.${nameMatch[1]}`, entryPath);
							}
						} catch {
							// Skip files that can't be read
						}
					}
				}

				// Recurse into subdirectories (e.g., Aws/S3, Google/Gmail)
				scanDir(entryPath);
			}
		} catch {
			// Directory doesn't exist or can't be read
		}
	}

	scanDir(nodesBasePath);
	schemaMapCache.set(nodesBasePath, result);
	return result;
}

/**
 * Normalize a version number to a semver-like string for directory matching.
 * 1 → "1.0.0", 1.1 → "1.1.0", 2 → "2.0.0"
 */
function normalizeVersion(version: number): string {
	const str = String(version);
	const parts = str.split('.');
	while (parts.length < 3) parts.push('0');
	return parts.join('.');
}

/**
 * Resolve the __schema__ JSON Schema for a node's output, if available.
 */
export function resolveSchemaForNode(
	nodeType: string,
	typeVersion: number,
	resource: string | undefined,
	operation: string | undefined,
	nodesBasePath: string,
): Record<string, unknown> | undefined {
	const schemaMap = buildSchemaMap(nodesBasePath);
	const nodeDir = schemaMap.get(nodeType);
	if (!nodeDir) return undefined;

	const schemaBaseDir = join(nodeDir, '__schema__');
	if (!existsSync(schemaBaseDir)) return undefined;

	const versionStr = normalizeVersion(typeVersion);

	// Try exact version first, then fall back to available versions
	const versionDirs = [
		`v${versionStr}`,
		...readdirSync(schemaBaseDir)
			.filter((d) => d.startsWith('v'))
			.sort()
			.reverse(),
	];

	for (const vDir of [...new Set(versionDirs)]) {
		const versionPath = join(schemaBaseDir, vDir);
		if (!existsSync(versionPath)) continue;

		// Build path with resource and operation
		const parts = [versionPath, resource, operation ? `${operation}.json` : undefined].filter(
			Boolean,
		) as string[];

		const schemaFile = join(...parts);
		if (existsSync(schemaFile)) {
			try {
				return JSON.parse(readFileSync(schemaFile, 'utf-8')) as Record<string, unknown>;
			} catch {
				return undefined;
			}
		}
	}

	return undefined;
}

// ---------------------------------------------------------------------------
// Schema context building
// ---------------------------------------------------------------------------

/**
 * Build schema context for all pin-data-eligible nodes.
 */
export function buildSchemaContexts(nodes: INode[], nodesBasePath?: string): NodeSchemaContext[] {
	return nodes.map((node) => {
		const params = node.parameters as Record<string, unknown> | undefined;
		const resource = typeof params?.resource === 'string' ? params.resource : undefined;
		const operation = typeof params?.operation === 'string' ? params.operation : undefined;

		let schema: Record<string, unknown> | undefined;
		if (nodesBasePath) {
			schema = resolveSchemaForNode(
				node.type,
				node.typeVersion,
				resource,
				operation,
				nodesBasePath,
			);
		}

		return {
			nodeName: node.name,
			nodeType: node.type,
			typeVersion: node.typeVersion,
			resource,
			operation,
			schema,
		};
	});
}

// ---------------------------------------------------------------------------
// Mermaid diagram generation
// ---------------------------------------------------------------------------

/**
 * Convert a workflow's nodes and connections to a mermaid flowchart string.
 * Includes node type, version, resource, and operation info in labels.
 */
export function workflowToMermaid(workflow: SimpleWorkflow): string {
	const lines: string[] = ['flowchart LR'];

	// Build a map for safe mermaid IDs
	const nodeIdMap = new Map<string, string>();
	workflow.nodes.forEach((node, i) => {
		nodeIdMap.set(node.name, `n${i}`);
	});

	// Add node declarations with labels
	for (const node of workflow.nodes) {
		const id = nodeIdMap.get(node.name)!;
		const params = node.parameters as Record<string, unknown> | undefined;
		const resource = typeof params?.resource === 'string' ? params.resource : undefined;
		const operation = typeof params?.operation === 'string' ? params.operation : undefined;

		const shortType = node.type.split('.').pop() ?? node.type;
		let label = `${node.name} (${shortType} v${node.typeVersion}`;
		if (resource) label += `, resource:${resource}`;
		if (operation) label += `, op:${operation}`;
		label += ')';

		lines.push(`  ${id}["${label}"]`);
	}

	// Add connections
	const { connections } = workflow;
	for (const [sourceName, nodeConns] of Object.entries(connections)) {
		const sourceId = nodeIdMap.get(sourceName);
		if (!sourceId) continue;

		for (const [, outputConnections] of Object.entries(nodeConns)) {
			if (!Array.isArray(outputConnections)) continue;

			for (const outputGroup of outputConnections) {
				if (!Array.isArray(outputGroup)) continue;

				for (const conn of outputGroup) {
					if (!conn?.node) continue;
					const targetId = nodeIdMap.get(conn.node);
					if (targetId) {
						lines.push(`  ${sourceId} --> ${targetId}`);
					}
				}
			}
		}
	}

	return lines.join('\n');
}

// ---------------------------------------------------------------------------
// LLM prompt construction
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a test data generator for n8n workflow automation. Generate realistic mock API response data for service nodes in a workflow.

RULES:
1. Data must be consistent across nodes. If node A creates an entity with id "abc-123", downstream nodes referencing that entity must use "abc-123".
2. Generate 1-2 items per node.
3. When a JSON Schema is provided, follow its structure exactly.
4. When no schema is provided, generate a realistic response based on the node type, resource, and operation.
5. Use realistic but clearly fake values (e.g., "jane@example.com", "proj_abc123", "2024-01-15T10:30:00Z").
6. Return ONLY a valid JSON object, no explanation or markdown fencing.`;

function buildUserPrompt(workflow: SimpleWorkflow, contexts: NodeSchemaContext[]): string {
	const mermaid = workflowToMermaid(workflow);

	const sections: string[] = [
		'Generate mock output data for service nodes in this workflow.',
		'',
		'## Workflow Graph',
		'',
		'```mermaid',
		mermaid,
		'```',
		'',
		'## Nodes Requiring Mock Data',
	];

	for (const ctx of contexts) {
		sections.push('');
		sections.push(`### ${ctx.nodeName} (${ctx.nodeType} v${ctx.typeVersion})`);
		if (ctx.resource || ctx.operation) {
			const parts: string[] = [];
			if (ctx.resource) parts.push(`Resource: ${ctx.resource}`);
			if (ctx.operation) parts.push(`Operation: ${ctx.operation}`);
			sections.push(`- ${parts.join(' | ')}`);
		}
		if (ctx.schema) {
			const schemaStr = JSON.stringify(ctx.schema, null, 2);
			// Truncate very large schemas to keep prompt manageable
			const truncated = schemaStr.length > 3000 ? schemaStr.slice(0, 3000) + '\n...' : schemaStr;
			sections.push('- Output JSON Schema:');
			sections.push('```json');
			sections.push(truncated);
			sections.push('```');
		} else {
			sections.push('(no schema available — generate based on API knowledge)');
		}
	}

	sections.push('');
	sections.push('## Expected Output Format');
	sections.push('');
	sections.push(
		'Return a JSON object where each key is the exact node name and the value is an array of items, each wrapped in a "json" key:',
	);
	sections.push('');
	sections.push('```json');
	sections.push('{');
	for (let i = 0; i < Math.min(contexts.length, 2); i++) {
		const ctx = contexts[i];
		const comma = i < Math.min(contexts.length, 2) - 1 ? ',' : '';
		sections.push(`  "${ctx.nodeName}": [{ "json": { ... } }]${comma}`);
	}
	if (contexts.length > 2) {
		sections.push('  ...');
	}
	sections.push('}');
	sections.push('```');

	return sections.join('\n');
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

/**
 * Parse the LLM response into IPinData format.
 * Handles both `{ "json": {...} }` wrapped and unwrapped items.
 */
function parsePinDataResponse(responseText: string, expectedNodes: string[]): IPinData {
	// Strip markdown code fences if present
	let cleaned = responseText.trim();
	if (cleaned.startsWith('```')) {
		cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
	}

	const parsed = jsonParse<Record<string, unknown>>(cleaned);
	const pinData: IPinData = {};

	for (const nodeName of expectedNodes) {
		const nodeData = parsed[nodeName];
		if (!Array.isArray(nodeData) || nodeData.length === 0) continue;

		pinData[nodeName] = nodeData.map((item: unknown) => {
			if (typeof item === 'object' && item !== null && 'json' in item) {
				return item as { json: IDataObject };
			}
			// Wrap raw objects in { json: ... }
			return { json: (item ?? {}) as IDataObject };
		});
	}

	return pinData;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Generate pin data for all service nodes in a workflow using an LLM.
 * Produces consistent cross-node mock data in a single LLM call.
 *
 * @returns IPinData map (node name → execution data items). Returns {} on failure.
 */
export async function generateEvalPinData(
	workflow: SimpleWorkflow,
	options: PinDataGeneratorOptions,
): Promise<IPinData> {
	const { llm, nodeTypes, nodesBasePath, logger } = options;

	// 1. Identify which nodes need pin data
	const eligibleNodes = identifyPinDataNodes(workflow, nodeTypes);
	if (eligibleNodes.length === 0) {
		logger?.verbose('  Pin data: no service nodes found, skipping');
		return {};
	}

	logger?.verbose(`  Pin data: generating for ${eligibleNodes.length} node(s)`);

	// 2. Build schema contexts (with optional __schema__ enrichment)
	const contexts = buildSchemaContexts(eligibleNodes, nodesBasePath);
	const schemasFound = contexts.filter((c) => c.schema).length;
	if (schemasFound > 0) {
		logger?.verbose(`  Pin data: found __schema__ for ${schemasFound}/${contexts.length} node(s)`);
	}

	// 3. Build prompt and call LLM
	const userPrompt = buildUserPrompt(workflow, contexts);
	const expectedNodeNames = contexts.map((c) => c.nodeName);

	try {
		const response = await llm.invoke([
			new SystemMessage(SYSTEM_PROMPT),
			new HumanMessage(userPrompt),
		]);

		const responseText =
			typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

		const pinData = parsePinDataResponse(responseText, expectedNodeNames);

		const generatedCount = Object.keys(pinData).length;
		logger?.verbose(
			`  Pin data: generated for ${generatedCount}/${expectedNodeNames.length} node(s)`,
		);

		return pinData;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger?.warn(`  Pin data generation failed: ${message}`);
		return {};
	}
}
