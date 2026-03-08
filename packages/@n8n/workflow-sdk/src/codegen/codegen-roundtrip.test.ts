import * as fs from 'fs';
import * as path from 'path';

import { generateWorkflowCode } from './index';
import { parseWorkflowCode, parseWorkflowCodeToBuilder } from './parse-workflow-code';
import {
	ensureFixtures,
	FixtureDownloadError,
	DOWNLOADED_FIXTURES_DIR,
	COMMITTED_FIXTURES_DIR,
} from '../__tests__/fixtures-download';
import type { WorkflowJSON } from '../types/base';

// Workflows with known issues that need to be skipped
// 5979: Code generator creates duplicate inline nodes, causing duplicate detection to rename them
const SKIP_WORKFLOWS = new Set<string>(['5979']);

// Workflows to skip validation due to known codegen bugs (invalid warnings)
// These produce warnings that don't exist in the original workflow (codegen issues to fix)
// Once fixed, these should be moved to expectedWarnings in manifest.json
// NOTE: All previous workflows have been fixed and moved to expectedWarnings in manifests
const SKIP_VALIDATION_WORKFLOWS = new Set<string>([
	// Currently empty - all codegen bugs have been fixed!
]);

interface ExpectedWarning {
	code: string;
	nodeName?: string;
}

interface TestWorkflow {
	id: string;
	name: string;
	json: WorkflowJSON;
	nodeCount: number;
	expectedWarnings?: ExpectedWarning[];
}

