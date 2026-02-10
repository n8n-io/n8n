import { generateWorkflowCode } from './index';
import { parseWorkflowCode } from './parse-workflow-code';
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

		// Should have trigger node variable declaration
		expect(code).toContain('const schedule_Trigger = trigger({');
		expect(code).toContain("type: 'n8n-nodes-base.scheduleTrigger'");

		// Should have regular node variable declaration
		expect(code).toContain('const hTTP_Request = node({');
		expect(code).toContain("type: 'n8n-nodes-base.httpRequest'");

		// Should have connection chain
		expect(code).toContain('.add(');
		expect(code).toContain('.to(');
	});

	it('should output expression strings using expr() helper', () => {
		const json: WorkflowJSON = {
			id: 'expr-test',
			name: 'Expression Test',
			nodes: [
				{
					id: 'node-1',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
				},
				{
					id: 'node-2',
					name: 'Set',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [200, 0],
					parameters: {
						assignments: {
							assignments: [
								{
									name: 'greeting',
									value: '=Hello {{ $json.name }}',
								},
								{
									name: 'data',
									value: '={{ $json.field }}',
								},
							],
						},
					},
				},
			],
			connections: {
				'Manual Trigger': {
					main: [[{ node: 'Set', type: 'main', index: 0 }]],
				},
			},
		};

		const code = generateWorkflowCode(json);

		// Expressions should be output using expr() helper, not as raw strings
		expect(code).toContain("expr('Hello {{ $json.name }}')");
		expect(code).toContain("expr('{{ $json.field }}')");
		// Should NOT contain raw expression strings
		expect(code).not.toMatch(/'=Hello \{\{ \$json\.name \}\}'/);
		expect(code).not.toMatch(/'=\{\{ \$json\.field \}\}'/);
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

	it('should handle IF branching with fluent API', () => {
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

		// Should use fluent API instead of .output()
		expect(code).toContain('.onTrue(');
		expect(code).toContain('.onFalse(');
		expect(code).not.toContain('.output(0)');
		expect(code).not.toContain('.output(1)');
	});

	it('should handle single-branch IF nodes', () => {
		const json: WorkflowJSON = {
			id: 'single-branch-test',
			name: 'Single Branch Test',
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
			],
			connections: {
				IF: {
					main: [[{ node: 'True Handler', type: 'main', index: 0 }]],
				},
			},
		};

		const code = generateWorkflowCode(json);

		// Should use fluent API with only onTrue (no onFalse since false branch is missing)
		expect(code).toContain('.onTrue(');
		expect(code).not.toContain('.onFalse(');
	});

	it('should roundtrip single-branch IF node with downstream connections', () => {
		// This reproduces the bug from workflow 5895: IF node with only true branch,
		// and the true branch node has downstream connections that get lost
		const originalJson: WorkflowJSON = {
			id: 'single-branch-roundtrip',
			name: 'Single Branch Roundtrip Test',
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
					id: 'if-1',
					name: 'IF',
					type: 'n8n-nodes-base.if',
					typeVersion: 2.2,
					position: [200, 0],
					parameters: {},
				},
				{
					id: 'true-1',
					name: 'True Branch',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [400, 0],
					parameters: { mode: 'manual' },
				},
				{
					id: 'downstream-1',
					name: 'Downstream Node',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [600, 0],
					parameters: { url: 'https://api.example.com' },
				},
				{
					id: 'downstream-2',
					name: 'Final Node',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [800, 0],
					parameters: {},
				},
			],
			connections: {
				'Manual Trigger': {
					main: [[{ node: 'IF', type: 'main', index: 0 }]],
				},
				IF: {
					// Only true branch (output 0) is connected, no false branch
					main: [[{ node: 'True Branch', type: 'main', index: 0 }]],
				},
				'True Branch': {
					main: [[{ node: 'Downstream Node', type: 'main', index: 0 }]],
				},
				'Downstream Node': {
					main: [[{ node: 'Final Node', type: 'main', index: 0 }]],
				},
			},
		};

		// Generate code and parse back
		const code = generateWorkflowCode(originalJson);
		const parsedJson = parseWorkflowCode(code);

		// Verify all nodes are preserved
		expect(parsedJson.nodes).toHaveLength(originalJson.nodes.length);

		// Critical: verify downstream connections from True Branch are preserved
		const trueBranchConns = parsedJson.connections['True Branch'];
		expect(trueBranchConns).toBeDefined();
		expect(trueBranchConns.main[0]![0].node).toBe('Downstream Node');

		const downstreamConns = parsedJson.connections['Downstream Node'];
		expect(downstreamConns).toBeDefined();
		expect(downstreamConns.main[0]![0].node).toBe('Final Node');
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

	it('should generate code with variables-first format', () => {
		const json: WorkflowJSON = {
			id: 'test-return',
			name: 'Test Return',
			nodes: [],
			connections: {},
		};

		const code = generateWorkflowCode(json);

		// Should start with const wf = workflow(...)
		expect(code).toMatch(/^const wf = workflow\(/);
		// Should end with export default wf
		expect(code.trim()).toMatch(/export default wf$/);
	});

	it('should not end with semicolon', () => {
		const json: WorkflowJSON = {
			id: 'test-no-semi',
			name: 'Test No Semicolon',
			nodes: [],
			connections: {},
		};

		const code = generateWorkflowCode(json);

		expect(code.trim()).not.toMatch(/;$/);
	});
});

// =============================================================================
// AI Subnode Codegen Tests
// =============================================================================

