import * as fs from 'fs';
import * as path from 'path';

import {
	ensureFixtures,
	FixtureDownloadError,
	DOWNLOADED_FIXTURES_DIR,
	COMMITTED_FIXTURES_DIR,
} from './__tests__/fixtures-download';
import { generateWorkflowCode } from './codegen';
import type { WorkflowJSON } from './types/base';
import { workflow } from './workflow-builder';

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
	} catch {
		// Don't fail the test if code generation fails
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

	// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse -- Manifest is controlled fixture file
	const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as {
		workflows: Array<{ id: string | number; name: string; success: boolean }>;
	};

	for (const entry of manifest.workflows) {
		if (!entry.success) continue;

		const filePath = path.join(dir, `${entry.id}.json`);
		if (fs.existsSync(filePath)) {
			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse -- Test fixture file
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

	return workflows;
}

// Load workflows at file parse time for individual test generation
const workflows = loadTestWorkflows();

describe('Real Workflow Round-Trip', () => {
	// Download fixtures if needed
	beforeAll(() => {
		try {
			ensureFixtures();
		} catch (error) {
			if (error instanceof FixtureDownloadError) {
				throw new Error(
					`Failed to download test fixtures from n8n.io API: ${error.message}. ` +
						'Check your network connection and ensure the API is accessible.',
				);
			}
			throw error;
		}
	});

	if (workflows.length === 0) {
		it('should have fixtures available (run tests again after download)', () => {
			expect(workflows.length).toBeGreaterThan(0);
		});
	} else {
		// Helper function for filtering empty connections
		const filterEmptyConnections = (conns: Record<string, unknown>) => {
			const result: Record<string, unknown> = {};
			for (const [nodeName, nodeConns] of Object.entries(conns)) {
				const nonEmptyTypes: Record<string, unknown> = {};
				for (const [connType, outputs] of Object.entries(nodeConns as Record<string, unknown[]>)) {
					const nonEmptyOutputs = (outputs ?? []).filter(
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

		describe('fromJSON().toJSON() round-trip', () => {
			workflows.forEach(({ id, name, json, nodeCount }) => {
				it(`should round-trip workflow ${id}: "${name}" (${nodeCount} nodes)`, () => {
					const wf = workflow.fromJSON(json);
					const exported = wf.toJSON();

					writeGeneratedTsFile(id, json);

					expect(exported.nodes.length).toBe(json.nodes.length);

					const idCounts = new Map<string, number>();
					for (const node of json.nodes) {
						idCounts.set(node.id, (idCounts.get(node.id) ?? 0) + 1);
					}
					const hasDuplicateIds = [...idCounts.values()].some((count) => count > 1);

					for (const originalNode of json.nodes) {
						const exportedNode = hasDuplicateIds
							? exported.nodes.find((n) => n.name === originalNode.name)
							: exported.nodes.find((n) => n.id === originalNode.id);
						expect(exportedNode).toBeDefined();

						if (exportedNode) {
							expect(exportedNode.type).toBe(originalNode.type);
							expect(exportedNode.name).toBe(originalNode.name);
							expect(exportedNode.position).toEqual(originalNode.position);
							expect(exportedNode.typeVersion).toBe(originalNode.typeVersion);
							expect(exportedNode.parameters).toEqual(originalNode.parameters);

							if (originalNode.credentials) {
								expect(exportedNode.credentials).toEqual(originalNode.credentials);
							}
						}
					}

					const filteredOriginal = filterEmptyConnections(json.connections);
					const filteredExported = filterEmptyConnections(exported.connections);

					const nodeNames = new Set(json.nodes.map((n) => n.name));
					const orphanedConnectionKeys = Object.keys(json.connections).filter(
						(key) => !nodeNames.has(key),
					);

					if (orphanedConnectionKeys.length === 0) {
						expect(Object.keys(filteredExported).sort()).toEqual(
							Object.keys(filteredOriginal).sort(),
						);

						for (const nodeName of Object.keys(filteredOriginal)) {
							expect(filteredExported[nodeName]).toEqual(filteredOriginal[nodeName]);
						}
					}
				});
			});
		});

		describe('node retrieval', () => {
			workflows.forEach(({ id, name, json }) => {
				it(`should retrieve all nodes by name in workflow ${id}: "${name}"`, () => {
					const wf = workflow.fromJSON(json);

					for (const node of json.nodes) {
						// Skip nodes without names (e.g., some sticky notes)
						if (!node.name) continue;
						const retrieved = wf.getNode(node.name);
						expect(retrieved).toBeDefined();
						if (retrieved) {
							expect(retrieved.config.name).toBe(node.name);
						}
					}
				});
			});
		});

		describe('settings preservation', () => {
			const workflowsWithSettings = workflows.filter((w) => w.json.settings);
			workflowsWithSettings.forEach(({ id, name, json }) => {
				it(`should preserve settings in workflow ${id}: "${name}"`, () => {
					const wf = workflow.fromJSON(json);
					const exported = wf.toJSON();
					expect(exported.settings).toEqual(json.settings);
				});
			});

			if (workflowsWithSettings.length === 0) {
				it('should have no workflows with settings', () => {
					expect(workflowsWithSettings.length).toBe(0);
				});
			}
		});

		describe('pinData preservation', () => {
			const workflowsWithPinData = workflows.filter(
				(w) => w.json.pinData && Object.keys(w.json.pinData).length > 0,
			);
			workflowsWithPinData.forEach(({ id, name, json }) => {
				it(`should preserve pinData in workflow ${id}: "${name}"`, () => {
					const wf = workflow.fromJSON(json);
					const exported = wf.toJSON();
					expect(exported.pinData).toEqual(json.pinData);
				});
			});

			if (workflowsWithPinData.length === 0) {
				it('should have no workflows with pinData', () => {
					expect(workflowsWithPinData.length).toBe(0);
				});
			}
		});
	}
});

describe('Real Workflow Patterns', () => {
	beforeAll(() => {
		ensureFixtures();
	});

	it('should handle AI agent workflows with subnodes', () => {
		expect(workflows.length).toBeGreaterThan(0);
		const aiWorkflow = workflows.find((w) => w.id === '1954');
		if (!aiWorkflow) {
			return;
		}

		const wf = workflow.fromJSON(aiWorkflow.json);
		const exported = wf.toJSON();

		const connectionTypes = new Set<string>();
		for (const nodeConnections of Object.values(exported.connections)) {
			for (const connType of Object.keys(nodeConnections)) {
				connectionTypes.add(connType);
			}
		}

		expect(connectionTypes.has('main') || connectionTypes.size > 0).toBe(true);

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
		const complexWorkflow = workflows.find((w) => w.nodeCount >= 10);
		if (!complexWorkflow) {
			return;
		}

		const wf = workflow.fromJSON(complexWorkflow.json);
		const exported = wf.toJSON();

		expect(exported.nodes.length).toBe(complexWorkflow.nodeCount);
	});

	it('should handle workflows with credentials', () => {
		const workflowWithCreds = workflows.find((w) =>
			w.json.nodes.some((n) => n.credentials && Object.keys(n.credentials).length > 0),
		);

		if (!workflowWithCreds) {
			return;
		}

		const wf = workflow.fromJSON(workflowWithCreds.json);
		const exported = wf.toJSON();

		for (const originalNode of workflowWithCreds.json.nodes) {
			if (originalNode.credentials && Object.keys(originalNode.credentials).length > 0) {
				const exportedNode = exported.nodes.find((n) => n.id === originalNode.id);
				expect(exportedNode?.credentials).toEqual(originalNode.credentials);
			}
		}
	});
});

describe('Expression Preservation', () => {
	beforeAll(() => {
		ensureFixtures();
	});

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

	workflows.forEach(({ id, name, json }) => {
		const expressions = extractExpressions(json);
		if (expressions.length === 0) return;

		it(`should preserve expressions in workflow ${id}: "${name}"`, () => {
			const wf = workflow.fromJSON(json);
			const exported = wf.toJSON();
			const exportedExpressions = extractExpressions(exported);

			expect(exportedExpressions).toEqual(expressions);
		});
	});
});
