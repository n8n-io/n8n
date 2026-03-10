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
	validation?: WorkflowValidation;
	roundTripCodeMatch?: boolean;
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

	// Check for dangling connections
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

function normalizeCode(code: string): string {
	return code
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.join('\n');
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
			executionData[fixture.dir] = {
				status: 'skip',
				reason: fixture.skip,
			};
			it.skip(`${fixture.title} [execution]`, () => {});
			continue;
		}

		it(`${fixture.title} [execution]`, () => {
			// Step 1: Parse data-flow code → WorkflowJSON
			const parsed = parseDataFlowCode(fixture.input);
			expect(parsed.nodes.length).toBeGreaterThan(0);

			// Step 2: Validate parsed workflow structure
			const validation = validateWorkflowStructure(parsed);

			// Step 3: Re-generate code and check round-trip produces same workflow
			const reGenerated = generateDataFlowWorkflowCode(parsed);
			const reParsed = parseDataFlowCode(reGenerated);
			const roundTripCodeMatch = normalizeCode(reGenerated) === normalizeCode(fixture.input);

			executionData[fixture.dir] = {
				status: 'pass',
				validation,
				roundTripCodeMatch,
			};

			// Assertions
			expect(validation.errors).toHaveLength(0);
			expect(validation.triggerCount).toBeGreaterThanOrEqual(1);
			expect(reParsed.nodes).toEqual(parsed.nodes);
			expect(reParsed.connections).toEqual(parsed.connections);
		});
	}
});
