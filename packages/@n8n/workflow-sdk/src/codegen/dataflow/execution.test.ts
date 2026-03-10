import { writeFileSync } from 'fs';
import { join } from 'path';
import { generateDataFlowWorkflowCode } from './index';
import { parseDataFlowCode } from './dataflow-parser';
import { generateReport } from './generate-report';
import { loadFixtures } from './fixture-loader';
import type { WorkflowJSON, NodeJSON } from '../../types/base';

// ---------------------------------------------------------------------------
// Execution validation types
// ---------------------------------------------------------------------------

interface NodeValidation {
	name: string;
	type: string;
	hasParameters: boolean;
	hasConnections: boolean;
	parameterCount: number;
}

interface ConnectionValidation {
	source: string;
	targets: string[];
	connectionType: string;
}

interface WorkflowValidation {
	name: string;
	nodeCount: number;
	connectionCount: number;
	triggerCount: number;
	nodes: NodeValidation[];
	connections: ConnectionValidation[];
	orphanedNodes: string[];
	errors: string[];
}

interface FixtureExecutionEntry {
	status: 'pass' | 'error' | 'skip';
	error?: string;
	reason?: string;
	originalValidation?: WorkflowValidation;
	parsedValidation?: WorkflowValidation;
	comparisonResult?: {
		nodeCountMatch: boolean;
		triggerCountMatch: boolean;
		allNodeTypesPresent: boolean;
		allConnectionsPresent: boolean;
		missingNodeTypes: string[];
		missingConnections: string[];
	};
}

const executionData: Record<string, FixtureExecutionEntry> = {};

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const TRIGGER_TYPE_PATTERNS = ['Trigger', 'trigger', 'webhook', 'Webhook', 'schedule', 'Schedule'];

function isTriggerNode(node: NodeJSON): boolean {
	return TRIGGER_TYPE_PATTERNS.some((p) => node.type.includes(p) || (node.name ?? '').includes(p));
}

function validateWorkflowStructure(json: WorkflowJSON): WorkflowValidation {
	const errors: string[] = [];
	const nonStickyNodes = json.nodes.filter((n) => !n.type.includes('stickyNote'));

	const nodes: NodeValidation[] = nonStickyNodes.map((n) => {
		const params = n.parameters as Record<string, unknown> | undefined;
		const paramCount = params ? Object.keys(params).length : 0;
		const hasConn =
			!!json.connections[n.name ?? ''] ||
			Object.values(json.connections).some((nodeConns) => {
				const conns = nodeConns as Record<string, unknown[][]>;
				return Object.values(conns).some((outputs) =>
					outputs.some(
						(output) =>
							Array.isArray(output) &&
							output.some((c) => c && (c as { node?: string }).node === n.name),
					),
				);
			});

		return {
			name: n.name ?? '',
			type: n.type,
			hasParameters: paramCount > 0,
			hasConnections: hasConn,
			parameterCount: paramCount,
		};
	});

	const connections: ConnectionValidation[] = [];
	for (const [source, nodeConns] of Object.entries(json.connections)) {
		for (const [connType, outputs] of Object.entries(nodeConns as Record<string, unknown[][]>)) {
			if (!Array.isArray(outputs)) continue;
			const targets: string[] = [];
			for (const output of outputs) {
				if (!Array.isArray(output)) continue;
				for (const conn of output) {
					const c = conn as { node?: string };
					if (c && c.node) {
						targets.push(c.node);
					}
				}
			}
			if (targets.length > 0) {
				connections.push({ source, targets, connectionType: connType });
			}
		}
	}

	// Find orphaned nodes (not connected as source or target, excluding triggers)
	const connectedNodes = new Set<string>();
	for (const conn of connections) {
		connectedNodes.add(conn.source);
		for (const t of conn.targets) connectedNodes.add(t);
	}
	const orphanedNodes = nonStickyNodes
		.filter((n) => !connectedNodes.has(n.name ?? '') && !isTriggerNode(n))
		.map((n) => n.name ?? '');

	// Check for nodes without type
	for (const n of nonStickyNodes) {
		if (!n.type) errors.push(`Node "${n.name}" has no type`);
	}

	// Check for dangling connections (target node doesn't exist)
	const nodeNames = new Set(nonStickyNodes.map((n) => n.name ?? ''));
	for (const conn of connections) {
		for (const target of conn.targets) {
			if (!nodeNames.has(target)) {
				errors.push(`Connection target "${target}" from "${conn.source}" does not exist`);
			}
		}
	}

	return {
		name: json.name ?? '',
		nodeCount: nonStickyNodes.length,
		connectionCount: connections.length,
		triggerCount: nonStickyNodes.filter(isTriggerNode).length,
		nodes,
		connections,
		orphanedNodes,
		errors,
	};
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Data-flow execution validation (fixture round-trip)', () => {
	afterAll(() => {
		writeFileSync(
			join(__dirname, '__fixtures__', 'execution-data.json'),
			JSON.stringify(executionData, null, 2) + '\n',
		);
		generateReport();
	});

	const fixtures = loadFixtures();

	for (const fixture of fixtures) {
		if (fixture.skip) {
			executionData[fixture.dir] = { status: 'skip', reason: fixture.skip };
			it.skip(`${fixture.title} [execution]`, () => {});
			continue;
		}

		it(`${fixture.title} [execution]`, () => {
			// Step 1: Validate the original workflow structure
			const originalValidation = validateWorkflowStructure(fixture.input);

			// Step 2: Generate data-flow code
			const code = generateDataFlowWorkflowCode(fixture.input);
			expect(code.length).toBeGreaterThan(0);

			// Step 3: Parse back to WorkflowJSON
			const parsed = parseDataFlowCode(code);

			// Step 4: Validate the parsed workflow structure
			const parsedValidation = validateWorkflowStructure(parsed);

			// Step 5: Compare structures
			const origNodeTypes = new Set(originalValidation.nodes.map((n) => n.type));
			const parsedNodeTypes = new Set(parsedValidation.nodes.map((n) => n.type));
			const missingNodeTypes = [...origNodeTypes].filter((t) => !parsedNodeTypes.has(t));

			const origConnSources = new Set(originalValidation.connections.map((c) => c.source));
			const parsedConnSources = new Set(parsedValidation.connections.map((c) => c.source));
			const missingConnections = [...origConnSources].filter((s) => !parsedConnSources.has(s));

			const comparisonResult = {
				nodeCountMatch: parsedValidation.nodeCount >= originalValidation.nodeCount,
				triggerCountMatch: parsedValidation.triggerCount >= originalValidation.triggerCount,
				allNodeTypesPresent: missingNodeTypes.length === 0,
				allConnectionsPresent: missingConnections.length === 0,
				missingNodeTypes,
				missingConnections,
			};

			executionData[fixture.dir] = {
				status: 'pass',
				originalValidation,
				parsedValidation,
				comparisonResult,
			};

			// Assertions
			expect(parsedValidation.errors).toHaveLength(0);
			expect(missingNodeTypes).toEqual([]);
			expect(parsedValidation.triggerCount).toBeGreaterThanOrEqual(originalValidation.triggerCount);
		});
	}
});
