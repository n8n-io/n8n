'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.generatePinData = generatePinData;
const fs_1 = require('fs');
const path_1 = require('path');
const eval_agents_1 = require('../../src/utils/eval-agents');
let _resolvedNodesBasePath;
function resolveNodesBasePath() {
	if (_resolvedNodesBasePath !== undefined) {
		return _resolvedNodesBasePath ?? undefined;
	}
	let dir = __dirname;
	for (let i = 0; i < 10; i++) {
		const candidate = (0, path_1.join)(dir, 'packages', 'nodes-base', 'nodes');
		if ((0, fs_1.existsSync)(candidate)) {
			_resolvedNodesBasePath = candidate;
			return candidate;
		}
		const parent = (0, path_1.join)(dir, '..');
		if (parent === dir) break;
		dir = parent;
	}
	_resolvedNodesBasePath = null;
	return undefined;
}
const schemaMapCache = new Map();
function buildSchemaMap(nodesBasePath) {
	const cached = schemaMapCache.get(nodesBasePath);
	if (cached) return cached;
	const result = new Map();
	function scanDir(dir) {
		try {
			for (const entry of (0, fs_1.readdirSync)(dir, { withFileTypes: true })) {
				if (!entry.isDirectory()) continue;
				const entryPath = (0, path_1.join)(dir, entry.name);
				const schemaDir = (0, path_1.join)(entryPath, '__schema__');
				if ((0, fs_1.existsSync)(schemaDir)) {
					const nodeFiles = (0, fs_1.readdirSync)(entryPath).filter(
						(f) => f.endsWith('.node.ts') || f.endsWith('.node.js'),
					);
					for (const nodeFile of nodeFiles) {
						try {
							const content = (0, fs_1.readFileSync)(
								(0, path_1.join)(entryPath, nodeFile),
								'utf-8',
							);
							const nameMatch = content.match(/name:\s*['"]([^'"]+)['"]/);
							if (nameMatch) {
								result.set(`n8n-nodes-base.${nameMatch[1]}`, entryPath);
							}
						} catch {}
					}
				}
				scanDir(entryPath);
			}
		} catch {}
	}
	scanDir(nodesBasePath);
	schemaMapCache.set(nodesBasePath, result);
	return result;
}
function normalizeVersion(version) {
	const str = String(version);
	const parts = str.split('.');
	while (parts.length < 3) parts.push('0');
	return parts.join('.');
}
function resolveSchemaForNode(nodeType, typeVersion, resource, operation, nodesBasePath) {
	const schemaMap = buildSchemaMap(nodesBasePath);
	const nodeDir = schemaMap.get(nodeType);
	if (!nodeDir) return undefined;
	const schemaBaseDir = (0, path_1.join)(nodeDir, '__schema__');
	if (!(0, fs_1.existsSync)(schemaBaseDir)) return undefined;
	const versionStr = normalizeVersion(typeVersion);
	const versionDirs = [
		`v${versionStr}`,
		...(0, fs_1.readdirSync)(schemaBaseDir)
			.filter((d) => d.startsWith('v'))
			.sort()
			.reverse(),
	];
	for (const vDir of [...new Set(versionDirs)]) {
		const versionPath = (0, path_1.join)(schemaBaseDir, vDir);
		if (!(0, fs_1.existsSync)(versionPath)) continue;
		const parts = [versionPath, resource, operation ? `${operation}.json` : undefined].filter(
			Boolean,
		);
		const schemaFile = (0, path_1.join)(...parts);
		if ((0, fs_1.existsSync)(schemaFile)) {
			try {
				return JSON.parse((0, fs_1.readFileSync)(schemaFile, 'utf-8'));
			} catch {
				return undefined;
			}
		}
	}
	return undefined;
}
function buildSchemaContexts(nodes, nodesBasePath) {
	return nodes.map((node) => {
		const params = node.parameters;
		const resource = typeof params?.resource === 'string' ? params.resource : undefined;
		const operation = typeof params?.operation === 'string' ? params.operation : undefined;
		let schema;
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
function workflowToMermaid(workflow) {
	const lines = ['flowchart LR'];
	const nodeIdMap = new Map();
	workflow.nodes.forEach((node, i) => {
		if (node.name) nodeIdMap.set(node.name, `n${String(i)}`);
	});
	for (const node of workflow.nodes) {
		if (!node.name) continue;
		const id = nodeIdMap.get(node.name);
		if (!id) continue;
		const params = node.parameters;
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
		for (const [, outputConnections] of Object.entries(nodeConns)) {
			if (!Array.isArray(outputConnections)) continue;
			for (const outputGroup of outputConnections) {
				if (!Array.isArray(outputGroup)) continue;
				for (const conn of outputGroup) {
					if (typeof conn !== 'object' || conn === null || !('node' in conn)) continue;
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
const SYSTEM_PROMPT = `You are a test data generator for n8n workflow automation. Generate realistic mock API response data for service nodes in a workflow.

RULES:
1. Data must be consistent across nodes. If node A creates an entity with id "abc-123", downstream nodes referencing that entity must use "abc-123".
2. Generate 1-2 items per node.
3. When a JSON Schema is provided, follow its structure exactly.
4. When no schema is provided, generate a realistic response based on the node type, resource, and operation.
5. Use realistic but clearly fake values (e.g., "jane@example.com", "proj_abc123", "2024-01-15T10:30:00Z").
6. Return ONLY a valid JSON object, no explanation or markdown fencing.
7. CRITICAL: You MUST generate data for EVERY node listed in "Nodes Requiring Mock Data". Never skip a node, even if the test scenario describes an empty or error response. An empty response is still valid data.`;
function buildUserPrompt(workflow, contexts, instructions) {
	const mermaid = workflowToMermaid(workflow);
	const sections = ['Generate mock output data for service nodes in this workflow.'];
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
			const parts = [];
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
function parsePinDataResponse(responseText, expectedNodes) {
	let cleaned = responseText.trim();
	if (cleaned.startsWith('```')) {
		cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
	}
	let parsed;
	try {
		parsed = JSON.parse(cleaned);
	} catch {
		return {};
	}
	const pinData = {};
	for (const nodeName of expectedNodes) {
		const nodeData = parsed[nodeName];
		if (!Array.isArray(nodeData) || nodeData.length === 0) continue;
		pinData[nodeName] = nodeData.map((item) => {
			if (typeof item === 'object' && item !== null && 'json' in item) {
				return item;
			}
			return { json: item ?? {} };
		});
	}
	return pinData;
}
async function generatePinData(options) {
	const { workflow, nodeNames, instructions } = options;
	if (nodeNames.length === 0) return {};
	const targetNodes = workflow.nodes.filter((n) => n.name && nodeNames.includes(n.name));
	if (targetNodes.length === 0) return {};
	const nodesBasePath = resolveNodesBasePath();
	const contexts = buildSchemaContexts(targetNodes, nodesBasePath);
	const userPrompt = buildUserPrompt(workflow, contexts, instructions);
	const expectedNodeNames = contexts.map((c) => c.nodeName);
	try {
		const agent = (0, eval_agents_1.createEvalAgent)('eval-pin-data-generator', {
			instructions: SYSTEM_PROMPT,
			cache: true,
		});
		const result = await agent.generate(userPrompt, {
			providerOptions: { anthropic: { maxTokens: 16_384 } },
		});
		const responseText = (0, eval_agents_1.extractText)(result);
		return parsePinDataResponse(responseText, expectedNodeNames);
	} catch {
		return {};
	}
}
//# sourceMappingURL=pin-data-generator.js.map