function loadWorkflowsFromDir(dir: string, workflows: TestWorkflow[]): void {
	const manifestPath = path.join(dir, 'manifest.json');
	if (!fs.existsSync(manifestPath)) {
		return;
	}

	// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse -- Manifest is controlled fixture file
	const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as {
		workflows: Array<{
			id: string | number;
			name: string;
			success: boolean;
			expectedWarnings?: ExpectedWarning[];
		}>;
	};

	for (const entry of manifest.workflows) {
		if (!entry.success) continue;
		if (SKIP_WORKFLOWS.has(String(entry.id))) continue;

		const filePath = path.join(dir, `${entry.id}.json`);
		if (fs.existsSync(filePath)) {
			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse -- Test fixture file
			const json = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as WorkflowJSON;
			workflows.push({
				id: String(entry.id),
				name: entry.name,
				json,
				nodeCount: json.nodes?.length ?? 0,
				expectedWarnings: entry.expectedWarnings,
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
		expect(parsedJson.connections['Manual Trigger'].main[0]![0].node).toBe('HTTP Request');
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
		expect(parsedJson.connections['IF'].main[0]![0].node).toBe('True Branch');
		expect(parsedJson.connections['IF'].main[1]![0].node).toBe('False Branch');
	});

	it('should preserve connections when both IF branches converge to the same node', () => {
		// This tests the branch convergence pattern:
		// IF node has two branches (True and False), both leading to the same downstream node
		// The generated code should create the convergence node as a variable and reference it
		// in both branches to preserve both connections
		const originalJson: WorkflowJSON = {
			id: 'branch-convergence-test',
			name: 'Branch Convergence Test',
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
					name: 'True Path',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [400, -100],
					parameters: {},
				},
				{
					id: 'false-1',
					name: 'False Path',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [400, 100],
					parameters: {},
				},
				{
					id: 'converge-1',
					name: 'Convergence Node',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [600, 0],
					parameters: { mode: 'manual' },
				},
			],
			connections: {
				Trigger: {
					main: [[{ node: 'IF', type: 'main', index: 0 }]],
				},
				IF: {
					main: [
						[{ node: 'True Path', type: 'main', index: 0 }],
						[{ node: 'False Path', type: 'main', index: 0 }],
					],
				},
				// Both branches converge to the same node
				'True Path': {
					main: [[{ node: 'Convergence Node', type: 'main', index: 0 }]],
				},
				'False Path': {
					main: [[{ node: 'Convergence Node', type: 'main', index: 0 }]],
				},
			},
		};

		const code = generateWorkflowCode(originalJson);
		const parsedJson = parseWorkflowCode(code);

		// Verify all nodes are present
		expect(parsedJson.nodes).toHaveLength(5);

		// Verify IF connections to branch nodes
		expect(parsedJson.connections['IF']).toBeDefined();
		expect(parsedJson.connections['IF'].main[0]![0].node).toBe('True Path');
		expect(parsedJson.connections['IF'].main[1]![0].node).toBe('False Path');

		// CRITICAL: Verify BOTH branches connect to the convergence node
		expect(parsedJson.connections['True Path']).toBeDefined();
		expect(parsedJson.connections['True Path'].main[0]![0].node).toBe('Convergence Node');

		expect(parsedJson.connections['False Path']).toBeDefined();
		expect(parsedJson.connections['False Path'].main[0]![0].node).toBe('Convergence Node');
	});

	it('should preserve connections for switch case with downstream chain', () => {
		// This test reproduces the issue where nodes downstream of switch case branches
		// get incorrectly chained to the switch composite instead of their specific branch
		const originalJson: WorkflowJSON = {
			id: 'switch-chain-test',
			name: 'Switch Chain Test',
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
					id: 'switch-1',
					name: 'Switch',
					type: 'n8n-nodes-base.switch',
					typeVersion: 3.2,
					position: [200, 0],
					parameters: {
						rules: {
							values: [
								{ outputKey: 'Case A', conditions: {} },
								{ outputKey: 'Case B', conditions: {} },
							],
						},
					},
				},
				{
					id: 'case-a-1',
					name: 'Case A Node',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [400, -100],
					parameters: {},
				},
				{
					id: 'case-b-1',
					name: 'Case B Node',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [400, 100],
					parameters: {},
				},
				{
					id: 'case-b-2',
					name: 'Case B Downstream',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [600, 100],
					parameters: { mode: 'manual' },
				},
			],
			connections: {
				Trigger: {
					main: [[{ node: 'Switch', type: 'main', index: 0 }]],
				},
				Switch: {
					main: [
						[{ node: 'Case A Node', type: 'main', index: 0 }],
						[{ node: 'Case B Node', type: 'main', index: 0 }],
					],
				},
				// This is the critical connection: Case B Node -> Case B Downstream
				'Case B Node': {
					main: [[{ node: 'Case B Downstream', type: 'main', index: 0 }]],
				},
			},
		};

		const code = generateWorkflowCode(originalJson);
		const parsedJson = parseWorkflowCode(code);

		// Verify all nodes are present
		expect(parsedJson.nodes).toHaveLength(5);

		// Verify Switch connections to case branches
		expect(parsedJson.connections['Switch']).toBeDefined();
		expect(parsedJson.connections['Switch'].main[0]![0].node).toBe('Case A Node');
		expect(parsedJson.connections['Switch'].main[1]![0].node).toBe('Case B Node');

		// CRITICAL: Verify the downstream connection is preserved
		// Case B Node should connect to Case B Downstream
		expect(parsedJson.connections['Case B Node']).toBeDefined();
		expect(parsedJson.connections['Case B Node'].main[0]![0].node).toBe('Case B Downstream');
	});

	it('should preserve cycle connections in polling loop pattern (Wait → IF)', () => {
		// This tests the polling loop pattern where a node cycles back to an IF node:
		// Trigger → Job Complete? (IF)
		//             ↓ true          ↓ false
		//         Get Dataset    Check Status → Wait → Job Complete? (CYCLE!)
		//
		// The cycle Wait → Job Complete? must be preserved in the roundtrip.
		const originalJson: WorkflowJSON = {
			id: 'polling-loop-test',
			name: 'Polling Loop Test',
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
					name: 'Job Complete?',
					type: 'n8n-nodes-base.if',
					typeVersion: 2,
					position: [200, 0],
					parameters: {},
				},
				{
					id: 'done-1',
					name: 'Get Dataset',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [400, -100],
					parameters: { url: 'https://api.example.com/dataset' },
				},
				{
					id: 'check-1',
					name: 'Check Status',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [400, 100],
					parameters: { url: 'https://api.example.com/status' },
				},
				{
					id: 'wait-1',
					name: 'Wait',
					type: 'n8n-nodes-base.wait',
					typeVersion: 1.1,
					position: [600, 100],
					parameters: { amount: 5 },
				},
			],
			connections: {
				Trigger: {
					main: [[{ node: 'Job Complete?', type: 'main', index: 0 }]],
				},
				'Job Complete?': {
					main: [
						[{ node: 'Get Dataset', type: 'main', index: 0 }], // true branch
						[{ node: 'Check Status', type: 'main', index: 0 }], // false branch
					],
				},
				'Check Status': {
					main: [[{ node: 'Wait', type: 'main', index: 0 }]],
				},
				// CRITICAL: This is the cycle - Wait connects back to the IF node
				Wait: {
					main: [[{ node: 'Job Complete?', type: 'main', index: 0 }]],
				},
			},
		};

		const code = generateWorkflowCode(originalJson);
		const parsedJson = parseWorkflowCode(code);

		// Verify all nodes are present
		expect(parsedJson.nodes).toHaveLength(5);

		// Verify IF node connections
		expect(parsedJson.connections['Job Complete?']).toBeDefined();
		expect(parsedJson.connections['Job Complete?'].main[0]![0].node).toBe('Get Dataset');
		expect(parsedJson.connections['Job Complete?'].main[1]![0].node).toBe('Check Status');

		// Verify Check Status → Wait connection
		expect(parsedJson.connections['Check Status']).toBeDefined();
		expect(parsedJson.connections['Check Status'].main[0]![0].node).toBe('Wait');

		// CRITICAL: Verify the CYCLE connection Wait → Job Complete? is preserved
		expect(parsedJson.connections['Wait']).toBeDefined();
		expect(parsedJson.connections['Wait'].main[0]![0].node).toBe('Job Complete?');
	});

	it('should preserve merge input indices when fan-out includes both regular node and merge', () => {
		// Bug: MERGE_SINGLE_INPUT - when a node fans out to both a regular node AND a merge node,
		// the merge input index is lost. Pattern from workflow 6897 (HR CVs Filter):
		//
		// Download Actual File → Store CV (output 0) → Merge (input 0)
		// Download Actual File → Merge (input 1)  ← This connection loses its input index!
		//
		// The merge node should receive:
		// - input 0: from Store CV
		// - input 1: from Download Actual File
		const originalJson: WorkflowJSON = {
			id: 'merge-fanout-test',
			name: 'Merge Fan-out Test',
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
					id: 'fanout-1',
					name: 'Fan Out Node',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [200, 0],
					parameters: { url: 'https://api.example.com' },
				},
				{
					id: 'branch-1',
					name: 'Branch Node',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [400, -100],
					parameters: { mode: 'manual' },
				},
				{
					id: 'merge-1',
					name: 'Merge',
					type: 'n8n-nodes-base.merge',
					typeVersion: 3.2,
					position: [600, 0],
					parameters: {},
				},
				{
					id: 'after-merge',
					name: 'After Merge',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [800, 0],
					parameters: {},
				},
			],
			connections: {
				Trigger: {
					main: [[{ node: 'Fan Out Node', type: 'main', index: 0 }]],
				},
				// Fan Out Node fans out to BOTH Branch Node AND Merge
				'Fan Out Node': {
					main: [
						[
							{ node: 'Branch Node', type: 'main', index: 0 },
							{ node: 'Merge', type: 'main', index: 1 }, // Goes to merge INPUT 1
						],
					],
				},
				// Branch Node goes to Merge input 0
				'Branch Node': {
					main: [[{ node: 'Merge', type: 'main', index: 0 }]],
				},
				Merge: {
					main: [[{ node: 'After Merge', type: 'main', index: 0 }]],
				},
			},
		};

		const code = generateWorkflowCode(originalJson);
		const parsedJson = parseWorkflowCode(code);

		// Verify all nodes are present
		expect(parsedJson.nodes).toHaveLength(5);

		// Verify Fan Out Node has connections to both Branch Node and Merge
		const fanOutConns = parsedJson.connections['Fan Out Node']?.main[0];
		expect(fanOutConns).toBeDefined();
		expect(fanOutConns!.length).toBeGreaterThanOrEqual(2);

		// Find connections to Branch Node and Merge
		const toBranch = fanOutConns!.find((c) => c.node === 'Branch Node');
		const toMerge = fanOutConns!.find((c) => c.node === 'Merge');

		expect(toBranch).toBeDefined();
		expect(toMerge).toBeDefined();

		// CRITICAL: The merge connection from Fan Out Node should go to input 1
		expect(toMerge!.index).toBe(1);

		// Branch Node should connect to Merge input 0
		const branchToMerge = parsedJson.connections['Branch Node']?.main[0]?.[0];
		expect(branchToMerge).toBeDefined();
		expect(branchToMerge!.node).toBe('Merge');
		expect(branchToMerge!.index).toBe(0);

		// Verify Merge has output to After Merge
		expect(parsedJson.connections['Merge']?.main[0]?.[0]?.node).toBe('After Merge');
	});

	it('should preserve merge input indices when fan-out includes multiple merge nodes', () => {
		// Bug: MERGE_SINGLE_INPUT - when a node fans out to multiple merge nodes,
		// the merge input indices are lost. Pattern from workflow 3066:
		//
		// Source → Regular Node (output 0)
		// Source → Merge1 (input 1)
		// Source → Merge2 (input 1)
		// Regular Node → Merge1 (input 0)
		// Other → Merge2 (input 0)
		//
		// The merge nodes should receive their correct input indices
		const originalJson: WorkflowJSON = {
			id: 'multi-merge-fanout-test',
			name: 'Multiple Merge Fan-out Test',
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
					id: 'source-1',
					name: 'Source Node',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [200, 0],
					parameters: { url: 'https://api.example.com' },
				},
				{
					id: 'branch-1',
					name: 'Branch Node',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [400, -100],
					parameters: { mode: 'manual' },
				},
				{
					id: 'other-1',
					name: 'Other Node',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [400, 100],
					parameters: { mode: 'manual' },
				},
				{
					id: 'merge-1',
					name: 'Merge1',
					type: 'n8n-nodes-base.merge',
					typeVersion: 3.2,
					position: [600, -50],
					parameters: {},
				},
				{
					id: 'merge-2',
					name: 'Merge2',
					type: 'n8n-nodes-base.merge',
					typeVersion: 3.2,
					position: [600, 50],
					parameters: {},
				},
				{
					id: 'end-1',
					name: 'End',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [800, 0],
					parameters: {},
				},
			],
			connections: {
				Trigger: {
					main: [[{ node: 'Source Node', type: 'main', index: 0 }]],
				},
				// Source Node fans out to: Branch Node, Merge1 (input 1), Merge2 (input 1)
				'Source Node': {
					main: [
						[
							{ node: 'Branch Node', type: 'main', index: 0 },
							{ node: 'Merge1', type: 'main', index: 1 }, // Goes to Merge1 INPUT 1
							{ node: 'Merge2', type: 'main', index: 1 }, // Goes to Merge2 INPUT 1
						],
					],
				},
				// Branch Node goes to Merge1 input 0
				'Branch Node': {
					main: [[{ node: 'Merge1', type: 'main', index: 0 }]],
				},
				// Other Node goes to Merge2 input 0
				'Other Node': {
					main: [[{ node: 'Merge2', type: 'main', index: 0 }]],
				},
				Merge1: {
					main: [[{ node: 'End', type: 'main', index: 0 }]],
				},
				Merge2: {
					main: [[{ node: 'End', type: 'main', index: 0 }]],
				},
			},
		};

		const code = generateWorkflowCode(originalJson);
		const parsedJson = parseWorkflowCode(code);

		// Verify all nodes are present
		expect(parsedJson.nodes).toHaveLength(7);

		// Verify Source Node has connections to Branch Node, Merge1, and Merge2
		const sourceConns = parsedJson.connections['Source Node']?.main[0];
		expect(sourceConns).toBeDefined();
		expect(sourceConns!.length).toBeGreaterThanOrEqual(3);

		// Find connections to each target
		const toBranch = sourceConns!.find((c) => c.node === 'Branch Node');
		const toMerge1 = sourceConns!.find((c) => c.node === 'Merge1');
		const toMerge2 = sourceConns!.find((c) => c.node === 'Merge2');

		expect(toBranch).toBeDefined();
		expect(toMerge1).toBeDefined();
		expect(toMerge2).toBeDefined();

		// CRITICAL: Both merge connections from Source Node should go to input 1
		expect(toMerge1!.index).toBe(1);
		expect(toMerge2!.index).toBe(1);

		// Branch Node should connect to Merge1 input 0
		const branchToMerge = parsedJson.connections['Branch Node']?.main[0]?.[0];
		expect(branchToMerge).toBeDefined();
		expect(branchToMerge!.node).toBe('Merge1');
		expect(branchToMerge!.index).toBe(0);

		// Other Node should connect to Merge2 input 0
		const otherToMerge = parsedJson.connections['Other Node']?.main[0]?.[0];
		expect(otherToMerge).toBeDefined();
		expect(otherToMerge!.node).toBe('Merge2');
		expect(otherToMerge!.index).toBe(0);
	});

	describe('escapes node references in single-quoted strings', () => {
		it('should parse code with unescaped $() node references', () => {
			// This code has unescaped single quotes inside single-quoted strings
			// The parser should automatically escape them
			const codeWithUnescapedQuotes = `
export default workflow('test-id', 'Test Workflow')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }))
  .to(node({ type: 'n8n-nodes-base.set', version: 3.4, config: {
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          {
            id: 'test',
            name: 'value',
            value: '={{ $('Manual Trigger').item.json.data }}',
            type: 'string'
          }
        ]
      }
    }
  } }))
`;
			// This should not throw a syntax error
			const parsedJson = parseWorkflowCode(codeWithUnescapedQuotes);
			expect(parsedJson.id).toBe('test-id');
			expect(parsedJson.nodes).toHaveLength(2);

			const setNode = parsedJson.nodes.find((n) => n.type === 'n8n-nodes-base.set');
			expect(setNode).toBeDefined();
			// The expression should be preserved with the node reference
			const assignments = (setNode?.parameters as Record<string, unknown>)?.assignments as Record<
				string,
				unknown
			>;
			const assignmentList = assignments?.assignments as Array<Record<string, unknown>>;
			expect(assignmentList?.[0]?.value).toBe("={{ $('Manual Trigger').item.json.data }}");
		});

		it('should handle multiple node references in the same string', () => {
			const code = `
export default workflow('test-id', 'Test Workflow')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }))
  .to(node({ type: 'n8n-nodes-base.set', version: 3.4, config: {
    parameters: {
      mode: 'raw',
      jsonOutput: '={{ $('Node A').item.json.a + $('Node B').item.json.b }}'
    }
  } }))
`;
			const parsedJson = parseWorkflowCode(code);
			const setNode = parsedJson.nodes.find((n) => n.type === 'n8n-nodes-base.set');
			expect((setNode?.parameters as Record<string, unknown>)?.jsonOutput).toBe(
				"={{ $('Node A').item.json.a + $('Node B').item.json.b }}",
			);
		});

		it('should not double-escape already escaped quotes', () => {
			// Code with already-escaped quotes should not be double-escaped
			const codeWithEscapedQuotes = `
export default workflow('test-id', 'Test Workflow')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }))
  .to(node({ type: 'n8n-nodes-base.set', version: 3.4, config: {
    parameters: {
      mode: 'raw',
      jsonOutput: '={{ $(\\'Properly Escaped\\').item.json.data }}'
    }
  } }))
`;
			const parsedJson = parseWorkflowCode(codeWithEscapedQuotes);
			const setNode = parsedJson.nodes.find((n) => n.type === 'n8n-nodes-base.set');
			expect((setNode?.parameters as Record<string, unknown>)?.jsonOutput).toBe(
				"={{ $('Properly Escaped').item.json.data }}",
			);
		});

		it('should preserve double-quoted strings unchanged', () => {
			// Node references in double-quoted strings don't need escaping
			const code = `
export default workflow('test-id', 'Test Workflow')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }))
  .to(node({ type: 'n8n-nodes-base.set', version: 3.4, config: {
    parameters: {
      mode: 'raw',
      jsonOutput: "={{ $('Node Name').item.json.data }}"
    }
  } }))
`;
			const parsedJson = parseWorkflowCode(code);
			const setNode = parsedJson.nodes.find((n) => n.type === 'n8n-nodes-base.set');
			expect((setNode?.parameters as Record<string, unknown>)?.jsonOutput).toBe(
				"={{ $('Node Name').item.json.data }}",
			);
		});

		it('should handle node names with spaces and special characters', () => {
			const code = `
export default workflow('test-id', 'Test Workflow')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }))
  .to(node({ type: 'n8n-nodes-base.set', version: 3.4, config: {
    parameters: {
      mode: 'raw',
      jsonOutput: '={{ $('Lead Generation Form').item.json.fullName }}'
    }
  } }))
`;
			const parsedJson = parseWorkflowCode(code);
			const setNode = parsedJson.nodes.find((n) => n.type === 'n8n-nodes-base.set');
			expect((setNode?.parameters as Record<string, unknown>)?.jsonOutput).toBe(
				"={{ $('Lead Generation Form').item.json.fullName }}",
			);
		});

		it('should fix double-escaped $() node references', () => {
			// LLMs sometimes generate $(\\'NodeName\\') with double-escaped backslashes
			// In a template literal, \\\\ produces \\, so the actual string chars are $( + \ + \ + '
			const code = `
export default workflow('test-id', 'Test Workflow')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} })
  .to(node({ type: 'n8n-nodes-base.set', version: 3.4, config: {
    parameters: {
      mode: 'raw',
      jsonOutput: '={{ $(\\\\'Manual Trigger\\\\').item.json.data }}'
    }
  } })))
`;
			const parsedJson = parseWorkflowCode(code);
			const setNode = parsedJson.nodes.find((n) => n.type === 'n8n-nodes-base.set');
			expect((setNode?.parameters as Record<string, unknown>)?.jsonOutput).toBe(
				"={{ $('Manual Trigger').item.json.data }}",
			);
		});

		it('should fix multiple double-escaped $() references in the same string', () => {
			const code = `
export default workflow('test-id', 'Test Workflow')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} })
  .to(node({ type: 'n8n-nodes-base.set', version: 3.4, config: {
    parameters: {
      mode: 'raw',
      jsonOutput: '={{ $(\\\\'Node A\\\\').item.json.a + $(\\\\'Node B\\\\').item.json.b }}'
    }
  } })))
`;
			const parsedJson = parseWorkflowCode(code);
			const setNode = parsedJson.nodes.find((n) => n.type === 'n8n-nodes-base.set');
			expect((setNode?.parameters as Record<string, unknown>)?.jsonOutput).toBe(
				"={{ $('Node A').item.json.a + $('Node B').item.json.b }}",
			);
		});
	});

	describe('parses placeholder() in workflow code', () => {
		it('should parse code with placeholder() in parameters', () => {
			const code = `
export default workflow('test-id', 'Test Workflow')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }))
  .to(node({ type: 'n8n-nodes-base.slack', version: 2.2, config: {
    name: 'Send Slack Message',
    parameters: { channel: placeholder('Enter Slack Channel') }
  } }))
`;
			const parsedJson = parseWorkflowCode(code);
			expect(parsedJson.id).toBe('test-id');
			expect(parsedJson.nodes).toHaveLength(2);

			const slackNode = parsedJson.nodes.find((n) => n.type === 'n8n-nodes-base.slack');
			expect(slackNode).toBeDefined();
			expect((slackNode?.parameters as Record<string, unknown>)?.channel).toBe(
				'<__PLACEHOLDER_VALUE__Enter Slack Channel__>',
			);
		});

		it('should roundtrip JSON with placeholder values through code generation', () => {
			// Start with JSON containing placeholder value
			const inputJson: WorkflowJSON = {
				id: 'test-id',
				name: 'Test Workflow',
				nodes: [
					{
						id: 'trigger',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0] as [number, number],
						parameters: {},
					},
					{
						id: 'slack',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2.2,
						position: [200, 0] as [number, number],
						parameters: {
							channel: '<__PLACEHOLDER_VALUE__Enter Slack Channel__>',
							text: 'Hello',
						},
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'Slack', type: 'main', index: 0 }]],
					},
				},
			};

			// JSON → code
			const code = generateWorkflowCode(inputJson);

			// Code should contain placeholder() call, not raw string
			expect(code).toContain("placeholder('Enter Slack Channel')");
			expect(code).not.toContain('<__PLACEHOLDER_VALUE__');

			// code → JSON (roundtrip)
			const outputJson = parseWorkflowCode(code);
			const slackNode = outputJson.nodes.find((n) => n.type === 'n8n-nodes-base.slack');
			expect((slackNode?.parameters as Record<string, unknown>)?.channel).toBe(
				'<__PLACEHOLDER_VALUE__Enter Slack Channel__>',
			);
		});
	});

	describe('parses newCredential() in workflow code', () => {
		it('should parse code with newCredential() in credentials', () => {
			const code = `
export default workflow('test-id', 'Test Workflow')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }))
  .to(node({ type: 'n8n-nodes-base.slack', version: 2.2, config: {
    name: 'Send Slack Message',
    parameters: { channel: '#general', text: 'Hello!' },
    credentials: { slackApi: newCredential('My Slack Bot') }
  } }))
`;
			const parsedJson = parseWorkflowCode(code);
			expect(parsedJson.id).toBe('test-id');
			expect(parsedJson.nodes).toHaveLength(2);

			const slackNode = parsedJson.nodes.find((n) => n.type === 'n8n-nodes-base.slack');
			expect(slackNode).toBeDefined();
			// newCredential serializes to undefined, which is omitted from JSON - not yet implemented
			expect(slackNode?.credentials).toEqual({});
		});

		it('should parse code with multiple newCredential() calls', () => {
			const code = `
export default workflow('test-id', 'Test Workflow')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }))
  .to(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: {
    name: 'HTTP Request',
    parameters: { url: 'https://api.example.com' },
    credentials: {
      httpBasicAuth: newCredential('Basic Auth'),
      httpHeaderAuth: newCredential('API Key Header')
    }
  } }))
`;
			const parsedJson = parseWorkflowCode(code);
			const httpNode = parsedJson.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest');
			// newCredential serializes to undefined, which is omitted - not yet implemented
			expect(httpNode?.credentials).toEqual({});
		});

		it('should parse code with newCredential() mixed with regular credentials', () => {
			const code = `
export default workflow('test-id', 'Test Workflow')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }))
  .to(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: {
    name: 'HTTP Request',
    parameters: { url: 'https://api.example.com' },
    credentials: {
      httpBasicAuth: { id: 'existing-123', name: 'Existing Auth' },
      httpHeaderAuth: newCredential('New API Key')
    }
  } }))
`;
			const parsedJson = parseWorkflowCode(code);
			const httpNode = parsedJson.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest');
			// Regular credentials preserved, newCredential omitted (not yet implemented)
			expect(httpNode?.credentials).toEqual({
				httpBasicAuth: { id: 'existing-123', name: 'Existing Auth' },
			});
		});

		it('should parse AI agent with newCredential() on subnode', () => {
			const code = `
export default workflow('test-id', 'AI Agent')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }))
  .to(node({
    type: '@n8n/n8n-nodes-langchain.agent',
    version: 3.1,
    config: {
      name: 'AI Agent',
      parameters: { promptType: 'define', text: 'You are helpful' },
      subnodes: {
        model: languageModel({
          type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
          version: 1,
          config: {
            parameters: {},
            credentials: { openAiApi: newCredential('OpenAI API') }
          }
        })
      }
    }
  }))
`;
			const parsedJson = parseWorkflowCode(code);
			const openAiNode = parsedJson.nodes.find(
				(n) => n.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			);
			expect(openAiNode).toBeDefined();
			// newCredential serializes to undefined, which is omitted - not yet implemented
			expect(openAiNode?.credentials).toEqual({});
		});
	});

	describe('parses Switch fluent API with pinData', () => {
		it('should parse workflow with Switch fluent API and pinData without errors', () => {
			// This code reproduces a bug where Switch with pinData fails with
			// "Cannot read properties of undefined (reading 'subnodes')"
			// Uses fluent syntax: switchNode.onCase(0, case0).onCase(1, case1)
			const code = `
// Declare the switch node first
const triageSwitch = node({
  type: 'n8n-nodes-base.switch',
  version: 3.2,
  config: {
    name: 'Triage Issues',
    parameters: {
      mode: 'rules',
      rules: {
        values: [
          {
            conditions: {
              options: {
                caseSensitive: false,
                leftValue: '',
                typeValidation: 'loose'
              },
              conditions: [
                {
                  leftValue: '={{ $json.title.toLowerCase() }}',
                  rightValue: '',
                  operator: {
                    type: 'string',
                    operation: 'contains',
                    rightType: 'any',
                    singleValue: 'bug'
                  }
                }
              ],
              combinator: 'or'
            },
            renameOutput: true,
            outputKey: 'Bug'
          },
          {
            conditions: {},
            renameOutput: true,
            outputKey: 'Feature/Enhancement'
          }
        ]
      }
    },
    position: [840, 300]
  }
});

// Declare case nodes
const tagAsBug = node({
  type: 'n8n-nodes-base.linear',
  version: 1.1,
  config: {
    name: 'Tag as Bug',
    parameters: {
      resource: 'issue',
      operation: 'update',
      issueId: '={{ $json.id }}',
      updateFields: {
        labelIds: ['bug-label-id']
      }
    },
    credentials: {
      linearApi: newCredential('Linear API')
    },
    position: [1140, 200]
  }
});

const tagAsFeature = node({
  type: 'n8n-nodes-base.linear',
  version: 1.1,
  config: {
    name: 'Tag as Feature',
    parameters: {
      resource: 'issue',
      operation: 'update',
      issueId: '={{ $json.id }}',
      updateFields: {
        labelIds: ['feature-label-id']
      }
    },
    credentials: {
      linearApi: newCredential('Linear API')
    },
    position: [1140, 400]
  }
});

export default workflow('AlNAxHXOpfimqHPOGVuNg', 'My workflow 23')
  .add(
    trigger({
      type: 'n8n-nodes-base.manualTrigger',
      version: 1,
      config: {
        name: 'Start',
        position: [240, 300]
      }
    })
    .to(
      node({
        type: 'n8n-nodes-base.linear',
        version: 1.1,
        config: {
          name: 'Get Linear Issues',
          parameters: {
            resource: 'issue',
            operation: 'getAll',
            returnAll: false,
            limit: 50
          },
          credentials: {
            linearApi: newCredential('Linear API')
          },
          position: [540, 300],
          onError: 'continueErrorOutput',
          pinData: [
            {
              id: 'ISS-123',
              identifier: 'ISS-123',
              title: 'Application crashes on startup',
              priority: 1,
              state: { id: 'state-1', name: 'Todo' },
              createdAt: '2024-01-15T10:00:00Z',
              creator: { id: 'user-1', displayName: 'John Doe' }
            }
          ]
        }
      })
      .onError(
        node({
          type: 'n8n-nodes-base.slack',
          version: 2.4,
          config: {
            name: 'Send Error to Slack',
            parameters: {
              resource: 'message',
              operation: 'post',
              select: 'channel',
              channelId: { mode: 'list', value: '', __rl: true },
              messageType: 'text',
              text: 'Error occurred'
            },
            credentials: {
              slackApi: newCredential('Slack Bot')
            },
            position: [840, 500]
          }
        })
      )
    )
    .to(triageSwitch.onCase(0, tagAsBug).onCase(1, tagAsFeature))
  );`;

			// This should not throw an error
			const parsedJson = parseWorkflowCode(code);

			expect(parsedJson.id).toBe('AlNAxHXOpfimqHPOGVuNg');
			expect(parsedJson.name).toBe('My workflow 23');
			expect(parsedJson.nodes.length).toBeGreaterThanOrEqual(5); // trigger + linear + slack + switch + 2 case nodes
		});
	});

	describe('parses multiple sticky notes', () => {
		it('should parse workflow code with multiple sticky notes', () => {
			// This code has 4 sticky notes added via .add()
			const code = `
// Create all nodes first
const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: {
    name: 'Start Research',
    position: [112, 400]
  }
});

const setTopic = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Set Research Topic',
    parameters: {
      mode: 'manual',
      duplicateItem: false,
      assignments: {},
      options: {}
    },
    position: [336, 400]
  }
});

// Research Agent and its subnodes
const researchModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1.3,
  config: {
    name: 'GPT-4.1-mini Model',
    parameters: {
      model: 'gpt-4.1-mini',
      options: {
        maxTokens: 4000,
        temperature: 0.3
      }
    },
    credentials: {
      openAiApi: newCredential('OpenAI API')
    },
    position: [576, 624]
  }
});

const webSearchTool = tool({
  type: '@n8n/n8n-nodes-langchain.toolCode',
  version: 1.3,
  config: {
    name: 'Web Search Simulator',
    parameters: {
      description: 'Simulates web search to find information about a topic.',
      language: 'javaScript',
      jsCode: 'return JSON.stringify([]);'
    },
    position: [704, 624]
  }
});

const researchAgent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Research Agent',
    parameters: {
      text: '={{ $json.chatInput }}',
      options: {}
    },
    subnodes: {
      model: researchModel,
      tools: [webSearchTool]
    },
    position: [560, 400]
  }
});

// Fact-Checking Agent
const factCheckModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1.3,
  config: {
    name: 'GPT-4.1-mini Fact Checker',
    parameters: {
      model: 'gpt-4.1-mini',
      options: { maxTokens: 3000, temperature: 0.1 }
    },
    credentials: {
      openAiApi: newCredential('OpenAI API')
    },
    position: [992, 624]
  }
});

const factCheckAgent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Fact-Checking Agent',
    parameters: {
      text: '={{ $json.chatInput }}',
      options: {}
    },
    subnodes: {
      model: factCheckModel
    },
    position: [912, 400]
  }
});

// Writing Agent
const writerModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1.3,
  config: {
    name: 'GPT-4.1-mini Writer',
    parameters: {
      model: 'gpt-4.1-mini',
      options: { maxTokens: 2500, temperature: 0.7 }
    },
    credentials: {
      openAiApi: newCredential('OpenAI API')
    },
    position: [1344, 624]
  }
});

const writingAgent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Writing Agent',
    parameters: {
      text: '={{ $json.chatInput }}',
      options: {}
    },
    subnodes: {
      model: writerModel
    },
    position: [1264, 400]
  }
});

// Editing Agent
const editorModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1.3,
  config: {
    name: 'GPT-4.1-mini Editor',
    parameters: {
      model: 'gpt-4.1-mini',
      options: { maxTokens: 3000, temperature: 0.4 }
    },
    credentials: {
      openAiApi: newCredential('OpenAI API')
    },
    position: [1696, 624]
  }
});

const editingAgent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Editing & Formatting Agent',
    parameters: {
      text: '={{ $json.chatInput }}',
      options: {}
    },
    subnodes: {
      model: editorModel
    },
    position: [1616, 400]
  }
});

// Create sticky notes for each agent
const researchSticky = sticky(
  '## Research Agent\\n\\n**Purpose:** Conducts initial research on the given topic',
  {
    nodes: [researchAgent, researchModel, webSearchTool],
    color: 5
  }
);

const factCheckSticky = sticky(
  '## Fact-Checking Agent\\n\\n**Purpose:** Verifies accuracy and credibility',
  {
    nodes: [factCheckAgent, factCheckModel],
    color: 6
  }
);

const writingSticky = sticky(
  '## Writing Agent\\n\\n**Purpose:** Transforms verified research into well-written content',
  {
    nodes: [writingAgent, writerModel],
    color: 4
  }
);

const editingSticky = sticky(
  '## Editing & Formatting Agent\\n\\n**Purpose:** Polishes content and formats as HTML',
  {
    nodes: [editingAgent, editorModel],
    color: 2
  }
);

// Build the workflow
export default workflow('test-multi-sticky', 'Multi-Agent Research Workflow')
  .add(startTrigger)
  .to(setTopic)
  .to(researchAgent)
  .to(factCheckAgent)
  .to(writingAgent)
  .to(editingAgent)
  .add(researchSticky)
  .add(factCheckSticky)
  .add(writingSticky)
  .add(editingSticky);
`;

			const parsedJson = parseWorkflowCode(code);

			// Verify we have all 4 sticky notes
			const stickyNotes = parsedJson.nodes.filter((n) => n.type === 'n8n-nodes-base.stickyNote');
			expect(stickyNotes).toHaveLength(4);

			// Verify each sticky content exists
			expect(
				stickyNotes.some((s) => (s.parameters?.content as string)?.includes('Research Agent')),
			).toBe(true);
			expect(
				stickyNotes.some((s) => (s.parameters?.content as string)?.includes('Fact-Checking Agent')),
			).toBe(true);
			expect(
				stickyNotes.some((s) => (s.parameters?.content as string)?.includes('Writing Agent')),
			).toBe(true);
			expect(
				stickyNotes.some((s) =>
					(s.parameters?.content as string)?.includes('Editing & Formatting Agent'),
				),
			).toBe(true);

			// Verify each sticky has a color set
			expect(stickyNotes.every((s) => s.parameters?.color !== undefined)).toBe(true);
		});

		it('should parse simple workflow code with multiple sticky notes without nodes option', () => {
			// Simpler test case without the nodes option
			const code = `
const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Start', position: [100, 300] }
});

const sticky1 = sticky('## Section 1\\n\\nFirst section', { color: 1, position: [50, 100] });
const sticky2 = sticky('## Section 2\\n\\nSecond section', { color: 2, position: [300, 100] });
const sticky3 = sticky('## Section 3\\n\\nThird section', { color: 3, position: [550, 100] });

export default workflow('test-simple-multi-sticky', 'Simple Multi-Sticky Workflow')
  .add(startTrigger)
  .add(sticky1)
  .add(sticky2)
  .add(sticky3);
`;

			const parsedJson = parseWorkflowCode(code);

			// Verify we have all 3 sticky notes
			const stickyNotes = parsedJson.nodes.filter((n) => n.type === 'n8n-nodes-base.stickyNote');
			expect(stickyNotes).toHaveLength(3);

			// Verify content
			expect(
				stickyNotes.some((s) => (s.parameters?.content as string)?.includes('Section 1')),
			).toBe(true);
			expect(
				stickyNotes.some((s) => (s.parameters?.content as string)?.includes('Section 2')),
			).toBe(true);
			expect(
				stickyNotes.some((s) => (s.parameters?.content as string)?.includes('Section 3')),
			).toBe(true);

			// Verify colors are distinct
			const colors = stickyNotes.map((s) => s.parameters?.color);
			expect(colors).toContain(1);
			expect(colors).toContain(2);
			expect(colors).toContain(3);
		});
	});

	describe('multi-trigger workflows with shared downstream nodes', () => {
		it('should preserve connections from both triggers when they share downstream targets', () => {
			// Bug B: Multi-trigger workflows where triggers share downstream nodes
			// Pattern: Two triggers both connect to the same downstream nodes
			// The first trigger's traversal marks downstream nodes as visited,
			// preventing the second trigger from establishing its connections
			const originalJson: WorkflowJSON = {
				id: 'multi-trigger-test',
				name: 'Multi-Trigger Shared Targets',
				nodes: [
					{
						id: 'trigger-1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'trigger-2',
						name: 'Schedule Trigger',
						type: 'n8n-nodes-base.scheduleTrigger',
						typeVersion: 1.2,
						position: [0, 200],
						parameters: {},
					},
					{
						id: 'shared-1',
						name: 'Shared Node A',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [200, 100],
						parameters: { mode: 'manual' },
					},
					{
						id: 'shared-2',
						name: 'Shared Node B',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4.2,
						position: [400, 100],
						parameters: { url: 'https://api.example.com' },
					},
				],
				connections: {
					// BOTH triggers connect to the same two nodes
					'Manual Trigger': {
						main: [
							[
								{ node: 'Shared Node A', type: 'main', index: 0 },
								{ node: 'Shared Node B', type: 'main', index: 0 },
							],
						],
					},
					'Schedule Trigger': {
						main: [
							[
								{ node: 'Shared Node A', type: 'main', index: 0 },
								{ node: 'Shared Node B', type: 'main', index: 0 },
							],
						],
					},
				},
			};

			const code = generateWorkflowCode(originalJson);
			const parsedJson = parseWorkflowCode(code);

			// Verify all nodes are present
			expect(parsedJson.nodes).toHaveLength(4);

			// CRITICAL: Both triggers must have connections to their shared targets
			expect(parsedJson.connections['Manual Trigger']).toBeDefined();
			const trigger1Targets = parsedJson.connections['Manual Trigger'].main[0]!.map((c) => c.node);
			expect(trigger1Targets).toContain('Shared Node A');
			expect(trigger1Targets).toContain('Shared Node B');

			expect(parsedJson.connections['Schedule Trigger']).toBeDefined();
			const trigger2Targets = parsedJson.connections['Schedule Trigger'].main[0]!.map(
				(c) => c.node,
			);
			expect(trigger2Targets).toContain('Shared Node A');
			expect(trigger2Targets).toContain('Shared Node B');
		});
	});

	describe('nodes with multiple output slots (classifier pattern)', () => {
		it('should preserve all branches when a regular node has multiple output slots', () => {
			// Bug A: Nodes with multiple output slots (like textClassifier) lose branches
			// Pattern: Node has 3 outputs, each going to a different target
			// The traversal only follows the first non-empty output slot
			const originalJson: WorkflowJSON = {
				id: 'classifier-test',
				name: 'Classifier Pattern Test',
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
						id: 'classifier-1',
						name: 'Text Classifier',
						type: '@n8n/n8n-nodes-langchain.textClassifier',
						typeVersion: 1.2,
						position: [200, 0],
						parameters: {},
					},
					{
						id: 'branch-a',
						name: 'Branch A Node',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [400, -100],
						parameters: {},
					},
					{
						id: 'branch-b',
						name: 'Branch B Node',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [400, 0],
						parameters: {},
					},
					{
						id: 'branch-c',
						name: 'Branch C Node',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [400, 100],
						parameters: {},
					},
				],
				connections: {
					Trigger: {
						main: [[{ node: 'Text Classifier', type: 'main', index: 0 }]],
					},
					// Text Classifier has 3 separate output slots
					'Text Classifier': {
						main: [
							[{ node: 'Branch A Node', type: 'main', index: 0 }], // output 0
							[{ node: 'Branch B Node', type: 'main', index: 0 }], // output 1
							[{ node: 'Branch C Node', type: 'main', index: 0 }], // output 2
						],
					},
				},
			};

			const code = generateWorkflowCode(originalJson);
			const parsedJson = parseWorkflowCode(code);

			// CRITICAL: All 5 nodes must be present
			expect(parsedJson.nodes).toHaveLength(5);

			// Verify all branch nodes exist
			const nodeNames = parsedJson.nodes.map((n) => n.name);
			expect(nodeNames).toContain('Branch A Node');
			expect(nodeNames).toContain('Branch B Node');
			expect(nodeNames).toContain('Branch C Node');

			// Verify Text Classifier has connections to all branches
			// Note: The codegen may output as fan-out (all on slot 0) rather than separate slots
			// The important thing is all targets are connected
			expect(parsedJson.connections['Text Classifier']).toBeDefined();
			const textClassifierTargets = parsedJson.connections['Text Classifier'].main
				.flat()
				.filter((c): c is NonNullable<typeof c> => c !== null)
				.map((c) => c.node);
			expect(textClassifierTargets).toContain('Branch A Node');
			expect(textClassifierTargets).toContain('Branch B Node');
			expect(textClassifierTargets).toContain('Branch C Node');
		});
	});

	describe('parses Code node jsCode with template literals', () => {
		it('should parse Code node with properly escaped template literals', () => {
			// When template literals are properly escaped with \$, they should work
			const code = `
export default workflow('test-id', 'Code Workflow')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }))
  .to(node({
    type: 'n8n-nodes-base.code',
    version: 2,
    config: {
      name: 'Process Data',
      parameters: {
        mode: 'runOnceForEachItem',
        jsCode: \`const data = $input.item.json;
const message = \\\`Processing item: \\\${data.name}\\\`;
return { json: { message } };\`
      }
    }
  }))
`;
			const parsedJson = parseWorkflowCode(code);
			const codeNode = parsedJson.nodes.find((n) => n.type === 'n8n-nodes-base.code');
			expect(codeNode).toBeDefined();
			// The jsCode should contain the template literal with ${data.name} preserved
			expect(codeNode?.parameters?.jsCode).toContain('${data.name}');
		});

		it('should escape and parse unescaped template expressions with non-n8n variables', () => {
			// BUG FIX TEST: When AI generates code with unescaped ${variable} in jsCode,
			// the parser should escape them to prevent "variable is not defined" errors.
			// This is the failing case from the user's workflow where the AI generated:
			//   jsCode: `...errors.push(\`Currency '${invoiceData.currency}' is not valid.\`);...`
			// The ${invoiceData.currency} should be escaped to \${invoiceData.currency}
			const code = `
export default workflow('test-id', 'Validation Workflow')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }))
  .to(node({
    type: 'n8n-nodes-base.code',
    version: 2,
    config: {
      name: 'Validate Data',
      parameters: {
        mode: 'runOnceForEachItem',
        jsCode: \`const errors = [];
const invoiceData = $input.item.json;
if (!invoiceData.currency) {
  errors.push(\\\`Currency '\${invoiceData.currency}' is not valid.\\\`);
}
return { json: { errors } };\`
      }
    }
  }))
`;
			// This should NOT throw "invoiceData is not defined" - it should escape and parse
			const parsedJson = parseWorkflowCode(code);
			const codeNode = parsedJson.nodes.find((n) => n.type === 'n8n-nodes-base.code');
			expect(codeNode).toBeDefined();
			// The jsCode should preserve the ${invoiceData.currency} as a literal string
			expect(codeNode?.parameters?.jsCode).toContain('${invoiceData.currency}');
		});

		it('should escape multiple unescaped template expressions in nested template literals', () => {
			// More complex case with multiple user-defined variables in template expressions
			const code = `
export default workflow('test-id', 'Complex Code')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }))
  .to(node({
    type: 'n8n-nodes-base.code',
    version: 2,
    config: {
      name: 'Format Output',
      parameters: {
        jsCode: \`const item = $input.item.json;
const result = \\\`Name: \${item.name}, Amount: \${item.amount}, Date: \${item.date}\\\`;
return { json: { result } };\`
      }
    }
  }))
`;
			const parsedJson = parseWorkflowCode(code);
			const codeNode = parsedJson.nodes.find((n) => n.type === 'n8n-nodes-base.code');
			expect(codeNode).toBeDefined();
			expect(codeNode?.parameters?.jsCode).toContain('${item.name}');
			expect(codeNode?.parameters?.jsCode).toContain('${item.amount}');
			expect(codeNode?.parameters?.jsCode).toContain('${item.date}');
		});
	});

	describe('SplitInBatches to Merge pattern', () => {
		it('should roundtrip SIB outputs to same merge at different inputs (Pattern 9)', () => {
			// Pattern 9: SIB.done → Merge:input0, SIB.each → Merge:input1
			// This tests the explicit connections pattern
			const originalJson: WorkflowJSON = {
				id: 'sib-merge-test',
				name: 'SIB to Merge Pattern',
				nodes: [
					{
						id: 'sib-1',
						name: 'Loop Over Items13',
						type: 'n8n-nodes-base.splitInBatches',
						typeVersion: 3,
						position: [0, 0],
						parameters: { options: {} },
					},
					{
						id: 'merge-1',
						name: 'Merge',
						type: 'n8n-nodes-base.merge',
						typeVersion: 3.2,
						position: [224, 0],
						parameters: {},
					},
				],
				connections: {
					'Loop Over Items13': {
						main: [
							[{ node: 'Merge', type: 'main', index: 0 }], // done → merge input 0
							[{ node: 'Merge', type: 'main', index: 1 }], // each → merge input 1
						],
					},
					Merge: {
						main: [[{ node: 'Loop Over Items13', type: 'main', index: 0 }]], // merge → SIB (loop back)
					},
				},
			};

			// Generate code
			const code = generateWorkflowCode(originalJson);

			// Parse back to JSON
			const parsedJson = parseWorkflowCode(code);

			// Verify nodes
			expect(parsedJson.nodes).toHaveLength(2);

			// Verify connections
			const sibConns = parsedJson.connections['Loop Over Items13'];
			expect(sibConns).toBeDefined();
			expect(sibConns.main[0]).toBeDefined();
			expect(sibConns.main[1]).toBeDefined();

			// SIB done (output 0) → Merge input 0
			const doneConn = sibConns.main[0]![0];
			expect(doneConn.node).toBe('Merge');
			expect(doneConn.index).toBe(0);

			// SIB each (output 1) → Merge input 1
			const eachConn = sibConns.main[1]![0];
			expect(eachConn.node).toBe('Merge');
			expect(eachConn.index).toBe(1);

			// Merge → SIB (loop back)
			const mergeConns = parsedJson.connections['Merge'];
			expect(mergeConns).toBeDefined();
			expect(mergeConns.main[0]![0].node).toBe('Loop Over Items13');
		});
	});

	describe('JSON-escaped code strings', () => {
		it('should parse code with escaped newlines (from JSON.stringify)', () => {
			// When code is passed through JSON.stringify, newlines become \\n
			// This is a common scenario when code is stored/transmitted as JSON
			const normalCode = `const myTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: {
    name: 'Start',
    position: [240, 400]
  }
});

export default workflow('test-id', 'Test Workflow')
  .add(myTrigger);`;

			// Simulate what happens when code goes through JSON
			const jsonEncoded = JSON.stringify(normalCode);
			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse -- Parsing test-controlled JSON.stringify output
			const jsonDecoded = JSON.parse(jsonEncoded) as string;

			// This should work - the JSON parse/stringify preserves newlines correctly
			expect(() => parseWorkflowCode(jsonDecoded)).not.toThrow();
			const parsedJson = parseWorkflowCode(jsonDecoded);
			expect(parsedJson.id).toBe('test-id');
			expect(parsedJson.name).toBe('Test Workflow');
		});

		it('should parse code with literal backslash-n sequences (double-escaped)', () => {
			// When code is double-escaped (e.g., JSON stringified twice, or from certain APIs),
			// the \\n becomes literal backslash-n characters in the string
			// This commonly happens when code is embedded in JSON that gets stringified again
			const codeWithLiteralBackslashN =
				"const myTrigger = trigger({\\n  type: 'n8n-nodes-base.manualTrigger',\\n  version: 1,\\n  config: {\\n    name: 'Start',\\n    position: [240, 400]\\n  }\\n});\\n\\nexport default workflow('test-id', 'Test Workflow')\\n  .add(myTrigger);";

			// The parser should handle this by converting \\n to actual newlines
			expect(() => parseWorkflowCode(codeWithLiteralBackslashN)).not.toThrow();
			const parsedJson = parseWorkflowCode(codeWithLiteralBackslashN);
			expect(parsedJson.id).toBe('test-id');
			expect(parsedJson.name).toBe('Test Workflow');
		});

		it('should parse code with escaped quotes in strings', () => {
			// Double-escaped quotes like \\" should be handled
			const codeWithEscapedQuotes =
				"const setNode = node({\\n  type: 'n8n-nodes-base.set',\\n  version: 3.4,\\n  config: {\\n    name: 'Set Data',\\n    parameters: {\\n      mode: 'manual',\\n      assignments: {\\n        assignments: [{\\n          id: 'msg',\\n          name: 'message',\\n          value: '={{ $json.error || \\\"Default message\\\" }}',\\n          type: 'string'\\n        }]\\n      }\\n    },\\n    position: [240, 400]\\n  }\\n});\\n\\nexport default workflow('test-id', 'Test')\\n  .add(setNode);";

			expect(() => parseWorkflowCode(codeWithEscapedQuotes)).not.toThrow();
			const parsedJson = parseWorkflowCode(codeWithEscapedQuotes);
			expect(parsedJson.id).toBe('test-id');
		});
	});

	describe('shared subnodes (one subnode used by multiple parents)', () => {
		it('should produce a single language model node connected to both agents', () => {
			const code = `
const sharedModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1.3,
  config: {
    name: 'Shared GPT-4o',
    parameters: { model: { mode: 'list', value: 'gpt-4o-mini' } }
  }
});

const agent1 = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Research Agent',
    parameters: { text: 'Research this topic' },
    subnodes: { model: sharedModel }
  }
});

const agent2 = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Writing Agent',
    parameters: { text: 'Write about this topic' },
    subnodes: { model: sharedModel }
  }
});

export default workflow('shared-model-test', 'Shared Model Test')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } })
    .to([agent1, agent2]));
`;
			const parsedJson = parseWorkflowCode(code);

			// Should have exactly 4 nodes: trigger, 2 agents, 1 shared model
			expect(parsedJson.nodes).toHaveLength(4);

			// Only ONE language model node should exist
			const modelNodes = parsedJson.nodes.filter(
				(n) => n.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			);
			expect(modelNodes).toHaveLength(1);
			expect(modelNodes[0].name).toBe('Shared GPT-4o');

			// The shared model should have ai_languageModel connections to BOTH agents
			const modelConnections = parsedJson.connections['Shared GPT-4o']?.ai_languageModel?.[0];
			expect(modelConnections).toBeDefined();
			expect(modelConnections).toHaveLength(2);
			const targetAgents = modelConnections!.map((c) => c.node).sort();
			expect(targetAgents).toEqual(['Research Agent', 'Writing Agent']);
		});

		it('should produce a single tool node connected to both agents', () => {
			const code = `
const sharedCalculator = tool({
  type: '@n8n/n8n-nodes-langchain.toolCalculator',
  version: 1,
  config: { name: 'Shared Calculator' }
});

const agent1 = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Math Agent',
    parameters: { text: 'Calculate this' },
    subnodes: {
      model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.3, config: { name: 'Model 1', parameters: { model: { mode: 'list', value: 'gpt-4o-mini' } } } }),
      tools: [sharedCalculator]
    }
  }
});

const agent2 = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Science Agent',
    parameters: { text: 'Calculate that' },
    subnodes: {
      model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.3, config: { name: 'Model 2', parameters: { model: { mode: 'list', value: 'gpt-4o-mini' } } } }),
      tools: [sharedCalculator]
    }
  }
});

export default workflow('shared-tool-test', 'Shared Tool Test')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } })
    .to([agent1, agent2]));
`;
			const parsedJson = parseWorkflowCode(code);

			// Should have 6 nodes: trigger, 2 agents, 2 models, 1 shared tool
			expect(parsedJson.nodes).toHaveLength(6);

			// Only ONE calculator tool node should exist
			const toolNodes = parsedJson.nodes.filter(
				(n) => n.type === '@n8n/n8n-nodes-langchain.toolCalculator',
			);
			expect(toolNodes).toHaveLength(1);
			expect(toolNodes[0].name).toBe('Shared Calculator');

			// The shared tool should have ai_tool connections to BOTH agents
			const toolConnections = parsedJson.connections['Shared Calculator']?.ai_tool?.[0];
			expect(toolConnections).toBeDefined();
			expect(toolConnections).toHaveLength(2);
			const targetAgents = toolConnections!.map((c) => c.node).sort();
			expect(targetAgents).toEqual(['Math Agent', 'Science Agent']);
		});

		it('should roundtrip JSON with shared language model through codegen', () => {
			// JSON → code → JSON: A single language model connected to 2 agents
			const originalJson: WorkflowJSON = {
				id: 'shared-model-roundtrip',
				name: 'Shared Model Roundtrip',
				nodes: [
					{
						id: 'trigger-1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'agent-1',
						name: 'Research Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 3.1,
						position: [200, -100],
						parameters: { text: 'Research this' },
					},
					{
						id: 'agent-2',
						name: 'Writing Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 3.1,
						position: [200, 100],
						parameters: { text: 'Write about this' },
					},
					{
						id: 'model-1',
						name: 'Shared GPT-4o',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						typeVersion: 1.3,
						position: [200, 0],
						parameters: { model: { mode: 'list', value: 'gpt-4o-mini' } },
					},
				],
				connections: {
					Start: {
						main: [
							[
								{ node: 'Research Agent', type: 'main', index: 0 },
								{ node: 'Writing Agent', type: 'main', index: 0 },
							],
						],
					},
					// Shared model connects to BOTH agents
					'Shared GPT-4o': {
						ai_languageModel: [
							[
								{ node: 'Research Agent', type: 'ai_languageModel', index: 0 },
								{ node: 'Writing Agent', type: 'ai_languageModel', index: 0 },
							],
						],
					},
				},
			};

			const code = generateWorkflowCode(originalJson);
			const parsedJson = parseWorkflowCode(code);

			// Should have exactly 4 nodes
			expect(parsedJson.nodes).toHaveLength(4);

			// Only ONE language model node
			const modelNodes = parsedJson.nodes.filter(
				(n) => n.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			);
			expect(modelNodes).toHaveLength(1);

			// The shared model should connect to BOTH agents
			const modelConnections = parsedJson.connections['Shared GPT-4o']?.ai_languageModel?.[0];
			expect(modelConnections).toBeDefined();
			expect(modelConnections).toHaveLength(2);
			const targetAgents = modelConnections!.map((c) => c.node).sort();
			expect(targetAgents).toEqual(['Research Agent', 'Writing Agent']);
		});

		it('should produce a single embedding node connected to both vector stores', () => {
			const code = `
const sharedEmbedding = embedding({
  type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
  version: 1.2,
  config: {
    name: 'Shared Embeddings',
    parameters: { model: 'text-embedding-3-small' }
  }
});

const vectorStore1 = node({
  type: '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
  version: 1,
  config: {
    name: 'Vector Store 1',
    parameters: {},
    subnodes: { embedding: sharedEmbedding }
  }
});

const vectorStore2 = node({
  type: '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
  version: 1,
  config: {
    name: 'Vector Store 2',
    parameters: {},
    subnodes: { embedding: sharedEmbedding }
  }
});

export default workflow('shared-embedding-test', 'Shared Embedding Test')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } })
    .to([vectorStore1, vectorStore2]));
`;
			const parsedJson = parseWorkflowCode(code);

			// Should have 4 nodes: trigger, 2 vector stores, 1 shared embedding
			expect(parsedJson.nodes).toHaveLength(4);

			// Only ONE embedding node should exist
			const embeddingNodes = parsedJson.nodes.filter(
				(n) => n.type === '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
			);
			expect(embeddingNodes).toHaveLength(1);
			expect(embeddingNodes[0].name).toBe('Shared Embeddings');

			// The shared embedding should have ai_embedding connections to BOTH vector stores
			const embeddingConnections = parsedJson.connections['Shared Embeddings']?.ai_embedding?.[0];
			expect(embeddingConnections).toBeDefined();
			expect(embeddingConnections).toHaveLength(2);
			const targetStores = embeddingConnections!.map((c) => c.node).sort();
			expect(targetStores).toEqual(['Vector Store 1', 'Vector Store 2']);
		});

		it('should handle same-named agents sharing a language model (auto-rename scenario)', () => {
			const code = `
const sharedModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1.3,
  config: {
    name: 'OpenAI Chat Model',
    parameters: { model: { mode: 'list', value: 'gpt-4o' } }
  }
});

const agent1 = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Generate Story Script',
    parameters: { text: 'Write act 1' },
    subnodes: { model: sharedModel }
  }
});

const agent2 = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Generate Story Script',
    parameters: { text: 'Write act 2' },
    subnodes: { model: sharedModel }
  }
});

export default workflow('same-name-agents', 'Same Name Agents')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } })
    .to([agent1, agent2]));
`;
			const parsedJson = parseWorkflowCode(code);

			// Should have 4 nodes: trigger, 2 agents (one renamed), 1 shared model
			expect(parsedJson.nodes).toHaveLength(4);

			// Two agent nodes should exist, one auto-renamed
			const agentNodes = parsedJson.nodes.filter(
				(n) => n.type === '@n8n/n8n-nodes-langchain.agent',
			);
			expect(agentNodes).toHaveLength(2);
			const agentNames = agentNodes.map((n) => n.name).sort();
			expect(agentNames).toEqual(['Generate Story Script', 'Generate Story Script 1']);

			// Only ONE language model node
			const modelNodes = parsedJson.nodes.filter(
				(n) => n.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			);
			expect(modelNodes).toHaveLength(1);

			// The shared model should connect to BOTH agents (using their actual map keys)
			const modelConnections = parsedJson.connections['OpenAI Chat Model']?.ai_languageModel?.[0];
			expect(modelConnections).toBeDefined();
			expect(modelConnections).toHaveLength(2);
			const targetAgents = modelConnections!.map((c) => c.node).sort();
			expect(targetAgents).toEqual(['Generate Story Script', 'Generate Story Script 1']);
		});
	});
});