describe('generateWorkflowCode with AI subnodes', () => {
	it('should generate subnode config for AI agent with model', () => {
		const json: WorkflowJSON = {
			id: 'ai-agent-test',
			name: 'AI Agent with Model',
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
					id: 'agent-1',
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 1.7,
					position: [200, 0],
					parameters: {
						promptType: 'define',
						text: 'Hello, how can I help?',
					},
				},
				{
					id: 'model-1',
					name: 'OpenAI Model',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					typeVersion: 1.2,
					position: [200, 200],
					parameters: {
						model: 'gpt-4',
					},
				},
			],
			connections: {
				'Manual Trigger': {
					main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
				},
				'OpenAI Model': {
					ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
				},
			},
		};

		const code = generateWorkflowCode(json);

		// Should NOT have standalone model node as .add() call
		expect(code).not.toMatch(/\.add\(node\(\{\s*type:\s*'@n8n\/n8n-nodes-langchain\.lmChatOpenAi'/);

		// Should have subnode as a variable declaration
		expect(code).toMatch(/const \w+ = languageModel\(/);
		expect(code).toContain("type: '@n8n/n8n-nodes-langchain.lmChatOpenAi'");
		// Should reference the variable in subnodes config
		expect(code).toContain('subnodes:');
		expect(code).toMatch(/model: \w+/); // Variable reference, not inline call
	});

	it('should generate subnode config for AI agent with multiple subnodes', () => {
		const json: WorkflowJSON = {
			id: 'ai-multi-subnode',
			name: 'AI Agent with Multiple Subnodes',
			nodes: [
				{
					id: 'agent-1',
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 1.7,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'model-1',
					name: 'OpenAI Model',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					typeVersion: 1.2,
					position: [0, 200],
					parameters: { model: 'gpt-4' },
				},
				{
					id: 'tool-1',
					name: 'Code Tool',
					type: '@n8n/n8n-nodes-langchain.toolCode',
					typeVersion: 1.1,
					position: [0, 300],
					parameters: { code: 'return "test"' },
				},
				{
					id: 'tool-2',
					name: 'Calculator Tool',
					type: '@n8n/n8n-nodes-langchain.toolCalculator',
					typeVersion: 1,
					position: [0, 400],
					parameters: {},
				},
				{
					id: 'memory-1',
					name: 'Buffer Memory',
					type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
					typeVersion: 1.2,
					position: [0, 500],
					parameters: { contextWindowLength: 5 },
				},
			],
			connections: {
				'OpenAI Model': {
					ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
				},
				'Code Tool': {
					ai_tool: [[{ node: 'AI Agent', type: 'ai_tool', index: 0 }]],
				},
				'Calculator Tool': {
					ai_tool: [[{ node: 'AI Agent', type: 'ai_tool', index: 0 }]],
				},
				'Buffer Memory': {
					ai_memory: [[{ node: 'AI Agent', type: 'ai_memory', index: 0 }]],
				},
			},
		};

		const code = generateWorkflowCode(json);

		// Should have all subnodes as variable declarations
		expect(code).toMatch(/const \w+ = languageModel\(/);
		expect(code).toMatch(/const \w+ = memory\(/);
		expect(code).toMatch(/const \w+ = tool\(/);
		// Should reference variables in subnodes config
		expect(code).toContain('subnodes:');
		expect(code).toMatch(/model: \w+/); // Variable reference
		expect(code).toMatch(/memory: \w+/); // Variable reference
		expect(code).toMatch(/tools: \[\w+, \w+\]/); // Variable references in array

		// Should NOT have standalone subnode .add() calls
		expect(code).not.toMatch(/\.add\(node\(\{\s*type:\s*'@n8n\/n8n-nodes-langchain\.lmChatOpenAi'/);
		expect(code).not.toMatch(/\.add\(node\(\{\s*type:\s*'@n8n\/n8n-nodes-langchain\.toolCode'/);
		expect(code).not.toMatch(
			/\.add\(node\(\{\s*type:\s*'@n8n\/n8n-nodes-langchain\.memoryBufferWindow'/,
		);
	});

	it('should handle output parser subnode', () => {
		const json: WorkflowJSON = {
			id: 'output-parser-test',
			name: 'Agent with Output Parser',
			nodes: [
				{
					id: 'agent-1',
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 1.7,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'model-1',
					name: 'OpenAI Model',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					typeVersion: 1.2,
					position: [0, 200],
					parameters: {},
				},
				{
					id: 'parser-1',
					name: 'Structured Parser',
					type: '@n8n/n8n-nodes-langchain.outputParserStructured',
					typeVersion: 1,
					position: [0, 300],
					parameters: { schemaType: 'manual' },
				},
			],
			connections: {
				'OpenAI Model': {
					ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
				},
				'Structured Parser': {
					ai_outputParser: [[{ node: 'AI Agent', type: 'ai_outputParser', index: 0 }]],
				},
			},
		};

		const code = generateWorkflowCode(json);

		// Should have the outputParser subnode as a variable declaration
		expect(code).toMatch(/const \w+ = outputParser\(/);
		// Should reference the variable in subnodes config
		expect(code).toMatch(/outputParser: \w+/); // Variable reference, not inline call
	});

	it('should roundtrip AI connections correctly', () => {
		const originalJson: WorkflowJSON = {
			id: 'ai-roundtrip',
			name: 'AI Roundtrip Test',
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
					id: 'agent-1',
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 1.7,
					position: [200, 0],
					parameters: { promptType: 'auto' },
				},
				{
					id: 'model-1',
					name: 'OpenAI Model',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					typeVersion: 1.2,
					position: [200, 200],
					parameters: { model: 'gpt-4' },
				},
			],
			connections: {
				'Manual Trigger': {
					main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
				},
				'OpenAI Model': {
					ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
				},
			},
		};

		// Generate code and parse back
		const code = generateWorkflowCode(originalJson);
		const parsedJson = parseWorkflowCode(code);

		// Verify AI connections are preserved
		expect(parsedJson.connections['OpenAI Model']).toBeDefined();
		expect(parsedJson.connections['OpenAI Model'].ai_languageModel).toBeDefined();
		expect(parsedJson.connections['OpenAI Model'].ai_languageModel[0]![0].node).toBe('AI Agent');
		expect(parsedJson.connections['OpenAI Model'].ai_languageModel[0]![0].type).toBe(
			'ai_languageModel',
		);
	});

	it('should preserve disconnected AI nodes with their subnodes', () => {
		// Workflow with a disconnected AI agent that has a model subnode
		const json: WorkflowJSON = {
			id: 'disconnected-ai-test',
			name: 'Disconnected AI Test',
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
					id: 'http-1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [200, 0],
					parameters: { url: 'https://api.example.com' },
				},
				// Disconnected AI Agent (not connected to the trigger chain)
				{
					id: 'agent-1',
					name: 'Disconnected AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 1.7,
					position: [0, 300],
					parameters: { promptType: 'auto' },
				},
				// Model subnode connected to the disconnected agent
				{
					id: 'model-1',
					name: 'OpenAI Model',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					typeVersion: 1.2,
					position: [0, 500],
					parameters: { model: 'gpt-4' },
				},
			],
			connections: {
				'Manual Trigger': {
					main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
				},
				// AI connection - model is subnode of the disconnected agent
				'OpenAI Model': {
					ai_languageModel: [
						[{ node: 'Disconnected AI Agent', type: 'ai_languageModel', index: 0 }],
					],
				},
			},
		};

		const code = generateWorkflowCode(json);

		// Should include the disconnected AI agent
		expect(code).toContain('Disconnected AI Agent');
		// Should have the model subnode as a variable declaration
		expect(code).toMatch(/const \w+ = languageModel\(/);
		// Should reference the variable in subnodes config
		expect(code).toContain('subnodes:');
		expect(code).toMatch(/model: \w+/); // Variable reference, not inline call
	});

	it('should roundtrip disconnected AI nodes correctly', () => {
		const originalJson: WorkflowJSON = {
			id: 'disconnected-ai-roundtrip',
			name: 'Disconnected AI Roundtrip Test',
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
					id: 'http-1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [200, 0],
					parameters: { url: 'https://api.example.com' },
				},
				// Disconnected AI Agent
				{
					id: 'agent-1',
					name: 'Disconnected Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 1.7,
					position: [0, 300],
					parameters: { promptType: 'auto' },
				},
				// Model subnode
				{
					id: 'model-1',
					name: 'OpenAI Model',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					typeVersion: 1.2,
					position: [0, 500],
					parameters: { model: 'gpt-4' },
				},
			],
			connections: {
				'Manual Trigger': {
					main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
				},
				'OpenAI Model': {
					ai_languageModel: [[{ node: 'Disconnected Agent', type: 'ai_languageModel', index: 0 }]],
				},
			},
		};

		// Generate code and parse back
		const code = generateWorkflowCode(originalJson);
		const parsedJson = parseWorkflowCode(code);

		// Verify all nodes are preserved
		expect(parsedJson.nodes).toHaveLength(originalJson.nodes.length);

		// Verify the agent node exists
		const agentNode = parsedJson.nodes.find((n) => n.name === 'Disconnected Agent');
		expect(agentNode).toBeDefined();

		// Verify the model node exists
		const modelNode = parsedJson.nodes.find((n) => n.name === 'OpenAI Model');
		expect(modelNode).toBeDefined();

		// Verify AI connection is preserved
		const modelConns = parsedJson.connections['OpenAI Model'];
		expect(modelConns).toBeDefined();
		expect(modelConns.ai_languageModel).toBeDefined();
	});

	it('should handle embedding subnode for vector store', () => {
		const json: WorkflowJSON = {
			id: 'embedding-test',
			name: 'Vector Store with Embedding',
			nodes: [
				{
					id: 'vs-1',
					name: 'Pinecone Store',
					type: '@n8n/n8n-nodes-langchain.vectorStorePinecone',
					typeVersion: 1,
					position: [0, 0],
					parameters: { indexName: 'test' },
				},
				{
					id: 'emb-1',
					name: 'OpenAI Embeddings',
					type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
					typeVersion: 1,
					position: [0, 200],
					parameters: { model: 'text-embedding-ada-002' },
				},
			],
			connections: {
				'OpenAI Embeddings': {
					ai_embedding: [[{ node: 'Pinecone Store', type: 'ai_embedding', index: 0 }]],
				},
			},
		};

		const code = generateWorkflowCode(json);

		// Should have the embedding subnode as a variable declaration
		expect(code).toMatch(/const \w+ = embedding\(/);
		// Should reference the variable in subnodes config
		expect(code).toMatch(/embedding: \w+/); // Variable reference, not inline call
	});

	describe('complex connection patterns', () => {
		it('should generate [a, b] array for fan-out patterns', () => {
			const json: WorkflowJSON = {
				id: 'fan-out-test',
				name: 'Fan-Out Workflow',
				nodes: [
					{
						id: 'trigger-1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: 'source-1',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4.2,
						position: [200, 0],
						parameters: { url: 'https://api.example.com' },
					},
					{
						id: 'target-1',
						name: 'Process A',
						type: 'n8n-nodes-base.code',
						typeVersion: 2,
						position: [400, -100],
						parameters: { jsCode: 'return items' },
					},
					{
						id: 'target-2',
						name: 'Process B',
						type: 'n8n-nodes-base.code',
						typeVersion: 2,
						position: [400, 100],
						parameters: { jsCode: 'return items' },
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
					},
					'HTTP Request': {
						main: [
							[
								{ node: 'Process A', type: 'main', index: 0 },
								{ node: 'Process B', type: 'main', index: 0 },
							],
						],
					},
				},
			};

			const code = generateWorkflowCode(json);

			// All nodes are variables in the variables-first format
			expect(code).toContain('const process_A = node({');
			expect(code).toContain('const process_B = node({');

			// Should use plain array syntax for fan-out with variable references
			expect(code).toContain('[');
			// Both target variables should be in the array
			expect(code).toMatch(/\.to\(\[\s*process_A,\s*process_B\s*\]\)/);
		});

		it('should roundtrip fan-out patterns correctly', () => {
			const originalJson: WorkflowJSON = {
				id: 'fan-out-roundtrip',
				name: 'Fan-Out Roundtrip Test',
				nodes: [
					{
						id: 'trigger-1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: 'source-1',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4.2,
						position: [200, 0],
						parameters: { url: 'https://api.example.com' },
					},
					{
						id: 'target-1',
						name: 'Process A',
						type: 'n8n-nodes-base.code',
						typeVersion: 2,
						position: [400, -100],
						parameters: { jsCode: 'return items' },
					},
					{
						id: 'target-2',
						name: 'Process B',
						type: 'n8n-nodes-base.code',
						typeVersion: 2,
						position: [400, 100],
						parameters: { jsCode: 'return items' },
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
					},
					'HTTP Request': {
						main: [
							[
								{ node: 'Process A', type: 'main', index: 0 },
								{ node: 'Process B', type: 'main', index: 0 },
							],
						],
					},
				},
			};

			// Generate code and parse back
			const code = generateWorkflowCode(originalJson);
			const parsedJson = parseWorkflowCode(code);

			// Verify all nodes are preserved
			expect(parsedJson.nodes).toHaveLength(originalJson.nodes.length);

			// Verify fan-out connections are preserved
			const httpConnections = parsedJson.connections['HTTP Request'];
			expect(httpConnections).toBeDefined();
			expect(httpConnections.main[0]).toHaveLength(2);
			expect(httpConnections.main[0]!.map((c) => c.node).sort()).toEqual([
				'Process A',
				'Process B',
			]);
		});

		it('should generate .input(n) syntax for fan-in merge patterns', () => {
			const json: WorkflowJSON = {
				id: 'merge-test',
				name: 'Merge Workflow',
				nodes: [
					{
						id: 'trigger-1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: 'source-1',
						name: 'Source 1',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4.2,
						position: [200, -100],
						parameters: { url: 'https://api1.example.com' },
					},
					{
						id: 'source-2',
						name: 'Source 2',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4.2,
						position: [200, 100],
						parameters: { url: 'https://api2.example.com' },
					},
					{
						id: 'merge-1',
						name: 'Merge',
						type: 'n8n-nodes-base.merge',
						typeVersion: 3.2,
						position: [400, 0],
						parameters: { mode: 'append' },
					},
				],
				connections: {
					'Manual Trigger': {
						main: [
							[
								{ node: 'Source 1', type: 'main', index: 0 },
								{ node: 'Source 2', type: 'main', index: 0 },
							],
						],
					},
					'Source 1': {
						main: [[{ node: 'Merge', type: 'main', index: 0 }]],
					},
					'Source 2': {
						main: [[{ node: 'Merge', type: 'main', index: 1 }]],
					},
				},
			};

			const code = generateWorkflowCode(json);

			// Should use .input(n) syntax for connecting branches to merge
			// This avoids duplicate key issues and ensures correct output indices
			expect(code).toContain('.input(0)');
			expect(code).toContain('.input(1)');
			expect(code).toContain('merge_node'); // The merge node variable
		});

		it('should generate fluent API for IF node patterns', () => {
			const json: WorkflowJSON = {
				id: 'if-test',
				name: 'IF Workflow',
				nodes: [
					{
						id: 'trigger-1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: 'if-1',
						name: 'IF',
						type: 'n8n-nodes-base.if',
						typeVersion: 2.3,
						position: [200, 0],
						parameters: {
							conditions: {
								conditions: [{ leftValue: '={{ $json.value }}', rightValue: 100 }],
							},
						},
					},
					{
						id: 'true-1',
						name: 'True Path',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [400, -100],
					},
					{
						id: 'false-1',
						name: 'False Path',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [400, 100],
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'IF', type: 'main', index: 0 }]],
					},
					IF: {
						main: [
							[{ node: 'True Path', type: 'main', index: 0 }],
							[{ node: 'False Path', type: 'main', index: 0 }],
						],
					},
				},
			};

			const code = generateWorkflowCode(json);

			// Should use fluent API syntax
			expect(code).toContain('.onTrue(');
			expect(code).toContain('.onFalse(');
		});

		it('should generate fluent API for Switch node patterns', () => {
			const json: WorkflowJSON = {
				id: 'switch-test',
				name: 'Switch Workflow',
				nodes: [
					{
						id: 'trigger-1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: 'switch-1',
						name: 'Switch',
						type: 'n8n-nodes-base.switch',
						typeVersion: 3.4,
						position: [200, 0],
						parameters: { mode: 'rules' },
					},
					{
						id: 'case-0',
						name: 'Case 0',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [400, -100],
					},
					{
						id: 'case-1',
						name: 'Case 1',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [400, 0],
					},
					{
						id: 'case-2',
						name: 'Case 2',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [400, 100],
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'Switch', type: 'main', index: 0 }]],
					},
					Switch: {
						main: [
							[{ node: 'Case 0', type: 'main', index: 0 }],
							[{ node: 'Case 1', type: 'main', index: 0 }],
							[{ node: 'Case 2', type: 'main', index: 0 }],
						],
					},
				},
			};

			const code = generateWorkflowCode(json);

			// Should use fluent API syntax
			expect(code).toContain('.onCase(0,');
			expect(code).toContain('.onCase(1,');
			expect(code).toContain('.onCase(2,');
		});
	});
});

describe('parseWorkflowCode with template literals in jsCode', () => {
	it('should throw a helpful error when code has syntax errors', () => {
		// This code has an unclosed template literal - missing the closing backtick
		// before the newline in the subject line
		const malformedCode = `export default workflow('test', 'Test')
  .add(node({
    type: 'n8n-nodes-base.code',
    version: 2,
    config: {
      parameters: {
        jsCode: \`return { subject: \\\`Hello
\` }\`
      }
    }
  }))`;

		// The parser should throw with a helpful error message
		expect(() => parseWorkflowCode(malformedCode)).toThrow(/syntax/i);
	});

	it('should parse code with nested template literals in jsCode parameter', () => {
		// This code has template literals inside the jsCode that contain ${} expressions
		// and was generated by an LLM - the parser must handle this correctly
		const code = `export default workflow('IH8D5PUFd8JhwyZP8Ng0g', 'My workflow 15')
  .add(trigger({
    type: 'n8n-nodes-base.scheduleTrigger',
    version: 1.3,
    config: {
      name: 'Every Monday Morning',
      parameters: {
        rule: {
          interval: [{
            field: 'weeks',
            weeksInterval: 1,
            triggerAtDay: [1], // Monday
            triggerAtHour: 9,
            triggerAtMinute: 0
          }]
        }
      },
      position: [240, 300]
    }
  }))
  .to(node({
    type: 'n8n-nodes-base.gmail',
    version: 2.2,
    config: {
      name: 'Get Weekend Emails',
      parameters: {
        resource: 'message',
        operation: 'getAll',
        returnAll: false,
        limit: 50,
        simple: true,
        filters: {
          receivedAfter: '={{ $now.minus({ days: 3 }).toISO() }}' // Last 3 days (Fri-Sun)
        },
        options: {
          includeSpamTrash: false
        }
      },
      position: [540, 300]
    }
  }))
  .to(node({
    type: '@n8n/n8n-nodes-langchain.agent',
    version: 3.1,
    config: {
      name: 'Analyze Emails with GPT-4',
      parameters: {
        promptType: 'define',
        text: \`You are an email analysis assistant. Analyze the following emails and extract:

1. **Action Items**: Tasks that require my attention or response
2. **Priorities**: Urgent or important emails that need immediate action
3. **Summary**: Brief overview of each important email

Format your response as a structured summary with clear sections:
- High Priority Action Items
- Medium Priority Items
- General Updates

Emails to analyze:
{{ $json.emails }}

Provide a clear, organized summary that I can quickly review.\`,
        options: {}
      },
      subnodes: {
        model: node({
          type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
          version: 1.3,
          config: {
            name: 'GPT-4 Mini Model',
            parameters: {
              model: 'gpt-4o-mini',
              options: {
                temperature: 0.3 // Lower temperature for more focused analysis
              }
            }
          }
        })
      },
      position: [840, 300]
    }
  }))
  .to(node({
    type: 'n8n-nodes-base.code',
    version: 2,
    config: {
      name: 'Format Email Summary',
      parameters: {
        mode: 'runOnceForAllItems',
        jsCode: \`// Get the AI analysis from the previous node
const aiResponse = $input.first().json;
const emailCount = $('Get Weekend Emails').all().length;

// Format the email body
const emailBody = \\\`
Hi there,

Here's your weekend email summary for Monday, \\\${new Date().toLocaleDateString()}:

📧 Total Emails Received: \\\${emailCount}

---

\\\${aiResponse.output || aiResponse.text || 'No analysis available'}

---

This summary was automatically generated by your n8n workflow.

Have a productive week!
\\\`;

return [{
  json: {
    subject: \\\`📬 Weekend Email Summary - \\\${new Date().toLocaleDateString()}\\\`,
    body: emailBody,
    emailCount: emailCount
  }
}];\`
      },
      position: [1140, 300]
    }
  }))
  .to(node({
    type: 'n8n-nodes-base.gmail',
    version: 2.2,
    config: {
      name: 'Send Summary Email',
      parameters: {
        resource: 'message',
        operation: 'send',
        sendTo: '={{ $json.myEmail }}', // You'll need to set this to your email
        subject: '={{ $json.subject }}',
        emailType: 'text',
        message: '={{ $json.body }}',
        options: {}
      },
      position: [1440, 300]
    }
  }))`;

		// This should NOT throw a parsing error
		const workflow = parseWorkflowCode(code);

		expect(workflow.id).toBe('IH8D5PUFd8JhwyZP8Ng0g');
		expect(workflow.name).toBe('My workflow 15');

		// Should have all nodes
		expect(workflow.nodes.length).toBeGreaterThan(0);

		// Should have the schedule trigger
		const scheduleTrigger = workflow.nodes.find((n) => n.name === 'Every Monday Morning');
		expect(scheduleTrigger).toBeDefined();

		// Should have the code node
		const codeNode = workflow.nodes.find((n) => n.name === 'Format Email Summary');
		expect(codeNode).toBeDefined();

		// The jsCode should contain the nested template literal content
		const jsCode = (codeNode?.parameters?.jsCode as string) || '';
		expect(jsCode).toContain('const emailBody =');
		expect(jsCode).toContain('Weekend Email Summary');
	});

	it('should auto-escape n8n runtime variables like $today', () => {
		// When jsCode is defined as a template literal with unescaped ${$today},
		// the parser now auto-escapes it to prevent "$today is not defined" errors
		const codeWithUnescapedVars = `export default workflow('test', 'Test')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { position: [0, 0] } }))
  .to(node({
    type: 'n8n-nodes-base.code',
    version: 2,
    config: {
      parameters: {
        jsCode: \`return { date: \${$today} };\`
      },
      position: [200, 0]
    }
  }))`;

		// Should now work - variables are auto-escaped
		const workflow = parseWorkflowCode(codeWithUnescapedVars);
		const codeNode = workflow.nodes.find((n) => n.type === 'n8n-nodes-base.code');

		// The jsCode should contain the literal ${$today}
		const jsCode = (codeNode?.parameters?.jsCode as string) || '';
		expect(jsCode).toContain('${$today}');
	});

	it('should parse jsCode with properly escaped n8n runtime variables', () => {
		// To preserve ${$today} as a literal string in jsCode, escape it as \${$today}
		const codeWithEscapedVars = `export default workflow('test', 'Test')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { position: [0, 0] } }))
  .to(node({
    type: 'n8n-nodes-base.code',
    version: 2,
    config: {
      parameters: {
        jsCode: \`return { date: \\\${$today}, now: \\\${$now} };\`
      },
      position: [200, 0]
    }
  }))`;

		// This should work - the escaped expressions become literal strings
		const workflow = parseWorkflowCode(codeWithEscapedVars);
		const codeNode = workflow.nodes.find((n) => n.type === 'n8n-nodes-base.code');
		expect(codeNode).toBeDefined();

		// The jsCode should contain the literal ${$today} and ${$now} strings
		const jsCode = (codeNode?.parameters?.jsCode as string) || '';
		expect(jsCode).toContain('${$today}');
		expect(jsCode).toContain('${$now}');
	});

	it('should not double-escape already-escaped \\${{ in template literals', () => {
		const codeWithAlreadyEscaped = `export default workflow('test', 'Test')
  .add(trigger({ type: 'n8n-nodes-base.webhook', version: 2.1, config: { parameters: { httpMethod: 'POST', path: 'test' }, position: [0, 0] }, output: [{ body: { amount: 50 } }] })
  .to(node({
    type: 'n8n-nodes-base.gmail',
    version: 2.2,
    config: {
      name: 'Send Email',
      parameters: {
        resource: 'message',
        operation: 'send',
        sendTo: 'test@test.com',
        subject: expr('Purchase approved'),
        emailType: 'html',
        message: expr(\`<p>Amount: \\\${{ $json.body.amount }}</p>\`)
      },
      position: [200, 0]
    },
    output: [{ id: 'msg1' }]
  })))`;

		const workflow = parseWorkflowCode(codeWithAlreadyEscaped);
		const emailNode = workflow.nodes.find((n) => n.type === 'n8n-nodes-base.gmail');
		expect(emailNode).toBeDefined();

		const message = (emailNode?.parameters?.message as string) || '';
		expect(message).toContain('${{');
		expect(message).not.toContain('\\${{');
	});

	it('should auto-escape ${{ pattern in template literals inside expr()', () => {
		// When expr() is used with backtick template literals containing ${{ (e.g., currency $
		// followed by n8n expression {{ }}), JS interprets ${{ as ${...} template interpolation.
		// The parser should auto-escape ${{ → \${{ to prevent parse errors.
		const codeWithDollarBrace = `export default workflow('test', 'Test')
  .add(trigger({ type: 'n8n-nodes-base.webhook', version: 2.1, config: { parameters: { httpMethod: 'POST', path: 'test' }, position: [0, 0] }, output: [{ body: { amount: 50 } }] })
  .to(node({
    type: 'n8n-nodes-base.gmail',
    version: 2.2,
    config: {
      name: 'Send Email',
      parameters: {
        resource: 'message',
        operation: 'send',
        sendTo: 'test@test.com',
        subject: expr('Purchase approved'),
        emailType: 'html',
        message: expr(\`<p>Amount: \${{ $json.body.amount }}</p>\`)
      },
      position: [200, 0]
    },
    output: [{ id: 'msg1' }]
  })))`;

		const workflow = parseWorkflowCode(codeWithDollarBrace);
		const emailNode = workflow.nodes.find((n) => n.type === 'n8n-nodes-base.gmail');
		expect(emailNode).toBeDefined();

		// The message parameter should contain the n8n expression with literal $
		const message = (emailNode?.parameters?.message as string) || '';
		expect(message).toContain('${{');
	});
});

describe('multiple triggers / disconnected chains', () => {
	it('should preserve all nodes when workflow has multiple disconnected trigger chains', () => {
		// This is a workflow with two independent trigger chains:
		// - Trigger A -> Node A1 -> Node A2
		// - Trigger B -> Node B1 -> Node B2
		// Both chains should be fully traversed in codegen roundtrip
		const originalJson: WorkflowJSON = {
			id: 'multi-trigger-test',
			name: 'Multiple Trigger Chains',
			nodes: [
				// First chain
				{
					id: 'trigger-a',
					name: 'Schedule Trigger',
					type: 'n8n-nodes-base.scheduleTrigger',
					typeVersion: 1.1,
					position: [0, 0],
					parameters: { rule: { interval: [{ field: 'hours', hour: 9 }] } },
				},
				{
					id: 'node-a1',
					name: 'HTTP Request A',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [200, 0],
					parameters: { url: 'https://api-a.example.com' },
				},
				{
					id: 'node-a2',
					name: 'Process A',
					type: 'n8n-nodes-base.code',
					typeVersion: 2,
					position: [400, 0],
					parameters: { jsCode: 'return items' },
				},
				// Second chain - completely independent
				{
					id: 'trigger-b',
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 2,
					position: [0, 300],
					parameters: { path: 'webhook-b' },
				},
				{
					id: 'node-b1',
					name: 'HTTP Request B',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [200, 300],
					parameters: { url: 'https://api-b.example.com' },
				},
				{
					id: 'node-b2',
					name: 'Process B',
					type: 'n8n-nodes-base.code',
					typeVersion: 2,
					position: [400, 300],
					parameters: { jsCode: 'return items' },
				},
			],
			connections: {
				'Schedule Trigger': {
					main: [[{ node: 'HTTP Request A', type: 'main', index: 0 }]],
				},
				'HTTP Request A': {
					main: [[{ node: 'Process A', type: 'main', index: 0 }]],
				},
				Webhook: {
					main: [[{ node: 'HTTP Request B', type: 'main', index: 0 }]],
				},
				'HTTP Request B': {
					main: [[{ node: 'Process B', type: 'main', index: 0 }]],
				},
			},
		};

		// Generate code and parse back
		const code = generateWorkflowCode(originalJson);
		const parsedJson = parseWorkflowCode(code);

		// Verify ALL nodes from both chains are preserved
		expect(parsedJson.nodes).toHaveLength(originalJson.nodes.length);

		// Check all node names exist
		const nodeNames = parsedJson.nodes.map((n) => n.name);
		expect(nodeNames).toContain('Schedule Trigger');
		expect(nodeNames).toContain('HTTP Request A');
		expect(nodeNames).toContain('Process A');
		expect(nodeNames).toContain('Webhook');
		expect(nodeNames).toContain('HTTP Request B');
		expect(nodeNames).toContain('Process B');
	});

	it('should preserve nodes from all trigger chains even with AI subnodes', () => {
		// Complex case: multiple triggers where one chain has AI agent with subnodes
		const originalJson: WorkflowJSON = {
			id: 'multi-trigger-ai-test',
			name: 'Multiple Triggers with AI',
			nodes: [
				// First chain - simple
				{
					id: 'trigger-1',
					name: 'Schedule Trigger',
					type: 'n8n-nodes-base.scheduleTrigger',
					typeVersion: 1.1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'http-1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [200, 0],
					parameters: { url: 'https://api.example.com' },
				},
				// Second chain - with AI agent
				{
					id: 'trigger-2',
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 2,
					position: [0, 300],
					parameters: { path: 'ai-webhook' },
				},
				{
					id: 'agent-1',
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 1.7,
					position: [200, 300],
					parameters: { promptType: 'auto' },
				},
				{
					id: 'model-1',
					name: 'OpenAI Model',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					typeVersion: 1.2,
					position: [200, 500],
					parameters: { model: 'gpt-4' },
				},
			],
			connections: {
				'Schedule Trigger': {
					main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
				},
				Webhook: {
					main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
				},
				'OpenAI Model': {
					ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
				},
			},
		};

		// Generate code and parse back
		const code = generateWorkflowCode(originalJson);
		const parsedJson = parseWorkflowCode(code);

		// Verify ALL nodes preserved including AI nodes
		expect(parsedJson.nodes).toHaveLength(originalJson.nodes.length);

		const nodeNames = parsedJson.nodes.map((n) => n.name);
		expect(nodeNames).toContain('Schedule Trigger');
		expect(nodeNames).toContain('HTTP Request');
		expect(nodeNames).toContain('Webhook');
		expect(nodeNames).toContain('AI Agent');
		expect(nodeNames).toContain('OpenAI Model');
	});
});

describe('parseWorkflowCode with splitInBatches', () => {
	it('should parse code that uses splitInBatches() with new fluent API syntax', () => {
		// This is the type of code the LLM might generate using splitInBatches new API
		const code = `const loop = node({ type: 'n8n-nodes-base.splitInBatches', version: 3, config: { parameters: { batchSize: 2 }, position: [400, 100], name: 'Loop' } });
export default workflow('test-sib', 'Split In Batches Test')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { position: [0, 0] } }))
  .to(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: { assignments: { assignments: [{ name: 'items', type: 'array', value: '[1,2,3,4,5]' }] } }, position: [200, 0], name: 'Generate Items' } }))
  .to(
    splitInBatches(loop)
      .onDone(node({ type: 'n8n-nodes-base.noOp', version: 1, config: { position: [600, 0], name: 'Done Processing' } }))
      .onEachBatch(node({ type: 'n8n-nodes-base.noOp', version: 1, config: { position: [600, 200], name: 'Process Batch' } }).to(loop))
  )`;

		// This should NOT throw "splitInBatches is not defined"
		const workflow = parseWorkflowCode(code);

		expect(workflow.id).toBe('test-sib');
		expect(workflow.name).toBe('Split In Batches Test');
		expect(workflow.nodes.length).toBeGreaterThan(0);

		// Should have the Split In Batches node
		const sibNode = workflow.nodes.find((n) => n.type === 'n8n-nodes-base.splitInBatches');
		expect(sibNode).toBeDefined();
	});

	it('should parse splitInBatches code with onEachBatch and onDone', () => {
		// This tests the new fluent API syntax with onEachBatch and onDone
		const code = `const processEachArticle = node({
  type: 'n8n-nodes-base.splitInBatches',
  version: 3,
  config: {
    name: 'Process Each Article',
    parameters: { batchSize: 1 },
    position: [1140, 300]
  }
});
export default workflow('IH8D5PUFd8JhwyZP8Ng0g', 'My workflow 15')
  .add(trigger({
    type: 'n8n-nodes-base.scheduleTrigger',
    version: 1.3,
    config: {
      name: 'Every Night at 8pm',
      parameters: {
        rule: {
          interval: [{
            field: 'hours',
            hoursInterval: 24,
            triggerAtHour: 20
          }]
        }
      },
      position: [240, 300]
    }
  }))
  .to(node({
    type: 'n8n-nodes-base.httpRequest',
    version: 4.3,
    config: {
      name: 'Fetch AI News from NewsAPI',
      parameters: {
        method: 'GET',
        url: 'https://newsapi.org/v2/everything'
      },
      position: [540, 300]
    }
  }))
  .to(node({
    type: 'n8n-nodes-base.code',
    version: 2,
    config: {
      name: 'Extract Top 5 Articles',
      parameters: {
        mode: 'runOnceForAllItems',
        jsCode: 'return [];'
      },
      position: [840, 300]
    }
  }))
  .to(splitInBatches(processEachArticle)
    .onEachBatch(
      node({
        type: 'n8n-nodes-base.set',
        version: 3.4,
        config: {
          name: 'Process Item',
          parameters: { mode: 'manual' },
          position: [1440, 200]
        }
      }).to(processEachArticle)
    )
    .onDone(
      node({
        type: 'n8n-nodes-base.code',
        version: 2,
        config: {
          name: 'Prepare Message',
          parameters: { mode: 'runOnceForAllItems', jsCode: 'return [];' },
          position: [2040, 300]
        }
      }).to(node({
        type: 'n8n-nodes-base.set',
        version: 3.4,
        config: {
          name: 'Final Output',
          parameters: { mode: 'manual' },
          position: [2340, 300]
        }
      }))
    )
  )`;

		// This should NOT throw any errors
		const workflow = parseWorkflowCode(code);

		expect(workflow.id).toBe('IH8D5PUFd8JhwyZP8Ng0g');
		expect(workflow.name).toBe('My workflow 15');

		// Should have the Split In Batches node
		const sibNode = workflow.nodes.find((n) => n.type === 'n8n-nodes-base.splitInBatches');
		expect(sibNode).toBeDefined();
		expect(sibNode?.name).toBe('Process Each Article');

		// Should have both done chain and each chain nodes
		const prepareMessage = workflow.nodes.find((n) => n.name === 'Prepare Message');
		const processItem = workflow.nodes.find((n) => n.name === 'Process Item');
		expect(prepareMessage).toBeDefined();
		expect(processItem).toBeDefined();
	});
});

describe('cycle detection and variable generation', () => {
	it('should detect simple cycle and generate variable declaration', () => {
		// Simple cycle: A → B → A
		const json: WorkflowJSON = {
			id: 'cycle-test',
			name: 'Simple Cycle',
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
					id: 'node-a',
					name: 'Node A',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [200, 0],
					parameters: {},
				},
				{
					id: 'node-b',
					name: 'Node B',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [400, 0],
					parameters: {},
				},
			],
			connections: {
				Trigger: { main: [[{ node: 'Node A', type: 'main', index: 0 }]] },
				'Node A': { main: [[{ node: 'Node B', type: 'main', index: 0 }]] },
				'Node B': { main: [[{ node: 'Node A', type: 'main', index: 0 }]] }, // Cycle back to A
			},
		};

		const code = generateWorkflowCode(json);

		// All nodes are now variables in the variables-first format
		expect(code).toContain('const trigger_node = trigger({');
		expect(code).toContain('const node_A = node({');
		expect(code).toContain('const node_B = node({');

		// Should reference the cycle target variable in the chain
		expect(code).toContain('.to(node_A)');
	});

	it('should detect cycle to IF node and generate correct structure', () => {
		// Polling loop pattern: Trigger → IF → [true: Done, false: Wait → IF (cycle)]
		const json: WorkflowJSON = {
			id: 'if-cycle-test',
			name: 'IF Cycle',
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
					name: 'Check Status',
					type: 'n8n-nodes-base.if',
					typeVersion: 2,
					position: [200, 0],
					parameters: {},
				},
				{
					id: 'done-1',
					name: 'Done',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [400, -100],
					parameters: {},
				},
				{
					id: 'wait-1',
					name: 'Wait',
					type: 'n8n-nodes-base.wait',
					typeVersion: 1.1,
					position: [400, 100],
					parameters: { amount: 5 },
				},
			],
			connections: {
				Trigger: { main: [[{ node: 'Check Status', type: 'main', index: 0 }]] },
				'Check Status': {
					main: [
						[{ node: 'Done', type: 'main', index: 0 }], // true branch
						[{ node: 'Wait', type: 'main', index: 0 }], // false branch
					],
				},
				Wait: { main: [[{ node: 'Check Status', type: 'main', index: 0 }]] }, // Cycle!
			},
		};

		const code = generateWorkflowCode(json);

		// All nodes are now variables in the variables-first format
		expect(code).toContain('const trigger_node = trigger({');
		expect(code).toContain('const check_Status = node({');
		expect(code).toContain("type: 'n8n-nodes-base.if'");
		expect(code).toContain('const done = node({');
		expect(code).toContain('const wait = node({');

		// Should reference the cycle target (IF node) in the loop back
		expect(code).toContain('.to(check_Status)');
	});

	it('should handle longer cycle chain', () => {
		// Longer cycle: A → B → C → A
		const json: WorkflowJSON = {
			id: 'long-cycle-test',
			name: 'Long Cycle',
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
					id: 'node-a',
					name: 'Node A',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [200, 0],
					parameters: {},
				},
				{
					id: 'node-b',
					name: 'Node B',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [400, 0],
					parameters: {},
				},
				{
					id: 'node-c',
					name: 'Node C',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [600, 0],
					parameters: {},
				},
			],
			connections: {
				Trigger: { main: [[{ node: 'Node A', type: 'main', index: 0 }]] },
				'Node A': { main: [[{ node: 'Node B', type: 'main', index: 0 }]] },
				'Node B': { main: [[{ node: 'Node C', type: 'main', index: 0 }]] },
				'Node C': { main: [[{ node: 'Node A', type: 'main', index: 0 }]] }, // Cycle back to A
			},
		};

		const code = generateWorkflowCode(json);

		// All nodes are now variables in the variables-first format
		expect(code).toContain('const trigger_node = trigger({');
		expect(code).toContain('const node_A = node({');
		expect(code).toContain('const node_B = node({');
		expect(code).toContain('const node_C = node({');

		// Should reference the cycle target variable at the end of the chain
		expect(code).toContain('.to(node_A)');
	});

	it('should not generate cycle variables for non-cycle workflows', () => {
		// Simple linear workflow with no cycles
		const json: WorkflowJSON = {
			id: 'no-cycle-test',
			name: 'No Cycle',
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
					id: 'node-1',
					name: 'Node 1',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [200, 0],
					parameters: {},
				},
				{
					id: 'node-2',
					name: 'Node 2',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [400, 0],
					parameters: {},
				},
			],
			connections: {
				Trigger: { main: [[{ node: 'Node 1', type: 'main', index: 0 }]] },
				'Node 1': { main: [[{ node: 'Node 2', type: 'main', index: 0 }]] },
			},
		};

		const code = generateWorkflowCode(json);

		// All nodes are variables in the variables-first format (regardless of cycles)
		expect(code).toContain('const wf = workflow(');
		expect(code).toContain('const trigger_node = trigger({');
		expect(code).toContain('const node_1 = node({');
		expect(code).toContain('const node_2 = node({');

		// Should have proper structure
		expect(code).toContain('export default wf');
		expect(code).toContain('.add(trigger_node)');
		expect(code).toContain('.to(node_1)');
		expect(code).toContain('.to(node_2)');
	});

	it('should roundtrip a cycle workflow correctly', () => {
		const originalJson: WorkflowJSON = {
			id: 'roundtrip-cycle',
			name: 'Roundtrip Cycle Test',
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
					name: 'Check',
					type: 'n8n-nodes-base.if',
					typeVersion: 2,
					position: [200, 0],
					parameters: {},
				},
				{
					id: 'done-1',
					name: 'Success',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [400, -100],
					parameters: {},
				},
				{
					id: 'retry-1',
					name: 'Retry',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [400, 100],
					parameters: {},
				},
			],
			connections: {
				Trigger: { main: [[{ node: 'Check', type: 'main', index: 0 }]] },
				Check: {
					main: [
						[{ node: 'Success', type: 'main', index: 0 }],
						[{ node: 'Retry', type: 'main', index: 0 }],
					],
				},
				Retry: { main: [[{ node: 'Check', type: 'main', index: 0 }]] }, // Cycle!
			},
		};

		const code = generateWorkflowCode(originalJson);
		const parsedJson = parseWorkflowCode(code);

		// Verify all nodes are present
		expect(parsedJson.nodes).toHaveLength(4);
		expect(parsedJson.nodes.map((n) => n.name).sort()).toEqual(
			['Check', 'Retry', 'Success', 'Trigger'].sort(),
		);

		// Verify connections including the cycle
		expect(parsedJson.connections['Trigger']).toBeDefined();
		expect(parsedJson.connections['Check']).toBeDefined();
		expect(parsedJson.connections['Retry']).toBeDefined();

		// The cycle connection Retry → Check should be preserved
		expect(parsedJson.connections['Retry']?.main[0]?.[0]?.node).toBe('Check');
	});
});

