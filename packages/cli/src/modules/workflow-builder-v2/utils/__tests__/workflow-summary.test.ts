import { summarizeWorkflow } from '../workflow-summary';

describe('summarizeWorkflow', () => {
	it('returns an empty-state hint when no nodes are committed', () => {
		const result = summarizeWorkflow({ nodes: [], connections: {} });

		expect(result).toContain('Nodes: (none yet');
		expect(result).toContain('fromStart');
	});

	it('renders committed nodes in order with id, name, and type@version', () => {
		const result = summarizeWorkflow({
			nodes: [
				{
					id: 'abc12345',
					name: 'Schedule Trigger',
					type: 'n8n-nodes-base.scheduleTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'def67890',
					name: 'Google Sheets',
					type: 'n8n-nodes-base.googleSheets',
					typeVersion: 4,
					position: [220, 0],
					parameters: { resource: 'sheet', operation: 'append' },
				},
			],
			connections: {},
		});

		expect(result).toContain('1. id=abc12345');
		expect(result).toContain('n8n-nodes-base.scheduleTrigger@1');
		expect(result).toContain('2. id=def67890');
		expect(result).toContain('n8n-nodes-base.googleSheets@4');
		expect(result).toContain('operation=append, resource=sheet');
	});

	it('points the next insertion at the most recently committed node', () => {
		const result = summarizeWorkflow({
			nodes: [
				{
					id: 'first',
					name: 'A',
					type: 'n8n-nodes-base.set',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'second',
					name: 'B',
					type: 'n8n-nodes-base.if',
					typeVersion: 1,
					position: [220, 0],
					parameters: {},
				},
			],
			connections: {},
		});

		expect(result).toContain('afterNodeId: "second"');
	});
});
