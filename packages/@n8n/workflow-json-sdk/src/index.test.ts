import { describe, it, expect } from 'vitest';

import { workflow, fromJSON, type WorkflowJSON } from './index';

describe('Workflow JSON SDK', () => {
	describe('Basic Workflow Creation', () => {
		it('should create a simple workflow with nodes', () => {
			const wf = workflow({ name: 'My workflow' });

			wf.node('Manual Trigger').type('n8n-nodes-base.manualTrigger').parameters({});

			wf.node('Set').type('n8n-nodes-base.set').parameters({ options: {} });

			const json = wf.toJSON();

			expect(json.name).toBe('My workflow');
			expect(json.nodes).toHaveLength(2);
			expect(json.nodes[0].name).toBe('Manual Trigger');
			expect(json.nodes[1].name).toBe('Set');
		});

		it('should create nodes with full configuration', () => {
			const wf = workflow();

			wf.node('Test Node')
				.type('n8n-nodes-base.test')
				.parameters({ value: 'test' })
				.position(100, 200)
				.version(2)
				.disabled(true)
				.notes('Test note', true);

			const json = wf.toJSON();
			const nodeData = json.nodes[0];

			expect(nodeData.name).toBe('Test Node');
			expect(nodeData.type).toBe('n8n-nodes-base.test');
			expect(nodeData.parameters).toEqual({ value: 'test' });
			expect(nodeData.position).toEqual([100, 200]);
			expect(nodeData.typeVersion).toBe(2);
			expect(nodeData.disabled).toBe(true);
			expect(nodeData.notes).toBe('Test note');
			expect(nodeData.notesInFlow).toBe(true);
		});

		it('should set workflow metadata', () => {
			const wf = workflow({
				name: 'Test Workflow',
				meta: {
					instanceId: 'test-instance',
					templateCredsSetupCompleted: true,
				},
			});

			const json = wf.toJSON();

			expect(json.name).toBe('Test Workflow');
			expect(json.meta?.instanceId).toBe('test-instance');
			expect(json.meta?.templateCredsSetupCompleted).toBe(true);
		});
	});

	describe('Connections', () => {
		it('should create simple connections between nodes', () => {
			const wf = workflow();

			const triggerNode = wf.node('Trigger').type('n8n-nodes-base.manualTrigger').parameters({});

			const setNode = wf.node('Set').type('n8n-nodes-base.set').parameters({});

			wf.connection().from(triggerNode).to(setNode);

			const json = wf.toJSON();

			expect(json.connections['Trigger']).toBeDefined();
			expect(json.connections['Trigger']?.main).toBeDefined();
			expect(json.connections['Trigger']?.main?.[0]).toHaveLength(1);
			expect(json.connections['Trigger']?.main?.[0]?.[0]).toEqual({
				node: 'Set',
				type: 'main',
				index: 0,
			});
		});

		it('should create connections to multiple nodes', () => {
			const wf = workflow();

			const trigger = wf.node('Trigger').type('n8n-nodes-base.manualTrigger').parameters({});

			const setA = wf.node('Set A').type('n8n-nodes-base.set').parameters({});

			const setB = wf.node('Set B').type('n8n-nodes-base.set').parameters({});

			wf.connection().from(trigger).to([setA, setB]);

			const json = wf.toJSON();

			expect(json.connections['Trigger']?.main?.[0]).toHaveLength(2);
			expect(json.connections['Trigger']?.main?.[0]?.[0]?.node).toBe('Set A');
			expect(json.connections['Trigger']?.main?.[0]?.[1]?.node).toBe('Set B');
		});

		it('should create chained connections', () => {
			const wf = workflow();

			const trigger = wf.node('Trigger').type('n8n-nodes-base.manualTrigger').parameters({});

			const setA = wf.node('Set A').type('n8n-nodes-base.set').parameters({});

			const setB = wf.node('Set B').type('n8n-nodes-base.set').parameters({});

			const setC = wf.node('Set C').type('n8n-nodes-base.set').parameters({});

			wf.connection().from(trigger).to([setA, setB]);

			wf.connection().from(setA).to(setC);

			const json = wf.toJSON();

			expect(json.connections['Trigger']?.main?.[0]).toHaveLength(2);
			expect(json.connections['Set A']?.main?.[0]).toHaveLength(1);
			expect(json.connections['Set A']?.main?.[0]?.[0]?.node).toBe('Set C');
		});

		it('should support custom connection types and indices', () => {
			const wf = workflow();

			const agentNode = wf.node('Agent').type('@n8n/n8n-nodes-langchain.agent').parameters({});

			const toolNode = wf.node('Tool').type('n8n-nodes-base.rssFeedReadTool').parameters({});

			wf.connection()
				.from({ node: toolNode, type: 'ai_tool', index: 0 })
				.to({ node: agentNode, type: 'ai_tool', index: 0 });

			const json = wf.toJSON();

			expect(json.connections['Tool']?.ai_tool?.[0]?.[0]).toEqual({
				node: 'Agent',
				type: 'ai_tool',
				index: 0,
			});
		});

		it('should support chaining to() calls', () => {
			const wf = workflow();

			const trigger = wf.node('Trigger').type('n8n-nodes-base.manualTrigger').parameters({});

			const setA = wf.node('Set A').type('n8n-nodes-base.set').parameters({});

			const setB = wf.node('Set B').type('n8n-nodes-base.set').parameters({});

			const setC = wf.node('Set C').type('n8n-nodes-base.set').parameters({});

			wf.connection().from(trigger).to([setA, setB]).to(setC);

			const json = wf.toJSON();

			expect(json.connections['Trigger']?.main?.[0]).toHaveLength(3);
			expect(json.connections['Trigger']?.main?.[0]?.map((c) => c?.node)).toEqual([
				'Set A',
				'Set B',
				'Set C',
			]);
		});
	});

	describe('AI Agent Workflow Example', () => {
		it('should create a complex AI agent workflow like the example', () => {
			const wf = workflow({ name: 'AI Agent Workflow' });

			wf.meta({
				instanceId: 'test-instance-id',
				templateCredsSetupCompleted: true,
			});

			const chatTrigger = wf
				.node('Example Chat')
				.type('@n8n/n8n-nodes-langchain.chatTrigger')
				.position(-176, -64)
				.parameters({
					public: true,
					options: {
						title: 'Your first AI Agent 🚀',
						subtitle: 'This is for demo purposes. Try me out !',
						responseMode: 'lastNode',
						inputPlaceholder: 'Type your message here...',
						showWelcomeScreen: false,
					},
					initialMessages: 'Hi there! 👋',
				})
				.webhookId('e5616171-e3b5-4c39-81d4-67409f9fa60a')
				.version(1.1)
				.notes('© 2025 Lucas Peyrin');

			const agent = wf
				.node('Your First AI Agent')
				.type('@n8n/n8n-nodes-langchain.agent')
				.position(192, -64)
				.parameters({
					options: {
						systemMessage: 'You are a helpful assistant.',
					},
				})
				.version(2.2)
				.notes('© 2025 Lucas Peyrin');

			const gemini = wf
				.node('Connect Gemini')
				.type('@n8n/n8n-nodes-langchain.lmChatGoogleGemini')
				.position(-176, 224)
				.parameters({
					options: {
						temperature: 0,
					},
				})
				.version(1)
				.notes('© 2025 Lucas Peyrin');

			const memory = wf
				.node('Conversation Memory')
				.type('@n8n/n8n-nodes-langchain.memoryBufferWindow')
				.position(224, 224)
				.parameters({
					contextWindowLength: 30,
				})
				.version(1.3)
				.notes('© 2025 Lucas Peyrin');

			const weatherTool = wf
				.node('Get Weather')
				.type('n8n-nodes-base.httpRequestTool')
				.position(544, 224)
				.parameters({
					url: 'https://api.open-meteo.com/v1/forecast',
					options: {},
					sendQuery: true,
					toolDescription: 'Get weather forecast anywhere, anytime.',
				})
				.version(4.2)
				.notes('', true);

			const newsTool = wf
				.node('Get News')
				.type('n8n-nodes-base.rssFeedReadTool')
				.position(656, 224)
				.parameters({
					toolDescription: 'Gets the latest blog posts about any rss feed.',
				})
				.version(1.2)
				.notes('© 2025 Lucas Peyrin');

			// Create connections
			wf.connection().from(chatTrigger).to({ node: agent, type: 'main', index: 0 });

			wf.connection()
				.from({ node: gemini, type: 'ai_languageModel', index: 0 })
				.to({ node: agent, type: 'ai_languageModel', index: 0 });

			wf.connection()
				.from({ node: memory, type: 'ai_memory', index: 0 })
				.to({ node: agent, type: 'ai_memory', index: 0 });

			wf.connection()
				.from({ node: weatherTool, type: 'ai_tool', index: 0 })
				.to({ node: agent, type: 'ai_tool', index: 0 });

			wf.connection()
				.from({ node: newsTool, type: 'ai_tool', index: 0 })
				.to({ node: agent, type: 'ai_tool', index: 0 });

			const json = wf.toJSON();

			expect(json.nodes).toHaveLength(6);
			expect(json.connections['Example Chat']).toBeDefined();
			expect(json.connections['Connect Gemini']).toBeDefined();
			expect(json.connections['Conversation Memory']).toBeDefined();
			expect(json.connections['Get Weather']).toBeDefined();
			expect(json.connections['Get News']).toBeDefined();
		});
	});

	describe('Additional Features', () => {
		it('should support pin data', () => {
			const wf = workflow();

			wf.node('Test').type('n8n-nodes-base.test').parameters({});

			wf.pinData('Test', [{ json: { value: 'test' } }]);

			const json = wf.toJSON();

			expect(json.pinData).toEqual({
				// eslint-disable-next-line @typescript-eslint/naming-convention
				Test: [{ json: { value: 'test' } }],
			});
		});

		it('should support workflow settings', () => {
			const wf = workflow();

			wf.settings({
				executionOrder: 'v1',
				saveManualExecutions: true,
			});

			const json = wf.toJSON();

			expect(json.settings).toEqual({
				executionOrder: 'v1',
				saveManualExecutions: true,
			});
		});

		it('should support static data', () => {
			const wf = workflow();

			wf.staticData({ counter: 0 });

			const json = wf.toJSON();

			expect(json.staticData).toEqual({ counter: 0 });
		});

		it('should support active status', () => {
			const wf = workflow();

			wf.active(true);

			const json = wf.toJSON();

			expect(json.active).toBe(true);
		});

		it('should support retry configuration', () => {
			const wf = workflow();

			wf.node('Test').type('n8n-nodes-base.test').parameters({}).retryOnFail(true, 3, 1000);

			const json = wf.toJSON();
			const node = json.nodes[0];

			expect(node.retryOnFail).toBe(true);
			expect(node.maxTries).toBe(3);
			expect(node.waitBetweenTries).toBe(1000);
		});

		it('should support credentials', () => {
			const wf = workflow();

			wf.node('Test')
				.type('n8n-nodes-base.test')
				.parameters({})
				.credentials({
					api: {
						id: 'cred-123',
						name: 'My API Credential',
					},
				});

			const json = wf.toJSON();
			const node = json.nodes[0];

			expect(node.credentials).toEqual({
				api: {
					id: 'cred-123',
					name: 'My API Credential',
				},
			});
		});
	});

	describe('fromJSON', () => {
		it('should parse workflow from JSON', () => {
			const originalJSON: WorkflowJSON = {
				id: '',
				name: 'Test Workflow',
				active: false,
				isArchived: false,
				createdAt: new Date(),
				updatedAt: new Date(),
				meta: {
					instanceId: 'test-id',
				},
				nodes: [
					{
						id: 'node-1',
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						position: [100, 200],
						parameters: {},
						typeVersion: 1,
					},
					{
						id: 'node-2',
						name: 'Set',
						type: 'n8n-nodes-base.set',
						position: [300, 200],
						parameters: { values: {} },
						typeVersion: 1,
					},
				],
				connections: {
					// eslint-disable-next-line @typescript-eslint/naming-convention
					Trigger: {
						main: [[{ node: 'Set', type: 'main', index: 0 }]],
					},
				},
				pinData: {},
			};

			const wf = fromJSON(originalJSON);
			const json = wf.toJSON();

			expect(json.name).toBe('Test Workflow');
			expect(json.nodes).toHaveLength(2);
			expect(json.nodes[0].name).toBe('Trigger');
			expect(json.nodes[1].name).toBe('Set');
			// eslint-disable-next-line @typescript-eslint/naming-convention
			expect(json.connections['Trigger']?.main?.[0]?.[0]?.node).toBe('Set');
		});

		it('should preserve all node properties when parsing from JSON', () => {
			const originalJSON: WorkflowJSON = {
				id: '',
				name: 'Test Workflow',
				active: false,
				isArchived: false,
				createdAt: new Date(),
				updatedAt: new Date(),
				nodes: [
					{
						id: 'node-1',
						name: 'Test',
						type: 'n8n-nodes-base.test',
						position: [100, 200],
						parameters: { value: 'test' },
						typeVersion: 2,
						disabled: true,
						notes: 'Test note',
						notesInFlow: true,
						webhookId: 'webhook-123',
						retryOnFail: true,
						maxTries: 3,
						waitBetweenTries: 1000,
						alwaysOutputData: true,
						executeOnce: true,
						continueOnFail: true,
					},
				],
				connections: {},
			};

			const wf = fromJSON(originalJSON);
			const json = wf.toJSON();
			const node = json.nodes[0];

			expect(node.name).toBe('Test');
			expect(node.type).toBe('n8n-nodes-base.test');
			expect(node.typeVersion).toBe(2);
			expect(node.disabled).toBe(true);
			expect(node.notes).toBe('Test note');
			expect(node.notesInFlow).toBe(true);
			expect(node.webhookId).toBe('webhook-123');
			expect(node.retryOnFail).toBe(true);
			expect(node.maxTries).toBe(3);
			expect(node.waitBetweenTries).toBe(1000);
			expect(node.alwaysOutputData).toBe(true);
			expect(node.executeOnce).toBe(true);
			expect(node.continueOnFail).toBe(true);
		});
	});

	describe('API Examples', () => {
		it('should match the README example API', () => {
			const wf = workflow({ name: 'My workflow' });

			const manualTrigger = wf
				.node('Manual Trigger')
				.type('n8n-nodes-base.manualTrigger')
				.parameters({});

			const setA = wf.node('Set A').type('n8n-nodes-base.set').parameters({ options: {} });

			const setB = wf.node('Set B').type('n8n-nodes-base.set');

			const setC = wf.node('Set C').type('n8n-nodes-base.set').parameters({
				example: 'value',
			});

			wf.connection().from(manualTrigger).to([setA, setB]);

			wf.connection()
				.from({ node: manualTrigger, type: 'main', index: 0 })
				.to([setA, setB])
				.to({ node: setC, type: 'main', index: 0 });

			const workflowJSON = wf.toJSON();

			expect(workflowJSON.name).toBe('My workflow');
			expect(workflowJSON.nodes).toHaveLength(4);
			expect(workflowJSON.connections['Manual Trigger']).toBeDefined();
		});
	});
});
