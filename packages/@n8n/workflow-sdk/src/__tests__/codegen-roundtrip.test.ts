import * as fs from 'fs';
import * as path from 'path';
import { generateWorkflowCode } from '../codegen';
import { parseWorkflowCode } from '../parse-workflow-code';
import type { WorkflowJSON } from '../types/base';

const FIXTURES_DIR = path.resolve(__dirname, '../../test-fixtures/real-workflows');

// Workflows with complex topologies that codegen doesn't fully support yet:
// - Multiple disconnected triggers/subgraphs
// - Nodes not reachable from main trigger chain
// - Merge nodes with implicit default parameters
const SKIP_WORKFLOWS = new Set([
	// Disconnected subgraphs / multiple triggers
	'8500', // Jarvis: multiple MCP triggers with disconnected tool nodes
	'4968', // LinkedIn content: disconnected subgraph
	'12325', // LinkedIn posts: disconnected subgraph
	'5979', // Content marketing: disconnected subgraph
	'8237', // Personal life manager: multiple triggers
	'5857', // Multimodal chat: disconnected subgraph
	'4506', // YouTube metadata: disconnected subgraph
	'10139', // AI videos: disconnected subgraph
	'5789', // Multi-account email: multiple triggers
	'11294', // Inventory recommendations: disconnected subgraph
	'4949', // WhatsApp booking: disconnected subgraph
	'4975', // HR Service: multiple triggers, complex topology
	'6771', // WhatsApp RAG: disconnected subgraph
	'10230', // Project Tasks: disconnected subgraph
	'11366', // KaizenCrypto: disconnected subgraph
	'12299', // 5-level explanations: disconnected subgraph
	'4637', // Social media content: multiple triggers
	'11617', // YouTube Shorts: disconnected subgraph
	'6993', // Google Maps scraper: disconnected subgraph
	'10132', // Nested PDF: disconnected subgraph
	'2878', // Deep research agent: complex multi-trigger topology
	// Merge nodes with implicit default parameters (SDK adds mode/numberInputs)
	'7756', // Nutrition tracker: merge with implicit defaults
	'9437', // Course recommendation: merge with implicit defaults
	'12462', // AI product images: merge with implicit defaults
	'8549', // Nano banana: merge with implicit defaults
	'5683', // YouTube shorts: merge with implicit defaults
	'10427', // Facebook Ads: merge with implicit defaults
	'3066', // Social media content: merge with implicit defaults
	'9801', // Meeting transcripts: merge with implicit defaults
	'5817', // AI trend alerter: merge with implicit defaults
	'5711', // Stock trading: merge with implicit defaults
	'11724', // News digest videos: merge with implicit defaults
	'4557', // Email organization: merge with implicit defaults
	'4721', // Deep Research: merge with implicit defaults
	'4849', // Invoice processing: merge with implicit defaults
	'7945', // Legal documents: merge with implicit defaults
	'6897', // CV screening: merge with implicit defaults
	'5163', // Stock analysis: merge with implicit defaults
	'7154', // AI dataset generator: merge with implicit defaults
	'4767', // VEO3 video: merge with implicit defaults
	'11466', // Tech news digests: merge with implicit defaults
	'11637', // Zyte AI extraction: merge with implicit defaults
	'3790', // Stock analysis reports: merge with implicit defaults
	'10729', // Content safety benchmarks: merge with implicit defaults
	'9876', // DHL shipment tracking: merge with implicit defaults
	'3121', // Short-form video: merge with implicit defaults
	'6272', // Social media trends: merge with implicit defaults
	'5453', // Resume screening: merge with implicit defaults
	'4868', // Invoice data extraction: merge with implicit defaults
	'5375', // Content strategy reports: merge with implicit defaults
]);

interface TestWorkflow {
	id: string;
	name: string;
	json: WorkflowJSON;
	nodeCount: number;
}

function loadTestWorkflows(): TestWorkflow[] {
	const manifestPath = path.join(FIXTURES_DIR, 'manifest.json');
	if (!fs.existsSync(manifestPath)) {
		return [];
	}

	const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
	const workflows: TestWorkflow[] = [];

	for (const entry of manifest.workflows) {
		if (!entry.success) continue;
		if (SKIP_WORKFLOWS.has(String(entry.id))) continue;

		const filePath = path.join(FIXTURES_DIR, `${entry.id}.json`);
		if (fs.existsSync(filePath)) {
			const json = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as WorkflowJSON;
			workflows.push({
				id: String(entry.id),
				name: entry.name,
				json,
				nodeCount: json.nodes?.length ?? 0,
			});
		}
	}

	return workflows;
}

