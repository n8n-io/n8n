import { parseWorkflowCodeToBuilder } from './parse-workflow-code';

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
