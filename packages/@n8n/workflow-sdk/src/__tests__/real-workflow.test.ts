import * as fs from 'fs';
import * as path from 'path';
import { workflow } from '../workflow-builder';
import { generateWorkflowCode } from '../codegen';
import type { WorkflowJSON } from '../types/base';
import {
	ensureFixtures,
	FixtureDownloadError,
	DOWNLOADED_FIXTURES_DIR,
	COMMITTED_FIXTURES_DIR,
} from './fixtures-download';

/**
 * Writes a .generated.ts file next to the original JSON fixture.
 * These files are gitignored and provide a TypeScript SDK representation
 * of each workflow for inspection/debugging.
 */
function writeGeneratedTsFile(id: string, json: WorkflowJSON): void {
	try {
		const code = generateWorkflowCode(json);
		const generatedPath = path.join(DOWNLOADED_FIXTURES_DIR, `${id}.generated.ts`);
		fs.writeFileSync(generatedPath, code, 'utf-8');
	} catch (error) {
		// Don't fail the test if code generation fails - just log it
		console.warn(`Failed to generate TS for workflow ${id}:`, error);
	}
}

interface TestWorkflow {
	id: string;
	name: string;
	json: WorkflowJSON;
	nodeCount: number;
}

function loadWorkflowsFromDir(dir: string, workflows: TestWorkflow[]): void {
	const manifestPath = path.join(dir, 'manifest.json');
	if (!fs.existsSync(manifestPath)) {
		return;
	}

	const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

	for (const entry of manifest.workflows) {
		if (!entry.success) continue;

		const filePath = path.join(dir, `${entry.id}.json`);
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
}

function loadTestWorkflows(): TestWorkflow[] {
	const workflows: TestWorkflow[] = [];

	// Load committed workflows first (always available)
	loadWorkflowsFromDir(COMMITTED_FIXTURES_DIR, workflows);

	// Load downloaded workflows
	loadWorkflowsFromDir(DOWNLOADED_FIXTURES_DIR, workflows);

	if (workflows.length === 0) {
		throw new Error('No test workflows loaded. Check that fixtures were downloaded correctly.');
	}

	return workflows;
}

describe('Real Workflow Round-Trip', () => {
	let workflows: TestWorkflow[] = [];

	beforeAll(async () => {
		// Download fixtures if they don't exist - fails test if API is unreachable
		try {
			await ensureFixtures();
		} catch (error) {
			if (error instanceof FixtureDownloadError) {
				throw new Error(
					`Failed to download test fixtures from n8n.io API: ${error.message}. ` +
						`Check your network connection and ensure the API is accessible.`,
				);
			}
			throw error;
		}

		// Load workflows after fixtures are available
		workflows = loadTestWorkflows();
	}, 120000); // 2 minute timeout for downloading fixtures

	describe('fromJSON().toJSON() round-trip', () => {
		it('should round-trip all workflows', () => {
			expect(workflows.length).toBeGreaterThan(0);

			for (const { id, name, json, nodeCount } of workflows) {
				// Import the workflow
				const wf = workflow.fromJSON(json);

				// Export back to JSON
				const exported = wf.toJSON();

				// Generate TypeScript SDK representation (gitignored)
				writeGeneratedTsFile(id, json);

				// Verify node count matches
				expect(exported.nodes.length).toBe(json.nodes.length);

				// Check for duplicate IDs (data quality issue in some workflows)
				const idCounts = new Map<string, number>();
				for (const node of json.nodes) {
					idCounts.set(node.id, (idCounts.get(node.id) || 0) + 1);
				}
				const hasDuplicateIds = [...idCounts.values()].some((count) => count > 1);

				// Verify all original nodes are present
				for (const originalNode of json.nodes) {
					// If IDs are duplicated (e.g., all empty string), use name for matching
					const exportedNode = hasDuplicateIds
						? exported.nodes.find((n) => n.name === originalNode.name)
						: exported.nodes.find((n) => n.id === originalNode.id);
					expect(exportedNode).toBeDefined();

					if (exportedNode) {
						// Verify node type
						expect(exportedNode.type).toBe(originalNode.type);

						// Verify node name
						expect(exportedNode.name).toBe(originalNode.name);

						// Verify position
						expect(exportedNode.position).toEqual(originalNode.position);

						// Verify type version
						expect(exportedNode.typeVersion).toBe(originalNode.typeVersion);

						// Verify parameters are preserved
						expect(exportedNode.parameters).toEqual(originalNode.parameters);

						// Verify credentials are preserved (if any)
						if (originalNode.credentials) {
							expect(exportedNode.credentials).toEqual(originalNode.credentials);
						}
					}
				}

				// Verify connection structure is preserved
				// Filter out empty connections (nodes with empty arrays) for comparison
				// as these are semantically equivalent to having no connections
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

				const filteredOriginal = filterEmptyConnections(json.connections);
				const filteredExported = filterEmptyConnections(exported.connections);

				// Check for connection keys that don't match any node name (data quality issue)
				// This can happen due to encoding mismatches in original workflow files
				const nodeNames = new Set(json.nodes.map((n) => n.name));
				const orphanedConnectionKeys = Object.keys(json.connections).filter(
					(key) => !nodeNames.has(key),
				);

				// Only verify connections if all connection keys match node names
				if (orphanedConnectionKeys.length === 0) {
					const originalConnectionKeys = Object.keys(filteredOriginal);
					const exportedConnectionKeys = Object.keys(filteredExported);
					expect(exportedConnectionKeys.sort()).toEqual(originalConnectionKeys.sort());

					// Verify each connection (only non-empty ones)
					for (const nodeName of originalConnectionKeys) {
						const originalConns = filteredOriginal[nodeName];
						const exportedConns = filteredExported[nodeName];
						expect(exportedConns).toEqual(originalConns);
					}
				}
			}
		});
	});

	describe('node retrieval', () => {
		it('should retrieve all nodes by name in all workflows', () => {
			expect(workflows.length).toBeGreaterThan(0);

			for (const { id, name, json } of workflows) {
				const wf = workflow.fromJSON(json);

				for (const node of json.nodes) {
					const retrieved = wf.getNode(node.name);
					expect(retrieved).toBeDefined();
					if (retrieved) {
						expect(retrieved.config.name).toBe(node.name);
					}
				}
			}
		});
	});

	describe('settings preservation', () => {
		it('should preserve settings in all workflows', () => {
			for (const { id, name, json } of workflows) {
				if (!json.settings) continue;

				const wf = workflow.fromJSON(json);
				const exported = wf.toJSON();

				expect(exported.settings).toEqual(json.settings);
			}
		});
	});

	describe('pinData preservation', () => {
		it('should preserve pinData in all workflows', () => {
			for (const { id, name, json } of workflows) {
				if (!json.pinData || Object.keys(json.pinData).length === 0) continue;

				const wf = workflow.fromJSON(json);
				const exported = wf.toJSON();

				expect(exported.pinData).toEqual(json.pinData);
			}
		});
	});
});

describe('Real Workflow Patterns', () => {
	let workflows: TestWorkflow[] = [];

	beforeAll(async () => {
		await ensureFixtures();
		workflows = loadTestWorkflows();
	}, 120000);

	it('should handle AI agent workflows with subnodes', () => {
		expect(workflows.length).toBeGreaterThan(0);
		// Find AI agent workflow (1954)
		const aiWorkflow = workflows.find((w) => w.id === '1954');
		if (!aiWorkflow) {
			console.warn('AI agent workflow (1954) not found in fixtures');
			return;
		}

		const wf = workflow.fromJSON(aiWorkflow.json);
		const exported = wf.toJSON();

		// Verify AI-specific connection types are preserved
		const connectionTypes = new Set<string>();
		for (const nodeConnections of Object.values(exported.connections)) {
			for (const connType of Object.keys(nodeConnections)) {
				connectionTypes.add(connType);
			}
		}

		// AI workflows have special connection types
		expect(connectionTypes.has('main') || connectionTypes.size > 0).toBe(true);

		// Check for AI connection types if present
		const hasAiConnections =
			connectionTypes.has('ai_tool') ||
			connectionTypes.has('ai_memory') ||
			connectionTypes.has('ai_languageModel');

		if (aiWorkflow.json.connections) {
			const originalTypes = new Set<string>();
			for (const nodeConnections of Object.values(aiWorkflow.json.connections)) {
				for (const connType of Object.keys(nodeConnections as object)) {
					originalTypes.add(connType);
				}
			}

			// If original had AI connections, verify they're preserved
			if (
				originalTypes.has('ai_tool') ||
				originalTypes.has('ai_memory') ||
				originalTypes.has('ai_languageModel')
			) {
				expect(hasAiConnections).toBe(true);
			}
		}
	});

	it('should handle multi-node workflows', () => {
		// Find a workflow with many nodes
		const complexWorkflow = workflows.find((w) => w.nodeCount >= 10);
		if (!complexWorkflow) {
			console.warn('No complex workflow (10+ nodes) found in fixtures');
			return;
		}

		const wf = workflow.fromJSON(complexWorkflow.json);
		const exported = wf.toJSON();

		expect(exported.nodes.length).toBe(complexWorkflow.nodeCount);
	});

	it('should handle workflows with credentials', () => {
		// Find any workflow with credentials
		const workflowWithCreds = workflows.find((w) =>
			w.json.nodes.some((n) => n.credentials && Object.keys(n.credentials).length > 0),
		);

		if (!workflowWithCreds) {
			console.warn('No workflow with credentials found in fixtures');
			return;
		}

		const wf = workflow.fromJSON(workflowWithCreds.json);
		const exported = wf.toJSON();

		// Verify credentials are preserved
		for (const originalNode of workflowWithCreds.json.nodes) {
			if (originalNode.credentials && Object.keys(originalNode.credentials).length > 0) {
				const exportedNode = exported.nodes.find((n) => n.id === originalNode.id);
				expect(exportedNode?.credentials).toEqual(originalNode.credentials);
			}
		}
	});
});

describe('Expression Preservation', () => {
	let workflows: TestWorkflow[] = [];

	beforeAll(async () => {
		await ensureFixtures();
		workflows = loadTestWorkflows();
	}, 120000);

	function extractExpressions(json: WorkflowJSON): string[] {
		const expressions: string[] = [];

		function findExpressions(obj: unknown): void {
			if (typeof obj === 'string' && obj.startsWith('={{')) {
				expressions.push(obj);
			} else if (Array.isArray(obj)) {
				obj.forEach(findExpressions);
			} else if (obj && typeof obj === 'object') {
				Object.values(obj).forEach(findExpressions);
			}
		}

		for (const node of json.nodes) {
			findExpressions(node.parameters);
		}

		return expressions.sort();
	}

	it('should preserve all expressions in round-trip', () => {
		expect(workflows.length).toBeGreaterThan(0);

		for (const { id, json } of workflows) {
			const originalExpressions = extractExpressions(json);
			if (originalExpressions.length === 0) continue;

			const wf = workflow.fromJSON(json);
			const exported = wf.toJSON();
			const exportedExpressions = extractExpressions(exported);

			expect(exportedExpressions).toEqual(originalExpressions);
		}
	});
});
