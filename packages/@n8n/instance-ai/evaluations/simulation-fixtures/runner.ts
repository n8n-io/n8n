// ---------------------------------------------------------------------------
// Grader for simulation-fixture generation (INS-668)
//
// For each case: build a minimal workflow, mark the listed nodes `simulate`,
// call the REAL fixture generator (hits the configured model), then grade
// every simulated node on two metrics:
//   - non_empty:          the item has at least one field (catches the `{}` bug)
//   - schema_appropriate:  at least one expected key is present for the node type
// A node passes only when both hold. Case/overall score is the pass fraction.
// ---------------------------------------------------------------------------

import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { FixtureCase } from './cases';
import { generateSimulationFixtures } from '../../src/tools/workflows/generate-simulation-fixtures.service';
import type { NodeSimulationVerdict } from '../../src/workflow-loop/workflow-loop-state';

export interface NodeGrade {
	nodeName: string;
	nonEmpty: boolean;
	schemaAppropriate: boolean;
	pass: boolean;
	item: Record<string, unknown>;
	missingFrom: string[];
}

export interface CaseResult {
	id: string;
	description: string;
	nodes: NodeGrade[];
	pass: boolean;
	error?: string;
}

function toWorkflow(testCase: FixtureCase): WorkflowJSON {
	return {
		name: testCase.id,
		nodes: testCase.nodes.map((n, i) => ({
			id: `id-${i}`,
			name: n.name,
			type: n.type,
			typeVersion: 1,
			position: [i * 200, 0],
			parameters: n.parameters ?? {},
		})),
		connections: testCase.connections ?? {},
		pinData: {},
		settings: {},
	} as unknown as WorkflowJSON;
}

function toPlan(testCase: FixtureCase): NodeSimulationVerdict[] {
	const simulate = new Set(testCase.simulate);
	return testCase.nodes.map((n) => ({
		nodeName: n.name,
		verdict: simulate.has(n.name) ? 'simulate' : 'execute',
		reason: 'Performs an external side effect',
		confidence: 'high',
		source: 'deterministic',
	}));
}

const hasKey = (item: Record<string, unknown>, key: string): boolean =>
	Object.keys(item).some((k) => k.toLowerCase() === key.toLowerCase());

export async function gradeCase(testCase: FixtureCase): Promise<CaseResult> {
	let fixtures;
	try {
		fixtures = await generateSimulationFixtures({
			workflow: toWorkflow(testCase),
			plan: toPlan(testCase),
		});
	} catch (error) {
		return {
			id: testCase.id,
			description: testCase.description,
			nodes: [],
			pass: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}

	const nodes: NodeGrade[] = testCase.simulate.map((nodeName) => {
		const item = fixtures[nodeName]?.[0] ?? {};
		const expected = testCase.expectedKeys[nodeName] ?? [];
		const nonEmpty = Object.keys(item).length > 0;
		const present = expected.filter((k) => hasKey(item, k));
		const schemaAppropriate = expected.length === 0 ? nonEmpty : present.length > 0;
		return {
			nodeName,
			nonEmpty,
			schemaAppropriate,
			pass: nonEmpty && schemaAppropriate,
			item,
			missingFrom: present.length > 0 ? [] : expected,
		};
	});

	return {
		id: testCase.id,
		description: testCase.description,
		nodes,
		pass: nodes.length > 0 && nodes.every((n) => n.pass),
	};
}