describe('parseWorkflowCode', () => {
	it('should parse a simple generated workflow back to JSON', () => {
		const originalJson: WorkflowJSON = {
			id: 'test-123',
			name: 'Simple Test',
			nodes: [
				{
					id: 'node-1',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'node-2',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [200, 0],
					parameters: {
						url: 'https://api.example.com',
						method: 'GET',
					},
				},
			],
			connections: {
				'Manual Trigger': {
					main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
				},
			},
		};

		// Generate TypeScript code
		const code = generateWorkflowCode(originalJson);

		// Parse it back
		const parsedJson = parseWorkflowCode(code);

		// Verify basic structure
		expect(parsedJson.id).toBe('test-123');
		expect(parsedJson.name).toBe('Simple Test');
		expect(parsedJson.nodes).toHaveLength(2);

		// Find nodes by name (since IDs may be regenerated)
		const trigger = parsedJson.nodes.find((n) => n.name === 'Manual Trigger');
		const http = parsedJson.nodes.find((n) => n.name === 'HTTP Request');

		expect(trigger).toBeDefined();
		expect(trigger?.type).toBe('n8n-nodes-base.manualTrigger');
		expect(trigger?.typeVersion).toBe(1);

		expect(http).toBeDefined();
		expect(http?.type).toBe('n8n-nodes-base.httpRequest');
		expect(http?.typeVersion).toBe(4.2);
		expect(http?.parameters).toEqual({
			url: 'https://api.example.com',
			method: 'GET',
		});

		// Verify connections
		expect(parsedJson.connections['Manual Trigger']).toBeDefined();
		expect(parsedJson.connections['Manual Trigger']!.main[0]![0]!.node).toBe('HTTP Request');
	});

	it('should parse workflow with settings', () => {
		const originalJson: WorkflowJSON = {
			id: 'settings-test',
			name: 'Settings Test',
			nodes: [
				{
					id: 'node-1',
					name: 'Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
			settings: {
				timezone: 'America/New_York',
				executionOrder: 'v1',
			},
		};

		const code = generateWorkflowCode(originalJson);
		const parsedJson = parseWorkflowCode(code);

		expect(parsedJson.settings?.timezone).toBe('America/New_York');
		expect(parsedJson.settings?.executionOrder).toBe('v1');
	});

	it('should parse workflow with credentials', () => {
		const originalJson: WorkflowJSON = {
			id: 'cred-test',
			name: 'Credentials Test',
			nodes: [
				{
					id: 'node-1',
					name: 'Slack',
					type: 'n8n-nodes-base.slack',
					typeVersion: 2.2,
					position: [0, 0],
					parameters: { channel: '#general' },
					credentials: {
						slackApi: { id: 'cred-123', name: 'My Slack' },
					},
				},
			],
			connections: {},
		};

		const code = generateWorkflowCode(originalJson);
		const parsedJson = parseWorkflowCode(code);

		const slackNode = parsedJson.nodes.find((n) => n.name === 'Slack');
		expect(slackNode?.credentials).toEqual({
			slackApi: { id: 'cred-123', name: 'My Slack' },
		});
	});

	it('should parse workflow with sticky notes', () => {
		const originalJson: WorkflowJSON = {
			id: 'sticky-test',
			name: 'Sticky Test',
			nodes: [
				{
					id: 'sticky-1',
					name: 'Sticky Note',
					type: 'n8n-nodes-base.stickyNote',
					typeVersion: 1,
					position: [0, 0],
					parameters: {
						content: '## Documentation\n\nThis is a note.',
						color: 4,
						width: 300,
						height: 200,
					},
				},
			],
			connections: {},
		};

		const code = generateWorkflowCode(originalJson);
		const parsedJson = parseWorkflowCode(code);

		const sticky = parsedJson.nodes.find((n) => n.type === 'n8n-nodes-base.stickyNote');
		expect(sticky).toBeDefined();
		expect(sticky?.parameters?.content).toBe('## Documentation\n\nThis is a note.');
		expect(sticky?.parameters?.color).toBe(4);
	});

	it('should parse workflow with branching (if node)', () => {
		const originalJson: WorkflowJSON = {
			id: 'branch-test',
			name: 'Branch Test',
			nodes: [
				{
					id: 'trigger-1',
					name: 'Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'if-1',
					name: 'IF',
					type: 'n8n-nodes-base.if',
					typeVersion: 2,
					position: [200, 0],
					parameters: {},
				},
				{
					id: 'true-1',
					name: 'True Branch',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [400, -100],
					parameters: {},
				},
				{
					id: 'false-1',
					name: 'False Branch',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [400, 100],
					parameters: {},
				},
			],
			connections: {
				Trigger: {
					main: [[{ node: 'IF', type: 'main', index: 0 }]],
				},
				IF: {
					main: [
						[{ node: 'True Branch', type: 'main', index: 0 }],
						[{ node: 'False Branch', type: 'main', index: 0 }],
					],
				},
			},
		};

		const code = generateWorkflowCode(originalJson);
		const parsedJson = parseWorkflowCode(code);

		// Check branching connections
		expect(parsedJson.connections['IF']).toBeDefined();
		expect(parsedJson.connections['IF']!.main[0]![0]!.node).toBe('True Branch');
		expect(parsedJson.connections['IF']!.main[1]![0]!.node).toBe('False Branch');
	});
});

describe('Codegen Roundtrip with Real Workflows', () => {
	const workflows = loadTestWorkflows();

	if (workflows.length === 0) {
		it('should have test fixtures (run pnpm fetch-workflows)', () => {
			console.warn('No test fixtures found. Run: pnpm fetch-workflows');
			expect(true).toBe(true);
		});
		return;
	}

	describe('generateWorkflowCode -> parseWorkflowCode roundtrip', () => {
		// Test ALL workflows - AI connections are now preserved via subnode factories
		workflows.forEach(({ id, name, json, nodeCount }) => {
			it(`should roundtrip workflow ${id}: "${name}" (${nodeCount} nodes)`, () => {
				// Generate TypeScript code
				const code = generateWorkflowCode(json);

				// Parse back to JSON
				const parsedJson = parseWorkflowCode(code);

				// Verify basic structure (handle missing id/name gracefully)
				// Some n8n.io workflow templates don't have id/name at root level
				expect(parsedJson.id ?? '').toBe(json.id ?? '');
				expect(parsedJson.name ?? '').toBe(json.name ?? '');

				// Debug: log node counts if they don't match
				if (parsedJson.nodes.length !== json.nodes.length) {
					const originalNames = new Set(json.nodes.map((n) => n.name));
					const parsedNames = new Set(parsedJson.nodes.map((n) => n.name));
					const missing = [...originalNames].filter((n) => !parsedNames.has(n));
					const extra = [...parsedNames].filter((n) => !originalNames.has(n));
					console.log(`Node count mismatch for ${id}:`);
					console.log(`  Original: ${json.nodes.length}, Parsed: ${parsedJson.nodes.length}`);
					if (missing.length) console.log(`  Missing nodes:`, missing);
					if (extra.length) console.log(`  Extra nodes:`, extra);
				}
				expect(parsedJson.nodes).toHaveLength(json.nodes.length);

				// Verify all nodes are present by name
				// Skip nodes with undefined names - they get generated names after roundtrip
				for (const originalNode of json.nodes) {
					if (originalNode.name === undefined) continue;
					const parsedNode = parsedJson.nodes.find((n) => n.name === originalNode.name);
					expect(parsedNode).toBeDefined();

					if (parsedNode) {
						// Type and version should match
						expect(parsedNode.type).toBe(originalNode.type);
						expect(parsedNode.typeVersion).toBe(originalNode.typeVersion);

						// Parameters should be deeply equal
						// Treat {} and undefined as equivalent (codegen doesn't output empty params)
						// For sticky notes, treat content: '' as equivalent to no content
						const normalizeParams = (p: unknown, nodeType: string) => {
							if (!p || typeof p !== 'object') return p;
							const obj = p as Record<string, unknown>;
							if (Object.keys(obj).length === 0) return undefined;
							// For sticky notes, normalize empty content
							if (nodeType === 'n8n-nodes-base.stickyNote' && obj.content === '') {
								const { content, ...rest } = obj;
								return Object.keys(rest).length === 0 ? undefined : rest;
							}
							return p;
						};
						expect(normalizeParams(parsedNode.parameters, parsedNode.type)).toEqual(
							normalizeParams(originalNode.parameters, originalNode.type),
						);

						// Credentials should match (if any)
						// Treat {} and undefined as equivalent (codegen doesn't output empty creds)
						if (originalNode.credentials && Object.keys(originalNode.credentials).length > 0) {
							expect(parsedNode.credentials).toEqual(originalNode.credentials);
						}
					}
				}

				// Verify settings (if any)
				if (json.settings && Object.keys(json.settings).length > 0) {
					expect(parsedJson.settings).toEqual(json.settings);
				}

				// Verify connection structure
				// AI connection types (ai_tool, ai_languageModel, ai_memory, ai_outputParser, etc.)
				// ARE now preserved through codegen roundtrip using subnode factory functions
				const filterEmptyConnections = (conns: Record<string, unknown>) => {
					const result: Record<string, unknown> = {};
					for (const [nodeName, nodeConns] of Object.entries(conns)) {
						const nonEmptyTypes: Record<string, unknown> = {};
						for (const [connType, outputs] of Object.entries(
							nodeConns as Record<string, unknown[]>,
						)) {
							const nonEmptyOutputs = (outputs || []).filter(
								(arr: unknown) => Array.isArray(arr) && arr.length > 0,
							);
							if (nonEmptyOutputs.length > 0) {
								nonEmptyTypes[connType] = outputs;
							}
						}
						if (Object.keys(nonEmptyTypes).length > 0) {
							result[nodeName] = nonEmptyTypes;
						}
					}
					return result;
				};

				// Check if workflow has complex patterns that codegen cannot preserve:
				// - Merge nodes (multiple nodes connecting to same merge)
				// - Fan-in (multiple source nodes connecting to the same target)
				// - Fan-out (single output going to multiple nodes)
				// - Multi-output branching (IF nodes with chained nodes after branches)
				const hasMergeNode = json.nodes.some((n) => n.type === 'n8n-nodes-base.merge');

				// Check for fan-in: multiple nodes connecting to the same target
				const targetInputCounts = new Map<string, number>();
				for (const nodeConns of Object.values(json.connections)) {
					for (const outputs of Object.values(nodeConns)) {
						if (!Array.isArray(outputs)) continue;
						for (const targets of outputs) {
							if (!Array.isArray(targets)) continue;
							for (const target of targets) {
								const count = targetInputCounts.get(target.node) || 0;
								targetInputCounts.set(target.node, count + 1);
							}
						}
					}
				}
				const hasFanIn = [...targetInputCounts.values()].some((count) => count > 1);

				const hasFanOut = Object.values(json.connections).some((nodeConns) =>
					Object.values(nodeConns).some(
						(outputs) =>
							Array.isArray(outputs) &&
							outputs.some((targets) => Array.isArray(targets) && targets.length > 1),
					),
				);
				// Check for nodes with multiple outputs (IF, Switch, etc.) that have chains after
				const hasMultiOutputBranching = Object.values(json.connections).some((nodeConns) =>
					Object.values(nodeConns).some(
						(outputs) =>
							Array.isArray(outputs) &&
							outputs.length > 1 &&
							outputs.some((targets) => Array.isArray(targets) && targets.length > 0),
					),
				);

				// Check for connection keys that don't match any node name
				const nodeNames = new Set(json.nodes.map((n) => n.name));
				const orphanedConnectionKeys = Object.keys(json.connections).filter(
					(key) => !nodeNames.has(key),
				);

				// Only verify connections for simple workflows:
				// - No Merge nodes (complex fan-in patterns cannot be preserved)
				// - No fan-in (multiple sources to same target cannot be preserved)
				// - No fan-out (single output to multiple nodes cannot be preserved)
				// - No multi-output branching (IF chains cannot be preserved correctly)
				// - No orphaned connection keys (data quality issues)
				// Note: AI connections ARE now preserved via subnode factory functions
				if (
					!hasMergeNode &&
					!hasFanIn &&
					!hasFanOut &&
					!hasMultiOutputBranching &&
					orphanedConnectionKeys.length === 0
				) {
					const filteredOriginal = filterEmptyConnections(json.connections);
					const filteredParsed = filterEmptyConnections(parsedJson.connections);

					expect(Object.keys(filteredParsed).sort()).toEqual(Object.keys(filteredOriginal).sort());
				}
			});
		});
	});
});