describe('SplitInBatches multi-output handling', () => {
	it('should preserve both outputs of SplitInBatches node', () => {
		// SplitInBatches has 2 outputs:
		// - Output 0: "done" (all items processed)
		// - Output 1: "loop" (continue processing)
		// Both must be preserved in roundtrip
		const workflow: WorkflowJSON = {
			id: 'sib-test',
			name: 'SplitInBatches Test',
			nodes: [
				{
					id: '1',
					name: 'Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: '2',
					name: 'Loop',
					type: 'n8n-nodes-base.splitInBatches',
					typeVersion: 3,
					position: [200, 0],
					parameters: {},
				},
				{
					id: '3',
					name: 'Process',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [400, 100],
					parameters: {},
				},
				{
					id: '4',
					name: 'Done',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [400, -100],
					parameters: {},
				},
			],
			connections: {
				Trigger: { main: [[{ node: 'Loop', type: 'main', index: 0 }]] },
				Loop: {
					main: [
						[{ node: 'Done', type: 'main', index: 0 }], // output 0: done
						[{ node: 'Process', type: 'main', index: 0 }], // output 1: loop
					],
				},
				Process: { main: [[{ node: 'Loop', type: 'main', index: 0 }]] }, // cycle back
			},
		};

		const code = generateWorkflowCode(workflow);
		const parsed = parseWorkflowCode(code);

		// Both outputs must be connected
		expect(parsed.connections['Loop']).toBeDefined();
		expect(parsed.connections['Loop'].main[0]![0].node).toBe('Done');
		expect(parsed.connections['Loop'].main[1]![0].node).toBe('Process');
		// Cycle back must exist
		expect(parsed.connections['Process'].main[0]![0].node).toBe('Loop');
	});

	it('should preserve chains after both SplitInBatches outputs', () => {
		// When nodes are chained after each SplitInBatches output,
		// both chains must be preserved
		const workflow: WorkflowJSON = {
			id: 'sib-chain-test',
			name: 'SplitInBatches Chain Test',
			nodes: [
				{
					id: '1',
					name: 'Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: '2',
					name: 'Loop',
					type: 'n8n-nodes-base.splitInBatches',
					typeVersion: 3,
					position: [200, 0],
					parameters: {},
				},
				{
					id: '3',
					name: 'Process',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [400, 100],
					parameters: {},
				},
				{
					id: '4',
					name: 'Done',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [400, -100],
					parameters: {},
				},
				{
					id: '5',
					name: 'Final',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [600, -100],
					parameters: {},
				},
			],
			connections: {
				Trigger: { main: [[{ node: 'Loop', type: 'main', index: 0 }]] },
				Loop: {
					main: [
						[{ node: 'Done', type: 'main', index: 0 }],
						[{ node: 'Process', type: 'main', index: 0 }],
					],
				},
				Process: { main: [[{ node: 'Loop', type: 'main', index: 0 }]] },
				Done: { main: [[{ node: 'Final', type: 'main', index: 0 }]] },
			},
		};

		const code = generateWorkflowCode(workflow);
		const parsed = parseWorkflowCode(code);

		// Chain after done output must be preserved
		expect(parsed.connections['Done'].main[0]![0].node).toBe('Final');
	});
});

