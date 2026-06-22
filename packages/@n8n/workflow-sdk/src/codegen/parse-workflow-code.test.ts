import { parseWorkflowCode, parseWorkflowCodeToBuilder } from './parse-workflow-code';
import { validateWorkflow } from '../validation';

describe('parseWorkflowCodeToBuilder', () => {
	describe('SDK builder code', () => {
		it('should return a WorkflowBuilder from SDK workflow() calls', () => {
			const code = `export default workflow('test-id', 'My Workflow')
				.add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }))
			`;

			const builder = parseWorkflowCodeToBuilder(code);

			expect(typeof builder.regenerateNodeIds).toBe('function');
			expect(typeof builder.validate).toBe('function');
			expect(typeof builder.toJSON).toBe('function');

			const json = builder.toJSON();
			expect(json.name).toBe('My Workflow');
			expect(json.nodes).toHaveLength(1);
		});

		it('should parse SDK code using nodeJson()', () => {
			const code = `
				const telegramTrigger = trigger({
					type: 'n8n-nodes-base.telegramTrigger',
					version: 1,
					config: { name: 'Telegram Trigger', parameters: {} }
				});
				const setChat = node({
					type: 'n8n-nodes-base.set',
					version: 3.4,
					config: {
						name: 'Set Chat',
						parameters: { chatId: nodeJson(telegramTrigger, 'message.chat.id') }
					}
				});
				export default workflow('test-id', 'My Workflow').add(telegramTrigger).to(setChat);
			`;

			const builder = parseWorkflowCodeToBuilder(code);
			const json = builder.toJSON();
			const setNode = json.nodes.find((node) => node.name === 'Set Chat');

			expect(setNode?.parameters?.chatId).toBe(
				"={{ $('Telegram Trigger').item.json.message.chat.id }}",
			);
		});

		it('rejects detached onTrue/onFalse statements after export default', () => {
			const code = `
				const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
				const isResolved = ifElse({ version: 2.2, config: { name: 'Resolved?' } });
				const replyResolved = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'Send FAQ Answer' } });
				const replyEscalated = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'Send Escalation Reply' } });

				export default workflow('whatsapp-faq-bot', 'WhatsApp FAQ Bot')
					.add(t)
					.to(isResolved);

				isResolved.onTrue(replyResolved);
				isResolved.onFalse(replyEscalated);
			`;

			expect(() => parseWorkflowCode(code)).toThrow(/must be chained inside \.to/);
		});

		it('wires IF branches when onTrue/onFalse are passed to .to()', () => {
			const code = `
				const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
				const isResolved = ifElse({ version: 2.2, config: { name: 'Resolved?' } });
				const replyResolved = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'Send FAQ Answer' } });
				const replyEscalated = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'Send Escalation Reply' } });

				export default workflow('whatsapp-faq-bot', 'WhatsApp FAQ Bot')
					.add(t)
					.to(isResolved.onTrue(replyResolved).onFalse(replyEscalated));
			`;

			const json = parseWorkflowCode(code);
			const ifWarnings = validateWorkflow(json).warnings.filter(
				(w) => w.code === 'IF_NO_OUTPUT_CONNECTIONS',
			);

			expect(json.nodes.map((n) => n.name)).toEqual(
				expect.arrayContaining(['Resolved?', 'Send FAQ Answer', 'Send Escalation Reply']),
			);
			expect(json.connections['Resolved?']?.main?.[0]?.[0]?.node).toBe('Send FAQ Answer');
			expect(json.connections['Resolved?']?.main?.[1]?.[0]?.node).toBe('Send Escalation Reply');
			expect(ifWarnings).toHaveLength(0);
		});
	});

	describe('plain object code (WorkflowJSON)', () => {
		it('should convert a plain object with nodes array into a WorkflowBuilder', () => {
			const code = `
				const myFlow = {
					name: 'TEST',
					nodes: [
						{
							id: 'sticky-test',
							name: 'Test Note',
							type: 'n8n-nodes-base.stickyNote',
							typeVersion: 1,
							position: [100, 100],
							parameters: { content: 'Hello', height: 200, width: 300, color: 3 }
						}
					],
					connections: {}
				};
				export default myFlow;
			`;

			const builder = parseWorkflowCodeToBuilder(code);

			expect(typeof builder.regenerateNodeIds).toBe('function');
			expect(typeof builder.validate).toBe('function');
			expect(typeof builder.toJSON).toBe('function');

			builder.regenerateNodeIds();
			const json = builder.toJSON();
			expect(json.name).toBe('TEST');
			expect(json.nodes).toHaveLength(1);
			expect(json.nodes[0].type).toBe('n8n-nodes-base.stickyNote');
		});

		it('should convert a directly exported object literal', () => {
			const code = `export default {
				name: 'Direct Export',
				nodes: [
					{
						id: 'node-1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {}
					}
				],
				connections: {}
			}`;

			const builder = parseWorkflowCodeToBuilder(code);
			builder.regenerateNodeIds();

			const json = builder.toJSON();
			expect(json.name).toBe('Direct Export');
			expect(json.nodes).toHaveLength(1);
		});

		it('should handle a plain object with multiple nodes', () => {
			const code = `export default {
				name: 'Multi Node',
				nodes: [
					{
						id: 'trigger-1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {}
					},
					{
						id: 'set-1',
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [200, 0],
						parameters: {}
					}
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'Set', type: 'main', index: 0 }]]
					}
				}
			}`;

			const builder = parseWorkflowCodeToBuilder(code);
			builder.regenerateNodeIds();

			const json = builder.toJSON();
			expect(json.nodes).toHaveLength(2);
			expect(json.connections).toBeDefined();
		});

		it('should handle a plain object with empty nodes array', () => {
			const code = "export default { name: 'Empty', nodes: [], connections: {} }";

			const builder = parseWorkflowCodeToBuilder(code);
			builder.regenerateNodeIds();

			const json = builder.toJSON();
			expect(json.name).toBe('Empty');
			expect(json.nodes).toHaveLength(0);
		});
	});

	describe('invalid exports', () => {
		it('should throw for a number export', () => {
			expect(() => parseWorkflowCodeToBuilder('export default 42')).toThrow(
				'Code must export a workflow built with the workflow() SDK function.',
			);
		});

		it('should throw for a string export', () => {
			expect(() => parseWorkflowCodeToBuilder("export default 'hello'")).toThrow(
				'Code must export a workflow built with the workflow() SDK function.',
			);
		});

		it('should throw for an object without nodes', () => {
			expect(() => parseWorkflowCodeToBuilder("export default { foo: 'bar' }")).toThrow(
				'Code must export a workflow built with the workflow() SDK function.',
			);
		});

		it('should throw for a boolean export', () => {
			expect(() => parseWorkflowCodeToBuilder('export default true')).toThrow(
				'Code must export a workflow built with the workflow() SDK function.',
			);
		});
	});
});
