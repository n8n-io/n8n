import { node, trigger, sticky, placeholder, newCredential } from '../node-builder';
import { languageModel, memory, tool, outputParser } from '../subnode-builders';
import type { LcAgentV31Node } from '../types/generated';

describe('Node Builder', () => {
	describe('node()', () => {
		it('should create a node from object with type, version, and config', () => {
			const n = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { parameters: { url: 'https://api.example.com' } },
			});
			expect(n.type).toBe('n8n-nodes-base.httpRequest');
			expect(n.version).toBe('4.2');
			expect(n.config.parameters).toEqual({ url: 'https://api.example.com' });
		});

		it('should work with generated node types', () => {
			// Using satisfies to validate against generated type
			const agentNode = node({
				type: '@n8n/n8n-nodes-langchain.agent',
				version: 3.1,
				config: {
					parameters: {
						promptType: 'auto',
						text: 'Hello',
					},
				},
			} satisfies LcAgentV31Node);
			expect(agentNode.type).toBe('@n8n/n8n-nodes-langchain.agent');
			expect(agentNode.version).toBe('3.1');
		});

		it('should support integer versions', () => {
			const n = node({
				type: 'n8n-nodes-base.code',
				version: 2,
				config: {},
			});
			expect(n.version).toBe('2');
		});

		it('should create a node with parameters', () => {
			const n = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: {
					parameters: { url: 'https://api.example.com', method: 'GET' },
				},
			});
			expect(n.config.parameters).toEqual({
				url: 'https://api.example.com',
				method: 'GET',
			});
		});

		it('should create a node with credentials', () => {
			const n = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: {
					credentials: { httpBasicAuth: { name: 'My Creds', id: '123' } },
				},
			});
			expect(n.config.credentials).toEqual({
				httpBasicAuth: { name: 'My Creds', id: '123' },
			});
		});

		it('should create a node with execution options', () => {
			const n = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: {
					parameters: { url: 'https://api.example.com' },
					onError: 'continueErrorOutput',
					retryOnFail: true,
					executeOnce: true,
				},
			});
			expect(n.config.onError).toBe('continueErrorOutput');
			expect(n.config.retryOnFail).toBe(true);
			expect(n.config.executeOnce).toBe(true);
		});

		it('should auto-generate a unique ID', () => {
			const n1 = node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: {} });
			const n2 = node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: {} });
			expect(n1.id).toBeDefined();
			expect(n2.id).toBeDefined();
			expect(n1.id).not.toBe(n2.id);
		});

		it('should auto-generate a name from type if not provided', () => {
			const n = node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: {} });
			expect(n.name).toBe('HTTP Request');
		});

		it('should use custom name if provided', () => {
			const n = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'Fetch API Data' },
			});
			expect(n.name).toBe('Fetch API Data');
		});

		it('should support position', () => {
			const n = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { position: [100, 200] },
			});
			expect(n.config.position).toEqual([100, 200]);
		});

		it('should support disabled state', () => {
			const n = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { disabled: true },
			});
			expect(n.config.disabled).toBe(true);
		});

		it('should support notes', () => {
			const n = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: {
					notes: 'This fetches user data',
					notesInFlow: true,
				},
			});
			expect(n.config.notes).toBe('This fetches user data');
			expect(n.config.notesInFlow).toBe(true);
		});

		it('should support update() to modify configuration', () => {
			const n = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { parameters: { url: 'https://old-url.com' } },
			});
			const updated = n.update({
				parameters: { url: 'https://new-url.com' },
			});
			expect(updated.config.parameters).toEqual({ url: 'https://new-url.com' });
			// Original should be unchanged (immutable)
			expect(n.config.parameters).toEqual({ url: 'https://old-url.com' });
		});
	});

	describe('trigger()', () => {
		it('should create a trigger from object with type, version, and config', () => {
			const t = trigger({
				type: 'n8n-nodes-base.scheduleTrigger',
				version: 1.1,
				config: {
					parameters: { rule: { interval: [{ field: 'hours', hour: 8 }] } },
				},
			});
			expect(t.type).toBe('n8n-nodes-base.scheduleTrigger');
			expect(t.version).toBe('1.1');
			expect(t.isTrigger).toBe(true);
		});

		it('should support integer versions', () => {
			const t = trigger({
				type: 'n8n-nodes-base.webhookTrigger',
				version: 2,
				config: {},
			});
			expect(t.version).toBe('2');
			expect(t.isTrigger).toBe(true);
		});

		it('should auto-generate name for trigger', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			expect(t.name).toBe('Webhook Trigger');
		});
	});

	describe('sticky()', () => {
		it('should create a sticky note with content', () => {
			const s = sticky('## Documentation');
			expect(s.type).toBe('n8n-nodes-base.stickyNote');
			expect(s.config.parameters?.content).toBe('## Documentation');
		});

		it('should support color option', () => {
			const s = sticky('## Note', { color: 4 });
			expect(s.config.parameters?.color).toBe(4);
		});

		it('should support position option', () => {
			const s = sticky('## Note', { position: [80, -176] });
			expect(s.config.position).toEqual([80, -176]);
		});

		it('should support width and height', () => {
			const s = sticky('## Note', { width: 300, height: 200 });
			expect(s.config.parameters?.width).toBe(300);
			expect(s.config.parameters?.height).toBe(200);
		});

		it('should auto-position around nodes when nodes option is provided', () => {
			const n1 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'HTTP 1', position: [400, 300] },
			});
			const n2 = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Set', position: [700, 300] },
			});

			const s = sticky('## API Section', { nodes: [n1, n2], color: 2 });

			// Should calculate bounding box around nodes with padding (50px)
			// minX = 400, maxX = 700 + 200 = 900, minY = 300, maxY = 300 + 100 = 400
			// position = [400-50, 300-50] = [350, 250]
			// width = (900-400) + 100 = 600, height = (400-300) + 100 = 200
			expect(s.config.position).toEqual([350, 250]);
			expect(s.config.parameters?.width).toBe(600);
			expect(s.config.parameters?.height).toBe(200);
			expect(s.config.parameters?.color).toBe(2);
		});

		it('should allow manual position to override nodes bounding box', () => {
			const n1 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'HTTP', position: [400, 300] },
			});

			const s = sticky('## Note', { nodes: [n1], position: [100, 100] });

			// Manual position should override calculated position
			expect(s.config.position).toEqual([100, 100]);
		});

		it('should generate unique default names for multiple stickies', () => {
			const s1 = sticky('## Note 1');
			const s2 = sticky('## Note 2');
			const s3 = sticky('## Note 3');

			// Each sticky gets a unique name (based on first 8 chars of UUID)
			// to prevent them from overwriting each other in the workflow Map
			expect(s1.name).toMatch(/^Sticky Note [a-f0-9]{8}$/);
			expect(s2.name).toMatch(/^Sticky Note [a-f0-9]{8}$/);
			expect(s3.name).toMatch(/^Sticky Note [a-f0-9]{8}$/);

			// Names should be different
			expect(s1.name).not.toBe(s2.name);
			expect(s2.name).not.toBe(s3.name);
			expect(s1.name).not.toBe(s3.name);

			// Each sticky should have a unique ID
			expect(s1.id).not.toBe(s2.id);
			expect(s2.id).not.toBe(s3.id);
			expect(s1.id).not.toBe(s3.id);
		});

		it('should use explicit name when provided', () => {
			const s = sticky('## My Content', { name: 'Custom Sticky Name' });
			expect(s.name).toBe('Custom Sticky Name');
		});
	});

	describe('placeholder()', () => {
		it('should create a placeholder value with hint', () => {
			const p = placeholder('Enter Channel');
			expect(p.__placeholder).toBe(true);
			expect(p.hint).toBe('Enter Channel');
		});

		it('should serialize to placeholder format', () => {
			const p = placeholder('API Key');
			expect(String(p)).toBe('<__PLACEHOLDER_VALUE__API Key__>');
		});
	});

	describe('newCredential()', () => {
		it('should create a new credential marker with name', () => {
			const c = newCredential('My Slack Bot');
			expect(c.__newCredential).toBe(true);
			expect(c.name).toBe('My Slack Bot');
		});

		it('should serialize to undefined (not yet implemented)', () => {
			const c = newCredential('My API Auth');
			// toJSON returns undefined, which JSON.stringify omits
			expect(JSON.stringify({ cred: c })).toBe('{}');
		});

		it('should work in node credentials config', () => {
			const n = node({
				type: 'n8n-nodes-base.slack',
				version: 2.2,
				config: {
					parameters: { channel: '#general' },
					credentials: { slackApi: newCredential('Slack Bot') },
				},
			});
			expect(n.config.credentials).toBeDefined();
			const credJson = JSON.parse(JSON.stringify(n.config.credentials));
			// newCredential serializes to undefined, which is omitted from JSON
			expect(credJson).toEqual({});
		});

		it('should work alongside regular credential references', () => {
			const n = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: {
					parameters: { url: 'https://api.example.com' },
					credentials: {
						httpBasicAuth: { id: 'existing-123', name: 'Existing Auth' },
						httpHeaderAuth: newCredential('New Header Auth'),
					},
				},
			});
			const credJson = JSON.parse(JSON.stringify(n.config.credentials));
			// Regular credentials preserved, newCredential omitted (serializes to undefined)
			expect(credJson).toEqual({
				httpBasicAuth: { id: 'existing-123', name: 'Existing Auth' },
			});
		});
	});

	describe('then() with multiple targets (fan-out)', () => {
		it('should connect a node to multiple targets with array syntax', () => {
			const source = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'Source' },
			});
			const target1 = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Target 1' },
			});
			const target2 = node({
				type: 'n8n-nodes-base.code',
				version: 2,
				config: { name: 'Target 2' },
			});

			// Fan-out: connect source to both targets
			source.then([target1, target2]);

			const connections = source.getConnections();
			expect(connections).toHaveLength(2);
			expect(connections[0].target).toBe(target1);
			expect(connections[0].outputIndex).toBe(0);
			expect(connections[1].target).toBe(target2);
			expect(connections[1].outputIndex).toBe(0);
		});

		it('should connect to multiple targets with specific output index', () => {
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2,
				config: { name: 'IF' },
			});
			const target1 = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Target 1' },
			});
			const target2 = node({
				type: 'n8n-nodes-base.code',
				version: 2,
				config: { name: 'Target 2' },
			});

			// Connect IF true branch (output 0) to multiple targets
			ifNode.then([target1, target2], 0);

			const connections = ifNode.getConnections();
			expect(connections).toHaveLength(2);
			expect(connections.every((c) => c.outputIndex === 0)).toBe(true);
		});

		it('should work with single target (backward compatible)', () => {
			const source = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'Source' },
			});
			const target = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Target' },
			});

			// Single target (existing behavior)
			source.then(target);

			const connections = source.getConnections();
			expect(connections).toHaveLength(1);
			expect(connections[0].target).toBe(target);
		});

		it('should return a chain with all targets included', () => {
			const source = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'Source' },
			});
			const target1 = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Target 1' },
			});
			const target2 = node({
				type: 'n8n-nodes-base.code',
				version: 2,
				config: { name: 'Target 2' },
			});

			const chain = source.then([target1, target2]);

			// Chain should include all nodes
			expect(chain.allNodes).toContain(source);
			expect(chain.allNodes).toContain(target1);
			expect(chain.allNodes).toContain(target2);
		});

		it('should allow chaining after fan-out', () => {
			const source = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'Source' },
			});
			const branch1 = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Branch 1' },
			});
			const branch2 = node({
				type: 'n8n-nodes-base.code',
				version: 2,
				config: { name: 'Branch 2' },
			});
			const finalNode = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Final' },
			});

			// Fan-out then chain from last target
			const chain = source.then([branch1, branch2]).then(finalNode);

			// The chain should connect last target to finalNode
			expect(chain.tail).toBe(finalNode);
			expect(chain.allNodes).toContain(finalNode);
		});
	});

	describe('AI nodes with subnodes', () => {
		it('should create an AI node with subnodes', () => {
			const modelNode = languageModel({
				type: 'n8n-nodes-langchain.lmChatOpenAi',
				version: 1,
				config: { parameters: { model: 'gpt-4' } },
			});
			const memoryNode = memory({
				type: 'n8n-nodes-langchain.memoryBufferWindow',
				version: 1,
				config: { parameters: { windowSize: 5 } },
			});
			const toolNode = tool({
				type: 'n8n-nodes-langchain.toolCalculator',
				version: 1,
				config: {},
			});

			const agentNode = node({
				type: 'n8n-nodes-langchain.agent',
				version: 1.6,
				config: {
					parameters: { text: '={{ $json.prompt }}' },
					subnodes: {
						model: modelNode,
						memory: memoryNode,
						tools: [toolNode],
					},
				},
			});

			expect(agentNode.type).toBe('n8n-nodes-langchain.agent');
			expect(agentNode.config.subnodes).toBeDefined();
			expect(agentNode.config.subnodes?.model).toBe(modelNode);
			expect(agentNode.config.subnodes?.memory).toBe(memoryNode);
			expect(agentNode.config.subnodes?.tools).toHaveLength(1);
			expect(agentNode.config.subnodes?.tools?.[0]).toBe(toolNode);
		});

		it('should create an AI node with output parser', () => {
			const parserNode = outputParser({
				type: 'n8n-nodes-langchain.outputParserStructured',
				version: 1.3,
				config: { parameters: { schemaType: 'manual', inputSchema: '{}' } },
			});

			const chainNode = node({
				type: 'n8n-nodes-langchain.chainLlm',
				version: 1,
				config: {
					parameters: {},
					subnodes: {
						outputParser: parserNode,
					},
				},
			});

			expect(chainNode.config.subnodes?.outputParser).toBe(parserNode);
		});
	});
});