describe('Fan-out pattern handling', () => {
	it('should preserve all fan-out connections from same output', () => {
		// Fan-out: one output connects to multiple targets
		// All targets must be preserved in the .to([a, b]) array
		const workflow: WorkflowJSON = {
			id: 'fanout-test',
			name: 'Fan-out Test',
			nodes: [
				{
					id: '1',
					name: 'Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: '2',
					name: 'Source',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [200, 0],
					parameters: {},
				},
				{
					id: '3',
					name: 'TargetA',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [400, -100],
					parameters: {},
				},
				{
					id: '4',
					name: 'TargetB',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [400, 100],
					parameters: {},
				},
			],
			connections: {
				Trigger: { main: [[{ node: 'Source', type: 'main', index: 0 }]] },
				Source: {
					main: [
						[
							{ node: 'TargetA', type: 'main', index: 0 },
							{ node: 'TargetB', type: 'main', index: 0 }, // Fan-out: same output, 2 targets
						],
					],
				},
			},
		};

		const code = generateWorkflowCode(workflow);
		const parsed = parseWorkflowCode(code);

		// Both fan-out targets must be connected
		expect(parsed.connections['Source']).toBeDefined();
		expect(parsed.connections['Source'].main[0]).toHaveLength(2);
		const targetNodes = parsed.connections['Source'].main[0]!.map((c) => c.node).sort();
		expect(targetNodes).toEqual(['TargetA', 'TargetB']);
	});

	it('should preserve fan-out when branches converge at Merge', () => {
		// Fan-out pattern that converges at a Merge node (workflow 5711 pattern)
		// Source fans out to PathA and PathB, both eventually merge
		const workflow: WorkflowJSON = {
			id: 'fanout-merge-test',
			name: 'Fan-out Merge Test',
			nodes: [
				{
					id: '1',
					name: 'Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: '2',
					name: 'FanOutSource',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [200, 0],
					parameters: {},
				},
				{
					id: '3',
					name: 'PathA',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [400, -100],
					parameters: {},
				},
				{
					id: '4',
					name: 'PathB',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [400, 100],
					parameters: {},
				},
				{
					id: '5',
					name: 'ProcessA',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [600, -100],
					parameters: {},
				},
				{
					id: '6',
					name: 'ProcessB',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [600, 100],
					parameters: {},
				},
				{
					id: '7',
					name: 'Merge',
					type: 'n8n-nodes-base.merge',
					typeVersion: 3,
					position: [800, 0],
					parameters: {},
				},
			],
			connections: {
				Trigger: { main: [[{ node: 'FanOutSource', type: 'main', index: 0 }]] },
				FanOutSource: {
					main: [
						[
							{ node: 'PathA', type: 'main', index: 0 },
							{ node: 'PathB', type: 'main', index: 0 }, // Fan-out
						],
					],
				},
				PathA: { main: [[{ node: 'ProcessA', type: 'main', index: 0 }]] },
				PathB: { main: [[{ node: 'ProcessB', type: 'main', index: 0 }]] },
				ProcessA: { main: [[{ node: 'Merge', type: 'main', index: 0 }]] },
				ProcessB: { main: [[{ node: 'Merge', type: 'main', index: 1 }]] },
			},
		};

		const code = generateWorkflowCode(workflow);
		const parsed = parseWorkflowCode(code);

		// Fan-out must preserve both paths
		expect(parsed.connections['FanOutSource']).toBeDefined();
		expect(parsed.connections['FanOutSource'].main[0]).toHaveLength(2);
		const fanOutTargets = parsed.connections['FanOutSource'].main[0]!.map((c) => c.node).sort();
		expect(fanOutTargets).toEqual(['PathA', 'PathB']);

		// Both paths must connect to their downstream nodes
		expect(parsed.connections['PathA'].main[0]![0].node).toBe('ProcessA');
		expect(parsed.connections['PathB'].main[0]![0].node).toBe('ProcessB');

		// Both must converge at Merge
		expect(parsed.connections['ProcessA'].main[0]![0].node).toBe('Merge');
		expect(parsed.connections['ProcessB'].main[0]![0].node).toBe('Merge');
	});
});

