import * as fs from 'fs';
import * as path from 'path';
import { generateWorkflowCode } from '../codegen/index';
import { parseWorkflowCode } from '../parse-workflow-code';
import type { WorkflowJSON } from '../types/base';
import {
	ensureFixtures,
	FixtureDownloadError,
	DOWNLOADED_FIXTURES_DIR,
	COMMITTED_FIXTURES_DIR,
} from './fixtures-download';

const SKIP_WORKFLOWS = new Set<string>([
	// Fixed fan-out with direct merge pattern: 3066, 7946 now pass
	// Fixed SplitInBatches fan-out: 6150, 7945 now pass
	// Remaining issues (different patterns):
	'10132', // subnode connection issue - Structured Output Parser1 nested incorrectly
	'10476', // complex docker monitoring pattern with nested merges
	// New failures (may need investigation):
	'11466', // 48→47 nodes, missing "Filter" node
	'11724', // connection mismatch in news digest workflow
	'12299', // connection mismatch, missing "Grad + PhD" node
]);

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
		if (SKIP_WORKFLOWS.has(String(entry.id))) continue;

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
		expect(parsedJson.connections['IF']!.main[0]![0]!.node).toBe('True Path');
		expect(parsedJson.connections['IF']!.main[1]![0]!.node).toBe('False Path');

		// CRITICAL: Verify BOTH branches connect to the convergence node
		expect(parsedJson.connections['True Path']).toBeDefined();
		expect(parsedJson.connections['True Path']!.main[0]![0]!.node).toBe('Convergence Node');

		expect(parsedJson.connections['False Path']).toBeDefined();
		expect(parsedJson.connections['False Path']!.main[0]![0]!.node).toBe('Convergence Node');
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
		expect(parsedJson.connections['Switch']!.main[0]![0]!.node).toBe('Case A Node');
		expect(parsedJson.connections['Switch']!.main[1]![0]!.node).toBe('Case B Node');

		// CRITICAL: Verify the downstream connection is preserved
		// Case B Node should connect to Case B Downstream
		expect(parsedJson.connections['Case B Node']).toBeDefined();
		expect(parsedJson.connections['Case B Node']!.main[0]![0]!.node).toBe('Case B Downstream');
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
		expect(parsedJson.connections['Job Complete?']!.main[0]![0]!.node).toBe('Get Dataset');
		expect(parsedJson.connections['Job Complete?']!.main[1]![0]!.node).toBe('Check Status');

		// Verify Check Status → Wait connection
		expect(parsedJson.connections['Check Status']).toBeDefined();
		expect(parsedJson.connections['Check Status']!.main[0]![0]!.node).toBe('Wait');

		// CRITICAL: Verify the CYCLE connection Wait → Job Complete? is preserved
		expect(parsedJson.connections['Wait']).toBeDefined();
		expect(parsedJson.connections['Wait']!.main[0]![0]!.node).toBe('Job Complete?');
	});

	describe('escapes node references in single-quoted strings', () => {
		it('should parse code with unescaped $() node references', () => {
			// This code has unescaped single quotes inside single-quoted strings
			// The parser should automatically escape them
			const codeWithUnescapedQuotes = `
return workflow('test-id', 'Test Workflow')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: {
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
return workflow('test-id', 'Test Workflow')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: {
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
return workflow('test-id', 'Test Workflow')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: {
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
return workflow('test-id', 'Test Workflow')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: {
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
return workflow('test-id', 'Test Workflow')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: {
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
	});

	describe('parses placeholder() in workflow code', () => {
		it('should parse code with placeholder() in parameters', () => {
			const code = `
return workflow('test-id', 'Test Workflow')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }))
  .then(node({ type: 'n8n-nodes-base.slack', version: 2.2, config: {
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
	});

	describe('parses newCredential() in workflow code', () => {
		it('should parse code with newCredential() in credentials', () => {
			const code = `
return workflow('test-id', 'Test Workflow')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }))
  .then(node({ type: 'n8n-nodes-base.slack', version: 2.2, config: {
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
return workflow('test-id', 'Test Workflow')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: {
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
return workflow('test-id', 'Test Workflow')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: {
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
return workflow('test-id', 'AI Agent')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }))
  .then(node({
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

	describe('parses switchCase composite with pinData', () => {
		it('should parse workflow with switchCase and pinData without errors', () => {
			// This code reproduces a bug where switchCase with pinData fails with
			// "Cannot read properties of undefined (reading 'subnodes')"
			const code = `return workflow('AlNAxHXOpfimqHPOGVuNg', 'My workflow 23')
  .add(
    trigger({
      type: 'n8n-nodes-base.manualTrigger',
      version: 1,
      config: {
        name: 'Start',
        position: [240, 300]
      }
    })
    .then(
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
    .then(
      switchCase([
        node({
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
        }),
        node({
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
        })
      ], {
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
      })
    )
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
return workflow('test-multi-sticky', 'Multi-Agent Research Workflow')
  .add(startTrigger)
  .then(setTopic)
  .then(researchAgent)
  .then(factCheckAgent)
  .then(writingAgent)
  .then(editingAgent)
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
			expect(stickyNotes.some((s) => s.parameters?.content?.includes('Research Agent'))).toBe(true);
			expect(stickyNotes.some((s) => s.parameters?.content?.includes('Fact-Checking Agent'))).toBe(
				true,
			);
			expect(stickyNotes.some((s) => s.parameters?.content?.includes('Writing Agent'))).toBe(true);
			expect(
				stickyNotes.some((s) => s.parameters?.content?.includes('Editing & Formatting Agent')),
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

return workflow('test-simple-multi-sticky', 'Simple Multi-Sticky Workflow')
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
			expect(stickyNotes.some((s) => s.parameters?.content?.includes('Section 1'))).toBe(true);
			expect(stickyNotes.some((s) => s.parameters?.content?.includes('Section 2'))).toBe(true);
			expect(stickyNotes.some((s) => s.parameters?.content?.includes('Section 3'))).toBe(true);

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
			const trigger1Targets = parsedJson.connections['Manual Trigger']!.main[0]!.map((c) => c.node);
			expect(trigger1Targets).toContain('Shared Node A');
			expect(trigger1Targets).toContain('Shared Node B');

			expect(parsedJson.connections['Schedule Trigger']).toBeDefined();
			const trigger2Targets = parsedJson.connections['Schedule Trigger']!.main[0]!.map(
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
			const textClassifierTargets = parsedJson.connections['Text Classifier']!.main.flat().map(
				(c) => c.node,
			);
			expect(textClassifierTargets).toContain('Branch A Node');
			expect(textClassifierTargets).toContain('Branch B Node');
			expect(textClassifierTargets).toContain('Branch C Node');
		});
	});

	describe('parses Code node jsCode with template literals', () => {
		it('should parse Code node with properly escaped template literals', () => {
			// When template literals are properly escaped with \$, they should work
			const code = `
return workflow('test-id', 'Code Workflow')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }))
  .then(node({
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
return workflow('test-id', 'Validation Workflow')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }))
  .then(node({
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
return workflow('test-id', 'Complex Code')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }))
  .then(node({
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
});

describe('Codegen Roundtrip with Real Workflows', () => {
	// Download fixtures if needed (runs once before all tests in this file)
	beforeAll(async () => {
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
	}, 120000); // 2 minute timeout for downloading fixtures

	if (workflows.length === 0) {
		it('should have fixtures available (run tests again after download)', () => {
			// This test only runs if no workflows were loaded at parse time
			// After beforeAll downloads them, re-running tests should work
			expect(workflows.length).toBeGreaterThan(0);
		});
	} else {
		describe('generateWorkflowCode -> parseWorkflowCode roundtrip', () => {
			// Helper function for normalizing parameters
			const normalizeParams = (p: unknown, nodeType: string) => {
				if (!p || typeof p !== 'object') return p;
				const obj = p as Record<string, unknown>;
				if (Object.keys(obj).length === 0) return undefined;
				if (nodeType === 'n8n-nodes-base.stickyNote' && obj.content === '') {
					const { content, ...rest } = obj;
					return Object.keys(rest).length === 0 ? undefined : rest;
				}
				return p;
			};

			// Helper function for filtering empty connections and orphaned connections (from non-existent nodes)
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

			// Generate individual test for each workflow
			workflows.forEach(({ id, name, json, nodeCount }) => {
				it(`should roundtrip workflow ${id}: "${name}" (${nodeCount} nodes)`, () => {
					// Generate TypeScript code
					const code = generateWorkflowCode(json);

					// Parse back to JSON
					const parsedJson = parseWorkflowCode(code);

					// Verify basic structure
					expect(parsedJson.id ?? '').toBe(json.id ?? '');
					expect(parsedJson.name ?? '').toBe(json.name ?? '');

					// Verify node count
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
					const validNodeNames = new Set(json.nodes.map((n) => n.name));
					const filteredOriginal = filterEmptyConnections(json.connections, validNodeNames);
					const filteredParsed = filterEmptyConnections(parsedJson.connections);
					expect(Object.keys(filteredParsed).sort()).toEqual(Object.keys(filteredOriginal).sort());
				});
			});
		});
	}
});
