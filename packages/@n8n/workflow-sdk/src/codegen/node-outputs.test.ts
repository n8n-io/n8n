import { generateWorkflowCode } from './index';
import type { WorkflowJSON } from '../types/base';

function workflow(): WorkflowJSON {
	return {
		name: 'Status summary',
		nodes: [
			{
				id: 'trigger-1',
				name: 'Every Morning',
				type: 'n8n-nodes-base.scheduleTrigger',
				typeVersion: 1.2,
				position: [0, 0],
				parameters: { rule: { interval: [{ field: 'days', triggerAtHour: 8 }] } },
			},
			{
				id: 'http-1',
				name: 'Fetch Status Summary',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.5,
				position: [200, 0],
				parameters: { method: 'GET', url: 'https://status.example.com/api/summary' },
			},
		],
		connections: {
			'Every Morning': { main: [[{ node: 'Fetch Status Summary', type: 'main', index: 0 }]] },
		},
	};
}

describe('generateWorkflowCode nodeOutputs', () => {
	it('emits declared verification output verbatim for the named node only', () => {
		const code = generateWorkflowCode({
			workflow: workflow(),
			nodeOutputs: {
				'Fetch Status Summary': [{ summary: 'All systems operational.' }],
			},
		});

		expect(code).toContain("output: [{ summary: 'All systems operational.' }]");
		// Only one node declared output; the trigger gets none.
		expect(code.match(/output:/g)).toHaveLength(1);
	});

	it('emits several items and ignores names that are not in the workflow', () => {
		const code = generateWorkflowCode({
			workflow: workflow(),
			nodeOutputs: {
				'Fetch Status Summary': [{ a: 1 }, { a: 2 }],
				'Not A Node': [{ b: 1 }],
			},
		});

		expect(code).toContain('output: [{ a: 1 }, { a: 2 }]');
		expect(code).not.toContain('b: 1');
	});

	it('emits nothing for an empty item list and without the option', () => {
		expect(
			generateWorkflowCode({ workflow: workflow(), nodeOutputs: { 'Fetch Status Summary': [] } }),
		).not.toContain('output:');
		expect(generateWorkflowCode(workflow())).not.toContain('output:');
	});
});
