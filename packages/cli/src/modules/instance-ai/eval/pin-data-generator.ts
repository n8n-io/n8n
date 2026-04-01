/**
 * LLM-based pin data generator.
 *
 * Generates realistic mock output data for specified nodes in a workflow
 * via a single LLM call, ensuring cross-node data consistency. The caller
 * decides which nodes need pin data — this module only generates it.
 *
 * NOTE: Adapted from @n8n/ai-workflow-builder.ee/evaluations/support/pin-data-generator.ts
 * This should be extracted to a shared package (e.g., @n8n/eval-utils) for reuse
 * by MCP, frontend, instance-ai evaluations, and other teams.
 */

import type { WorkflowJSON, NodeJSON } from '@n8n/workflow-sdk';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

import { createEvalAgent, extractText } from '@n8n/instance-ai';

type PinData = Record<string, Array<Record<string, unknown>>>;

interface PinDataGenerationInstructions {
	dataDescription: string;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface GeneratePinDataOptions {
	/** The workflow containing the nodes to generate data for */
	workflow: WorkflowJSON;
	/** Node names to generate pin data for */
	nodeNames: string[];
	/** Optional instructions to enrich the LLM prompt */
	instructions?: PinDataGenerationInstructions;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface NodeSchemaContext {
	nodeName: string;
	nodeType: string;
	typeVersion: number;
	resource?: string;
	operation?: string;
	schema?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// nodesBasePath auto-resolution
// ---------------------------------------------------------------------------

let _resolvedNodesBasePath: string | undefined | null;

function resolveNodesBasePath(): string | undefined {
	if (_resolvedNodesBasePath !== undefined) {
		return _resolvedNodesBasePath ?? undefined;
	}

	let dir = __dirname;
	for (let i = 0; i < 10; i++) {
		const candidate = join(dir, 'packages', 'nodes-base', 'nodes');
		if (existsSync(candidate)) {
			_resolvedNodesBasePath = candidate;
			return candidate;
		}
		const parent = join(dir, '..');
		if (parent === dir) break;
		dir = parent;
	}

	_resolvedNodesBasePath = null;
	return undefined;
}

// ---------------------------------------------------------------------------
// Schema resolution
// ---------------------------------------------------------------------------

const schemaMapCache = new Map<string, Map<string, string>>();

/**
 * Build a map from node type name (e.g., "n8n-nodes-base.linear") to the
 * directory containing its __schema__ folder by scanning .node.ts files.
 */
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

function normalizeVersion(version: number): string {
	const str = String(version);
	const parts = str.split('.');
	while (parts.length < 3) parts.push('0');
	return parts.join('.');
}

/**
 * Resolve the __schema__ JSON Schema for a node's output, if available.
 */
function resolveSchemaForNode(
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

	const versionDirs = [
		`v${versionStr}`,
		...readdirSync(schemaBaseDir)
			.filter((d) => d.startsWith('v'))
			.sort((a, b) => {
				const partsA = a.slice(1).split('.').map(Number);
				const partsB = b.slice(1).split('.').map(Number);
				for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
					const diff = (partsB[i] ?? 0) - (partsA[i] ?? 0);
					if (diff !== 0) return diff;
				}
				return 0;
			}),
	];

	for (const vDir of [...new Set(versionDirs)]) {
		const versionPath = join(schemaBaseDir, vDir);
		if (!existsSync(versionPath)) continue;

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

function buildSchemaContexts(nodes: NodeJSON[], nodesBasePath?: string): NodeSchemaContext[] {
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
			nodeName: node.name ?? node.type,
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
 * Provides the LLM with workflow structure context for consistent data generation.
 */
function workflowToMermaid(workflow: WorkflowJSON): string {
	const lines: string[] = ['flowchart LR'];

	const nodeIdMap = new Map<string, string>();
	workflow.nodes.forEach((node, i) => {
		if (node.name) nodeIdMap.set(node.name, `n${String(i)}`);
	});

	for (const node of workflow.nodes) {
		if (!node.name) continue;
		const id = nodeIdMap.get(node.name);
		if (!id) continue;

		const params = node.parameters as Record<string, unknown> | undefined;
		const resource = typeof params?.resource === 'string' ? params.resource : undefined;
		const operation = typeof params?.operation === 'string' ? params.operation : undefined;

		const shortType = node.type.split('.').pop() ?? node.type;
		let label = `${node.name} (${shortType} v${String(node.typeVersion)}`;
		if (resource) label += `, resource:${resource}`;
		if (operation) label += `, op:${operation}`;
		label += ')';

		lines.push(`  ${id}["${label}"]`);
	}

	const { connections } = workflow;
	for (const [sourceName, nodeConns] of Object.entries(connections)) {
		const sourceId = nodeIdMap.get(sourceName);
		if (!sourceId) continue;

		for (const [, outputConnections] of Object.entries(nodeConns as Record<string, unknown>)) {
			if (!Array.isArray(outputConnections)) continue;

			for (const outputGroup of outputConnections) {
				if (!Array.isArray(outputGroup)) continue;

				for (const conn of outputGroup) {
					if (typeof conn !== 'object' || conn === null || !('node' in conn)) continue;
					const targetId = nodeIdMap.get((conn as { node: string }).node);
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
6. Return ONLY a valid JSON object, no explanation or markdown fencing.
7. CRITICAL: You MUST generate data for EVERY node listed in "Nodes Requiring Mock Data". Never skip a node, even if the test scenario describes an empty or error response. An empty response is still valid data.`;

function buildUserPrompt(
	workflow: WorkflowJSON,
	contexts: NodeSchemaContext[],
	instructions?: PinDataGenerationInstructions,
): string {
	const mermaid = workflowToMermaid(workflow);

	const sections: string[] = ['Generate mock output data for service nodes in this workflow.'];

	if (instructions?.dataDescription) {
		sections.push('');
		sections.push('## Data Generation Instructions');
		sections.push('');
		sections.push(instructions.dataDescription);
	}

	sections.push('');
	sections.push('## Workflow Graph');
	sections.push('');
	sections.push('```mermaid');
	sections.push(mermaid);
	sections.push('```');
	sections.push('');
	sections.push('## Nodes Requiring Mock Data');

	for (const ctx of contexts) {
		sections.push('');
		sections.push(`### ${ctx.nodeName} (${ctx.nodeType} v${String(ctx.typeVersion)})`);
		if (ctx.resource || ctx.operation) {
			const parts: string[] = [];
			if (ctx.resource) parts.push(`Resource: ${ctx.resource}`);
			if (ctx.operation) parts.push(`Operation: ${ctx.operation}`);
			sections.push(`- ${parts.join(' | ')}`);
		}
		if (ctx.schema) {
			const schemaStr = JSON.stringify(ctx.schema, null, 2);
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
 * Parse the LLM response into PinData format.
 * Handles both `{ "json": {...} }` wrapped and unwrapped items.
 */
function parsePinDataResponse(responseText: string, expectedNodes: string[]): PinData {
	let cleaned = responseText.trim();
	if (cleaned.startsWith('```')) {
		cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
	}

	let parsed: Record<string, unknown>;
	try {
		parsed = JSON.parse(cleaned) as Record<string, unknown>;
	} catch {
		return {};
	}

	const pinData: PinData = {};

	for (const nodeName of expectedNodes) {
		const nodeData = parsed[nodeName];
		if (!Array.isArray(nodeData) || nodeData.length === 0) continue;

		pinData[nodeName] = nodeData.map((item: unknown) => {
			// The execution engine expects { json: IDataObject } format.
			// The LLM may return items with or without the json wrapper.
			if (typeof item === 'object' && item !== null && 'json' in item) {
				return item as Record<string, unknown>;
			}
			// Wrap raw objects in { json: ... } for the execution engine
			return { json: item ?? {} };
		});
	}

	return pinData;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Generate pin data for specified nodes in a workflow using an LLM.
 * Produces consistent cross-node mock data in a single LLM call.
 *
 * The caller decides which nodes need pin data (via nodeNames).
 * This function only generates it.
 *
 * @returns PinData map (node name → data items). Returns {} on failure.
 */
export async function generatePinData(options: GeneratePinDataOptions): Promise<PinData> {
	const { workflow, nodeNames, instructions } = options;

	if (nodeNames.length === 0) return {};

	// Resolve target nodes from the workflow
	const targetNodes = workflow.nodes.filter((n) => n.name && nodeNames.includes(n.name));
	if (targetNodes.length === 0) return {};

	// Build schema contexts with optional __schema__ enrichment
	const nodesBasePath = resolveNodesBasePath();
	const contexts = buildSchemaContexts(targetNodes, nodesBasePath);

	// Build prompt and call LLM
	const userPrompt = buildUserPrompt(workflow, contexts, instructions);
	const expectedNodeNames = contexts.map((c) => c.nodeName);

	try {
		const agent = createEvalAgent('eval-pin-data-generator', {
			instructions: SYSTEM_PROMPT,
			cache: true,
		});

		const result = await agent.generate(userPrompt, {
			providerOptions: { anthropic: { maxTokens: 16_384 } },
		});

		const responseText = extractText(result);
		return parsePinDataResponse(responseText, expectedNodeNames);
	} catch {
		return {};
	}
}
