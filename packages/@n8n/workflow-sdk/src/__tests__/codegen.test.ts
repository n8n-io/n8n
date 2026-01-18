import { generateWorkflowCode } from '../codegen';
import { parseWorkflowCode } from '../parse-workflow-code';
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

	it('should handle IF branching with ifBranch() composite', () => {
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

		// Should use ifBranch() composite instead of .output()
		expect(code).toContain('ifBranch(');
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

		// Should use ifBranch() with null for missing branch
		expect(code).toContain('ifBranch(');
		expect(code).toContain('null');
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

	it('should generate code starting with return keyword', () => {
		const json: WorkflowJSON = {
			id: 'test-return',
			name: 'Test Return',
			nodes: [],
			connections: {},
		};

		const code = generateWorkflowCode(json);

		expect(code).toMatch(/^return workflow\(/);
		expect(code).not.toContain('const wf =');
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

		// Should have subnode config with languageModel factory
		expect(code).toContain('subnodes:');
		expect(code).toContain('model: languageModel(');
		expect(code).toContain("type: '@n8n/n8n-nodes-langchain.lmChatOpenAi'");
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

		// Should have all subnodes in config
		expect(code).toContain('subnodes:');
		expect(code).toContain('model: languageModel(');
		expect(code).toContain('memory: memory(');
		expect(code).toContain('tools: [');
		expect(code).toContain('tool(');

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

		expect(code).toContain('outputParser: outputParser(');
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
		expect(parsedJson.connections['OpenAI Model'].ai_languageModel[0][0].node).toBe('AI Agent');
		expect(parsedJson.connections['OpenAI Model'].ai_languageModel[0][0].type).toBe(
			'ai_languageModel',
		);
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

		expect(code).toContain('embedding: embedding(');
	});

	describe('complex connection patterns', () => {
		it('should generate merge() for fan-in patterns', () => {
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

			// Should use merge() function instead of regular node()
			expect(code).toContain('merge(');
			// Should include the source nodes in the merge array
			expect(code).toMatch(/merge\s*\(\s*\[/);
		});

		it('should generate ifBranch() for IF node patterns', () => {
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

			// Should use ifBranch() function
			expect(code).toContain('ifBranch(');
			// Should include both true and false branches
			expect(code).toMatch(/ifBranch\s*\(\s*\[/);
		});

		it('should generate switchCase() for Switch node patterns', () => {
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

			// Should use switchCase() function
			expect(code).toContain('switchCase(');
			// Should include all case branches
			expect(code).toMatch(/switchCase\s*\(\s*\[/);
		});
	});
});
