import { generateWorkflowCode } from '../codegen';
import type { WorkflowJSON } from '../types/base';

describe('generateWorkflowCode', () => {
	it('should generate valid TypeScript for a simple workflow', () => {
		const json: WorkflowJSON = {
			id: 'test-123',
			name: 'My Test Workflow',
			nodes: [
				{
					id: 'node-1',
					name: 'Schedule Trigger',
					type: 'n8n-nodes-base.scheduleTrigger',
					typeVersion: 1.1,
					position: [0, 0],
					parameters: {
						rule: { interval: [{ field: 'hours', hour: 9 }] },
					},
				},
				{
					id: 'node-2',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [200, 0],
					parameters: {
						url: 'https://api.example.com/data',
						method: 'GET',
					},
				},
			],
			connections: {
				'Schedule Trigger': {
					main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
				},
			},
			settings: {
				timezone: 'America/New_York',
			},
		};

		const code = generateWorkflowCode(json);

		// Should have workflow declaration
		expect(code).toContain("workflow('test-123', 'My Test Workflow'");

		// Should have settings
		expect(code).toContain("timezone: 'America/New_York'");

		// Should have trigger node with object format
		expect(code).toContain("trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.1");

		// Should have regular node with object format
		expect(code).toContain("node({ type: 'n8n-nodes-base.httpRequest', version: 4.2");

		// Should have connection chain
		expect(code).toContain('.add(');
		expect(code).toContain('.then(');
	});

	it('should generate code for nodes with credentials', () => {
		const json: WorkflowJSON = {
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

		const code = generateWorkflowCode(json);

		expect(code).toContain('credentials:');
		expect(code).toContain("slackApi: { id: 'cred-123', name: 'My Slack' }");
	});

	it('should generate code for sticky notes', () => {
		const json: WorkflowJSON = {
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

		const code = generateWorkflowCode(json);

		expect(code).toContain("sticky('## Documentation\\n\\nThis is a note.'");
		expect(code).toContain('color: 4');
	});

	it('should handle branching with output indices', () => {
		const json: WorkflowJSON = {
			id: 'branch-test',
			name: 'Branch Test',
			nodes: [
				{
					id: 'if-1',
					name: 'IF',
					type: 'n8n-nodes-base.if',
					typeVersion: 2,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'true-1',
					name: 'True Handler',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [200, -100],
					parameters: {},
				},
				{
					id: 'false-1',
					name: 'False Handler',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [200, 100],
					parameters: {},
				},
			],
			connections: {
				IF: {
					main: [
						[{ node: 'True Handler', type: 'main', index: 0 }],
						[{ node: 'False Handler', type: 'main', index: 0 }],
					],
				},
			},
		};

		const code = generateWorkflowCode(json);

		// Should show branching
		expect(code).toContain('.output(0)');
		expect(code).toContain('.output(1)');
	});

	it('should escape special characters in strings', () => {
		const json: WorkflowJSON = {
			id: 'escape-test',
			name: "Workflow with 'quotes' and\nnewlines",
			nodes: [
				{
					id: 'node-1',
					name: 'Code',
					type: 'n8n-nodes-base.code',
					typeVersion: 2,
					position: [0, 0],
					parameters: {
						jsCode: "const x = 'hello';\nreturn x;",
					},
				},
			],
			connections: {},
		};

		const code = generateWorkflowCode(json);

		// Should properly escape
		expect(code).toContain("\\'quotes\\'");
		expect(code).toContain('\\n');
	});
});