describe('Codegen Roundtrip with Real Workflows', () => {
	// Download fixtures if needed (runs once before all tests in this file)
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
			// This test only runs if no workflows were loaded at parse time
			// After beforeAll downloads them, re-running tests should work
			expect(workflows.length).toBeGreaterThan(0);
		});
	} else {
		describe('generateWorkflowCode -> parseWorkflowCode roundtrip', () => {
			// Helper to check if an object looks like a resource locator
			const isResourceLocatorLike = (obj: unknown): obj is Record<string, unknown> => {
				if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return false;
				const record = obj as Record<string, unknown>;
				return 'mode' in record && 'value' in record;
			};

			// Helper to recursively add __rl: true to resource locator values
			const normalizeResourceLocators = (params: unknown): unknown => {
				if (typeof params !== 'object' || params === null) return params;
				if (Array.isArray(params)) return params.map(normalizeResourceLocators);

				const result: Record<string, unknown> = {};
				for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
					if (isResourceLocatorLike(value)) {
						result[key] = {
							__rl: true,
							...(normalizeResourceLocators(value) as Record<string, unknown>),
						};
					} else if (typeof value === 'object' && value !== null) {
						result[key] = normalizeResourceLocators(value);
					} else {
						result[key] = value;
					}
				}
				return result;
			};

			// Helper function to normalize expressions (strip leading = from ==)
			const normalizeExpressions = (value: unknown): unknown => {
				if (typeof value === 'string') {
					// Strip leading = from double-equals expressions (e.g., "=={{ $json.x }}" -> "={{ $json.x }}")
					return value.startsWith('==') ? value.slice(1) : value;
				}
				if (Array.isArray(value)) {
					return value.map(normalizeExpressions);
				}
				if (value && typeof value === 'object') {
					const result: Record<string, unknown> = {};
					for (const [k, v] of Object.entries(value)) {
						result[k] = normalizeExpressions(v);
					}
					return result;
				}
				return value;
			};

			// Helper function for normalizing parameters
			const normalizeParams = (p: unknown, nodeType: string) => {
				if (!p || typeof p !== 'object') return p;
				const obj = p as Record<string, unknown>;
				if (Object.keys(obj).length === 0) return undefined;
				if (nodeType === 'n8n-nodes-base.stickyNote' && obj.content === '') {
					const { content, ...rest } = obj;
					return Object.keys(rest).length === 0 ? undefined : rest;
				}
				// Normalize resource locators (add __rl: true) for fair comparison
				// since SDK-generated code adds __rl: true to all resource locators
				// Also normalize expressions (strip leading = from double-equals)
				return normalizeExpressions(normalizeResourceLocators(p));
			};

			// Helper function for filtering empty connections, orphaned connections (from non-existent nodes),
			// and dangling connections (to non-existent target nodes)
			const filterEmptyConnections = (
				conns: Record<string, unknown>,
				validNodeNames?: Set<string>,
			) => {
				const result: Record<string, unknown> = {};
				for (const [nodeName, nodeConns] of Object.entries(conns)) {
					// Skip connections from non-existent nodes (orphaned connections in original workflow)
					if (validNodeNames && !validNodeNames.has(nodeName)) {
						continue;
					}
					const nonEmptyTypes: Record<string, unknown> = {};
					for (const [connType, outputs] of Object.entries(
						nodeConns as Record<string, unknown[]>,
					)) {
						// Filter each output slot to remove connections to non-existent target nodes
						const filteredOutputs = (outputs || []).map((slot: unknown) => {
							if (!Array.isArray(slot)) return slot as unknown[];
							// Filter out connections to non-existent nodes
							if (validNodeNames) {
								return slot.filter(
									(conn: { node?: string }) => conn.node && validNodeNames.has(conn.node),
								) as unknown[];
							}
							return slot as unknown[];
						});
						// Only include non-empty output slots
						const nonEmptyOutputs = filteredOutputs.filter(
							(arr: unknown) => Array.isArray(arr) && arr.length > 0,
						);
						if (nonEmptyOutputs.length > 0) {
							nonEmptyTypes[connType] = filteredOutputs;
						}
					}
					if (Object.keys(nonEmptyTypes).length > 0) {
						result[nodeName] = nonEmptyTypes;
					}
				}
				return result;
			};

			// Helper to normalize warnings for comparison
			const normalizeWarning = (w: ExpectedWarning): string => `${w.code}:${w.nodeName ?? ''}`;

			// Generate individual test for each workflow
			workflows.forEach(({ id, name, json, nodeCount, expectedWarnings }) => {
				it(`should roundtrip workflow ${id}: "${name}" (${nodeCount} nodes)`, () => {
					// Generate TypeScript code
					const code = generateWorkflowCode(json);

					// Parse back to builder and JSON
					const builder = parseWorkflowCodeToBuilder(code);
					const parsedJson: WorkflowJSON = builder.toJSON();

					// Validate the parsed workflow
					if (!SKIP_VALIDATION_WORKFLOWS.has(id)) {
						const validationResult = builder.validate();

						// Get actual warnings
						const actualWarnings: ExpectedWarning[] = validationResult.warnings
							.map((w: { code: string; nodeName?: string }) => ({
								code: w.code,
								nodeName: w.nodeName,
							}))
							.sort((a: ExpectedWarning, b: ExpectedWarning) =>
								normalizeWarning(a).localeCompare(normalizeWarning(b)),
							);

						// Get expected warnings (from manifest or empty array)
						const expected = (expectedWarnings ?? []).sort(
							(a: ExpectedWarning, b: ExpectedWarning) =>
								normalizeWarning(a).localeCompare(normalizeWarning(b)),
						);

						// Compare warnings
						expect(actualWarnings).toEqual(expected);
					}

					// Verify basic structure
					expect(parsedJson.id ?? '').toBe(json.id ?? '');
					expect(parsedJson.name ?? '').toBe(json.name ?? '');

					// Verify node count
					expect(parsedJson.nodes).toHaveLength(json.nodes.length);

					// Verify all nodes are present by name
					for (const originalNode of json.nodes) {
						if (originalNode.name === undefined) continue;
						const parsedNode = parsedJson.nodes.find((n) => n.name === originalNode.name);
						expect(parsedNode).toBeDefined();

						if (parsedNode) {
							expect(parsedNode.type).toBe(originalNode.type);
							expect(parsedNode.typeVersion).toBe(originalNode.typeVersion);
							expect(normalizeParams(parsedNode.parameters, parsedNode.type)).toEqual(
								normalizeParams(originalNode.parameters, originalNode.type),
							);

							if (originalNode.credentials && Object.keys(originalNode.credentials).length > 0) {
								expect(parsedNode.credentials).toEqual(originalNode.credentials);
							}
						}
					}

					// Verify settings
					if (json.settings && Object.keys(json.settings).length > 0) {
						expect(parsedJson.settings).toEqual(json.settings);
					}

					// Filter connections from non-existent nodes (orphaned connections in original workflow)
					const validNodeNames = new Set(
						json.nodes.map((n) => n.name).filter((name): name is string => !!name),
					);
					const filteredOriginal = filterEmptyConnections(json.connections, validNodeNames);
					const filteredParsed = filterEmptyConnections(parsedJson.connections);
					expect(Object.keys(filteredParsed).sort()).toEqual(Object.keys(filteredOriginal).sort());
				});
			});
		});
	}
});