describe('IF branches feeding into Merge', () => {
	it('should preserve both IF branches when they feed into same Merge node', () => {
		// Pattern: IF true and false branches both connect to Merge
		const workflow: WorkflowJSON = {
			id: 'if-merge-test',
			name: 'IF Merge Test',
			nodes: [
				{
					id: '1',
					name: 'Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: '2',
					name: 'IF',
					type: 'n8n-nodes-base.if',
					typeVersion: 2,
					position: [200, 0],
					parameters: {},
				},
				{
					id: '3',
					name: 'TrueNode',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [400, -100],
					parameters: {},
				},
				{
					id: '4',
					name: 'FalseNode',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [400, 100],
					parameters: {},
				},
				{
					id: '5',
					name: 'Merge',
					type: 'n8n-nodes-base.merge',
					typeVersion: 3,
					position: [600, 0],
					parameters: {},
				},
			],
			connections: {
				Trigger: { main: [[{ node: 'IF', type: 'main', index: 0 }]] },
				IF: {
					main: [
						[{ node: 'TrueNode', type: 'main', index: 0 }], // output 0 (true)
						[{ node: 'FalseNode', type: 'main', index: 0 }], // output 1 (false)
					],
				},
				TrueNode: { main: [[{ node: 'Merge', type: 'main', index: 0 }]] },
				FalseNode: { main: [[{ node: 'Merge', type: 'main', index: 1 }]] },
			},
		};

		const code = generateWorkflowCode(workflow);
		const parsed = parseWorkflowCode(code);

		// Both IF branches must exist
		expect(parsed.connections['IF']).toBeDefined();
		expect(parsed.connections['IF'].main[0]![0].node).toBe('TrueNode');
		expect(parsed.connections['IF'].main[1]![0].node).toBe('FalseNode');
		// Both branches must connect to Merge
		expect(parsed.connections['TrueNode'].main[0]![0].node).toBe('Merge');
		expect(parsed.connections['FalseNode'].main[0]![0].node).toBe('Merge');
	});

	it('should preserve IF false-only branch connecting to Merge', () => {
		// Pattern: IF only has false branch, which connects to Merge
		// Output 0 (true) is empty, output 1 (false) connects to Merge input 1
		const workflow: WorkflowJSON = {
			id: 'if-false-merge-test',
			name: 'IF False to Merge Test',
			nodes: [
				{
					id: '1',
					name: 'Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: '2',
					name: 'Source',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [200, 0],
					parameters: {},
				},
				{
					id: '3',
					name: 'IF',
					type: 'n8n-nodes-base.if',
					typeVersion: 2,
					position: [400, 0],
					parameters: {},
				},
				{
					id: '4',
					name: 'Merge',
					type: 'n8n-nodes-base.merge',
					typeVersion: 3,
					position: [600, 0],
					parameters: {},
				},
			],
			connections: {
				Trigger: { main: [[{ node: 'Source', type: 'main', index: 0 }]] },
				Source: {
					main: [
						[
							{ node: 'IF', type: 'main', index: 0 },
							{ node: 'Merge', type: 'main', index: 0 }, // fan-out to Merge input 0
						],
					],
				},
				IF: {
					main: [
						[], // output 0 (true) - empty
						[{ node: 'Merge', type: 'main', index: 1 }], // output 1 (false) -> Merge input 1
					],
				},
			},
		};

		const code = generateWorkflowCode(workflow);
		const parsed = parseWorkflowCode(code);

		// IF false branch must connect to Merge
		expect(parsed.connections['IF']).toBeDefined();
		expect(parsed.connections['IF'].main[1]).toBeDefined();
		expect(parsed.connections['IF'].main[1]![0].node).toBe('Merge');
	});
});

