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

	describe('layout of authored positions', () => {
		// A three-node chain scattered across the canvas, as generated code looks when it
		// copies positions off an existing workflow or off the reference examples.
		const withPositions = `
			const startTrigger = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start', position: [-1120, 1360] } });
			const fetchData = node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { name: 'Fetch Data', parameters: {}, position: [660, -220] } });
			const processData = node({ type: 'n8n-nodes-base.set', version: 3.4, config: { name: 'Process Data', parameters: {}, position: [-340, 980] } });

			export default workflow('wf-1', 'Chain')
				.add(startTrigger)
				.to(fetchData)
				.to(processData);
		`;
		const withoutPositions = withPositions.replace(/, position: \[[-\d, ]+\]/g, '');

		function positionsOf(code: string, overrideAuthoredPositions: boolean) {
			return parseWorkflowCodeToBuilder(code)
				.toJSON({ tidyUp: true, overrideAuthoredPositions })
				.nodes.map((n) => [n.name, n.position]);
		}

		it('keeps authored positions by default, so an edit cannot move nodes the user placed', () => {
			expect(positionsOf(withPositions, false)).toEqual([
				['Start', [-1120, 1360]],
				['Fetch Data', [660, -220]],
				['Process Data', [-340, 980]],
			]);
		});

		it('lays authored positions out when overrideAuthoredPositions is set', () => {
			// Same arrangement as the identical code with no positions at all: a tidy row.
			expect(positionsOf(withPositions, true)).toEqual(positionsOf(withoutPositions, false));
			expect(positionsOf(withPositions, true)).toEqual([
				['Start', [0, 0]],
				['Fetch Data', [224, 0]],
				['Process Data', [448, 0]],
			]);
		});
	});
});
