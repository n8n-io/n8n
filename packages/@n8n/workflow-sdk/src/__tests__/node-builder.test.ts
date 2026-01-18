import { node, trigger, sticky, placeholder } from '../node-builder';

describe('Node Builder', () => {
	describe('node()', () => {
		it('should create a node with type and version', () => {
			const n = node('n8n-nodes-base.httpRequest', 'v4.2', {});
			expect(n.type).toBe('n8n-nodes-base.httpRequest');
			expect(n.version).toBe('v4.2');
		});

		it('should create a node with parameters', () => {
			const n = node('n8n-nodes-base.httpRequest', 'v4.2', {
				parameters: { url: 'https://api.example.com', method: 'GET' },
			});
			expect(n.config.parameters).toEqual({
				url: 'https://api.example.com',
				method: 'GET',
			});
		});

		it('should create a node with credentials', () => {
			const n = node('n8n-nodes-base.httpRequest', 'v4.2', {
				credentials: { httpBasicAuth: { name: 'My Creds', id: '123' } },
			});
			expect(n.config.credentials).toEqual({
				httpBasicAuth: { name: 'My Creds', id: '123' },
			});
		});

		it('should create a node with execution options', () => {
			const n = node('n8n-nodes-base.httpRequest', 'v4.2', {
				parameters: { url: 'https://api.example.com' },
				onError: 'continueErrorOutput',
				retryOnFail: true,
				executeOnce: true,
			});
			expect(n.config.onError).toBe('continueErrorOutput');
			expect(n.config.retryOnFail).toBe(true);
			expect(n.config.executeOnce).toBe(true);
		});

		it('should auto-generate a unique ID', () => {
			const n1 = node('n8n-nodes-base.httpRequest', 'v4.2', {});
			const n2 = node('n8n-nodes-base.httpRequest', 'v4.2', {});
			expect(n1.id).toBeDefined();
			expect(n2.id).toBeDefined();
			expect(n1.id).not.toBe(n2.id);
		});

		it('should auto-generate a name from type if not provided', () => {
			const n = node('n8n-nodes-base.httpRequest', 'v4.2', {});
			expect(n.name).toBe('HTTP Request');
		});

		it('should use custom name if provided', () => {
			const n = node('n8n-nodes-base.httpRequest', 'v4.2', {
				name: 'Fetch API Data',
			});
			expect(n.name).toBe('Fetch API Data');
		});

		it('should support position', () => {
			const n = node('n8n-nodes-base.httpRequest', 'v4.2', {
				position: [100, 200],
			});
			expect(n.config.position).toEqual([100, 200]);
		});

		it('should support disabled state', () => {
			const n = node('n8n-nodes-base.httpRequest', 'v4.2', {
				disabled: true,
			});
			expect(n.config.disabled).toBe(true);
		});

		it('should support notes', () => {
			const n = node('n8n-nodes-base.httpRequest', 'v4.2', {
				notes: 'This fetches user data',
				notesInFlow: true,
			});
			expect(n.config.notes).toBe('This fetches user data');
			expect(n.config.notesInFlow).toBe(true);
		});

		it('should support update() to modify configuration', () => {
			const n = node('n8n-nodes-base.httpRequest', 'v4.2', {
				parameters: { url: 'https://old-url.com' },
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
		it('should create a trigger node with isTrigger marker', () => {
			const t = trigger('n8n-nodes-base.scheduleTrigger', 'v1.1', {
				parameters: { rule: { interval: [{ field: 'hours', hour: 8 }] } },
			});
			expect(t.type).toBe('n8n-nodes-base.scheduleTrigger');
			expect(t.isTrigger).toBe(true);
		});

		it('should auto-generate name for trigger', () => {
			const t = trigger('n8n-nodes-base.webhookTrigger', 'v1', {});
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

	describe('AI nodes with subnodes', () => {
		it('should create an AI node with subnodes', () => {
			const modelNode = node('n8n-nodes-langchain.lmChatOpenAi', 'v1', {
				parameters: { model: 'gpt-4' },
			});
			const memoryNode = node('n8n-nodes-langchain.memoryBufferWindow', 'v1', {
				parameters: { windowSize: 5 },
			});
			const toolNode = node('n8n-nodes-langchain.toolCalculator', 'v1', {});

			const agentNode = node('n8n-nodes-langchain.agent', 'v1.6', {
				parameters: { text: '={{ $json.prompt }}' },
				subnodes: {
					model: modelNode,
					memory: memoryNode,
					tools: [toolNode],
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
			const parserNode = node('n8n-nodes-langchain.outputParserStructured', 'v1.3', {
				parameters: { schemaType: 'manual', inputSchema: '{}' },
			});

			const chainNode = node('n8n-nodes-langchain.chainLlm', 'v1', {
				parameters: {},
				subnodes: {
					outputParser: parserNode,
				},
			});

			expect(chainNode.config.subnodes?.outputParser).toBe(parserNode);
		});
	});
});