describe('Phase 2b: .input(n) syntax for merge patterns', () => {
	it('should generate .input(n) syntax for IF branches feeding into Merge', () => {
		// Pattern: IF true and false branches both connect to Merge at different inputs
		// OLD behavior: merge(mergeNode, { input0: trueNode, input1: falseNode })
		// NEW expected: trueNode.to(merge.input(0)), falseNode.to(merge.input(1))
		const workflow: WorkflowJSON = {
			id: 'if-merge-input-test',
			name: 'IF Merge Input Test',
			nodes: [
				{
					id: '1',
					name: 'Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: '2',
					name: 'IF',
					type: 'n8n-nodes-base.if',
					typeVersion: 2,
					position: [200, 0],
					parameters: {},
				},
				{
					id: '3',
					name: 'TrueProcess',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [400, -100],
					parameters: {},
				},
				{
					id: '4',
					name: 'FalseProcess',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [400, 100],
					parameters: {},
				},
				{
					id: '5',
					name: 'Merge',
					type: 'n8n-nodes-base.merge',
					typeVersion: 3,
					position: [600, 0],
					parameters: {},
				},
			],
			connections: {
				Trigger: { main: [[{ node: 'IF', type: 'main', index: 0 }]] },
				IF: {
					main: [
						[{ node: 'TrueProcess', type: 'main', index: 0 }], // output 0 (true)
						[{ node: 'FalseProcess', type: 'main', index: 0 }], // output 1 (false)
					],
				},
				TrueProcess: { main: [[{ node: 'Merge', type: 'main', index: 0 }]] },
				FalseProcess: { main: [[{ node: 'Merge', type: 'main', index: 1 }]] },
			},
		};

		const code = generateWorkflowCode(workflow);

		// Should NOT use merge() function inside onTrue/onFalse
		expect(code).not.toMatch(/\.onTrue\([^)]*merge\(/);
		expect(code).not.toMatch(/\.onFalse\([^)]*merge\(/);
		// Should use .input(n) syntax for merge connections
		expect(code).toContain('.input(0)');
		expect(code).toContain('.input(1)');
		// Should still have fluent API for the branching
		expect(code).toContain('.onTrue(');
		expect(code).toContain('.onFalse(');

		// Roundtrip must preserve the connections
		const parsed = parseWorkflowCode(code);

		// Both IF branches must exist
		expect(parsed.connections['IF']).toBeDefined();
		expect(parsed.connections['IF'].main[0]![0].node).toBe('TrueProcess');
		expect(parsed.connections['IF'].main[1]![0].node).toBe('FalseProcess');
		// Both branches must connect to Merge at correct inputs
		expect(parsed.connections['TrueProcess'].main[0]![0].node).toBe('Merge');
		expect(parsed.connections['TrueProcess'].main[0]![0].index).toBe(0);
		expect(parsed.connections['FalseProcess'].main[0]![0].node).toBe('Merge');
		expect(parsed.connections['FalseProcess'].main[0]![0].index).toBe(1);
	});

	it('should generate .input(n) syntax for any multi-input node (not just Merge)', () => {
		// This tests the generality: any node with multiple inputs should work
		// Pattern: IF → branches → Compare (multi-input node)
		const workflow: WorkflowJSON = {
			id: 'if-compare-input-test',
			name: 'IF Compare Input Test',
			nodes: [
				{
					id: '1',
					name: 'Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: '2',
					name: 'IF',
					type: 'n8n-nodes-base.if',
					typeVersion: 2,
					position: [200, 0],
					parameters: {},
				},
				{
					id: '3',
					name: 'PathA',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [400, -100],
					parameters: {},
				},
				{
					id: '4',
					name: 'PathB',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [400, 100],
					parameters: {},
				},
				{
					id: '5',
					name: 'Merge',
					type: 'n8n-nodes-base.merge',
					typeVersion: 3,
					position: [600, 0],
					parameters: {},
				},
			],
			connections: {
				Trigger: { main: [[{ node: 'IF', type: 'main', index: 0 }]] },
				IF: {
					main: [
						[{ node: 'PathA', type: 'main', index: 0 }],
						[{ node: 'PathB', type: 'main', index: 0 }],
					],
				},
				PathA: { main: [[{ node: 'Merge', type: 'main', index: 0 }]] },
				PathB: { main: [[{ node: 'Merge', type: 'main', index: 1 }]] },
			},
		};

		const code = generateWorkflowCode(workflow);

		// Should use .input(n) syntax
		expect(code).toContain('.input(0)');
		expect(code).toContain('.input(1)');
	});
});

describe('Multiple triggers', () => {
	it('should preserve all trigger connections when multiple triggers connect to same node', () => {
		// Pattern from workflow 2519: two triggers both connect to the same first node
		const workflow: WorkflowJSON = {
			id: 'multi-trigger-test',
			name: 'Multiple Triggers Test',
			nodes: [
				{
					id: '1',
					name: 'TriggerA',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, -100],
					parameters: {},
				},
				{
					id: '2',
					name: 'TriggerB',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 2,
					position: [0, 100],
					parameters: {},
				},
				{
					id: '3',
					name: 'SharedNode',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [200, 0],
					parameters: {},
				},
				{
					id: '4',
					name: 'EndNode',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [400, 0],
					parameters: {},
				},
			],
			connections: {
				TriggerA: { main: [[{ node: 'SharedNode', type: 'main', index: 0 }]] },
				TriggerB: { main: [[{ node: 'SharedNode', type: 'main', index: 0 }]] },
				SharedNode: { main: [[{ node: 'EndNode', type: 'main', index: 0 }]] },
			},
		};

		const code = generateWorkflowCode(workflow);
		const parsed = parseWorkflowCode(code);

		// Both triggers must have connections to SharedNode
		expect(parsed.connections['TriggerA']).toBeDefined();
		expect(parsed.connections['TriggerA'].main[0]![0].node).toBe('SharedNode');
		expect(parsed.connections['TriggerB']).toBeDefined();
		expect(parsed.connections['TriggerB'].main[0]![0].node).toBe('SharedNode');
		// SharedNode must connect to EndNode
		expect(parsed.connections['SharedNode'].main[0]![0].node).toBe('EndNode');
	});

	it('should preserve merge downstream connection when fan-out includes direct merge connection', () => {
		// This tests the pattern where a node fans out to both a Merge node directly
		// AND to another node that also connects to the Merge. The Merge then connects downstream.
		// Pattern:
		//   Settings -> [Send Typing action, Merge[0]]
		//   Send Typing action -> Merge[1]
		//   Merge -> AI Agent
		// This is the failing pattern from workflow 5163.
		const workflow: WorkflowJSON = {
			id: 'merge-downstream-test',
			name: 'Merge Downstream Test',
			nodes: [
				{
					id: '1',
					name: 'Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: '2',
					name: 'Settings',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [200, 0],
					parameters: {},
				},
				{
					id: '3',
					name: 'Send Typing',
					type: 'n8n-nodes-base.telegram',
					typeVersion: 1,
					position: [400, 100],
					parameters: {},
				},
				{
					id: '4',
					name: 'Merge',
					type: 'n8n-nodes-base.merge',
					typeVersion: 2.1,
					position: [400, 0],
					parameters: { mode: 'chooseBranch' },
				},
				{
					id: '5',
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 1.7,
					position: [600, 0],
					parameters: {},
				},
			],
			connections: {
				Trigger: { main: [[{ node: 'Settings', type: 'main', index: 0 }]] },
				Settings: {
					main: [
						[
							{ node: 'Send Typing', type: 'main', index: 0 },
							{ node: 'Merge', type: 'main', index: 0 },
						],
					],
				},
				'Send Typing': { main: [[{ node: 'Merge', type: 'main', index: 1 }]] },
				Merge: { main: [[{ node: 'AI Agent', type: 'main', index: 0 }]] },
			},
		};

		const code = generateWorkflowCode(workflow);
		const parsed = parseWorkflowCode(code);

		// Verify all nodes present
		expect(parsed.nodes).toHaveLength(5);

		// CRITICAL: Verify Merge -> AI Agent connection is preserved
		expect(parsed.connections['Merge']).toBeDefined();
		expect(parsed.connections['Merge'].main[0]).toBeDefined();
		expect(parsed.connections['Merge'].main[0]![0].node).toBe('AI Agent');
	});
});

describe('SplitInBatches with IF branch converging to Merge (workflow 6993 pattern)', () => {
	it('should preserve all connections in SplitInBatches loop with IF->Merge convergence', () => {
		// Pattern from workflow 6993:
		// Loop Over Items[0] -> (done, empty)
		// Loop Over Items[1] -> Company website exists (IF)
		// Company website exists[0] (true) -> Scrape -> Set Fields -> Merge[0]
		// Company website exists[1] (false) -> Merge[1]
		// Merge -> Message Generator -> Upsert -> Loop Over Items (back to loop)
		const workflow: WorkflowJSON = {
			id: 'sib-if-merge-test',
			name: 'SplitInBatches IF Merge Test',
			nodes: [
				{
					id: '1',
					name: 'Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: '2',
					name: 'Loop Over Items',
					type: 'n8n-nodes-base.splitInBatches',
					typeVersion: 3,
					position: [200, 0],
					parameters: {},
				},
				{
					id: '3',
					name: 'Company website exists',
					type: 'n8n-nodes-base.if',
					typeVersion: 2,
					position: [400, 100],
					parameters: {},
				},
				{
					id: '4',
					name: 'Scrape & Summarize',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [600, 0],
					parameters: {},
				},
				{
					id: '5',
					name: 'Set Fields',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [800, 0],
					parameters: {},
				},
				{
					id: '6',
					name: 'Merge',
					type: 'n8n-nodes-base.merge',
					typeVersion: 3.2,
					position: [1000, 100],
					parameters: {},
				},
				{
					id: '7',
					name: 'Message Generator',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [1200, 100],
					parameters: {},
				},
				{
					id: '8',
					name: 'Supabase Upsert',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [1400, 100],
					parameters: {},
				},
			],
			connections: {
				Trigger: { main: [[{ node: 'Loop Over Items', type: 'main', index: 0 }]] },
				'Loop Over Items': {
					main: [
						[], // output 0: done (empty in this test)
						[{ node: 'Company website exists', type: 'main', index: 0 }], // output 1: loop
					],
				},
				'Company website exists': {
					main: [
						[{ node: 'Scrape & Summarize', type: 'main', index: 0 }], // true branch
						[{ node: 'Merge', type: 'main', index: 1 }], // false branch directly to Merge
					],
				},
				'Scrape & Summarize': { main: [[{ node: 'Set Fields', type: 'main', index: 0 }]] },
				'Set Fields': { main: [[{ node: 'Merge', type: 'main', index: 0 }]] },
				Merge: { main: [[{ node: 'Message Generator', type: 'main', index: 0 }]] },
				'Message Generator': { main: [[{ node: 'Supabase Upsert', type: 'main', index: 0 }]] },
				'Supabase Upsert': { main: [[{ node: 'Loop Over Items', type: 'main', index: 0 }]] },
			},
		};

		const code = generateWorkflowCode(workflow);
		const parsed = parseWorkflowCode(code);

		// Verify all nodes present
		expect(parsed.nodes).toHaveLength(8);

		// CRITICAL: Verify Loop Over Items[1] -> Company website exists connection
		expect(parsed.connections['Loop Over Items']).toBeDefined();
		expect(parsed.connections['Loop Over Items'].main[1]).toBeDefined();
		expect(parsed.connections['Loop Over Items'].main[1]![0].node).toBe('Company website exists');

		// CRITICAL: Verify IF branches are connected
		expect(parsed.connections['Company website exists']).toBeDefined();
		expect(parsed.connections['Company website exists'].main[0]![0].node).toBe(
			'Scrape & Summarize',
		);
		expect(parsed.connections['Company website exists'].main[1]![0].node).toBe('Merge');

		// CRITICAL: Verify the chain continues from Merge
		expect(parsed.connections['Merge']).toBeDefined();
		expect(parsed.connections['Merge'].main[0]![0].node).toBe('Message Generator');

		// CRITICAL: Verify the loop back connection
		expect(parsed.connections['Supabase Upsert']).toBeDefined();
		expect(parsed.connections['Supabase Upsert'].main[0]![0].node).toBe('Loop Over Items');
	});
});

describe('Sequential polling loops', () => {
	it('should handle two sequential polling loops where first IF true branch leads to second loop', () => {
		// This pattern is common in workflows that have multiple async job polling stages:
		// Trigger → Job1 → Wait1 → Check1 → IF1
		//                                  ├── true: Submit2 → Wait2 → Check2 → IF2
		//                                  │                                    ├── true: Done
		//                                  │                                    └── false: RetryWait2 → Check2 (cycle)
		//                                  └── false: RetryWait1 → Check1 (cycle)
		//
		// The key pattern from workflow 9867:
		// - First polling loop: Check1 is cycle target (RetryWait1 → Check1)
		// - Second polling loop: Check2 is cycle target (RetryWait2 → Check2)
		// - The true branch of IF1 goes through Submit2 → Wait2 → Check2 (not directly to Check2)
		// - This means the second polling loop is reached via a chain that hits the cycle target Check2
		const workflow: WorkflowJSON = {
			id: 'sequential-polling',
			name: 'Sequential Polling Loops',
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
					id: 'check1',
					name: 'Check Job 1',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [200, 0],
					parameters: { url: 'https://api.example.com/job1' },
				},
				{
					id: 'if1',
					name: 'Job 1 Done?',
					type: 'n8n-nodes-base.if',
					typeVersion: 2,
					position: [400, 0],
					parameters: {},
				},
				{
					id: 'retry-wait1',
					name: 'Retry Wait 1',
					type: 'n8n-nodes-base.wait',
					typeVersion: 1.1,
					position: [400, 200],
					parameters: { amount: 5 },
				},
				{
					id: 'submit2',
					name: 'Submit Job 2',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [600, 0],
					parameters: { url: 'https://api.example.com/submit2' },
				},
				{
					id: 'wait2',
					name: 'Wait For Job 2',
					type: 'n8n-nodes-base.wait',
					typeVersion: 1.1,
					position: [700, 0],
					parameters: { amount: 10 },
				},
				{
					id: 'check2',
					name: 'Check Job 2',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [800, 0],
					parameters: { url: 'https://api.example.com/job2' },
				},
				{
					id: 'if2',
					name: 'Job 2 Done?',
					type: 'n8n-nodes-base.if',
					typeVersion: 2,
					position: [1000, 0],
					parameters: {},
				},
				{
					id: 'retry-wait2',
					name: 'Retry Wait 2',
					type: 'n8n-nodes-base.wait',
					typeVersion: 1.1,
					position: [1000, 200],
					parameters: { amount: 5 },
				},
				{
					id: 'done',
					name: 'Done',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [1200, 0],
					parameters: {},
				},
			],
			connections: {
				Trigger: { main: [[{ node: 'Check Job 1', type: 'main', index: 0 }]] },
				'Check Job 1': { main: [[{ node: 'Job 1 Done?', type: 'main', index: 0 }]] },
				'Job 1 Done?': {
					main: [
						[{ node: 'Submit Job 2', type: 'main', index: 0 }], // true: go to second job
						[{ node: 'Retry Wait 1', type: 'main', index: 0 }], // false: retry
					],
				},
				'Retry Wait 1': { main: [[{ node: 'Check Job 1', type: 'main', index: 0 }]] }, // Cycle 1
				'Submit Job 2': { main: [[{ node: 'Wait For Job 2', type: 'main', index: 0 }]] },
				'Wait For Job 2': { main: [[{ node: 'Check Job 2', type: 'main', index: 0 }]] },
				'Check Job 2': { main: [[{ node: 'Job 2 Done?', type: 'main', index: 0 }]] },
				'Job 2 Done?': {
					main: [
						[{ node: 'Done', type: 'main', index: 0 }], // true: done
						[{ node: 'Retry Wait 2', type: 'main', index: 0 }], // false: retry
					],
				},
				'Retry Wait 2': { main: [[{ node: 'Check Job 2', type: 'main', index: 0 }]] }, // Cycle 2
			},
		};

		const code = generateWorkflowCode(workflow);
		const parsed = parseWorkflowCode(code);

		// Verify all 10 nodes are present
		expect(parsed.nodes).toHaveLength(10);
		const nodeNames = parsed.nodes.map((n) => n.name).sort();
		expect(nodeNames).toEqual([
			'Check Job 1',
			'Check Job 2',
			'Done',
			'Job 1 Done?',
			'Job 2 Done?',
			'Retry Wait 1',
			'Retry Wait 2',
			'Submit Job 2',
			'Trigger',
			'Wait For Job 2',
		]);

		// Verify all connections are preserved
		// Trigger → Check Job 1
		expect(parsed.connections['Trigger']?.main[0]?.[0]?.node).toBe('Check Job 1');

		// Check Job 1 → Job 1 Done?
		expect(parsed.connections['Check Job 1']?.main[0]?.[0]?.node).toBe('Job 1 Done?');

		// Job 1 Done? true branch → Submit Job 2
		expect(parsed.connections['Job 1 Done?']?.main[0]?.[0]?.node).toBe('Submit Job 2');

		// Job 1 Done? false branch → Retry Wait 1
		expect(parsed.connections['Job 1 Done?']?.main[1]?.[0]?.node).toBe('Retry Wait 1');

		// Retry Wait 1 → Check Job 1 (cycle back)
		expect(parsed.connections['Retry Wait 1']?.main[0]?.[0]?.node).toBe('Check Job 1');

		// Submit Job 2 → Wait For Job 2
		expect(parsed.connections['Submit Job 2']?.main[0]?.[0]?.node).toBe('Wait For Job 2');

		// Wait For Job 2 → Check Job 2
		expect(parsed.connections['Wait For Job 2']?.main[0]?.[0]?.node).toBe('Check Job 2');

		// Check Job 2 → Job 2 Done? (THIS IS THE CRITICAL ONE THAT'S MISSING!)
		expect(parsed.connections['Check Job 2']?.main[0]?.[0]?.node).toBe('Job 2 Done?');

		// Job 2 Done? true branch → Done
		expect(parsed.connections['Job 2 Done?']?.main[0]?.[0]?.node).toBe('Done');

		// Job 2 Done? false branch → Retry Wait 2
		expect(parsed.connections['Job 2 Done?']?.main[1]?.[0]?.node).toBe('Retry Wait 2');

		// Retry Wait 2 → Check Job 2 (cycle back)
		expect(parsed.connections['Retry Wait 2']?.main[0]?.[0]?.node).toBe('Check Job 2');
	});
});
