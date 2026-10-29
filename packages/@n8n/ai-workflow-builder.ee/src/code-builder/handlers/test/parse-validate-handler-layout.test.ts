import type { INodeType, INodeTypeDescription, INodeTypes } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ParseValidateHandler } from '../parse-validate-handler';

describe('ParseValidateHandler layout', () => {
	it('keeps a free-floating sticky clear of a Switch with unwired outputs', async () => {
		const nodeType = (
			name: string,
			description: Partial<INodeTypeDescription> = {},
		): INodeType => ({
			description: {
				name,
				displayName: name,
				description: '',
				version: 1,
				defaults: { name },
				group: [],
				inputs: ['main'],
				outputs: ['main'],
				properties: [],
				...description,
			},
		});
		const nodeTypes: Record<string, INodeType> = {
			'n8n-nodes-base.manualTrigger': nodeType('n8n-nodes-base.manualTrigger', {
				inputs: [],
				group: ['trigger'],
			}),
			'n8n-nodes-base.switch': nodeType('n8n-nodes-base.switch', {
				version: 3.2,
				outputs: '={{ Array($parameter.numberOutputs).fill("main") }}',
				properties: [{ displayName: 'Outputs', name: 'numberOutputs', type: 'number', default: 4 }],
			}),
			'n8n-nodes-base.noOp': nodeType('n8n-nodes-base.noOp'),
			'n8n-nodes-base.stickyNote': nodeType('n8n-nodes-base.stickyNote', {
				inputs: [],
				outputs: [],
			}),
		};
		const nodeTypesProvider = mock<INodeTypes>({
			getByNameAndVersion: (name) => nodeTypes[name],
		});
		const handler = new ParseValidateHandler({ nodeTypesProvider, generatePinData: false });

		const { workflow } = await handler.parseAndValidate(`
			const start = trigger({
				type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' }
			});
			const router = node({
				type: 'n8n-nodes-base.switch', version: 3.2,
				config: { name: 'Switch', parameters: { mode: 'expression', numberOutputs: 8 } }
			});
			const done = node({
				type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'Done' }
			});
			workflow('wf', 'Test')
				.add(start.to(router.onCase(0, done)))
				.add(sticky('## Workflow notes\\nRun this workflow manually.', { name: 'Notes' }));
		`);

		expect(workflow.connections.Switch.main).toEqual([[{ node: 'Done', type: 'main', index: 0 }]]);
		const note = workflow.nodes.find(({ name }) => name === 'Notes');
		expect(note).toBeDefined();
		if (!note) throw new Error('Notes not found');
		const [noteX, noteY] = note.position;
		const overlappingNodes = workflow.nodes
			.filter(({ name }) => name !== 'Notes')
			.filter(({ name, position: [x, y] }) => {
				// Eight main outputs make the Switch 288 pixels tall on the canvas.
				const height = name === 'Switch' ? 288 : 96;
				return x < noteX + 240 && noteX < x + 96 && y < noteY + 160 && noteY < y + height;
			})
			.map(({ name }) => name);

		expect(overlappingNodes).toEqual([]);
	});
});
